import React, { useState } from 'react';
import {
  ListTodo,
  Timer,
  Flame,
  LayoutDashboard,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import TaskList from '../GoogleTasks/TaskList';
import StudyTimer from './StudyTimer';
import StudyStreak from './StudyStreak';

export default function ProductivityHub({ initialTab = 'overview', onBackToBatches = null }) {
  const [activeTab, setActiveTab] = useState(initialTab); // 'overview' | 'tasks' | 'timer' | 'streaks'

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-in fade-in duration-200">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[var(--color-border)] pb-5">
        <div>
          {onBackToBatches && (
            <button
              onClick={onBackToBatches}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-muted)] hover:text-[#06B6D4] transition-colors mb-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Batches Catalog</span>
            </button>
          )}
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[var(--color-text-primary)] flex items-center gap-2.5">
            <span className="p-1.5 rounded-xl bg-gradient-to-tr from-[#5B21B6] to-[#06B6D4] text-white">
              <Sparkles className="w-5 h-5" />
            </span>
            <span>Productivity & Study Hub</span>
          </h1>
          <p className="text-xs sm:text-sm text-[var(--color-text-muted)] mt-1">
            Supercharge your prep with Google Tasks, Pomodoro focus timer, and daily streak tracking.
          </p>
        </div>

        {/* Tab Navigation Buttons */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] overflow-x-auto w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-[#5B21B6] text-white shadow-sm'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('tasks')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'tasks'
                ? 'bg-[#06B6D4] text-[#0F172A] shadow-sm'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            <ListTodo className="w-3.5 h-3.5" />
            <span>📋 My Tasks</span>
          </button>

          <button
            onClick={() => setActiveTab('timer')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'timer'
                ? 'bg-[#5B21B6] text-white shadow-sm'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            <Timer className="w-3.5 h-3.5" />
            <span>⏱️ Study Timer</span>
          </button>

          <button
            onClick={() => setActiveTab('streaks')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'streaks'
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>🔥 My Streaks</span>
          </button>
        </div>
      </div>

      {/* Main Tab Views */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Big Study Timer Studio */}
            <div className="lg:col-span-5 flex flex-col justify-start">
              <StudyTimer />
            </div>

            {/* Right Column: Streaks + Tasks */}
            <div className="lg:col-span-7 space-y-6">
              <StudyStreak />
              <TaskList onStartTimer={() => setActiveTab('timer')} />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'tasks' && (
        <div className="max-w-3xl mx-auto">
          <TaskList onStartTimer={() => setActiveTab('timer')} />
        </div>
      )}

      {activeTab === 'timer' && (
        <div className="max-w-xl mx-auto">
          <StudyTimer />
        </div>
      )}

      {activeTab === 'streaks' && (
        <div className="max-w-3xl mx-auto">
          <StudyStreak />
        </div>
      )}
    </div>
  );
}
