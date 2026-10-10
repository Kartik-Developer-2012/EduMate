import React from 'react';
import { 
  BookOpen, 
  Layers, 
  Search, 
  X, 
  ArrowLeft, 
  ShieldCheck,
  Sparkles,
  LogIn,
  LogOut,
  User,
  Smartphone,
  Lock
} from 'lucide-react';
import { useCourse } from '../context/CourseContext';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ 
  activeView, 
  setActiveView, 
  selectedBatch, 
  onBackToBatches,
  searchQuery,
  setSearchQuery,
  onOpenPwLogin
}) {
  const { enrolledBatches, activeProvider, setActiveProvider, pwUser, logoutPwUser } = useCourse();
  const { logout, authEmail } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full bg-[#0d0d13]/95 backdrop-blur-md border-b border-white/[0.08]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        
        {/* Left: Brand Identity or Back Button */}
        <div className="flex items-center gap-3 shrink-0">
          {selectedBatch ? (
            <button
              onClick={onBackToBatches}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-700/60 text-neutral-200 hover:text-white hover:border-purple-400 text-xs font-semibold transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>All Batches</span>
            </button>
          ) : (
            <div 
              onClick={() => setActiveView('batches')}
              className="flex items-center gap-2.5 cursor-pointer group"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-amber-400 p-0.5 shadow-md group-hover:scale-105 transition-transform">
                <div className="w-full h-full bg-black rounded-[10px] overflow-hidden flex items-center justify-center">
                  <img 
                    src="https://i.ibb.co/yF4mhNPB/f493d534-fbf8-4b31-b741-83b343f8a9e1.jpg" 
                    alt="EduMate Logo" 
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-heading font-extrabold text-base tracking-wide text-white leading-tight">
                    EDU<span className="text-amber-400">MATE</span>
                  </span>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    PW + NT
                  </span>
                </div>
                <span className="text-[10px] font-medium text-neutral-400 tracking-wider">
                  100% Free & Ad-Free
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Center: Search Bar */}
        {!selectedBatch && (
          <div className="flex-1 max-w-md mx-2 sm:mx-6">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Physics Wallah & Next Toppers batches..."
                className="w-full bg-[#15151f] border border-white/10 text-neutral-100 placeholder-neutral-500 text-xs rounded-xl pl-9 pr-8 py-2 focus:outline-none focus:border-purple-400 focus:bg-[#1a1a28] transition-colors"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white p-0.5 rounded-full"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Right: Navigation & Auth Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              setActiveView('batches');
              if (selectedBatch) onBackToBatches();
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              activeView === 'batches' && !selectedBatch
                ? 'bg-neutral-800 text-white font-bold border border-white/10'
                : 'text-neutral-300 hover:text-white hover:bg-neutral-800/60'
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
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              activeView === 'enrolled'
                ? 'bg-neutral-800 text-white font-bold border border-white/10'
                : 'text-neutral-300 hover:text-white hover:bg-neutral-800/60'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">My Batches</span>
            {enrolledBatches.length > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-purple-600 text-white">
                {enrolledBatches.length}
              </span>
            )}
          </button>

          {/* Physics Wallah Student Auth Button */}
          {pwUser ? (
            <div className="flex items-center gap-2 pl-2 border-l border-white/10">
              <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-purple-950/50 border border-purple-500/30 text-purple-200 text-xs font-medium">
                <User className="w-3.5 h-3.5 text-purple-400" />
                <span className="truncate max-w-[100px]">{pwUser.name || pwUser.phoneNumber || 'PW Student'}</span>
              </div>
              <button
                onClick={logoutPwUser}
                className="p-1.5 text-neutral-400 hover:text-red-400 hover:bg-white/5 rounded-lg transition-colors"
                title="Log Out of PW"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenPwLogin}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-[0_0_12px_rgba(147,51,234,0.3)] transition-all"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>PW Login</span>
            </button>
          )}

          {/* Ad-Free Status Badge */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Ad-Free</span>
          </div>

          {/* Master Lock Screen Button */}
          <button
            onClick={logout}
            title={`Authenticated as ${authEmail} • Click to Lock App`}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-neutral-900/90 border border-neutral-700/60 hover:border-amber-400/50 text-neutral-300 hover:text-amber-400 text-xs font-semibold transition-all active:scale-95"
          >
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline text-[11px]">Lock App</span>
          </button>
        </div>

      </div>
    </header>
  );
}
