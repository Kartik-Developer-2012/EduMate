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
import { ThemeProvider } from './context/ThemeContext';
import { RouterProvider, useRouter } from './context/RouterContext';
import { GoogleTasksProvider } from './context/GoogleTasksContext';
import { ProductivityHub, FloatingStudyAssistant } from './components/Productivity';
import AuthGate from './components/AuthGate';
import { ShieldCheck, Sparkles } from 'lucide-react';

function AppContent() {
  const { pwUser, masterActive } = useCourse();
  const { route, navigate, openModal, closeModal, getCachedMediaItem } = useRouter();

  // Next Toppers dynamic batches
  const [ntBatches, setNtBatches] = useState([]);
  const [loadingNt, setLoadingNt] = useState(true);

  // Physics Wallah dynamic batches
  const [pwBatches, setPwBatches] = useState([]);
  const [loadingPw, setLoadingPw] = useState(false);
  const [pwUnauthorized, setPwUnauthorized] = useState(false);
  const [pwPage, setPwPage] = useState(1);
  const [hasMorePw, setHasMorePw] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');

  // General App State
  const [activeView, setActiveView] = useState(route.view || 'batches'); // 'batches' | 'enrolled'
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [searchQuery, setSearchQuery] = useState(route.searchQuery || '');
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

  // 2. Dynamically load Physics Wallah batches from live API / catalogue
  const loadPwBatches = useCallback(async (page = 1, query = '', append = false, category = selectedCategory) => {
    setLoadingPw(true);
    try {
      const res = await fetchPwBatches(page, query, { category });
      if (res.unauthorized) {
        if (!masterActive) {
          setPwUnauthorized(true);
        }
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
  }, [masterActive, selectedCategory]);

  // Live PW batches loading and debounced live search
  useEffect(() => {
    // Avoid spamming live search if unauthorized and no master session
    if (pwUnauthorized && !masterActive && !pwUser) return;

    const timer = setTimeout(() => {
      loadPwBatches(1, searchQuery, false, selectedCategory);
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedCategory, loadPwBatches, pwUser, masterActive, pwUnauthorized]);

  // Handle immediate search (e.g. Enter pressed in search bar)
  const handleImmediateSearch = useCallback((query) => {
    loadPwBatches(1, query, false, selectedCategory);
  }, [loadPwBatches, selectedCategory]);

  // Handle Load More PW batches
  const handleLoadMorePw = () => {
    if (!loadingPw && hasMorePw) {
      loadPwBatches(pwPage + 1, searchQuery, true, selectedCategory);
    }
  };

  // Direct Batch ID Lookup (Works dynamically for both PW string IDs & NT numeric IDs)
  const handleDirectBatchLookup = useCallback(async (batchId) => {
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

    // 2. Purely numeric ID or explicit NT provider is ALWAYS Next Toppers
    const isNumeric = /^\d+$/.test(trimmed);
    const isNtProvider = route.provider === 'nt';

    if (isNumeric || isNtProvider) {
      setSelectedBatch({
        id: parseInt(trimmed, 10) || trimmed,
        title: `Next Toppers Batch #${trimmed}`,
        provider: 'nt'
      });
      return;
    }

    // 3. Query Physics Wallah API dynamically ONLY for non-numeric/PW batch IDs
    try {
      const details = await fetchPwBatchDetails(trimmed);
      if (details) {
        setSelectedBatch(details);
        return;
      }
    } catch (e) {
      console.warn('Direct PW batch fetch notice:', e.message);
    }

    // Direct PW batch candidate fallback
    setSelectedBatch({
      id: trimmed,
      batchId: trimmed,
      title: `Physics Wallah Batch (${trimmed})`,
      provider: 'pw',
      isLivePw: true
    });
  }, [ntBatches, pwBatches, route.provider]);

  // Sync route.view with activeView
  useEffect(() => {
    if (route.view && route.view !== activeView) {
      setActiveView(route.view);
    }
  }, [route.view, activeView]);

  // Sync route.batchId with selectedBatch
  useEffect(() => {
    if (route.batchId) {
      const currentId = String(selectedBatch?.id || selectedBatch?.batchId || '');
      if (currentId !== String(route.batchId)) {
        handleDirectBatchLookup(route.batchId);
      }
    } else if (!route.batchId && selectedBatch) {
      setSelectedBatch(null);
    }
  }, [route.batchId, selectedBatch, handleDirectBatchLookup]);

  // Sync PDF modal with route
  useEffect(() => {
    if (route.pdfId) {
      const currentPdfId = String(viewingPdfItem?.id || viewingPdfItem?._id || viewingPdfItem?.entity_id || '');
      if (currentPdfId !== String(route.pdfId)) {
        const cached = getCachedMediaItem(route.pdfId);
        if (cached) {
          setViewingPdfItem(cached);
        } else if (route.batchId) {
          setViewingPdfItem({
            id: route.pdfId,
            entity_id: route.pdfId,
            course_id: route.batchId,
            title: `Document #${route.pdfId}`,
            data: { file_type: 1 }
          });
        }
      }
    } else if (!route.pdfId && viewingPdfItem) {
      setViewingPdfItem(null);
    }
  }, [route.pdfId, route.batchId, viewingPdfItem, getCachedMediaItem]);

  // Sync Video modal with route
  useEffect(() => {
    if (route.videoId) {
      const currentVideoId = String(playingVideoItem?.id || playingVideoItem?._id || playingVideoItem?.entity_id || '');
      if (currentVideoId !== String(route.videoId)) {
        const cached = getCachedMediaItem(route.videoId);
        if (cached) {
          setPlayingVideoItem(cached);
        } else if (route.batchId) {
          setPlayingVideoItem({
            id: route.videoId,
            entity_id: route.videoId,
            course_id: route.batchId,
            title: `Lecture #${route.videoId}`
          });
        }
      }
    } else if (!route.videoId && playingVideoItem) {
      setPlayingVideoItem(null);
    }
  }, [route.videoId, route.batchId, playingVideoItem, getCachedMediaItem]);

  // Sync Test modal with route
  useEffect(() => {
    if (route.testId) {
      const currentTestId = String(activeTestItem?.id || activeTestItem?._id || activeTestItem?.entity_id || '');
      if (currentTestId !== String(route.testId)) {
        const cached = getCachedMediaItem(route.testId);
        if (cached) {
          setActiveTestItem(cached);
        }
      }
    } else if (!route.testId && activeTestItem) {
      setActiveTestItem(null);
    }
  }, [route.testId, activeTestItem, getCachedMediaItem]);

  // User Actions with Routing
  const handleSelectBatch = (batch) => {
    setSelectedBatch(batch);
    const bId = String(batch.id || batch.batchId);
    const prov = batch.provider || (batch.batchId ? 'pw' : 'nt');
    navigate({ batchId: bId, provider: prov }, { push: true });
  };

  const handleBackToBatches = () => {
    setSelectedBatch(null);
    navigate({ batchId: null }, { push: true });
  };

  const handlePlayVideo = (item) => {
    setPlayingVideoItem(item);
    openModal('video', item);
  };

  const handleViewPdf = (item) => {
    setViewingPdfItem(item);
    openModal('pdf', item);
  };

  const handleStartTest = (item) => {
    setActiveTestItem(item);
    openModal('test', item);
  };

  const handleCloseVideo = () => {
    setPlayingVideoItem(null);
    closeModal('video');
  };

  const handleClosePdf = () => {
    setViewingPdfItem(null);
    closeModal('pdf');
  };

  const handleCloseTest = () => {
    setActiveTestItem(null);
    closeModal('test');
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text-primary)] flex flex-col font-sans selection:bg-[#A8DADC] selection:text-[#1D3557] transition-colors duration-200">
      {/* Navigation Header */}
      <Navbar
        activeView={activeView}
        setActiveView={(view) => {
          setActiveView(view);
          setSelectedBatch(null);
          navigate({ view: view === 'batches' ? null : view, batchId: null }, { push: true });
        }}
        selectedBatch={selectedBatch}
        onBackToBatches={handleBackToBatches}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onSearchSubmit={handleImmediateSearch}
        onOpenPwLogin={() => setShowPwAuthModal(true)}
      />

      {/* Main View Area */}
      <main className="flex-1">
        {selectedBatch ? (
          selectedBatch.provider === 'pw' || Boolean(selectedBatch.batchId) || selectedBatch.isLivePw ? (
            <PwBatchBrowser
              batch={selectedBatch}
              onBack={handleBackToBatches}
              onPlayVideo={handlePlayVideo}
              onViewPdf={handleViewPdf}
              onOpenPwLogin={() => setShowPwAuthModal(true)}
            />
          ) : (
            <FolderBrowser
              batch={selectedBatch}
              onBack={handleBackToBatches}
              onPlayVideo={handlePlayVideo}
              onViewPdf={handleViewPdf}
              onStartTest={handleStartTest}
            />
          )
        ) : activeView === 'enrolled' ? (
          <EnrolledBatchesView
            batches={[...pwBatches, ...ntBatches]}
            onSelectBatch={handleSelectBatch}
            onBrowseBatches={() => {
              setActiveView('batches');
              navigate({ view: null, batchId: null }, { push: true });
            }}
          />
        ) : activeView === 'productivity' || activeView === 'tasks' || activeView === 'timer' || activeView === 'streaks' ? (
          <ProductivityHub
            initialTab={activeView === 'productivity' ? 'overview' : activeView}
            onBackToBatches={() => {
              setActiveView('batches');
              navigate({ view: null, batchId: null }, { push: true });
            }}
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
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />
        )}
      </main>

      {/* Active Modals */}
      {playingVideoItem && (
        <VideoPlayerModal
          item={playingVideoItem}
          courseId={selectedBatch?.id || playingVideoItem?.course_id || route.batchId}
          onClose={handleCloseVideo}
          onSelectLecture={(newLecture) => {
            const nextItem = {
              ...newLecture,
              playlist: playingVideoItem.playlist || [],
              chapterName: playingVideoItem.chapterName || '',
              subjectName: playingVideoItem.subjectName || ''
            };
            setPlayingVideoItem(nextItem);
            navigate({ videoId: String(newLecture.id || newLecture.entity_id || newLecture._id) }, { replace: true });
          }}
          onOpenPdf={(pdfDoc) => {
            handleCloseVideo();
            setViewingPdfItem(pdfDoc);
          }}
        />
      )}

      {viewingPdfItem && (
        <PdfViewerModal
          item={viewingPdfItem}
          courseId={selectedBatch?.id || viewingPdfItem?.course_id || route.batchId}
          onClose={handleClosePdf}
        />
      )}

      {activeTestItem && (
        <TestModal
          item={activeTestItem}
          onClose={handleCloseTest}
        />
      )}

      {/* Physics Wallah Mobile OTP Login Modal */}
      <PwAuthModal
        isOpen={showPwAuthModal}
        onClose={() => setShowPwAuthModal(false)}
        onSuccess={() => {
          setShowPwAuthModal(false);
          loadPwBatches(1, '', false);
        }}
      />

      {/* Footer */}
      <footer className="w-full py-8 border-t border-[var(--color-border)] bg-[var(--color-surface)] text-center text-xs text-[var(--color-text-secondary)] mt-12 transition-colors">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-heading font-extrabold text-[#F1FAEE] tracking-wider text-sm">
              EDU<span className="text-[#A8DADC]">MATE</span>
            </span>
            <span className="text-[10px] text-[var(--color-text-muted)]">•</span>
            <span className="text-[var(--color-text-secondary)]">Physics Wallah & Next Toppers Unified Platform</span>
          </div>

          <div className="flex items-center gap-4 text-[var(--color-text-secondary)] text-[11px]">
            <span className="flex items-center gap-1.5 text-[#A8DADC] font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>100% Free & Ad-Free</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5 text-[#457B9D] font-medium">
              <Sparkles className="w-3.5 h-3.5" />
              <span>100% Dynamic API Fetched</span>
            </span>
          </div>
        </div>
      </footer>
      {/* Floating Study Assistant Widget */}
      <FloatingStudyAssistant
        onOpenFullHub={() => {
          setActiveView('productivity');
          setSelectedBatch(null);
          navigate({ view: 'productivity', batchId: null }, { push: true });
        }}
      />
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
    <ThemeProvider>
      <AuthProvider>
        <RouterProvider>
          <GoogleTasksProvider>
            <MainApp />
          </GoogleTasksProvider>
        </RouterProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
