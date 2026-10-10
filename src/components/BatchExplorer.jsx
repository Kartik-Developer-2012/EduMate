import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Loader2, 
  Layers, 
  BookOpen, 
  Sparkles, 
  Lock, 
  LogIn, 
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import BatchCard from './BatchCard';
import { useCourse } from '../context/CourseContext';

const CATEGORIES = [
  { id: 'all', label: 'All Batches' },
  { id: 'neet', label: 'NEET & Medical' },
  { id: 'jee', label: 'JEE & Engineering' },
  { id: '10th', label: 'Class 10th' },
  { id: '9th', label: 'Class 9th' },
  { id: '11th', label: 'Class 11th' },
  { id: '12th', label: 'Class 12th' },
  { id: 'foundation', label: 'Foundation 7th & 8th' },
  { id: 'entrance', label: 'CUET & Olympiads' },
];

export default function BatchExplorer({ 
  ntBatches = [], 
  pwBatches = [],
  loadingNt = false,
  loadingPw = false,
  pwUnauthorized = false,
  onOpenPwLogin,
  onSelectBatch,
  searchQuery, 
  setSearchQuery,
  onLoadMorePw,
  hasMorePw = false,
  onDirectBatchLookup
}) {
  const { activeProvider, setActiveProvider, pwUser } = useCourse();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [directBatchId, setDirectBatchId] = useState('');

  // Combined batches based on activeProvider
  const currentBatches = useMemo(() => {
    if (activeProvider === 'pw') return pwBatches;
    if (activeProvider === 'nt') return ntBatches;
    return [...pwBatches, ...ntBatches];
  }, [activeProvider, pwBatches, ntBatches]);

  const filteredBatches = useMemo(() => {
    return currentBatches.filter((batch) => {
      const titleLower = (batch.title || batch.batchName || '').toLowerCase();
      const queryLower = searchQuery.toLowerCase().trim();

      // Category filter matching
      if (selectedCategory === 'neet' && !titleLower.includes('neet') && !titleLower.includes('yakeen')) {
        return false;
      }
      if (selectedCategory === 'jee' && !titleLower.includes('jee') && !titleLower.includes('prayas')) {
        return false;
      }
      if (selectedCategory === '10th' && !titleLower.includes('10th') && !titleLower.includes('class 10') && !titleLower.includes('udaan')) {
        return false;
      }
      if (selectedCategory === '9th' && !titleLower.includes('9th') && !titleLower.includes('class 9') && !titleLower.includes('neev')) {
        return false;
      }
      if (selectedCategory === '11th' && !titleLower.includes('11th') && !titleLower.includes('class 11') && !titleLower.includes('arjuna')) {
        return false;
      }
      if (selectedCategory === '12th' && !titleLower.includes('12th') && !titleLower.includes('class 12') && !titleLower.includes('lakshya')) {
        return false;
      }
      if (selectedCategory === 'foundation' && !titleLower.includes('7') && !titleLower.includes('8') && !titleLower.includes('nirmaan') && !titleLower.includes('umang')) {
        return false;
      }
      if (selectedCategory === 'entrance' && !titleLower.includes('cuet') && !titleLower.includes('ioqm') && !titleLower.includes('nsejs')) {
        return false;
      }

      // Search matching
      if (queryLower) {
        const matchesTitle = titleLower.includes(queryLower);
        const matchesId = String(batch.id).toLowerCase().includes(queryLower);
        const matchesTeacher = batch.byName && batch.byName.toLowerCase().includes(queryLower);
        return matchesTitle || matchesId || matchesTeacher;
      }

      return true;
    });
  }, [currentBatches, selectedCategory, searchQuery]);

  const isLoading = (activeProvider === 'pw' && loadingPw) || (activeProvider === 'nt' && loadingNt) || (activeProvider === 'all' && loadingNt && loadingPw);

  const handleLookupSubmit = (e) => {
    e.preventDefault();
    if (!directBatchId.trim()) return;
    if (onDirectBatchLookup) {
      onDirectBatchLookup(directBatchId.trim());
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      
      {/* Platform Provider Switcher Bar */}
      <div className="mb-6 p-4 sm:p-5 rounded-3xl bg-[#12121a] border border-white/[0.08] flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Provider Tabs */}
        <div className="flex items-center gap-2 p-1.5 bg-[#09090f] rounded-2xl border border-white/5 w-full md:w-auto">
          <button
            onClick={() => setActiveProvider('all')}
            className={`flex-1 md:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeProvider === 'all'
                ? 'bg-neutral-800 text-white shadow'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All Platforms</span>
          </button>

          <button
            onClick={() => setActiveProvider('pw')}
            className={`flex-1 md:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeProvider === 'pw'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.3)]'
                : 'text-purple-300 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Physics Wallah</span>
          </button>

          <button
            onClick={() => setActiveProvider('nt')}
            className={`flex-1 md:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeProvider === 'nt'
                ? 'bg-amber-400 text-black shadow-[0_0_15px_rgba(251,191,36,0.2)]'
                : 'text-amber-300 hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Next Toppers</span>
          </button>
        </div>

        {/* Status / Counts */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="px-3.5 py-1.5 rounded-xl bg-neutral-900 border border-white/5 text-right">
            <span className="text-xs font-bold text-white mr-1.5">{filteredBatches.length}</span>
            <span className="text-[10px] text-neutral-400 font-medium">Batches Live</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>100% Ad-Free</span>
          </div>
        </div>
      </div>

      {/* Physics Wallah Auth Required Banner (If PW tab and unauthorized) */}
      {activeProvider === 'pw' && pwUnauthorized && !pwUser && (
        <div className="mb-8 p-6 rounded-3xl bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-[#0d0d16] border border-purple-500/30 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center shrink-0 text-purple-300">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Physics Wallah Student Login</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold">
                    Free Access
                  </span>
                </h3>
                <p className="text-xs text-neutral-400 mt-1 max-w-xl leading-relaxed">
                  Connect your PW account with instant WhatsApp or SMS OTP to dynamically fetch all your enrolled batches, live lectures, notes, DPPs, and schedules with zero ads.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 w-full md:w-auto">
              <button
                onClick={onOpenPwLogin}
                className="w-full md:w-auto px-5 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(147,51,234,0.4)] transition-all"
              >
                <LogIn className="w-4 h-4" />
                <span>Login with Mobile OTP</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Direct Batch ID Lookup Bar */}
      <div className="mb-6 p-4 rounded-2xl bg-[#101017] border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-neutral-400">
          <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
          <span>Have a specific PW or Next Toppers Batch ID? Access it directly:</span>
        </div>

        <form onSubmit={handleLookupSubmit} className="flex items-center gap-2 w-full sm:w-auto">
          <input
            type="text"
            value={directBatchId}
            onChange={(e) => setDirectBatchId(e.target.value)}
            placeholder="Enter Batch ID (e.g. 176 or PW ID)..."
            className="w-full sm:w-64 bg-black/40 border border-white/10 text-xs rounded-xl px-3 py-2 text-white placeholder-neutral-500 outline-none focus:border-purple-400"
          />
          <button
            type="submit"
            disabled={!directBatchId.trim()}
            className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold transition-colors disabled:opacity-50 shrink-0"
          >
            Explore
          </button>
        </form>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 scrollbar-none">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedCategory === cat.id
                ? activeProvider === 'pw'
                  ? 'bg-purple-600 text-white font-bold shadow-md'
                  : 'bg-amber-400 text-black font-bold'
                : 'bg-[#15151c] text-neutral-300 hover:text-white hover:bg-neutral-800 border border-white/5'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Batches Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
          <Loader2 className={`w-8 h-8 animate-spin mb-3 ${
            activeProvider === 'pw' ? 'text-purple-400' : 'text-amber-400'
          }`} />
          <p className="text-xs font-semibold">Fetching live batches from {activeProvider === 'pw' ? 'Physics Wallah' : 'catalog'}...</p>
        </div>
      ) : filteredBatches.length === 0 ? (
        <div className="text-center py-20 bg-[#121218] rounded-3xl border border-white/[0.08] p-8">
          <Layers className="w-10 h-10 text-neutral-500 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-white mb-1">
            {searchQuery ? 'No batches matched your search' : 'No batches found'}
          </h3>
          <p className="text-xs text-neutral-400 max-w-md mx-auto mb-5 leading-relaxed">
            {activeProvider === 'pw' && !pwUser
              ? 'Please login with your Physics Wallah registered phone number to view all your enrolled and available batches.'
              : 'Try selecting a different category or entering a specific batch ID above.'}
          </p>

          {activeProvider === 'pw' && !pwUser && (
            <button
              onClick={onOpenPwLogin}
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs inline-flex items-center gap-2 transition-all shadow-md"
            >
              <LogIn className="w-4 h-4" />
              <span>Login with Phone Number</span>
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredBatches.map((batch) => (
              <BatchCard key={batch.id} batch={batch} onSelect={onSelectBatch} />
            ))}
          </div>

          {/* Load More Button for PW Live Batches */}
          {activeProvider === 'pw' && hasMorePw && (
            <div className="flex justify-center mt-8">
              <button
                onClick={onLoadMorePw}
                disabled={loadingPw}
                className="px-6 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-white/10 text-xs font-bold text-white flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                {loadingPw ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
                    <span>Loading Batches...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 text-purple-400" />
                    <span>Load More Batches</span>
                  </>
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
