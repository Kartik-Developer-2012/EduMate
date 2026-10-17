import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { Button } from '../ui';

export default function StudyTimer() {
  // Timer states
  const [mode, setMode] = useState('study'); // 'study' or 'break'
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes in seconds
  const [isRunning, setIsRunning] = useState(false);
  const [totalStudyTime, setTotalStudyTime] = useState(0);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Settings
  const [studyDuration, setStudyDuration] = useState(25); // minutes
  const [breakDuration, setBreakDuration] = useState(5); // minutes
  const [showSettings, setShowSettings] = useState(false);

  // References
  const timerInterval = useRef(null);
  const audioRef = useRef(null);

  // Calculate total time
  const totalDuration = mode === 'study' ? studyDuration * 60 : breakDuration * 60;
  const progressPercent = ((totalDuration - timeLeft) / totalDuration) * 100;

  // Format time display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Play notification sound
  const playSound = () => {
    if (soundEnabled && audioRef.current) {
      audioRef.current.play().catch(() => {
        // Fallback: use Web Audio API if audio file fails
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 1000;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
      });
    }
  };

  // Timer effect
  useEffect(() => {
    if (!isRunning) return;

    timerInterval.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Timer finished
          playSound();
          clearInterval(timerInterval.current);
          setIsRunning(false);

          if (mode === 'study') {
            // Switch to break
            setMode('break');
            setTimeLeft(breakDuration * 60);
            setTotalStudyTime((t) => t + studyDuration * 60);
          } else {
            // Switch back to study
            setMode('study');
            setTimeLeft(studyDuration * 60);
            setSessionsCompleted((s) => s + 1);
          }

          return 0;
        }

        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
      }
    };
  }, [isRunning, mode, studyDuration, breakDuration]);

  // Auto-pause if idle for 2 minutes
  const idleRef = useRef(null);
  useEffect(() => {
    const resetIdle = () => {
      if (idleRef.current) clearTimeout(idleRef.current);
      idleRef.current = setTimeout(() => {
        if (isRunning) {
          setIsRunning(false);
        }
      }, 2 * 60 * 1000); // 2 minutes
    };

    if (isRunning) {
      window.addEventListener('mousedown', resetIdle);
      window.addEventListener('keydown', resetIdle);
      resetIdle();
    }

    return () => {
      window.removeEventListener('mousedown', resetIdle);
      window.removeEventListener('keydown', resetIdle);
      if (idleRef.current) clearTimeout(idleRef.current);
    };
  }, [isRunning]);

  const handleReset = () => {
    setIsRunning(false);
    setMode('study');
    setTimeLeft(studyDuration * 60);
  };

  const handleSkipSession = () => {
    if (mode === 'study') {
      setTotalStudyTime((t) => t + studyDuration * 60);
      setMode('break');
      setTimeLeft(breakDuration * 60);
    } else {
      setMode('study');
      setTimeLeft(studyDuration * 60);
      setSessionsCompleted((s) => s + 1);
    }
    setIsRunning(false);
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
          📚 Study Timer
        </h2>
        <p className="text-xs text-[var(--color-text-muted)] mt-1">
          Pomodoro-style focus sessions
        </p>
      </div>

      {/* Mode Indicator */}
      <div className="flex justify-center gap-2 mb-6">
        <div
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
            mode === 'study'
              ? 'bg-[var(--color-primary)] text-white'
              : 'bg-[var(--color-surface-hover)] text-[var(--color-text-muted)]'
          }`}
        >
          Study Mode
        </div>
        <div
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
            mode === 'break'
              ? 'bg-[var(--color-accent)] text-white'
              : 'bg-[var(--color-surface-hover)] text-[var(--color-text-muted)]'
          }`}
        >
          Break Time
        </div>
      </div>

      {/* Timer Display */}
      <div className="relative mb-6">
        {/* Circular progress */}
        <svg className="w-full h-40 transform -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="var(--color-border)"
            strokeWidth="2"
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={mode === 'study' ? 'var(--color-primary)' : 'var(--color-accent)'}
            strokeWidth="2"
            strokeDasharray={`${(2 * Math.PI * 45 * progressPercent) / 100} ${2 * Math.PI * 45}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 1s linear' }}
          />
        </svg>

        {/* Time display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-4xl font-bold text-[var(--color-text-primary)]">
            {formatTime(timeLeft)}
          </div>
          <div className="text-xs text-[var(--color-text-muted)] mt-1">
            {mode === 'study' ? 'Time to focus' : 'Time to rest'}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={isRunning ? 'danger' : 'primary'}
          size="md"
          icon={isRunning ? Pause : Play}
          onClick={() => setIsRunning(!isRunning)}
          className="flex-1"
        >
          {isRunning ? 'Pause' : 'Start'}
        </Button>

        <Button
          variant="ghost"
          size="md"
          icon={RotateCcw}
          onClick={handleReset}
          className="flex-1"
        >
          Reset
        </Button>

        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="w-10 h-10 rounded-lg bg-[var(--color-surface-hover)] hover:bg-[var(--color-surface-elevated)] flex items-center justify-center text-[var(--color-text-secondary)] transition-colors"
        >
          {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-6 p-3 rounded-lg bg-[var(--color-bg)]">
        <div className="text-center">
          <p className="text-xs text-[var(--color-text-muted)]">Sessions</p>
          <p className="text-xl font-bold text-[var(--color-primary)]">{sessionsCompleted}</p>
        </div>
        <div className="text-center border-l border-r border-[var(--color-border)]">
          <p className="text-xs text-[var(--color-text-muted)]">Studied</p>
          <p className="text-xl font-bold text-[var(--color-secondary)]">
            {Math.floor(totalStudyTime / 60)}m
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-[var(--color-text-muted)]">Today</p>
          <p className="text-xl font-bold text-[var(--color-accent)]">🔥 {sessionsCompleted}x</p>
        </div>
      </div>

      {/* Break reminder message */}
      {mode === 'break' && !isRunning && timeLeft === breakDuration * 60 && (
        <div className="p-3 rounded-lg bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/30 text-center mb-4">
          <p className="text-sm font-medium text-[var(--color-accent)]">
            Great work! Take a {breakDuration}-minute break.
          </p>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            Go drink water 💧 and stretch
          </p>
        </div>
      )}

      {/* Study recommendation */}
      {mode === 'study' && !isRunning && timeLeft === studyDuration * 60 && (
        <div className="p-3 rounded-lg bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 text-center mb-4">
          <p className="text-sm font-medium text-[var(--color-primary)]">
            Ready to focus? {sessionsCompleted === 0 ? 'Start your first session!' : 'Keep the streak going!'}
          </p>
        </div>
      )}

      {/* Settings */}
      <button
        onClick={() => setShowSettings(!showSettings)}
        className="w-full px-3 py-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors text-center"
      >
        {showSettings ? '✕ Hide' : '⚙ Settings'}
      </button>

      {showSettings && (
        <div className="mt-4 p-3 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] space-y-3">
          <div>
            <label className="text-xs font-medium text-[var(--color-text-primary)] block mb-1">
              Study Duration: {studyDuration} min
            </label>
            <input
              type="range"
              min="1"
              max="60"
              value={studyDuration}
              onChange={(e) => {
                setStudyDuration(parseInt(e.target.value));
                if (!isRunning) setTimeLeft(parseInt(e.target.value) * 60);
              }}
              className="w-full"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-[var(--color-text-primary)] block mb-1">
              Break Duration: {breakDuration} min
            </label>
            <input
              type="range"
              min="1"
              max="30"
              value={breakDuration}
              onChange={(e) => setBreakDuration(parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowSettings(false)}
              className="flex-1"
            >
              Done
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStudyDuration(25);
                setBreakDuration(5);
              }}
              className="flex-1"
            >
              Reset
            </Button>
          </div>
        </div>
      )}

      {/* Hidden audio for notifications */}
      <audio ref={audioRef}>
        <source src="data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA==" />
      </audio>
    </div>
  );
}
