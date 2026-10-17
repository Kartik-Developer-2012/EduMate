import React, { useState } from 'react';
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
} from 'lucide-react';
import { useCourse } from '../context/CourseContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import appLogo from '../assets/app-logo.png';

/**
 * Modern, Clean Navbar (Balanced Design)
 * 5 items: Logo, Search, Theme, Bookmarks, Menu
 * Significantly simplified from previous 8+ items
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
  const { logout, authEmail } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(Boolean(searchQuery));

  const bookmarksCount = 0; // TODO: Connect to actual bookmarks context

  return (
    <header className="sticky top-0 z-40 w-full bg-[var(--color-surface)] border-b border-[var(--color-border)] shadow-sm transition-all duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Left: Brand Logo */}
        <div className="flex items-center gap-2.5 shrink-0">
          {selectedBatch ? (
            <button
              onClick={onBackToBatches}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--color-surface-hover)] border border-[var(--color-border)] text-[var(--color-text-primary)] hover:border-[#5B21B6] text-xs font-semibold transition-all hover:scale-105"
            >
              <span>← Back</span>
            </button>
          ) : (
            <button
              onClick={() => setActiveView('batches')}
              className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
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
              <div className="hidden sm:flex flex-col">
                <span className="font-bold text-sm tracking-tight text-[#F8FAFC]">
                  Edu<span className="text-[#06B6D4]">Mate</span>
                </span>
                <span className="text-[8px] font-medium text-[#64748B]">Learning Platform</span>
              </div>
            </button>
          )}
        </div>

        {/* Center: Search Bar (Desktop only) */}
        {!selectedBatch && (
          <div className="hidden md:flex flex-1 max-w-sm">
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

        {/* Right: Action Icons + Menu */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            title={isDark ? 'Light Mode' : 'Dark Mode'}
            className="p-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-[#5B21B6] transition-all hover:scale-110"
          >
            {isDark ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </button>

          {/* Bookmarks (Desktop only) */}
          <button
            onClick={() => setActiveView('bookmarks')}
            className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-[#06B6D4] text-xs font-medium transition-all relative"
          >
            <Bookmark className="w-4 h-4" />
            {bookmarksCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#06B6D4] text-[#0F172A] text-[9px] font-bold flex items-center justify-center">
                {bookmarksCount}
              </span>
            )}
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

          {/* Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)]"
          >
            {isMobileMenuOpen ? (
              <X className="w-4 h-4" />
            ) : (
              <Menu className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Search Bar */}
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

      {/* Mobile Menu Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 top-14 z-50 md:hidden bg-black/30 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}>
          <div
            className="w-full bg-[var(--color-surface)] border-b border-[var(--color-border)] shadow-lg p-4 space-y-3 max-h-[calc(100vh-3.5rem)] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Navigation Buttons */}
            <button
              onClick={() => {
                setActiveView('batches');
                if (selectedBatch) onBackToBatches();
                setIsMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-[#5B21B6] text-[#F8FAFC] font-medium text-sm transition-all"
            >
              <BookOpen className="w-4 h-4" />
              <span>All Batches</span>
            </button>

            <button
              onClick={() => {
                setActiveView('enrolled');
                if (selectedBatch) onBackToBatches();
                setIsMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] font-medium text-sm hover:bg-[var(--color-surface-card)] transition-all"
            >
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-4 h-4" />
                <span>My Batches</span>
              </div>
              {enrolledBatches.length > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#06B6D4] text-[#0F172A]">
                  {enrolledBatches.length}
                </span>
              )}
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
