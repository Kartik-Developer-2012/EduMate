import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Settings,
  Sparkles,
  Flame,
  CheckCircle,
  Coffee,
  BookOpen,
} from 'lucide-react';
import { StreakManager } from './StudyStreak';
import { Button } from '../ui';

export default function StudyTimer({ onSessionComplete = null }) {
  // Timer states
  const [mode, setMode] = useState('study'); // 'study' or 'break'
  const [studyDuration, setStudyDuration] = useState(25); // minutes
  const [breakDuration, setBreakDuration] = useState(5); // minutes
  const [timeLeft, setTimeLeft] = useState(25 * 60); // seconds
  const [isRunning, setIsRunning] = useState(false);
  const [totalStudySeconds, setTotalStudySeconds] = useState(0);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  const timerInterval = useRef(null);
  const audioRef = useRef(null);

  // Calculate percentage
  const totalSeconds = mode === 'study' ? studyDuration * 60 : breakDuration * 60;
  const progressPercent = Math.min(100, Math.max(0, ((totalSeconds - timeLeft) / totalSeconds) * 100));

  // Format MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Play notification chime
  const playSound = () => {
    if (!soundEnabled) return;
    try {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => playWebAudioTone());
      } else {
        playWebAudioTone();
      }
    } catch {
      playWebAudioTone();
    }
  };

  const playWebAudioTone = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.8);
    } catch (e) {
      console.warn('Web Audio playback error:', e);
    }
  };

  // Timer Tick
  useEffect(() => {
    if (!isRunning) return;

    timerInterval.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerInterval.current);
          setIsRunning(false);
          playSound();

          if (mode === 'study') {
            const completedSecs = studyDuration * 60;
            setTotalStudySeconds((t) => t + completedSecs);
            setSessionsCompleted((s) => s + 1);

            // Log session into StreakManager
            try {
              const manager = new StreakManager();
              manager.addStudySession(completedSecs);
              window.dispatchEvent(new CustomEvent('study-streak-updated'));
            } catch (err) {
              console.warn('Failed to update streak:', err);
            }

            onSessionComplete?.({ duration: completedSecs, mode: 'study' });

            // Switch to break
            setMode('break');
            return breakDuration * 60;
          } else {
            // Break completed, switch back to study
            setMode('study');
            return studyDuration * 60;
          }
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerInterval.current) clearInterval(timerInterval.current);
    };
  }, [isRunning, mode, studyDuration, breakDuration, onSessionComplete, soundEnabled]);

  // Handle Preset Select
  const selectPreset = (studyMin, breakMin) => {
    setIsRunning(false);
    setStudyDuration(studyMin);
    setBreakDuration(breakMin);
    setMode('study');
    setTimeLeft(studyMin * 60);
  };

  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(mode === 'study' ? studyDuration * 60 : breakDuration * 60);
  };

  const handleSwitchMode = (targetMode) => {
    setIsRunning(false);
    setMode(targetMode);
    setTimeLeft(targetMode === 'study' ? studyDuration * 60 : breakDuration * 60);
  };

  return (
    <div className="w-full max-w-lg mx-auto p-6 sm:p-8 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-md transition-all">
      {/* Title & Mode Switcher */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-base font-bold text-[var(--color-text-primary)] flex items-center gap-2">
            <span className="text-lg">⏱️</span>
            <span>Study Timer (Pomodoro)</span>
          </h2>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            Structured intervals for maximum retention and focus
          </p>
        </div>

        <button
          type="button"
          onClick={() => setSoundEnabled(!soundEnabled)}
          title={soundEnabled ? 'Mute sound' : 'Enable sound'}
          className="p-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
        >
          {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-red-400" />}
        </button>
      </div>

      {/* Mode Buttons */}
      <div className="flex gap-2 p-1 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] mb-6">
        <button
          type="button"
          onClick={() => handleSwitchMode('study')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            mode === 'study'
              ? 'bg-[#5B21B6] text-white shadow-sm'
              : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Study Mode ({studyDuration}m)</span>
        </button>
        <button
          type="button"
          onClick={() => handleSwitchMode('break')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            mode === 'break'
              ? 'bg-[#06B6D4] text-[#0F172A] shadow-sm'
              : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
          }`}
        >
          <Coffee className="w-3.5 h-3.5" />
          <span>Break ({breakDuration}m)</span>
        </button>
      </div>

      {/* Big Circular Countdown Display */}
      <div className="relative w-64 h-64 mx-auto mb-6 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="44"
            fill="none"
            stroke="var(--color-border)"
            strokeWidth="4"
          />
          <circle
            cx="50"
            cy="50"
            r="44"
            fill="none"
            stroke={mode === 'study' ? '#06B6D4' : '#10B981'}
            strokeWidth="4"
            strokeDasharray={`${(2 * Math.PI * 44 * progressPercent) / 100} ${2 * Math.PI * 44}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.5s ease' }}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-5xl font-mono font-extrabold tracking-tight text-[var(--color-text-primary)] drop-shadow-sm">
            {formatTime(timeLeft)}
          </span>
          <span className="text-xs font-bold tracking-wider uppercase mt-2 text-[#06B6D4]">
            {mode === 'study' ? (isRunning ? 'Focus In Progress' : 'Ready to Study') : 'Relax & Hydrate'}
          </span>
          {isRunning && (
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping mt-1.5" />
          )}
        </div>
      </div>

      {/* Main Controls: Start/Pause, Reset, Settings */}
      <div className="flex items-center gap-3 mb-6">
        <Button
          variant={isRunning ? 'danger' : 'primary'}
          size="lg"
          icon={isRunning ? Pause : Play}
          onClick={() => setIsRunning(!isRunning)}
          className={`flex-1 text-sm font-bold shadow-md ${
            isRunning
              ? 'bg-amber-600 hover:bg-amber-700 text-white border-none'
              : 'bg-[#5B21B6] hover:bg-[#6D28D9] text-[#F8FAFC] border-none'
          }`}
        >
          {isRunning ? 'Pause' : 'Start Timer'}
        </Button>

        <Button
          variant="secondary"
          size="lg"
          icon={RotateCcw}
          onClick={handleReset}
          className="px-4"
          title="Reset timer"
        >
          Reset
        </Button>

        <Button
          variant="ghost"
          size="lg"
          icon={Settings}
          onClick={() => setShowSettings(!showSettings)}
          className={`px-3.5 ${showSettings ? 'border-[#06B6D4] text-[#06B6D4]' : ''}`}
          title="Timer Settings"
        >
          <span className="sr-only">Settings</span>
        </Button>
      </div>

      {/* Quick Presets */}
      <div className="flex items-center justify-center gap-2 mb-6 text-xs">
        <span className="text-[10px] text-[var(--color-text-muted)] font-semibold uppercase mr-1">Presets:</span>
        <button
          type="button"
          onClick={() => selectPreset(25, 5)}
          className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all ${
            studyDuration === 25 && breakDuration === 5
              ? 'border-[#06B6D4] text-[#06B6D4] bg-[#06B6D4]/10'
              : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
          }`}
        >
          25 / 5m
        </button>
        <button
          type="button"
          onClick={() => selectPreset(50, 10)}
          className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all ${
            studyDuration === 50 && breakDuration === 10
              ? 'border-[#06B6D4] text-[#06B6D4] bg-[#06B6D4]/10'
              : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
          }`}
        >
          50 / 10m
        </button>
        <button
          type="button"
          onClick={() => selectPreset(15, 3)}
          className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all ${
            studyDuration === 15 && breakDuration === 3
              ? 'border-[#06B6D4] text-[#06B6D4] bg-[#06B6D4]/10'
              : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
          }`}
        >
          15 / 3m
        </button>
      </div>

      {/* Expandable Settings */}
      {showSettings && (
        <div className="p-4 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] mb-6 space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)]">
            <span className="text-xs font-bold text-[var(--color-text-primary)] flex items-center gap-1.5">
              <Settings className="w-3.5 h-3.5 text-[#06B6D4]" />
              <span>Custom Duration Settings</span>
            </span>
            <button
              type="button"
              onClick={() => setShowSettings(false)}
              className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            >
              Done
            </button>
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium text-[var(--color-text-primary)] mb-1">
              <span>Study Session</span>
              <span className="text-[#06B6D4] font-bold">{studyDuration} minutes</span>
            </div>
            <input
              type="range"
              min="5"
              max="90"
              step="5"
              value={studyDuration}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                setStudyDuration(val);
                if (!isRunning && mode === 'study') setTimeLeft(val * 60);
              }}
              className="w-full accent-[#06B6D4] cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium text-[var(--color-text-primary)] mb-1">
              <span>Break Time</span>
              <span className="text-emerald-400 font-bold">{breakDuration} minutes</span>
            </div>
            <input
              type="range"
              min="1"
              max="30"
              step="1"
              value={breakDuration}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                setBreakDuration(val);
                if (!isRunning && mode === 'break') setTimeLeft(val * 60);
              }}
              className="w-full accent-emerald-400 cursor-pointer"
            />
          </div>
        </div>
      )}

      {/* Summary Stats Row */}
      <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-center">
        <div>
          <p className="text-[10px] text-[var(--color-text-muted)] font-semibold uppercase">Completed</p>
          <p className="text-base font-bold text-[#F8FAFC] mt-0.5 flex items-center justify-center gap-1">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>{sessionsCompleted}</span>
          </p>
        </div>
        <div className="border-x border-[var(--color-border)]">
          <p className="text-[10px] text-[var(--color-text-muted)] font-semibold uppercase">Studied</p>
          <p className="text-base font-bold text-[#06B6D4] mt-0.5">
            {Math.floor(totalStudySeconds / 60)}m
          </p>
        </div>
        <div>
          <p className="text-[10px] text-[var(--color-text-muted)] font-semibold uppercase">Streak Auto</p>
          <p className="text-base font-bold text-amber-400 mt-0.5 flex items-center justify-center gap-1">
            <Flame className="w-3.5 h-3.5" />
            <span>Logged</span>
          </p>
        </div>
      </div>
    </div>
  );
}
