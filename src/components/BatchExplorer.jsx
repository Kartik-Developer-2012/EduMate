import React, { useState, useMemo } from 'react';
import { 
  Loader2, 
  Layers, 
  BookOpen, 
  Sparkles, 
  LogIn, 
  ArrowRight, 
  ShieldCheck, 
  RefreshCw,
  Search,
  X 
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
  const { activeProvider, setActiveProvider, pwUser, masterActive } = useCourse();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [directBatchId, setDirectBatchId] = useState('');

  // Combined batches based on activeProvider
  const currentBatches = useMemo(() => {
    if (activeProvider === 'pw') return pwBatches;
    if (activeProvider === 'nt') return ntBatches;
    return [...pwBatches, ...ntBatches];
  }, [activeProvider, pwBatches, ntBatches]);

  const filteredBatches = useMemo(() => {
    const q = (searchQuery || '').toLowerCase().trim();
    const tokens = q ? q.split(/\s+/).filter(Boolean) : [];

    return currentBatches.filter((batch) => {
      const titleLower = (batch.title || batch.batchName || '').toLowerCase();
      const byNameLower = (batch.byName || '').toLowerCase();
      const idLower = String(batch.id || batch.batchId || '').toLowerCase();
      const descLower = (batch.description || '').toLowerCase();
      const langLower = (batch.language || '').toLowerCase();

      // Multi-word search matching across all batch attributes
      if (tokens.length > 0) {
        const fullSearchable = `${titleLower} ${byNameLower} ${idLower} ${descLower} ${langLower}`;
        const matchesAll = tokens.every((tok) => fullSearchable.includes(tok));
        if (!matchesAll) return false;
      }

      // Category filter matching (only applies when no global search is active)
      if (selectedCategory !== 'all' && !q) {
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
      }

      return true;
    });
  }, [currentBatches, selectedCategory, searchQuery]);

  const isLoading = (activeProvider === 'pw' && loadingPw) || (activeProvider === 'nt' && loadingNt) || (activeProvider === 'all' && loadingNt && loadingPw);

  const handleLookupSubmit = (e) => {
    e.preventDefault();
    const val = directBatchId.trim();
    if (!val) return;

    // Check if it's a numeric ID (Next Toppers) or 24-char hex ObjectId (PW)
    const isNumericId = /^\d+$/.test(val);
    const isMongoId = /^[0-9a-fA-F]{24}$/.test(val);

    if (isNumericId || isMongoId) {
      if (onDirectBatchLookup) {
        onDirectBatchLookup(val);
      }
    } else {
      // User typed a name/keyword (e.g. "Yakeen", "Arjuna", "NEET")
      setSearchQuery(val);
      setDirectBatchId('');
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      
      {/* Platform Provider Switcher Bar */}
      <div className="mb-6 p-4 sm:p-5 rounded-3xl card-surface flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        
        {/* Provider Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-[var(--color-bg)] rounded-2xl border border-[var(--color-border)] w-full md:w-auto overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveProvider('all')}
            className={`flex-1 md:flex-initial px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 sm:gap-2 shrink-0 whitespace-nowrap btn-press ${
              activeProvider === 'all'
                ? 'bg-[#1D3557] text-[#F1FAEE] shadow-sm'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All Platforms</span>
          </button>

          <button
            onClick={() => setActiveProvider('pw')}
            className={`flex-1 md:flex-initial px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 sm:gap-2 shrink-0 whitespace-nowrap btn-press ${
              activeProvider === 'pw'
                ? 'bg-[#457B9D] text-[#F1FAEE] shadow-sm'
                : 'text-[var(--color-text-secondary)] hover:text-[#A8DADC]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#A8DADC]" />
            <span>Physics Wallah</span>
          </button>

          <button
            onClick={() => setActiveProvider('nt')}
            className={`flex-1 md:flex-initial px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 sm:gap-2 shrink-0 whitespace-nowrap btn-press ${
              activeProvider === 'nt'
                ? 'bg-[#1D3557] text-[#F1FAEE] shadow-sm'
                : 'text-[var(--color-text-secondary)] hover:text-[#A8DADC]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Next Toppers</span>
          </button>
        </div>

        {/* Status / Counts */}
        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
          <div className="px-3 py-1.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-right">
            <span className="text-xs font-bold text-[#A8DADC] mr-1.5">{filteredBatches.length}</span>
            <span className="text-[10px] text-[var(--color-text-secondary)] font-medium">Batches Live</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1D3557] border border-[#457B9D]/40 text-[#A8DADC] text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-[#A8DADC]" />
            <span>100% Ad-Free</span>
          </div>
        </div>
      </div>

      {/* Physics Wallah Lifetime Active Indicator */}
      {activeProvider === 'pw' && (masterActive || pwUser) && (
        <div className="mb-6 p-4 rounded-2xl bg-[#112033] border border-[#223E5E] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#1D3557] border border-[#457B9D]/40 flex items-center justify-center shrink-0 text-[#A8DADC]">
              <Sparkles className="w-4 h-4 text-[#A8DADC]" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#F1FAEE] flex items-center gap-2">
                <span>Physics Wallah: Lifetime Access Active</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#457B9D]/20 text-[#A8DADC] border border-[#457B9D]/40 font-semibold">
                  No Login Required
                </span>
              </p>
              <p className="text-[11px] text-[var(--color-text-secondary)] mt-0.5">
                All batches, live lectures, notes & DPPs are unlocked for all users.
              </p>
            </div>
          </div>
          <button
            onClick={onOpenPwLogin}
            className="text-xs text-[#A8DADC] hover:underline font-semibold shrink-0 self-start sm:self-auto"
          >
            Re-link / Manage PW
          </button>
        </div>
      )}

      {/* Physics Wallah One-Time Setup Banner (Only if unauthorized and no master session) */}
      {activeProvider === 'pw' && pwUnauthorized && !pwUser && !masterActive && (
        <div className="mb-8 p-5 sm:p-6 rounded-3xl bg-[#112033] border border-[#223E5E] shadow-md relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#1D3557] border border-[#457B9D]/40 flex items-center justify-center shrink-0 text-[#A8DADC]">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#F1FAEE] flex items-center gap-2">
                  <span>One-Time Physics Wallah Activation</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#457B9D]/20 text-[#A8DADC] border border-[#457B9D]/40 font-semibold">
                    One-Time OTP
                  </span>
                </h3>
                <p className="text-xs text-[var(--color-text-secondary)] mt-1 max-w-xl leading-relaxed">
                  Enter your mobile number & OTP once. Our system securely activates all Physics Wallah batches for lifetime, allowing all students and users to watch lectures, download notes & DPPs with zero login required.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 w-full md:w-auto">
              <button
                onClick={onOpenPwLogin}
                className="w-full md:w-auto px-5 py-3 rounded-xl bg-[#457B9D] hover:bg-[#386684] text-[#F1FAEE] font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all btn-press"
              >
                <LogIn className="w-4 h-4" />
                <span>One-Time PW Setup</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Direct Batch ID Lookup Bar */}
      <div className="mb-6 p-4 rounded-2xl card-surface flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
          <Sparkles className="w-4 h-4 text-[#A8DADC] shrink-0" />
          <span>Have a specific PW or Next Toppers Batch ID? Access it directly:</span>
        </div>

        <form onSubmit={handleLookupSubmit} className="flex items-center gap-2 w-full sm:w-auto">
          <input
            type="text"
            value={directBatchId}
            onChange={(e) => setDirectBatchId(e.target.value)}
            placeholder="Enter Batch ID (e.g. 176 or PW ID)..."
            className="flex-1 sm:w-64 bg-[var(--color-bg)] border border-[var(--color-border)] text-xs rounded-xl px-3 py-2 text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] outline-none focus:border-[#457B9D] focus:ring-1 focus:ring-[#457B9D]"
          />
          <button
            type="submit"
            disabled={!directBatchId.trim()}
            className="px-4 py-2 rounded-xl bg-[#457B9D] hover:bg-[#386684] text-[#F1FAEE] text-xs font-bold transition-all disabled:opacity-50 shrink-0 btn-press"
          >
            Explore
          </button>
        </form>
      </div>

      {/* Active Search Results Indicator */}
      {searchQuery && (
        <div className="flex items-center justify-between gap-3 mb-5 p-3 sm:p-4 rounded-2xl bg-[var(--color-surface)] border border-[#457B9D]/40 shadow-sm animate-in fade-in duration-150">
          <div className="flex items-center gap-2 text-xs flex-wrap">
            <Search className="w-4 h-4 text-[#A8DADC]" />
            <span className="text-[var(--color-text-secondary)]">Showing live results for:</span>
            <span className="font-bold text-[#F1FAEE]">"{searchQuery}"</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1D3557] text-[#A8DADC] border border-[#457B9D]/40 font-semibold">
              {filteredBatches.length} {filteredBatches.length === 1 ? 'batch' : 'batches'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="text-xs text-[#A8DADC] hover:text-[#F1FAEE] font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--color-surface-hover)] border border-[var(--color-border)] hover:border-[#457B9D] transition-colors btn-press shrink-0"
          >
            <X className="w-3.5 h-3.5" />
            <span>Clear Search</span>
          </button>
        </div>
      )}

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 scrollbar-none">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all btn-press ${
              selectedCategory === cat.id
                ? 'bg-[#457B9D] text-[#F1FAEE] font-bold shadow-sm'
                : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border)]'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Batches Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-[var(--color-text-secondary)]">
          <Loader2 className="w-8 h-8 animate-spin mb-3 text-[#A8DADC]" />
          <p className="text-xs font-semibold">Fetching live batches from {activeProvider === 'pw' ? 'Physics Wallah' : 'catalog'}...</p>
        </div>
      ) : filteredBatches.length === 0 ? (
        <div className="text-center py-20 card-surface rounded-3xl p-8">
          <div className="w-14 h-14 rounded-2xl bg-[#1D3557] border border-[#457B9D]/40 flex items-center justify-center mx-auto mb-4">
            <Layers className="w-7 h-7 text-[#A8DADC]" />
          </div>
          <h3 className="text-sm font-bold text-[var(--color-text-primary)] mb-1">
            {searchQuery ? `No batches found for "${searchQuery}"` : 'No batches found'}
          </h3>
          <p className="text-xs text-[var(--color-text-secondary)] max-w-md mx-auto mb-5 leading-relaxed">
            {searchQuery 
              ? 'Try checking for typos, searching for another keyword (e.g. Yakeen, Arjuna, Lakshya), or clearing the search.'
              : (activeProvider === 'pw' && !pwUser && !masterActive
                ? 'Please login with your Physics Wallah registered phone number to view all your enrolled and available batches.'
                : 'Try selecting a different category or entering a specific batch ID above.')}
          </p>

          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="px-5 py-2.5 rounded-xl bg-[#457B9D] hover:bg-[#386684] text-[#F1FAEE] font-bold text-xs inline-flex items-center gap-2 transition-all shadow-sm btn-press"
            >
              <X className="w-4 h-4" />
              <span>Clear Search</span>
            </button>
          ) : activeProvider === 'pw' && !pwUser && !masterActive ? (
            <button
              onClick={onOpenPwLogin}
              className="px-5 py-2.5 rounded-xl bg-[#457B9D] hover:bg-[#386684] text-[#F1FAEE] font-bold text-xs inline-flex items-center gap-2 transition-all shadow-sm btn-press"
            >
              <LogIn className="w-4 h-4" />
              <span>Login with Phone Number</span>
            </button>
          ) : null}
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
                className="px-6 py-2.5 rounded-xl bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border)] text-xs font-bold text-[var(--color-text-primary)] flex items-center gap-2 transition-all disabled:opacity-50 btn-press"
              >
                {loadingPw ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#A8DADC]" />
                    <span>Loading Batches...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 text-[#A8DADC]" />
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
