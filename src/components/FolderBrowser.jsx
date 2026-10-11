import React, { useState, useEffect, useMemo } from 'react';
import { 
  Folder, 
  Video, 
  FileText, 
  ListCheck, 
  ChevronRight, 
  Home, 
  Loader2, 
  Play, 
  ExternalLink, 
  Clock, 
  ArrowLeft, 
  CheckCircle2, 
  Bookmark, 
  User, 
  Calendar,
  Search,
  X,
  CalendarCheck,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { fetchCourseOverview, fetchFolderContent, getTeacherForContent } from '../services/api';
import { useCourse } from '../context/CourseContext';

export default function FolderBrowser({ 
  batch, 
  onBack, 
  onPlayVideo, 
  onViewPdf, 
  onStartTest 
}) {
  const { isLectureCompleted, toggleLectureComplete, toggleBookmark, isBookmarked } = useCourse();

  const [courseDetails, setCourseDetails] = useState(null);
  const [folderHistory, setFolderHistory] = useState([
    { id: '0', title: 'Course Content' }
  ]);
  const [contentItems, setContentItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'video', 'pdf', 'test'
  const [searchFilter, setSearchFilter] = useState('');
  const [showPlannerModal, setShowPlannerModal] = useState(false);

  const currentFolder = folderHistory[folderHistory.length - 1];

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
        setContentItems(items || []);
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
  };

  const navigateToBreadcrumb = (index) => {
    setActiveTab('all');
    setSearchFilter('');
    setFolderHistory((prev) => prev.slice(0, index + 1));
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
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:border-amber-400/50 text-xs font-semibold transition-all btn-press"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>All Batches</span>
        </button>

        {/* Timetable / Planner Modal Button */}
        {courseDetails?.description && courseDetails.description.includes('<img') && (
          <button
            onClick={() => setShowPlannerModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/30 text-amber-400 text-xs font-bold transition-all btn-press"
          >
            <CalendarCheck className="w-3.5 h-3.5" />
            <span>Weekly Planner & Time Table</span>
          </button>
        )}
      </div>

      {/* Course Context Header (Clean, Compact, No overflowing images) */}
      <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-[#141419] border border-white/[0.08] flex flex-col sm:flex-row items-center gap-5">
        <div className="w-full sm:w-48 aspect-video rounded-xl bg-neutral-950 overflow-hidden shrink-0 border border-white/10 shadow-sm">
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
          <div className="inline-block px-2 py-0.5 rounded bg-amber-400/15 border border-amber-400/25 text-[10px] font-bold text-amber-400 mb-1">
            BATCH #{batch.id}
          </div>
          <h1 className="font-heading text-base sm:text-xl font-bold text-white mb-1 truncate">
            {courseDetails?.title || batch.title}
          </h1>
          <p className="text-xs text-neutral-400 line-clamp-1">
            Official Next Toppers Batch Curriculum • Direct Video Streaming Enabled
          </p>
        </div>
      </div>

      {/* Breadcrumb Navigation Bar */}
      <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#141419] border border-white/[0.08] mb-6 overflow-x-auto text-xs text-neutral-400">
        <div className="flex items-center gap-1.5 shrink-0">
          {folderHistory.map((folder, index) => {
            const isLast = index === folderHistory.length - 1;
            return (
              <React.Fragment key={folder.id + '-' + index}>
                <button
                  onClick={() => navigateToBreadcrumb(index)}
                  className={`flex items-center gap-1.5 py-1 px-2.5 rounded-lg transition-colors btn-press ${
                    isLast ? 'bg-amber-400/20 text-amber-400 font-bold' : 'hover:text-white hover:bg-neutral-800'
                  }`}
                >
                  {index === 0 && <Home className="w-3.5 h-3.5" />}
                  <span>{folder.title}</span>
                </button>
                {!isLast && <ChevronRight className="w-3.5 h-3.5 text-neutral-600 shrink-0" />}
              </React.Fragment>
            );
          })}
        </div>

        {folderHistory.length > 1 && (
          <button
            onClick={() => navigateToBreadcrumb(folderHistory.length - 2)}
            className="flex items-center gap-1 text-[11px] font-semibold text-neutral-300 hover:text-white bg-neutral-800 px-3 py-1 rounded-lg shrink-0 btn-press"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Up One Level</span>
          </button>
        )}
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
        {/* Category Tabs: Root directory only shows All Items; inside subjects/subfolders all options appear */}
        <div className="flex items-center gap-1.5 bg-[#141419] p-1 rounded-xl border border-white/[0.08] overflow-x-auto">
          {folderHistory.length <= 1 ? (
            <button
              type="button"
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-amber-400 text-black flex items-center gap-1.5 whitespace-nowrap"
            >
              <span>All Items</span>
              {counts.total > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-black text-amber-400">
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
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap btn-press ${
                  activeTab === tab.id
                    ? 'bg-amber-400 text-black font-bold'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    activeTab === tab.id ? 'bg-black text-amber-400' : 'bg-neutral-800 text-neutral-300'
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
          <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search lectures or topics..."
            className="w-full bg-[#141419] border border-white/[0.08] text-neutral-200 placeholder-neutral-500 text-xs rounded-xl pl-8 pr-7 py-2 focus:outline-none focus:border-amber-400 transition-colors"
          />
          {searchFilter && (
            <button
              onClick={() => setSearchFilter('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ======================== SQUARE CARDS GRID ======================== */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-neutral-400">
          <Loader2 className="w-8 h-8 animate-spin text-amber-400 mb-2" />
          <p className="text-xs font-medium">Loading lecture cards...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-16 bg-[#141419] rounded-2xl border border-white/[0.08]">
          <Folder className="w-8 h-8 text-neutral-500 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-white mb-1">Folder is Empty</h3>
          <p className="text-xs text-neutral-400">No items found in this section.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredItems.map((item, idx) => {
            // Teacher name calculation
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
                  className="card-surface rounded-2xl p-5 cursor-pointer group flex flex-col justify-between border border-white/[0.08] hover:border-amber-400/50 transition-all duration-200 hover:-translate-y-0.5"
                >
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                      <Folder className="w-6 h-6 text-amber-400 fill-amber-400/20" />
                    </div>
                    <h3 className="text-sm font-bold text-neutral-100 group-hover:text-amber-400 transition-colors line-clamp-2 leading-snug">
                      {item.title}
                    </h3>
                    <p className="text-[11px] text-neutral-400 mt-1.5 font-medium">
                      {badges.length > 0 ? badges.join(' • ') : 'View Folder Contents'}
                    </p>
                  </div>

                  <div className="mt-5 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-neutral-400 group-hover:text-white">
                    <span>Open Folder</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              );
            }

            // 2. VIDEO LECTURE CARD (Square proportions with poster and teacher)
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
                  className="card-surface rounded-2xl overflow-hidden flex flex-col border border-white/[0.08] hover:border-amber-400/40 transition-all duration-200 group"
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
                      <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md text-[10px] font-mono text-white flex items-center gap-1 border border-white/10">
                        <Clock className="w-3 h-3 text-amber-400" />
                        <span>{durationText}</span>
                      </div>
                    )}

                    {/* Play Button Overlay */}
                    <div className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-amber-400 text-black flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-all opacity-80 group-hover:opacity-100">
                      <Play className="w-5 h-5 fill-black ml-0.5" />
                    </div>

                    {/* Watched Status Tag */}
                    {completed && (
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-emerald-500/90 text-black text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>WATCHED</span>
                      </div>
                    )}
                  </div>

                  {/* Details Area */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Teacher's Name Badge */}
                      <div className="flex items-center gap-1.5 text-[11px] text-amber-400 font-medium mb-1.5">
                        <User className="w-3.5 h-3.5 text-amber-400" />
                        <span>{teacherName}</span>
                      </div>

                      {/* Lecture Title */}
                      <h4 
                        onClick={() => onPlayVideo(enrichedItem)}
                        className="text-xs sm:text-sm font-semibold text-neutral-100 leading-snug line-clamp-2 cursor-pointer group-hover:text-amber-400 transition-colors"
                      >
                        {item.title}
                      </h4>

                      {dateText && (
                        <div className="flex items-center gap-1 text-[10px] text-neutral-400 mt-2 font-medium">
                          <Calendar className="w-3 h-3 text-neutral-400" />
                          <span>Uploaded: {dateText}</span>
                        </div>
                      )}
                    </div>

                    {/* Action Controls */}
                    <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => toggleLectureComplete(item.entity_id)}
                        className={`text-[11px] font-semibold flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors ${
                          completed 
                            ? 'text-emerald-400 bg-emerald-500/10' 
                            : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{completed ? 'Completed' : 'Mark Done'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onPlayVideo(enrichedItem)}
                        className="px-3.5 py-1.5 rounded-lg bg-amber-400 hover:bg-yellow-400 text-black text-xs font-bold flex items-center gap-1.5 transition-colors btn-press shadow-sm"
                      >
                        <Play className="w-3 h-3 fill-black" />
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
                  className="card-surface rounded-2xl p-4 flex flex-col justify-between border border-white/[0.08] hover:border-red-500/40 transition-all duration-200 group"
                >
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-3">
                      <FileText className="w-5 h-5 text-red-400" />
                    </div>

                    {/* Teacher name */}
                    <div className="flex items-center gap-1.5 text-[11px] text-red-400/90 font-medium mb-1">
                      <User className="w-3 h-3 text-red-400" />
                      <span>{teacherName}</span>
                    </div>

                    <h4 
                      onClick={() => onViewPdf(enrichedItem)}
                      className="text-xs sm:text-sm font-semibold text-neutral-100 group-hover:text-red-400 cursor-pointer transition-colors line-clamp-2 leading-snug"
                    >
                      {item.title}
                    </h4>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => toggleBookmark(item)}
                      className={`p-1.5 rounded-lg border transition-colors ${
                        bookmarked ? 'bg-amber-400/20 border-amber-400/40 text-amber-400' : 'border-white/5 text-neutral-400 hover:text-white'
                      }`}
                      title="Save Document"
                    >
                      <Bookmark className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onViewPdf(enrichedItem)}
                      className="px-3.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-semibold flex items-center gap-1.5 btn-press transition-colors"
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
                  className="card-surface rounded-2xl p-4 flex flex-col justify-between border border-indigo-500/30 hover:border-indigo-500/60 transition-all duration-200 group"
                >
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-3">
                      <ListCheck className="w-5 h-5 text-indigo-400" />
                    </div>
                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
                      Mock Assessment
                    </span>
                    <h4 className="text-xs sm:text-sm font-semibold text-neutral-100 line-clamp-2 mt-1">
                      {item.title}
                    </h4>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/[0.06] flex justify-end">
                    <button
                      type="button"
                      onClick={() => onStartTest(item)}
                      className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 btn-press"
                    >
                      <span>Start Test</span>
                      <Play className="w-3 h-3 fill-white" />
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
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-2xl bg-[#141419] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-white/[0.08] flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-amber-400" />
                <span>Batch Timetable & Weekly Planner</span>
              </h3>
              <button
                onClick={() => setShowPlannerModal(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div 
              className="p-6 overflow-y-auto space-y-4 text-xs text-neutral-300 [&_img]:rounded-xl [&_img]:mx-auto [&_img]:max-w-full [&_img]:h-auto [&_img]:my-3"
              dangerouslySetInnerHTML={{ __html: courseDetails?.description || '' }}
            />
          </div>
        </div>
      )}

    </div>
  );
}
