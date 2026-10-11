import React, { useState } from 'react';
import { 
  BookOpen, 
  Layers, 
  Search, 
  X, 
  ArrowLeft, 
  ShieldCheck,
  LogOut,
  User,
  Smartphone,
  Lock,
  Sun,
  Moon,
  Menu
} from 'lucide-react';
import { useCourse } from '../context/CourseContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import appLogo from '../assets/app-logo.png';

export default function Navbar({ 
  activeView, 
  setActiveView, 
  selectedBatch, 
  onBackToBatches,
  searchQuery, 
  setSearchQuery,
  onOpenPwLogin 
}) {
  const { enrolledBatches, pwUser, logoutPwUser } = useCourse();
  const { logout, authEmail } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(Boolean(searchQuery));

  return (
    <header className="sticky top-0 z-40 w-full bg-[var(--color-surface)]/95 backdrop-blur-md border-b border-[var(--color-border)] shadow-sm transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        
        {/* Left: Brand Identity or Back Button */}
        <div className="flex items-center gap-3 shrink-0">
          {selectedBatch ? (
            <button
              onClick={onBackToBatches}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--color-surface-hover)] border border-[var(--color-border)] text-[var(--color-text-primary)] hover:border-[#457B9D] text-xs font-semibold transition-colors btn-press"
            >
              <ArrowLeft className="w-4 h-4 text-[#A8DADC]" />
              <span>All Batches</span>
            </button>
          ) : (
            <div 
              onClick={() => setActiveView('batches')}
              className="flex items-center gap-2.5 cursor-pointer group"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#1D3557] to-[#457B9D] p-0.5 shadow-sm group-hover:scale-105 transition-transform">
                <div className="w-full h-full bg-[#112033] rounded-[10px] overflow-hidden flex items-center justify-center">
                  <img 
                    src={appLogo} 
                    alt="EduMate Logo" 
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-heading font-extrabold text-base tracking-wide text-[#F1FAEE] leading-tight">
                    EDU<span className="text-[#A8DADC]">MATE</span>
                  </span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#1D3557] text-[#A8DADC] border border-[#457B9D]/50">
                    PW + NT
                  </span>
                </div>
                <span className="text-[10px] font-medium text-[#A8DADC]/80 tracking-wider">
                  100% Free & Ad-Free
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Center: Search Bar (Desktop) */}
        {!selectedBatch && (
          <div className="hidden md:flex flex-1 max-w-md mx-4 lg:mx-6">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-[var(--color-text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Physics Wallah & Next Toppers batches..."
                className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] text-xs rounded-xl pl-9 pr-8 py-2 focus:outline-none focus:border-[#457B9D] focus:ring-2 focus:ring-[#457B9D]/20 transition-all"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] p-0.5 rounded-full"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Right: Desktop Navigation, Theme Toggle & Auth Buttons */}
        <div className="hidden md:flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              setActiveView('batches');
              if (selectedBatch) onBackToBatches();
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all btn-press ${
              activeView === 'batches' && !selectedBatch
                ? 'bg-[#457B9D] text-[#F1FAEE] font-bold shadow-sm'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Batches</span>
          </button>

          <button
            onClick={() => {
              setActiveView('enrolled');
              if (selectedBatch) onBackToBatches();
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all btn-press ${
              activeView === 'enrolled'
                ? 'bg-[#457B9D] text-[#F1FAEE] font-bold shadow-sm'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">My Batches</span>
            {enrolledBatches.length > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-[#A8DADC] text-[#1D3557]">
                {enrolledBatches.length}
              </span>
            )}
          </button>

          {/* Physics Wallah Student Auth Button */}
          {pwUser ? (
            <div className="flex items-center gap-2 pl-2 border-l border-[var(--color-border)]">
              <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#1D3557] border border-[#457B9D]/40 text-[#A8DADC] text-xs font-medium">
                <User className="w-3.5 h-3.5 text-[#A8DADC]" />
                <span className="truncate max-w-[100px]">{pwUser.name || pwUser.phoneNumber || 'PW Student'}</span>
              </div>
              <button
                onClick={logoutPwUser}
                className="p-1.5 text-[var(--color-text-secondary)] hover:text-red-400 hover:bg-[var(--color-surface-hover)] rounded-lg transition-colors"
                title="Log Out of PW"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenPwLogin}
              className="px-3 py-1.5 rounded-xl bg-[#457B9D] hover:bg-[#386684] text-[#F1FAEE] text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all btn-press"
            >
              <Smartphone className="w-3.5 h-3.5 text-[#F1FAEE]" />
              <span>PW Login</span>
            </button>
          )}

          {/* Ad-Free Status Badge */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#1D3557] border border-[#457B9D]/40 text-[#A8DADC] text-[11px] font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-[#A8DADC]" />
            <span>Ad-Free</span>
          </div>

          {/* Light / Dark Theme Mode Toggle */}
          <button
            onClick={toggleTheme}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="p-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-[#F1FAEE] transition-all btn-press"
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-[#F1FAEE]" />
            ) : (
              <Moon className="w-4 h-4 text-[#1D3557]" />
            )}
          </button>

          {/* Master Lock Screen Button */}
          <button
            onClick={logout}
            title={`Authenticated as ${authEmail} • Click to Lock App`}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[#457B9D] text-[var(--color-text-secondary)] hover:text-[#F1FAEE] text-xs font-semibold transition-all btn-press"
          >
            <Lock className="w-3.5 h-3.5 text-[#A8DADC]" />
            <span className="hidden sm:inline text-[11px]">Lock App</span>
          </button>
        </div>

        {/* Right: Mobile Quick Actions (Mobile Only) */}
        <div className="flex md:hidden items-center gap-1.5 shrink-0">
          {!selectedBatch && (
            <button
              onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
              className={`p-2 rounded-xl border text-xs font-semibold transition-all btn-press ${
                isMobileSearchOpen || searchQuery
                  ? 'bg-[#457B9D] text-[#F1FAEE] border-[#457B9D]'
                  : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:text-[#F1FAEE]'
              }`}
              title="Search Batches"
              aria-label="Toggle Search"
            >
              <Search className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={toggleTheme}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="p-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-[#F1FAEE] transition-all btn-press"
            aria-label="Toggle Theme"
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-[#F1FAEE]" />
            ) : (
              <Moon className="w-4 h-4 text-[#1D3557]" />
            )}
          </button>

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-[#F1FAEE] transition-all btn-press relative"
            title="Navigation Menu"
            aria-label="Navigation Menu"
          >
            {isMobileMenuOpen ? (
              <X className="w-4 h-4 text-[#A8DADC]" />
            ) : (
              <Menu className="w-4 h-4 text-[#A8DADC]" />
            )}
            {enrolledBatches.length > 0 && !isMobileMenuOpen && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#A8DADC]" />
            )}
          </button>
        </div>

      </div>

      {/* Mobile Search Row (Dropdown when active) */}
      {!selectedBatch && isMobileSearchOpen && (
        <div className="md:hidden px-4 py-2.5 bg-[var(--color-surface)] border-t border-[var(--color-border)] animate-in fade-in duration-150">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-[var(--color-text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search PW & Next Toppers batches..."
              autoFocus
              className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] text-xs rounded-xl pl-9 pr-8 py-2 focus:outline-none focus:border-[#457B9D] transition-all"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] p-0.5 rounded-full"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Mobile Navigation Drawer Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 top-16 z-50 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <div 
            className="w-full bg-[var(--color-surface)] border-b border-[var(--color-border)] shadow-2xl p-4 sm:p-5 flex flex-col gap-3.5 animate-in slide-in-from-top-2 duration-150 max-h-[calc(100vh-4rem)] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Navigation Buttons */}
            <div className="space-y-2">
              <button
                onClick={() => {
                  setActiveView('batches');
                  if (selectedBatch) onBackToBatches();
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full p-3 rounded-xl text-xs font-semibold flex items-center justify-between transition-all btn-press ${
                  activeView === 'batches' && !selectedBatch
                    ? 'bg-[#457B9D] text-[#F1FAEE] shadow-sm font-bold'
                    : 'bg-[var(--color-bg)] text-[var(--color-text-primary)] border border-[var(--color-border)]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Layers className="w-4 h-4 text-[#A8DADC]" />
                  <span>All Batches</span>
                </div>
                <span className="text-[10px] text-[#A8DADC] uppercase font-bold">Catalog</span>
              </button>

              <button
                onClick={() => {
                  setActiveView('enrolled');
                  if (selectedBatch) onBackToBatches();
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full p-3 rounded-xl text-xs font-semibold flex items-center justify-between transition-all btn-press ${
                  activeView === 'enrolled'
                    ? 'bg-[#457B9D] text-[#F1FAEE] shadow-sm font-bold'
                    : 'bg-[var(--color-bg)] text-[var(--color-text-primary)] border border-[var(--color-border)]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <BookOpen className="w-4 h-4 text-[#A8DADC]" />
                  <span>My Enrolled Batches</span>
                </div>
                {enrolledBatches.length > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#A8DADC] text-[#1D3557]">
                    {enrolledBatches.length} Saved
                  </span>
                )}
              </button>
            </div>

            {/* Physics Wallah Student Auth Card */}
            <div className="p-3.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-[#A8DADC]" />
                  <span className="text-xs font-bold text-[#F1FAEE]">Physics Wallah Account</span>
                </div>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#1D3557] text-[#A8DADC] border border-[#457B9D]/40">
                  {pwUser ? 'Connected' : 'Free Sync'}
                </span>
              </div>

              {pwUser ? (
                <div className="flex items-center justify-between pt-1">
                  <div className="text-xs text-[var(--color-text-secondary)] truncate mr-2">
                    {pwUser.name || pwUser.phoneNumber || 'PW Student'}
                  </div>
                  <button
                    onClick={() => {
                      logoutPwUser();
                      setIsMobileMenuOpen(false);
                    }}
                    className="px-2.5 py-1 text-[11px] font-semibold text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg flex items-center gap-1 transition-colors"
                  >
                    <LogOut className="w-3 h-3" />
                    <span>Log Out</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    onOpenPwLogin();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full mt-1.5 py-2 px-3 rounded-lg bg-[#457B9D] hover:bg-[#386684] text-[#F1FAEE] text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Connect Mobile OTP (Free)</span>
                </button>
              )}
            </div>

            {/* Security and Badges Row */}
            <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border)]">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#A8DADC]">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>100% Free & Ad-Free</span>
              </div>

              <button
                onClick={() => {
                  logout();
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-surface-hover)] border border-[var(--color-border)] text-xs font-semibold text-[var(--color-text-secondary)] hover:text-[#F1FAEE]"
              >
                <Lock className="w-3.5 h-3.5 text-[#A8DADC]" />
                <span>Lock App</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
