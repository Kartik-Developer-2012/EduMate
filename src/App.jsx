import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import BatchExplorer from './components/BatchExplorer';
import FolderBrowser from './components/FolderBrowser';
import PwBatchBrowser from './components/PwBatchBrowser';
import EnrolledBatchesView from './components/EnrolledBatchesView';
import VideoPlayerModal from './components/VideoPlayerModal';
import PdfViewerModal from './components/PdfViewerModal';
import TestModal from './components/TestModal';
import PwAuthModal from './components/PwAuthModal';
import { fetchBatches } from './services/api';
import { fetchPwBatches, fetchPwBatchDetails } from './services/pwApi';
import { CourseProvider, useCourse } from './context/CourseContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthGate from './components/AuthGate';
import { ShieldCheck, Sparkles } from 'lucide-react';

function AppContent() {
  const { activeProvider, pwUser } = useCourse();

  // Next Toppers dynamic batches
  const [ntBatches, setNtBatches] = useState([]);
  const [loadingNt, setLoadingNt] = useState(true);

  // Physics Wallah dynamic batches
  const [pwBatches, setPwBatches] = useState([]);
  const [loadingPw, setLoadingPw] = useState(false);
  const [pwUnauthorized, setPwUnauthorized] = useState(false);
  const [pwPage, setPwPage] = useState(1);
  const [hasMorePw, setHasMorePw] = useState(false);

  // General App State
  const [activeView, setActiveView] = useState('batches'); // 'batches' | 'enrolled'
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPwAuthModal, setShowPwAuthModal] = useState(false);

  // Media & Test Modals
  const [playingVideoItem, setPlayingVideoItem] = useState(null);
  const [viewingPdfItem, setViewingPdfItem] = useState(null);
  const [activeTestItem, setActiveTestItem] = useState(null);

  // 1. Dynamically load Next Toppers batches on mount
  useEffect(() => {
    let isCancelled = false;
    async function loadNt() {
      setLoadingNt(true);
      try {
        const data = await fetchBatches();
        if (!isCancelled) {
          const formatted = (data || []).map((b) => ({
            ...b,
            provider: 'nt'
          }));
          setNtBatches(formatted);
        }
      } catch (err) {
        console.error('Failed to load Next Toppers batches dynamically:', err);
      } finally {
        if (!isCancelled) setLoadingNt(false);
      }
    }
    loadNt();
    return () => { isCancelled = true; };
  }, []);

  // 2. Dynamically load Physics Wallah batches from live API
  const loadPwBatches = useCallback(async (page = 1, query = '', append = false) => {
    setLoadingPw(true);
    try {
      const res = await fetchPwBatches(page, query);
      if (res.unauthorized) {
        setPwUnauthorized(true);
        if (!append) setPwBatches([]);
        setHasMorePw(false);
      } else if (res.success) {
        setPwUnauthorized(false);
        setPwBatches((prev) => append ? [...prev, ...res.batches] : res.batches);
        setPwPage(res.currentPage || page);
        setHasMorePw((res.currentPage || page) < (res.totalPages || 1));
      } else {
        if (!append) setPwBatches([]);
      }
    } catch (err) {
      console.warn('Live PW batches fetch error:', err.message);
    } finally {
      setLoadingPw(false);
    }
  }, []);

  // Fetch PW batches whenever activeProvider changes to 'pw' or on initial load / auth state change
  useEffect(() => {
    loadPwBatches(1, searchQuery, false);
  }, [loadPwBatches, pwUser]);

  // Handle Load More PW batches
  const handleLoadMorePw = () => {
    if (!loadingPw && hasMorePw) {
      loadPwBatches(pwPage + 1, searchQuery, true);
    }
  };

  // Direct Batch ID Lookup (Works dynamically for both PW string IDs & NT numeric IDs)
  const handleDirectBatchLookup = async (batchId) => {
    if (!batchId) return;
    const trimmed = String(batchId).trim();

    // 1. Check existing in-memory batches
    const foundNt = ntBatches.find((b) => String(b.id) === trimmed);
    if (foundNt) {
      setSelectedBatch(foundNt);
      return;
    }

    const foundPw = pwBatches.find((b) => String(b.id || b.batchId) === trimmed);
    if (foundPw) {
      setSelectedBatch(foundPw);
      return;
    }

    // 2. Query Physics Wallah API dynamically for this specific batch
    try {
      const details = await fetchPwBatchDetails(trimmed);
      if (details) {
        setSelectedBatch(details);
        return;
      }
    } catch (e) {
      console.warn('Direct PW batch fetch returned:', e.message);
    }

    // 3. If purely numeric, create dynamic Next Toppers batch container
    if (/^\d+$/.test(trimmed)) {
      setSelectedBatch({
        id: parseInt(trimmed, 10),
        title: `Next Toppers Batch #${trimmed}`,
        provider: 'nt'
      });
    } else {
      // Direct PW batch candidate
      setSelectedBatch({
        id: trimmed,
        batchId: trimmed,
        title: `Physics Wallah Batch (${trimmed})`,
        provider: 'pw',
        isLivePw: true
      });
    }
  };

  const handleSelectBatch = (batch) => {
    setSelectedBatch(batch);
  };

  const handleBackToBatches = () => {
    setSelectedBatch(null);
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-neutral-100 flex flex-col font-sans selection:bg-purple-500 selection:text-white">
      {/* Navigation Header */}
      <Navbar
        activeView={activeView}
        setActiveView={(view) => {
          setActiveView(view);
          setSelectedBatch(null);
        }}
        selectedBatch={selectedBatch}
        onBackToBatches={handleBackToBatches}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onOpenPwLogin={() => setShowPwAuthModal(true)}
      />

      {/* Main View Area */}
      <main className="flex-1">
        {selectedBatch ? (
          selectedBatch.provider === 'pw' || Boolean(selectedBatch.batchId) || selectedBatch.isLivePw ? (
            <PwBatchBrowser
              batch={selectedBatch}
              onBack={handleBackToBatches}
              onPlayVideo={(item) => setPlayingVideoItem(item)}
              onViewPdf={(item) => setViewingPdfItem(item)}
            />
          ) : (
            <FolderBrowser
              batch={selectedBatch}
              onBack={handleBackToBatches}
              onPlayVideo={(item) => setPlayingVideoItem(item)}
              onViewPdf={(item) => setViewingPdfItem(item)}
              onStartTest={(item) => setActiveTestItem(item)}
            />
          )
        ) : activeView === 'enrolled' ? (
          <EnrolledBatchesView
            batches={[...pwBatches, ...ntBatches]}
            onSelectBatch={handleSelectBatch}
            onBrowseBatches={() => setActiveView('batches')}
          />
        ) : (
          <BatchExplorer
            ntBatches={ntBatches}
            pwBatches={pwBatches}
            loadingNt={loadingNt}
            loadingPw={loadingPw}
            pwUnauthorized={pwUnauthorized}
            onOpenPwLogin={() => setShowPwAuthModal(true)}
            onSelectBatch={handleSelectBatch}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onLoadMorePw={handleLoadMorePw}
            hasMorePw={hasMorePw}
            onDirectBatchLookup={handleDirectBatchLookup}
          />
        )}
      </main>

      {/* Active Modals */}
      {playingVideoItem && (
        <VideoPlayerModal
          item={playingVideoItem}
          courseId={selectedBatch?.id}
          onClose={() => setPlayingVideoItem(null)}
        />
      )}

      {viewingPdfItem && (
        <PdfViewerModal
          item={viewingPdfItem}
          courseId={selectedBatch?.id}
          onClose={() => setViewingPdfItem(null)}
        />
      )}

      {activeTestItem && (
        <TestModal
          item={activeTestItem}
          onClose={() => setActiveTestItem(null)}
        />
      )}

      {/* Physics Wallah Mobile OTP Login Modal */}
      <PwAuthModal
        isOpen={showPwAuthModal}
        onClose={() => setShowPwAuthModal(false)}
        onSuccess={(user) => {
          setShowPwAuthModal(false);
          loadPwBatches(1, '', false);
        }}
      />

      {/* Footer */}
      <footer className="w-full py-8 border-t border-white/5 bg-[#0b0b0e] text-center text-xs text-neutral-500 mt-12">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-heading font-extrabold text-white tracking-wider">
              EDU<span className="text-amber-400">MATE</span>
            </span>
            <span className="text-[10px] text-neutral-600">•</span>
            <span>Physics Wallah & Next Toppers Unified Platform</span>
          </div>

          <div className="flex items-center gap-4 text-neutral-400 text-[11px]">
            <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>100% Free & Ad-Free</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5 text-purple-400 font-medium">
              <Sparkles className="w-3.5 h-3.5" />
              <span>100% Dynamic API Fetched</span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function MainApp() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <AuthGate />;
  }

  return (
    <CourseProvider>
      <AppContent />
    </CourseProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
