import React, { useState, useEffect } from 'react';
import {
  Search,
  X,
  Sun,
  Moon,
  Menu,
  Bookmark,
  BookOpen,
  LogOut,
  Lock,
  Smartphone,
  Sparkles,
  ListTodo,
  Timer,
  Flame,
  LayoutDashboard,
} from 'lucide-react';
import { useCourse } from '../context/CourseContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useGoogleTasks } from '../context/GoogleTasksContext';
import { StreakManager } from './Productivity/StudyStreak';
import appLogo from '../assets/app-logo.png';

/**
 * Modern, Clean Navbar with Full Productivity Suite Navigation
 */
export default function Navbar({
  activeView,
  setActiveView,
  selectedBatch,
  onBackToBatches,
  searchQuery,
  setSearchQuery,
  onSearchSubmit,
  onOpenPwLogin,
}) {
  const { enrolledBatches, pwUser, logoutPwUser, masterActive } = useCourse();
  const { logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  // Productivity stats
  const tasksContext = useGoogleTasks();
  const todaysTasksCount = tasksContext?.todaysTasks?.length || 0;

  const [streakDays, setStreakDays] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(Boolean(searchQuery));

  useEffect(() => {
    const updateStreak = () => {
      try {
        const manager = new StreakManager();
        setStreakDays(manager.getData()?.currentStreak || 0);
      } catch {}
    };
    updateStreak();
    window.addEventListener('study-streak-updated', updateStreak);
    return () => window.removeEventListener('study-streak-updated', updateStreak);
  }, []);

  const handleNav = (view) => {
    setActiveView(view);
    if (selectedBatch && onBackToBatches) {
      onBackToBatches();
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[var(--color-surface)] border-b border-[var(--color-border)] shadow-sm transition-all duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
        {/* Left: Brand Logo & Main Nav Tabs */}
        <div className="flex items-center gap-3 shrink-0">
          {selectedBatch ? (
            <button
              onClick={onBackToBatches}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--color-surface-hover)] border border-[var(--color-border)] text-[var(--color-text-primary)] hover:border-[#5B21B6] text-xs font-semibold transition-all hover:scale-105"
            >
              <span>← Back</span>
            </button>
          ) : (
            <button
              onClick={() => handleNav('batches')}
              className="flex items-center gap-2 cursor-pointer hover:opacity-85 transition-opacity"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#5B21B6] to-[#06B6D4] p-0.5 shadow-sm">
                <div className="w-full h-full bg-[#0F172A] rounded-[8px] overflow-hidden flex items-center justify-center">
                  <img
                    src={appLogo}
                    alt="EduMate Logo"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="font-bold text-sm tracking-tight text-[#F8FAFC]">
                  Edu<span className="text-[#06B6D4]">Mate</span>
                </span>
                <span className="text-[8px] font-medium text-[#64748B]">Learning Platform</span>
              </div>
            </button>
          )}

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 ml-2 border-l border-[var(--color-border)] pl-3">
            <button
              onClick={() => handleNav('batches')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                activeView === 'batches' && !selectedBatch
                  ? 'bg-[#5B21B6] text-white shadow-sm'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]'
              }`}
            >
              Batches
            </button>

            <button
              onClick={() => handleNav('enrolled')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeView === 'enrolled'
                  ? 'bg-[#06B6D4] text-[#0F172A] font-bold shadow-sm'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]'
              }`}
            >
              <span>My Batches</span>
              {enrolledBatches.length > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                  activeView === 'enrolled' ? 'bg-[#0F172A]/20 text-[#0F172A]' : 'bg-[var(--color-border)] text-[#06B6D4]'
                }`}>
                  {enrolledBatches.length}
                </span>
              )}
            </button>

            <button
              onClick={() => handleNav('tasks')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeView === 'tasks'
                  ? 'bg-[#06B6D4] text-[#0F172A] font-bold shadow-sm'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]'
              }`}
            >
              <ListTodo className="w-3.5 h-3.5" />
              <span>Tasks</span>
              {todaysTasksCount > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                  activeView === 'tasks' ? 'bg-[#0F172A]/20 text-[#0F172A]' : 'bg-[#06B6D4]/20 text-[#06B6D4]'
                }`}>
                  {todaysTasksCount}
                </span>
              )}
            </button>

            <button
              onClick={() => handleNav('timer')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeView === 'timer'
                  ? 'bg-[#5B21B6] text-white shadow-sm'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]'
              }`}
            >
              <Timer className="w-3.5 h-3.5" />
              <span>Timer</span>
            </button>

            <button
              onClick={() => handleNav('streaks')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeView === 'streaks'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>Streaks</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                activeView === 'streaks' ? 'bg-white/20 text-white' : 'bg-amber-500/20 text-amber-300'
              }`}>
                {streakDays}d
              </span>
            </button>
          </nav>
        </div>

        {/* Center: Search Bar (Desktop only) */}
        {!selectedBatch && (
          <div className="hidden md:flex flex-1 max-w-xs">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onSearchSubmit?.(searchQuery);
              }}
              className="relative w-full"
            >
              <Search className="w-4 h-4 text-[var(--color-text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search batches..."
                className="w-full bg-[var(--color-surface-hover)] border border-[var(--color-border)] text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] text-xs rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:border-[#5B21B6] focus:ring-1 focus:ring-[#5B21B6]/30 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    onSearchSubmit?.('');
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] p-0.5 rounded transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </form>
          </div>
        )}

        {/* Right: Action Quick Badges + Theme + Menu */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Quick Streak Pill (Click to open streaks) */}
          <button
            onClick={() => handleNav('streaks')}
            title={`Study Streak: ${streakDays} days! Click to open Streaks`}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-bold transition-all hover:scale-105"
          >
            <Flame className="w-3.5 h-3.5 fill-amber-400" />
            <span>{streakDays}d</span>
          </button>

          {/* Quick Timer Pill (Click to open timer) */}
          <button
            onClick={() => handleNav('timer')}
            title="Open Pomodoro Study Timer"
            className="p-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-[#06B6D4] transition-all hover:scale-105"
          >
            <Timer className="w-4 h-4" />
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            title={isDark ? 'Light Mode' : 'Dark Mode'}
            className="p-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-[#5B21B6] transition-all hover:scale-105"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Mobile Search Toggle */}
          {!selectedBatch && (
            <button
              onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
              className="md:hidden p-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)]"
            >
              <Search className="w-4 h-4" />
            </button>
          )}

          {/* Mobile / Full Menu Toggle */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)]"
          >
            {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Search Bar Dropdown */}
      {!selectedBatch && isMobileSearchOpen && (
        <div className="md:hidden px-4 py-2.5 bg-[var(--color-surface)] border-t border-[var(--color-border)]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSearchSubmit?.(searchQuery);
            }}
            className="relative w-full"
          >
            <Search className="w-4 h-4 text-[var(--color-text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search batches..."
              autoFocus
              className="w-full bg-[var(--color-surface-hover)] border border-[var(--color-border)] text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] text-xs rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:border-[#5B21B6]"
            />
          </form>
        </div>
      )}

      {/* Full Navigation Drawer */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 top-14 z-50 bg-black/40 backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <div
            className="w-full max-w-md ml-auto bg-[var(--color-surface)] border-l border-b border-[var(--color-border)] shadow-2xl p-4 space-y-3 max-h-[calc(100vh-3.5rem)] overflow-y-auto animate-in slide-in-from-right duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider px-1">
              Course Catalog
            </div>

            <button
              onClick={() => handleNav('batches')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeView === 'batches'
                  ? 'bg-[#5B21B6] text-[#F8FAFC]'
                  : 'bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-card)]'
              }`}
            >
              <BookOpen className="w-4 h-4 text-[#06B6D4]" />
              <span>All Batches (Physics Wallah & Next Toppers)</span>
            </button>

            <button
              onClick={() => handleNav('enrolled')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeView === 'enrolled'
                  ? 'bg-[#06B6D4] text-[#0F172A] font-bold'
                  : 'bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-card)]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-4 h-4" />
                <span>My Enrolled Batches</span>
              </div>
              {enrolledBatches.length > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#0F172A] text-[#06B6D4]">
                  {enrolledBatches.length}
                </span>
              )}
            </button>

            <div className="pt-2 text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider px-1">
              Productivity & Study Suite
            </div>

            <button
              onClick={() => handleNav('productivity')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeView === 'productivity'
                  ? 'bg-gradient-to-r from-[#5B21B6] to-[#06B6D4] text-white font-bold'
                  : 'bg-[var(--color-surface-hover)] text-[var(--color-text-primary)]'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 text-[#06B6D4]" />
              <span>Productivity Hub (Overview)</span>
            </button>

            <button
              onClick={() => handleNav('tasks')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeView === 'tasks'
                  ? 'bg-[#06B6D4] text-[#0F172A] font-bold'
                  : 'bg-[var(--color-surface-hover)] text-[var(--color-text-primary)]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <ListTodo className="w-4 h-4 text-[#06B6D4]" />
                <span>📋 My Tasks (Google Tasks)</span>
              </div>
              {todaysTasksCount > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#06B6D4] text-[#0F172A]">
                  {todaysTasksCount} Due
                </span>
              )}
            </button>

            <button
              onClick={() => handleNav('timer')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeView === 'timer'
                  ? 'bg-[#5B21B6] text-white font-bold'
                  : 'bg-[var(--color-surface-hover)] text-[var(--color-text-primary)]'
              }`}
            >
              <Timer className="w-4 h-4 text-[#06B6D4]" />
              <span>⏱️ Study Timer (25:00 Pomodoro)</span>
            </button>

            <button
              onClick={() => handleNav('streaks')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeView === 'streaks'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold'
                  : 'bg-[var(--color-surface-hover)] text-[var(--color-text-primary)]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Flame className="w-4 h-4 text-amber-400" />
                <span>🔥 My Streaks & Badges</span>
              </div>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-400 text-[#0F172A]">
                {streakDays} Days
              </span>
            </button>

            {/* Physics Wallah Login */}
            <div className="my-2 pt-2 border-t border-[var(--color-border)]">
              {pwUser || masterActive ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--color-surface-hover)]">
                    <Sparkles className="w-4 h-4 text-[#06B6D4]" />
                    <span className="text-xs font-medium text-[#F8FAFC]">
                      {pwUser?.name || 'PW Lifetime Active'}
                    </span>
                  </div>
                  {pwUser && (
                    <button
                      onClick={() => {
                        logoutPwUser();
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-red-400 hover:bg-red-500/10 text-xs font-medium transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Log Out PW</span>
                    </button>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => {
                    onOpenPwLogin();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-[#06B6D4] hover:bg-[#0891B2] text-[#0F172A] font-bold text-xs transition-all"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>PW One-Time Setup</span>
                </button>
              )}
            </div>

            {/* Lock App */}
            <div className="pt-2 border-t border-[var(--color-border)]">
              <button
                onClick={() => {
                  logout();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-[var(--color-surface-hover)] hover:bg-red-500/10 text-[var(--color-text-primary)] hover:text-red-400 font-medium text-sm transition-all"
              >
                <Lock className="w-4 h-4" />
                <span>Lock App</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
