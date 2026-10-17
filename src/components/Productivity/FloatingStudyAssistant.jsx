import React, { useState, useEffect } from 'react';
import {
  Timer,
  ListTodo,
  X,
  Play,
  Pause,
  RotateCcw,
  ExternalLink,
  Flame,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { useGoogleTasks } from '../../context/GoogleTasksContext';
import { StreakManager } from './StudyStreak';

export default function FloatingStudyAssistant({ onOpenFullHub = null }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('timer'); // 'timer' | 'tasks'
  const { todaysTasks, completeTask, createTask } = useGoogleTasks();

  // Mini Timer States
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState('study'); // 'study' | 'break'
  const [newTaskTitle, setNewTaskTitle] = useState('');

  // Format time MM:SS
  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          if (mode === 'study') {
            try {
              const manager = new StreakManager();
              manager.addStudySession(25 * 60);
              window.dispatchEvent(new CustomEvent('study-streak-updated'));
            } catch {}
            setMode('break');
            return 5 * 60;
          } else {
            setMode('study');
            return 25 * 60;
          }
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning, mode]);

  const handleCreateQuickTask = (e) => {
    e.preventDefault();
    if (newTaskTitle.trim()) {
      createTask(newTaskTitle.trim());
      setNewTaskTitle('');
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-40 select-none print:hidden">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          title="Open Study Assistant"
          className="flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-gradient-to-r from-[#5B21B6] to-[#06B6D4] text-[#F8FAFC] shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 border border-white/20 group"
        >
          <Timer className="w-4 h-4 text-white group-hover:rotate-12 transition-transform" />
          <span className="text-xs font-bold tracking-tight">
            {isRunning ? formatTime(timeLeft) : 'Study Assistant'}
          </span>
          {todaysTasks.length > 0 && (
            <span className="w-4 h-4 rounded-full bg-[#0F172A] text-[#06B6D4] text-[9px] font-extrabold flex items-center justify-center">
              {todaysTasks.length}
            </span>
          )}
        </button>
      ) : (
        <div className="w-80 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-2xl overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="p-3 bg-gradient-to-r from-[#5B21B6] to-[#1E3A52] text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#06B6D4]" />
              <span className="text-xs font-bold tracking-wide">Study Assistant</span>
            </div>
            <div className="flex items-center gap-1">
              {onOpenFullHub && (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onOpenFullHub();
                  }}
                  title="Expand to Full Productivity Hub"
                  className="p-1 rounded text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                title="Minimize"
                className="p-1 rounded text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Sub Navigation */}
          <div className="flex border-b border-[var(--color-border)] bg-[var(--color-bg)]">
            <button
              onClick={() => setActiveTab('timer')}
              className={`flex-1 py-2 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                activeTab === 'timer'
                  ? 'text-[#06B6D4] border-b-2 border-[#06B6D4]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              <Timer className="w-3.5 h-3.5" />
              <span>Timer</span>
            </button>
            <button
              onClick={() => setActiveTab('tasks')}
              className={`flex-1 py-2 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                activeTab === 'tasks'
                  ? 'text-[#06B6D4] border-b-2 border-[#06B6D4]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              <ListTodo className="w-3.5 h-3.5" />
              <span>Tasks ({todaysTasks.length})</span>
            </button>
          </div>

          {/* Body */}
          <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
            {activeTab === 'timer' ? (
              <div className="text-center space-y-3">
                <div className="py-2">
                  <span className="text-4xl font-mono font-extrabold text-[var(--color-text-primary)]">
                    {formatTime(timeLeft)}
                  </span>
                  <p className="text-[10px] uppercase font-bold tracking-wider text-[#06B6D4] mt-1">
                    {mode === 'study' ? '25m Focus Block' : '5m Rest Interval'}
                  </p>
                </div>

                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => setIsRunning(!isRunning)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      isRunning
                        ? 'bg-amber-600 hover:bg-amber-700 text-white'
                        : 'bg-[#5B21B6] hover:bg-[#6D28D9] text-white shadow-sm'
                    }`}
                  >
                    {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    <span>{isRunning ? 'Pause' : 'Start'}</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsRunning(false);
                      setTimeLeft(mode === 'study' ? 25 * 60 : 5 * 60);
                    }}
                    className="p-2 rounded-xl border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="pt-2 border-t border-[var(--color-border)] flex items-center justify-between text-[11px] text-[var(--color-text-muted)]">
                  <span>Streak auto-logs upon completion</span>
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Quick Add Form */}
                <form onSubmit={handleCreateQuickTask} className="flex gap-1.5">
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="Quick add study task..."
                    className="flex-1 px-2.5 py-1.5 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[#06B6D4]"
                  />
                  <button
                    type="submit"
                    className="px-2.5 py-1.5 rounded-lg bg-[#06B6D4] text-[#0F172A] text-xs font-bold hover:bg-[#0891B2] transition-colors"
                  >
                    Add
                  </button>
                </form>

                {/* Today's Tasks List */}
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {todaysTasks.length === 0 ? (
                    <p className="text-center text-xs text-[var(--color-text-muted)] py-4">
                      No tasks for today! Great job! 🎉
                    </p>
                  ) : (
                    todaysTasks.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center gap-2 p-2 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] text-xs"
                      >
                        <input
                          type="checkbox"
                          checked={t.completed}
                          onChange={() => completeTask(t.id)}
                          className="w-3.5 h-3.5 accent-[#06B6D4] cursor-pointer"
                        />
                        <span
                          className={`flex-1 truncate ${
                            t.completed
                              ? 'line-through text-[var(--color-text-muted)]'
                              : 'text-[var(--color-text-primary)]'
                          }`}
                        >
                          {t.title}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer with link to Full Hub */}
          {onOpenFullHub && (
            <div className="p-2.5 bg-[var(--color-bg)] border-t border-[var(--color-border)] text-center">
              <button
                onClick={() => {
                  setIsOpen(false);
                  onOpenFullHub();
                }}
                className="w-full py-1 text-xs font-bold text-[#06B6D4] hover:underline flex items-center justify-center gap-1.5"
              >
                <span>Open Full Productivity Suite</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
