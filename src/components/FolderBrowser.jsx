import React, { useState, useEffect, useMemo } from 'react';
import { 
  Folder, 
  FileText, 
  ListCheck, 
  ChevronRight, 
  Home, 
  Loader2, 
  Play, 
  Clock, 
  ArrowLeft, 
  CheckCircle2, 
  Bookmark, 
  User, 
  Calendar, 
  Search, 
  X, 
  CalendarCheck 
} from 'lucide-react';
import { fetchCourseOverview, fetchFolderContent, getTeacherForContent } from '../services/api';
import { useCourse } from '../context/CourseContext';
import { useRouter } from '../context/RouterContext';

export default function FolderBrowser({ 
  batch, 
  onBack, 
  onPlayVideo, 
  onViewPdf, 
  onStartTest 
}) {
  const { isLectureCompleted, toggleLectureComplete, toggleBookmark, isBookmarked } = useCourse();
  const { route, navigate } = useRouter();

  const [courseDetails, setCourseDetails] = useState(null);
  const [folderHistory, setFolderHistory] = useState(() => {
    if (route.folderId && route.folderId !== '0') {
      return [
        { id: '0', title: 'Course Content' },
        { id: route.folderId, title: 'Folder Content' }
      ];
    }
    return [{ id: '0', title: 'Course Content' }];
  });
  const [contentItems, setContentItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(route.tab || 'all'); // 'all', 'video', 'pdf', 'test'
  const [searchFilter, setSearchFilter] = useState('');
  const [showPlannerModal, setShowPlannerModal] = useState(false);

  const currentFolder = folderHistory[folderHistory.length - 1];

  // Sync folderHistory when route.folderId changes via browser Back/Forward
  useEffect(() => {
    const rFolderId = route.folderId || '0';
    if (rFolderId === currentFolder.id) return;

    if (rFolderId === '0') {
      setFolderHistory([{ id: '0', title: 'Course Content' }]);
    } else {
      const existingIdx = folderHistory.findIndex((f) => String(f.id) === String(rFolderId));
      if (existingIdx !== -1) {
        setFolderHistory((prev) => prev.slice(0, existingIdx + 1));
      } else {
        setFolderHistory((prev) => [...prev, { id: rFolderId, title: 'Folder Content' }]);
      }
    }
  }, [route.folderId, currentFolder.id, folderHistory]);

  // Load course overview once
  useEffect(() => {
    async function loadOverview() {
      try {
        const details = await fetchCourseOverview(batch.id);
        setCourseDetails(details);
      } catch (err) {
        console.error('Failed to load course overview:', err);
      }
    }
    loadOverview();
  }, [batch.id]);

  // Load folder content whenever folder changes
  useEffect(() => {
    async function loadContent() {
      setLoading(true);
      setActiveTab('all');
      setSearchFilter('');
      try {
        const items = await fetchFolderContent(batch.id, currentFolder.id);
        const resolvedItems = items || [];
        setContentItems(resolvedItems);

        // Conditional deep link open if user navigated directly to a PDF, Video or Test
        if (route.pdfId) {
          const matchPdf = resolvedItems.find((it) => String(it.id || it.entity_id) === String(route.pdfId));
          if (matchPdf) onViewPdf(matchPdf);
        } else if (route.videoId) {
          const matchVideo = resolvedItems.find((it) => String(it.id || it.entity_id) === String(route.videoId));
          if (matchVideo) onPlayVideo(matchVideo);
        } else if (route.testId) {
          const matchTest = resolvedItems.find((it) => String(it.id || it.entity_id) === String(route.testId));
          if (matchTest) onStartTest(matchTest);
        }
      } catch (err) {
        console.error('Failed to load folder content:', err);
        setContentItems([]);
      } finally {
        setLoading(false);
      }
    }
    loadContent();
  }, [batch.id, currentFolder.id]);

  const openFolder = (folderId, folderTitle) => {
    setActiveTab('all');
    setSearchFilter('');
    setFolderHistory((prev) => [...prev, { id: folderId, title: folderTitle }]);
    navigate({ folderId: String(folderId) }, { push: true });
  };

  const navigateToBreadcrumb = (index) => {
    setActiveTab('all');
    setSearchFilter('');
    const target = folderHistory[index];
    setFolderHistory((prev) => prev.slice(0, index + 1));
    navigate({ folderId: target?.id === '0' ? null : String(target?.id) }, { push: true });
  };

  // Helper to determine if an item or folder matches a specific category tab
  const itemMatchesCategory = (item, tab) => {
    if (tab === 'all') return true;

    // 1. Direct File Item
    if (item.type === 'file') {
      const isVideo = item.data?.file_type === 2 || (item.data?.video_type > 0);
      const isPdf = item.data?.file_type === 1;

      if (tab === 'video') return isVideo;
      if (tab === 'pdf') return isPdf;
      if (tab === 'test') return false;
    }

    // 2. Direct Test Item
    if (item.type === 'test') {
      return tab === 'test';
    }

    // 3. Folder Item (Intelligent categorization by folder counts and keywords)
    if (item.type === 'folder') {
      const title = (item.title || '').toLowerCase();
      const fCounts = item.data?.content_counts || {};
      const videoCount = (fCounts.video?.paid || 0) + (fCounts.video?.free || 0);
      const pdfCount = (fCounts.pdf?.paid || 0) + (fCounts.pdf?.free || 0);
      const testCount = (fCounts.test?.paid || 0) + (fCounts.test?.free || 0);

      if (tab === 'video') {
        return (
          videoCount > 0 ||
          title.includes('lecture') ||
          title.includes('video') ||
          title.includes('class') ||
          title.includes('session')
        );
      }

      if (tab === 'pdf') {
        return (
          pdfCount > 0 ||
          title.includes('note') ||
          title.includes('dpp') ||
          title.includes('pdf') ||
          title.includes('material') ||
          title.includes('assignment') ||
          title.includes('subjective') ||
          title.includes('formula') ||
          title.includes('ncert')
        );
      }

      if (tab === 'test') {
        return (
          testCount > 0 ||
          title.includes('test') ||
          title.includes('quiz') ||
          title.includes('assessment') ||
          title.includes('exam')
        );
      }
    }

    return true;
  };

  // Content type counts for current view
  const counts = useMemo(() => {
    let videos = 0;
    let pdfs = 0;
    let tests = 0;

    contentItems.forEach((item) => {
      if (itemMatchesCategory(item, 'video')) videos += 1;
      if (itemMatchesCategory(item, 'pdf')) pdfs += 1;
      if (itemMatchesCategory(item, 'test')) tests += 1;
    });

    return { videos, pdfs, tests, total: contentItems.length };
  }, [contentItems]);

  // Filtered items based on activeTab and search filter
  const filteredItems = useMemo(() => {
    const q = searchFilter.toLowerCase().trim();
    return contentItems.filter((item) => {
      if (q && !item.title.toLowerCase().includes(q)) {
        return false;
      }
      return itemMatchesCategory(item, activeTab);
    });
  }, [contentItems, activeTab, searchFilter]);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6">
      
      {/* Top Bar with Back Button */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[#F1FAEE] hover:border-[#457B9D] text-xs font-semibold transition-all btn-press"
        >
          <ArrowLeft className="w-4 h-4 text-[#A8DADC]" />
          <span>All Batches</span>
        </button>

        {/* Timetable / Planner Modal Button */}
        {courseDetails?.description && courseDetails.description.includes('<img') && (
          <button
            onClick={() => setShowPlannerModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1D3557] hover:bg-[#223E5E] border border-[#457B9D]/40 text-[#A8DADC] text-xs font-bold transition-all btn-press"
          >
            <CalendarCheck className="w-3.5 h-3.5 text-[#A8DADC]" />
            <span>Weekly Planner & Time Table</span>
          </button>
        )}
      </div>

      {/* Course Context Header */}
      <div className="mb-6 p-4 sm:p-5 rounded-2xl card-surface flex flex-col sm:flex-row items-center gap-5">
        <div className="w-full sm:w-48 aspect-video rounded-xl bg-[var(--color-surface-hover)] overflow-hidden shrink-0 border border-[var(--color-border)] shadow-sm">
          <img
            src={courseDetails?.thumbnail || batch.thumbnail}
            alt={batch.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = batch.thumbnail;
            }}
          />
        </div>

        <div className="flex-1 text-center sm:text-left min-w-0">
          <div className="inline-block px-2 py-0.5 rounded bg-[#1D3557] border border-[#457B9D]/40 text-[10px] font-bold text-[#A8DADC] mb-1">
            BATCH #{batch.id}
          </div>
          <h1 className="font-heading text-base sm:text-xl font-bold text-[#F1FAEE] mb-1 truncate">
            {courseDetails?.title || batch.title}
          </h1>
          <p className="text-xs text-[var(--color-text-secondary)] line-clamp-1">
            Official Next Toppers Batch Curriculum • Direct Video Streaming Enabled
          </p>
        </div>
      </div>

      {/* Breadcrumb Navigation Bar */}
      <div className="flex items-center justify-between gap-3 p-3 rounded-xl card-surface mb-6 overflow-x-auto scrollbar-none text-xs text-[var(--color-text-secondary)]">
        <div className="flex items-center gap-1.5 shrink-0">
          {folderHistory.map((folder, index) => {
            const isLast = index === folderHistory.length - 1;
            return (
              <React.Fragment key={folder.id + '-' + index}>
                <button
                  onClick={() => navigateToBreadcrumb(index)}
                  className={`flex items-center gap-1.5 py-1 px-2.5 rounded-lg whitespace-nowrap transition-all shrink-0 btn-press ${
                    isLast 
                      ? 'bg-[#457B9D] text-[#F1FAEE] font-bold shadow-sm' 
                      : 'hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]'
                  }`}
                >
                  {index === 0 && <Home className="w-3.5 h-3.5" />}
                  <span>{folder.title}</span>
                </button>
                {!isLast && <ChevronRight className="w-3.5 h-3.5 text-[var(--color-border)] shrink-0" />}
              </React.Fragment>
            );
          })}
        </div>

        {folderHistory.length > 1 && (
          <button
            onClick={() => navigateToBreadcrumb(folderHistory.length - 2)}
            className="flex items-center gap-1 text-[11px] font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] bg-[var(--color-surface-hover)] border border-[var(--color-border)] px-3 py-1 rounded-lg shrink-0 btn-press whitespace-nowrap ml-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Up One Level</span>
          </button>
        )}
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 bg-[var(--color-surface)] p-1 rounded-xl border border-[var(--color-border)] overflow-x-auto scrollbar-none">
          {folderHistory.length <= 1 ? (
            <button
              type="button"
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#457B9D] text-[#F1FAEE] flex items-center gap-1.5 whitespace-nowrap shadow-sm"
            >
              <span>All Items</span>
              {counts.total > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-[#A8DADC] text-[#1D3557]">
                  {counts.total}
                </span>
              )}
            </button>
          ) : (
            [
              { id: 'all', label: 'All Items', count: counts.total },
              { id: 'video', label: 'Lectures', count: counts.videos },
              { id: 'pdf', label: 'Notes & DPP', count: counts.pdfs },
              { id: 'test', label: 'Mock Tests', count: counts.tests },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  navigate({ tab: tab.id === 'all' ? null : tab.id }, { replace: true });
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap btn-press ${
                  activeTab === tab.id
                    ? 'bg-[#457B9D] text-[#F1FAEE] font-bold shadow-sm'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    activeTab === tab.id ? 'bg-[#A8DADC] text-[#1D3557]' : 'bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)]'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))
          )}
        </div>

        {/* Quick Search in this folder */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-[var(--color-text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search lectures or topics..."
            className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] text-xs rounded-xl pl-8 pr-7 py-2 focus:outline-none focus:border-[#457B9D] transition-colors"
          />
          {searchFilter && (
            <button
              onClick={() => setSearchFilter('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Cards Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-[var(--color-text-secondary)]">
          <Loader2 className="w-8 h-8 animate-spin text-[#A8DADC] mb-2" />
          <p className="text-xs font-medium">Loading lecture cards...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-16 card-surface rounded-2xl">
          <div className="w-12 h-12 rounded-xl bg-[#1D3557] border border-[#457B9D]/40 flex items-center justify-center mx-auto mb-2 text-[#A8DADC]">
            <Folder className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-[var(--color-text-primary)] mb-1">Folder is Empty</h3>
          <p className="text-xs text-[var(--color-text-secondary)]">No items found in this section.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredItems.map((item, idx) => {
            const teacherName = getTeacherForContent(item, folderHistory, batch.title);

            // 1. FOLDER CARD
            if (item.type === 'folder') {
              const fCounts = item.data?.content_counts || {};
              const badges = [];
              if (fCounts.folders?.total > 0) badges.push(`${fCounts.folders.total} Folders`);
              if ((fCounts.video?.paid || 0) + (fCounts.video?.free || 0) > 0) {
                badges.push(`${(fCounts.video?.paid || 0) + (fCounts.video?.free || 0)} Videos`);
              }
              if ((fCounts.pdf?.paid || 0) + (fCounts.pdf?.free || 0) > 0) {
                badges.push(`${(fCounts.pdf?.paid || 0) + (fCounts.pdf?.free || 0)} PDFs`);
              }
              if ((fCounts.test?.paid || 0) + (fCounts.test?.free || 0) > 0) {
                badges.push(`${(fCounts.test?.paid || 0) + (fCounts.test?.free || 0)} Tests`);
              }

              return (
                <div
                  key={item.entity_id || idx}
                  onClick={() => openFolder(item.entity_id, item.title)}
                  className="card-surface rounded-2xl p-5 cursor-pointer group flex flex-col justify-between border border-[var(--color-border)] hover:border-[#A8DADC] transition-all duration-200 hover:-translate-y-0.5"
                >
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-[#1D3557] border border-[#457B9D]/40 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                      <Folder className="w-6 h-6 text-[#A8DADC] fill-[#A8DADC]/20" />
                    </div>
                    <h3 className="text-sm font-bold text-[var(--color-text-primary)] group-hover:text-[#A8DADC] transition-colors line-clamp-2 leading-snug">
                      {item.title}
                    </h3>
                    <p className="text-[11px] text-[var(--color-text-secondary)] mt-1.5 font-medium">
                      {badges.length > 0 ? badges.join(' • ') : 'View Folder Contents'}
                    </p>
                  </div>

                  <div className="mt-5 pt-3 border-t border-[var(--color-border)] flex items-center justify-between text-xs text-[var(--color-text-secondary)] group-hover:text-[#A8DADC]">
                    <span>Open Folder</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              );
            }

            // 2. VIDEO LECTURE CARD
            if (item.type === 'file' && (item.data?.file_type === 2 || item.data?.video_type > 0)) {
              const completed = isLectureCompleted(item.entity_id);
              const durationRaw = item.data?.duration || 0;
              const mins = Math.floor(durationRaw / 60);
              const secs = durationRaw % 60;
              const durationText = mins > 0 ? `${mins}m ${secs}s` : 'Full Lecture';

              const posterUrl = item.data?.thumbnail || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80';
              const dateText = item.data?.created_at ? new Date(item.data.created_at * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '';

              const enrichedItem = {
                ...item,
                teacherName,
                folderHistory,
                batchTitle: batch.title
              };

              return (
                <div
                  key={item.entity_id || idx}
                  className="card-surface rounded-2xl overflow-hidden flex flex-col border border-[var(--color-border)] hover:border-[#A8DADC] transition-all duration-200 group"
                >
                  {/* Video Poster Section */}
                  <div 
                    onClick={() => onPlayVideo(enrichedItem)}
                    className="relative aspect-video w-full bg-black overflow-hidden cursor-pointer"
                  >
                    <img
                      src={posterUrl}
                      alt={item.title}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 opacity-90 group-hover:opacity-100"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80';
                      }}
                    />

                    {/* Dark gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20"></div>

                    {/* Duration Badge */}
                    {durationRaw > 0 && (
                      <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md text-[10px] font-mono text-[#F1FAEE] flex items-center gap-1 border border-white/10">
                        <Clock className="w-3 h-3 text-[#A8DADC]" />
                        <span>{durationText}</span>
                      </div>
                    )}

                    {/* Play Button Overlay */}
                    <div className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-[#1D3557] text-white flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 group-hover:bg-[#457B9D] transition-all opacity-90 group-hover:opacity-100">
                      <Play className="w-5 h-5 fill-[#F1FAEE] ml-0.5" />
                    </div>

                    {/* Watched Status Tag */}
                    {completed && (
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-[#457B9D] text-[#F1FAEE] text-[9px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>WATCHED</span>
                      </div>
                    )}
                  </div>

                  {/* Details Area */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Teacher's Name Badge */}
                      <div className="flex items-center gap-1.5 text-[11px] text-[#A8DADC] font-medium mb-1.5">
                        <User className="w-3.5 h-3.5 text-[#A8DADC]" />
                        <span>{teacherName}</span>
                      </div>

                      {/* Lecture Title */}
                      <h4 
                        onClick={() => onPlayVideo(enrichedItem)}
                        className="text-xs sm:text-sm font-semibold text-[var(--color-text-primary)] leading-snug line-clamp-2 cursor-pointer group-hover:text-[#A8DADC] transition-colors"
                      >
                        {item.title}
                      </h4>

                      {dateText && (
                        <div className="flex items-center gap-1 text-[10px] text-[var(--color-text-secondary)] mt-2 font-medium">
                          <Calendar className="w-3 h-3 text-[var(--color-text-muted)]" />
                          <span>Uploaded: {dateText}</span>
                        </div>
                      )}
                    </div>

                    {/* Action Controls */}
                    <div className="mt-4 pt-3 border-t border-[var(--color-border)] flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => toggleLectureComplete(item.entity_id)}
                        className={`text-[11px] font-semibold flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors ${
                          completed 
                            ? 'text-[#A8DADC] bg-[#457B9D]/20' 
                            : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{completed ? 'Completed' : 'Mark Done'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onPlayVideo(enrichedItem)}
                        className="px-3.5 py-1.5 rounded-lg bg-[#457B9D] hover:bg-[#386684] text-[#F1FAEE] text-xs font-bold flex items-center gap-1.5 transition-colors btn-press shadow-sm"
                      >
                        <Play className="w-3 h-3 fill-[#F1FAEE]" />
                        <span>Watch</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            }

            // 3. NOTES / PDF CARD
            if (item.type === 'file' && item.data?.file_type === 1) {
              const bookmarked = isBookmarked(item.entity_id);
              const enrichedItem = {
                ...item,
                teacherName,
                folderHistory,
                batchTitle: batch.title
              };

              return (
                <div
                  key={item.entity_id || idx}
                  className="card-surface rounded-2xl p-4 flex flex-col justify-between border border-[var(--color-border)] hover:border-[#A8DADC] transition-all duration-200 group"
                >
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-[#1D3557] border border-[#457B9D]/40 flex items-center justify-center mb-3">
                      <FileText className="w-5 h-5 text-[#A8DADC]" />
                    </div>

                    {/* Teacher name */}
                    <div className="flex items-center gap-1.5 text-[11px] text-[#A8DADC] font-medium mb-1">
                      <User className="w-3 h-3 text-[#A8DADC]" />
                      <span>{teacherName}</span>
                    </div>

                    <h4 
                      onClick={() => onViewPdf(enrichedItem)}
                      className="text-xs sm:text-sm font-semibold text-[var(--color-text-primary)] group-hover:text-[#A8DADC] cursor-pointer transition-colors line-clamp-2 leading-snug"
                    >
                      {item.title}
                    </h4>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[var(--color-border)] flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => toggleBookmark(item)}
                      className={`p-1.5 rounded-lg border transition-colors ${
                        bookmarked 
                          ? 'bg-[#457B9D]/20 border-[#457B9D]/40 text-[#A8DADC]' 
                          : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                      }`}
                      title="Save Document"
                    >
                      <Bookmark className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onViewPdf(enrichedItem)}
                      className="px-3.5 py-1.5 rounded-lg bg-[#457B9D] hover:bg-[#386684] text-[#F1FAEE] text-xs font-semibold flex items-center gap-1.5 btn-press transition-colors shadow-sm"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>View PDF</span>
                    </button>
                  </div>
                </div>
              );
            }

            // 4. TEST CARD
            if (item.type === 'test') {
              return (
                <div
                  key={item.entity_id || idx}
                  className="card-surface rounded-2xl p-4 flex flex-col justify-between border border-[var(--color-border)] hover:border-[#A8DADC] transition-all duration-200 group"
                >
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-[#1D3557] border border-[#457B9D]/40 flex items-center justify-center mb-3">
                      <ListCheck className="w-5 h-5 text-[#A8DADC]" />
                    </div>
                    <span className="text-[10px] font-bold text-[#A8DADC] uppercase tracking-widest">
                      Mock Assessment
                    </span>
                    <h4 className="text-xs sm:text-sm font-semibold text-[var(--color-text-primary)] line-clamp-2 mt-1">
                      {item.title}
                    </h4>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[var(--color-border)] flex justify-end">
                    <button
                      type="button"
                      onClick={() => onStartTest(item)}
                      className="px-4 py-1.5 rounded-lg bg-[#457B9D] hover:bg-[#386684] text-[#F1FAEE] text-xs font-bold flex items-center gap-1.5 btn-press shadow-sm"
                    >
                      <span>Start Test</span>
                      <Play className="w-3 h-3 fill-[#F1FAEE]" />
                    </button>
                  </div>
                </div>
              );
            }

            return null;
          })}
        </div>
      )}

      {/* Timetable / Planner Modal */}
      {showPlannerModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-2xl bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between">
              <h3 className="text-sm font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-[#A8DADC]" />
                <span>Batch Timetable & Weekly Planner</span>
              </h3>
              <button
                onClick={() => setShowPlannerModal(false)}
                className="p-1 rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div 
              className="p-6 overflow-y-auto space-y-4 text-xs text-[var(--color-text-secondary)] [&_img]:rounded-xl [&_img]:mx-auto [&_img]:max-w-full [&_img]:h-auto [&_img]:my-3"
              dangerouslySetInnerHTML={{ __html: courseDetails?.description || '' }}
            />
          </div>
        </div>
      )}

    </div>
  );
}
