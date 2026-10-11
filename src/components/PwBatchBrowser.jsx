import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, 
  BookOpen, 
  Calendar, 
  CheckCircle2, 
  ChevronRight, 
  FileText, 
  Layers, 
  Loader2, 
  Play, 
  Sparkles, 
  User, 
  Video, 
  Bookmark, 
  ShieldCheck, 
  CalendarCheck,
  Search
} from 'lucide-react';
import { 
  fetchPwBatchDetails, 
  fetchPwSubjectInfo, 
  fetchPwTopicContent, 
  fetchPwPdf, 
  fetchPwSchedule,
  getPwTeacherName
} from '../services/pwApi';
import { useCourse } from '../context/CourseContext';

export default function PwBatchBrowser({ 
  batch, 
  onBack, 
  onPlayVideo, 
  onViewPdf 
}) {
  const { isLectureCompleted, toggleLectureComplete, toggleBookmark, isBookmarked, isEnrolled, toggleEnroll } = useCourse();

  const [loadingBatch, setLoadingBatch] = useState(true);
  const [batchDetails, setBatchDetails] = useState(null);
  const [activeSubject, setActiveSubject] = useState(null);

  const [loadingChapters, setLoadingChapters] = useState(false);
  const [chapters, setChapters] = useState([]);
  const [selectedChapter, setSelectedChapter] = useState(null);

  // Content tabs: 'videos' | 'notes' | 'dppNotes' | 'dppVideos' | 'schedule'
  const [activeTab, setActiveTab] = useState('videos');
  const [loadingContent, setLoadingContent] = useState(false);
  const [contentItems, setContentItems] = useState([]);

  // Schedule
  const [scheduleItems, setScheduleItems] = useState([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);

  // Search in chapter contents
  const [searchQuery, setSearchQuery] = useState('');

  const enrolled = isEnrolled(batch?.id);

  // 1. Fetch live batch details on mount
  useEffect(() => {
    let isCancelled = false;
    async function loadDetails() {
      setLoadingBatch(true);
      try {
        const details = await fetchPwBatchDetails(batch.id);
        if (!isCancelled) {
          setBatchDetails(details || batch);
          const subs = details?.subjects || batch?.subjects || [];
          if (subs.length > 0) {
            setActiveSubject(subs[0]);
          }
        }
      } catch (err) {
        console.error('Failed to load PW batch details:', err);
      } finally {
        if (!isCancelled) setLoadingBatch(false);
      }
    }

    loadDetails();
    return () => { isCancelled = true; };
  }, [batch.id]);

  // 2. Fetch live chapters when activeSubject changes
  useEffect(() => {
    if (!activeSubject) return;

    let isCancelled = false;
    async function loadChapters() {
      setLoadingChapters(true);
      try {
        const subjectId = activeSubject._id || activeSubject.id;
        const list = await fetchPwSubjectInfo(batch.id, subjectId);
        if (!isCancelled) {
          setChapters(Array.isArray(list) ? list : []);
          if (list && list.length > 0) {
            setSelectedChapter(list[0]);
          } else {
            setSelectedChapter(null);
          }
        }
      } catch (err) {
        console.error('Failed to load PW chapters:', err);
        if (!isCancelled) setChapters([]);
      } finally {
        if (!isCancelled) setLoadingChapters(false);
      }
    }

    loadChapters();
    return () => { isCancelled = true; };
  }, [batch.id, activeSubject]);

  // 3. Fetch live chapter contents when selectedChapter or activeTab changes
  useEffect(() => {
    if (!activeSubject || !selectedChapter) return;

    if (activeTab === 'schedule') {
      loadBatchSchedule();
      return;
    }

    let isCancelled = false;
    async function loadContents() {
      setLoadingContent(true);
      setContentItems([]);
      try {
        const subjectId = activeSubject._id || activeSubject.id;
        const chapterId = selectedChapter._id || selectedChapter.id;
        
        let typeParam = 'videos';
        if (activeTab === 'notes') typeParam = 'notes';
        if (activeTab === 'dppNotes') typeParam = 'dpp-notes';
        if (activeTab === 'dppVideos') typeParam = 'dpp-videos';

        const items = await fetchPwTopicContent(batch.id, subjectId, chapterId, typeParam);
        if (!isCancelled) {
          setContentItems(Array.isArray(items) ? items : []);
        }
      } catch (err) {
        console.error('Failed to load PW contents:', err);
        if (!isCancelled) setContentItems([]);
      } finally {
        if (!isCancelled) setLoadingContent(false);
      }
    }

    loadContents();
    return () => { isCancelled = true; };
  }, [batch.id, activeSubject, selectedChapter, activeTab]);

  const loadBatchSchedule = async () => {
    setLoadingSchedule(true);
    try {
      const schedule = await fetchPwSchedule(batch.id);
      setScheduleItems(Array.isArray(schedule) ? schedule : []);
    } catch (err) {
      console.warn('Failed to fetch schedule:', err);
    } finally {
      setLoadingSchedule(false);
    }
  };

  const handlePlayVideoItem = (video) => {
    const teacherName = video.faculty || video.teacherName || getPwTeacherName(video, activeSubject?.subject || activeSubject?.subjectName || activeSubject?.name);
    const formattedItem = {
      ...video,
      id: video._id || video.id,
      entity_id: video._id || video.id,
      title: video.topic || video.title || 'Physics Wallah Lecture',
      course_id: batch.id,
      provider: 'pw',
      teacherName,
      faculty: teacherName,
      data: {
        file_url: video.videoUrl || video.url || video.link || '',
        thumbnail: video.thumbnail || video.previewImage || batch.thumbnail,
        duration: video.duration || 0,
        video_type: video.videoUrl?.includes('youtube') ? 1 : 2
      }
    };
    onPlayVideo(formattedItem);
  };

  const handleOpenPdfItem = async (doc) => {
    let pdfUrl = doc.attachmentUrl || doc.fileUrl || doc.url || '';
    if (!pdfUrl && doc._id) {
      const subjectId = activeSubject._id || activeSubject.id;
      pdfUrl = await fetchPwPdf(batch.id, subjectId, doc._id);
    }

    const teacherName = doc.faculty || doc.teacherName || getPwTeacherName(doc, activeSubject?.subject || activeSubject?.subjectName || activeSubject?.name);
    const formattedItem = {
      ...doc,
      id: doc._id || doc.id,
      entity_id: doc._id || doc.id,
      title: doc.topic || doc.title || 'Class Notes PDF',
      course_id: batch.id,
      provider: 'pw',
      teacherName,
      faculty: teacherName,
      data: {
        file_url: pdfUrl,
        file_type: 1,
        thumbnail: batch.thumbnail
      }
    };
    onViewPdf(formattedItem);
  };

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return contentItems;
    const q = searchQuery.toLowerCase().trim();
    return contentItems.filter(item => {
      const t = (item.topic || item.title || item.name || '').toLowerCase();
      return t.includes(q);
    });
  }, [contentItems, searchQuery]);

  const subjectsList = batchDetails?.subjects || batch?.subjects || [];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      
      {/* Top Navigation & Breadcrumbs */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[#F1FAEE] hover:border-[#457B9D] text-xs font-semibold transition-all btn-press"
        >
          <ArrowLeft className="w-4 h-4 text-[#A8DADC]" />
          <span>Back to All Batches</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => toggleEnroll(batch.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 btn-press ${
              enrolled
                ? 'bg-[#457B9D]/20 text-[#A8DADC] border border-[#457B9D]/40'
                : 'bg-[#457B9D] hover:bg-[#386684] text-[#F1FAEE] shadow-sm'
            }`}
          >
            {enrolled ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-[#A8DADC]" />
                <span>Enrolled in Batch</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-[#F1FAEE]" />
                <span>Enroll Free</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Batch Hero Banner */}
      <div className="relative mb-8 rounded-3xl card-surface overflow-hidden p-6 sm:p-8">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="w-full md:w-64 h-36 sm:h-40 rounded-2xl overflow-hidden shrink-0 border border-[var(--color-border)] bg-[var(--color-surface-hover)] shadow-sm">
            <img
              src={batchDetails?.thumbnail || batch?.thumbnail}
              alt={batch.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/2cd05c71-3897-4e88-9c73-3e307e0dde03.jpg';
              }}
            />
          </div>

          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-md bg-[#1D3557] border border-[#457B9D]/40 text-[10px] font-bold text-[#A8DADC] uppercase tracking-wider">
                Physics Wallah
              </span>
              <span className="px-2.5 py-0.5 rounded-md bg-[#457B9D]/20 border border-[#457B9D]/40 text-[10px] font-bold text-[#A8DADC] uppercase tracking-wider">
                100% Free & Ad-Free
              </span>
              <span className="px-2 py-0.5 rounded-md bg-[var(--color-surface-hover)] text-[10px] font-semibold text-[var(--color-text-secondary)] border border-[var(--color-border)]">
                {batchDetails?.language || 'Hinglish'}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-[#F1FAEE] tracking-tight">
              {batchDetails?.title || batch?.title}
            </h1>

            <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] mt-2 line-clamp-2 max-w-3xl leading-relaxed">
              {batchDetails?.description || 'Access live lectures, chapter notes, daily DPPs and test series completely free with zero ads.'}
            </p>

            <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-[var(--color-text-secondary)]">
              <div className="flex items-center gap-1.5 text-[var(--color-text-primary)]">
                <User className="w-3.5 h-3.5 text-[#A8DADC]" />
                <span>{batchDetails?.byName || 'PW Faculty'}</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1.5 text-[var(--color-text-primary)]">
                <BookOpen className="w-3.5 h-3.5 text-[#A8DADC]" />
                <span>{subjectsList.length} Subjects</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Subjects Selection Tabs */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#A8DADC] flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#A8DADC]" />
            <span>Select Subject</span>
          </h2>
          <span className="text-xs text-[var(--color-text-muted)]">{subjectsList.length} subjects available</span>
        </div>

        {loadingBatch ? (
          <div className="flex items-center gap-2 py-4 text-[var(--color-text-secondary)]">
            <Loader2 className="w-4 h-4 animate-spin text-[#A8DADC]" />
            <span className="text-xs">Loading live subjects...</span>
          </div>
        ) : subjectsList.length === 0 ? (
          <div className="p-4 card-surface rounded-2xl text-xs text-[var(--color-text-secondary)]">
            No subjects returned for this batch. The live batch may require enrollment or has no active schedules.
          </div>
        ) : (
          <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none">
            {subjectsList.map((subj) => {
              const subjId = subj._id || subj.id;
              const isSelected = (activeSubject?._id || activeSubject?.id) === subjId;
              return (
                <button
                  key={subjId}
                  onClick={() => setActiveSubject(subj)}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 shrink-0 border btn-press ${
                    isSelected
                      ? 'bg-[#457B9D] text-[#F1FAEE] border-[#457B9D] shadow-sm'
                      : 'card-surface text-[var(--color-text-secondary)] hover:text-[#F1FAEE] hover:border-[#A8DADC]'
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-[#F1FAEE]' : 'bg-[#A8DADC]'}`} />
                  <span>{subj.subjectName || subj.name || 'Subject'}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Content Layout: Chapters Sidebar + Content Items Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Chapters / Units List */}
        <div className="lg:col-span-4 card-surface rounded-3xl p-4 sm:p-5 flex flex-col h-[650px]">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-[var(--color-border)]">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#A8DADC]" />
              <h3 className="text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wider">
                Chapters & Topics
              </h3>
            </div>
            <span className="text-[11px] font-semibold text-[var(--color-text-muted)]">
              {chapters.length} Total
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {loadingChapters ? (
              <div className="flex flex-col items-center justify-center py-16 text-[var(--color-text-secondary)]">
                <Loader2 className="w-6 h-6 animate-spin text-[#A8DADC] mb-2" />
                <span className="text-xs">Loading live chapters...</span>
              </div>
            ) : chapters.length === 0 ? (
              <div className="text-center py-12 text-[var(--color-text-muted)] text-xs">
                No chapters found for this subject.
              </div>
            ) : (
              chapters.map((ch, idx) => {
                const chId = ch._id || ch.id;
                const isSelected = (selectedChapter?._id || selectedChapter?.id) === chId;
                const chapterTitle = ch.topicName || ch.title || `Chapter ${idx + 1}`;

                return (
                  <button
                    key={chId || idx}
                    onClick={() => setSelectedChapter(ch)}
                    className={`w-full text-left p-3.5 rounded-2xl transition-all border flex items-center justify-between gap-3 btn-press ${
                      isSelected
                        ? 'bg-[#1D3557] border-[#457B9D] text-[#F1FAEE] shadow-sm font-semibold'
                        : 'bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] border-[var(--color-border)] text-[var(--color-text-primary)]'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          isSelected ? 'bg-[#457B9D] text-[#F1FAEE]' : 'bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)]'
                        }`}>
                          #{idx + 1}
                        </span>
                        <h4 className="text-xs font-semibold truncate">
                          {chapterTitle}
                        </h4>
                      </div>
                    </div>
                    <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${
                      isSelected ? 'text-[#A8DADC] translate-x-0.5' : 'text-[var(--color-text-muted)]'
                    }`} />
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Chapter Contents (Lectures, Notes, DPPs) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          
          {/* Content Sub-Navigation Bar */}
          <div className="p-3 card-surface rounded-2xl flex flex-wrap items-center justify-between gap-3">
            
            {/* Content Tabs */}
            <div className="flex items-center gap-1.5 bg-[var(--color-bg)] p-1 rounded-xl border border-[var(--color-border)]">
              <button
                onClick={() => setActiveTab('videos')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all btn-press ${
                  activeTab === 'videos'
                    ? 'bg-[#457B9D] text-[#F1FAEE] shadow-sm'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                <Video className="w-3.5 h-3.5" />
                <span>Lectures</span>
              </button>

              <button
                onClick={() => setActiveTab('notes')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all btn-press ${
                  activeTab === 'notes'
                    ? 'bg-[#457B9D] text-[#F1FAEE] shadow-sm'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Notes & Slides</span>
              </button>

              <button
                onClick={() => setActiveTab('dppNotes')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all btn-press ${
                  activeTab === 'dppNotes'
                    ? 'bg-[#457B9D] text-[#F1FAEE] shadow-sm'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>DPP Sheets</span>
              </button>

              <button
                onClick={() => setActiveTab('dppVideos')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all btn-press ${
                  activeTab === 'dppVideos'
                    ? 'bg-[#457B9D] text-[#F1FAEE] shadow-sm'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                <Play className="w-3.5 h-3.5" />
                <span>DPP Solutions</span>
              </button>

              <button
                onClick={() => setActiveTab('schedule')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all btn-press ${
                  activeTab === 'schedule'
                    ? 'bg-[#457B9D] text-[#F1FAEE] shadow-sm'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Schedule</span>
              </button>
            </div>

            {/* Filter Search */}
            {activeTab !== 'schedule' && (
              <div className="relative min-w-[180px]">
                <Search className="w-3.5 h-3.5 text-[var(--color-text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter items..."
                  className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] text-xs rounded-xl pl-8 pr-3 py-1.5 outline-none focus:border-[#457B9D]"
                />
              </div>
            )}
          </div>

          {/* Items Container */}
          <div className="card-surface rounded-3xl p-5 min-h-[570px] flex flex-col">
            
            {/* Header of Content Area */}
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--color-border)]">
              <div>
                <h3 className="text-sm font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                  <span>{selectedChapter?.topicName || selectedChapter?.title || 'Chapter Content'}</span>
                </h3>
                <p className="text-[11px] text-[var(--color-text-secondary)] mt-0.5">
                  Showing {filteredItems.length} {activeTab}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-[#1D3557] border border-[#457B9D]/40 text-[10px] font-semibold text-[#A8DADC] flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-[#A8DADC]" />
                  <span>Ad-Free Stream</span>
                </span>
              </div>
            </div>

            {/* Schedule View */}
            {activeTab === 'schedule' ? (
              <div className="flex-1">
                {loadingSchedule ? (
                  <div className="flex flex-col items-center justify-center py-24 text-[var(--color-text-secondary)]">
                    <Loader2 className="w-6 h-6 animate-spin text-[#A8DADC] mb-2" />
                    <span className="text-xs">Loading live class schedule...</span>
                  </div>
                ) : scheduleItems.length === 0 ? (
                  <div className="text-center py-20 text-[var(--color-text-muted)] text-xs">
                    <CalendarCheck className="w-10 h-10 mx-auto mb-2 text-[var(--color-text-muted)]" />
                    <p>No live classes scheduled for today in this batch.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {scheduleItems.map((sch, i) => (
                      <div key={i} className="p-4 rounded-2xl bg-[var(--color-surface-hover)] border border-[var(--color-border)] flex items-center justify-between gap-4">
                        <div>
                          <h4 className="text-xs font-bold text-[var(--color-text-primary)]">{sch.topic || sch.title}</h4>
                          <p className="text-[11px] text-[var(--color-text-secondary)] mt-0.5">{sch.faculty || sch.teacherName || 'PW Faculty'}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-semibold text-[#A8DADC]">{sch.startTime} - {sch.endTime}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : loadingContent ? (
              <div className="flex-1 flex flex-col items-center justify-center py-24 text-[var(--color-text-secondary)]">
                <Loader2 className="w-7 h-7 animate-spin text-[#A8DADC] mb-2" />
                <span className="text-xs font-medium">Loading live {activeTab} from Physics Wallah...</span>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-20 text-[var(--color-text-muted)] text-xs">
                <Layers className="w-10 h-10 mx-auto mb-2 text-[var(--color-text-muted)]" />
                <p>No {activeTab} available for this chapter yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredItems.map((item, idx) => {
                  const itemId = item._id || item.id || idx;
                  const itemTitle = item.topic || item.title || item.name || `${activeTab} ${idx + 1}`;
                  const teacher = getPwTeacherName(item, activeSubject?.subjectName);
                  const isCompleted = isLectureCompleted(itemId);
                  const bookmarked = isBookmarked(itemId);

                  const isVideoType = activeTab === 'videos' || activeTab === 'dppVideos';

                  return (
                    <div
                      key={itemId}
                      className="group p-4 rounded-2xl bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border)] hover:border-[#A8DADC] transition-all flex flex-col justify-between"
                    >
                      <div>
                        {/* Top row: Badges and Bookmark */}
                        <div className="flex items-center justify-between gap-2 mb-2.5">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#1D3557] text-[#A8DADC] border border-[#457B9D]/40">
                            #{idx + 1} {isVideoType ? 'Lecture' : 'Document'}
                          </span>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => toggleBookmark(item)}
                              className={`p-1.5 rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors ${
                                bookmarked ? 'text-[#A8DADC]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                              }`}
                              title="Bookmark"
                            >
                              <Bookmark className="w-3.5 h-3.5" fill={bookmarked ? 'currentColor' : 'none'} />
                            </button>

                            {isVideoType && (
                              <button
                                onClick={() => toggleLectureComplete(itemId)}
                                className={`p-1.5 rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors ${
                                  isCompleted ? 'text-[#A8DADC]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                                }`}
                                title="Mark as Completed"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Title */}
                        <h4 className="text-xs sm:text-sm font-semibold text-[var(--color-text-primary)] line-clamp-2 group-hover:text-[#A8DADC] transition-colors">
                          {itemTitle}
                        </h4>

                        {/* Faculty / Details */}
                        <div className="flex items-center gap-2 mt-2 text-[11px] text-[var(--color-text-secondary)]">
                          <User className="w-3 h-3 text-[#A8DADC]" />
                          <span className="truncate">{teacher}</span>
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="mt-4 pt-3 border-t border-[var(--color-border)] flex items-center justify-between gap-2">
                        {isVideoType ? (
                          <button
                            onClick={() => handlePlayVideoItem(item)}
                            className="w-full py-2 px-3 rounded-xl bg-[#457B9D] hover:bg-[#386684] text-[#F1FAEE] font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm btn-press"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Watch Lecture</span>
                          </button>
                        ) : (
                          <div className="w-full flex items-center gap-2">
                            <button
                              onClick={() => handleOpenPdfItem(item)}
                              className="flex-1 py-2 px-3 rounded-xl bg-[#457B9D] hover:bg-[#386684] text-[#F1FAEE] font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm btn-press"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>View Notes</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
