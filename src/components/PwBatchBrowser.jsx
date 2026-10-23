import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  ChevronUp,
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
  Search,
  LogIn,
  RefreshCw
} from 'lucide-react';
import {
  fetchPwBatchDetails,
  fetchPwSubjectInfo,
  fetchPwTopicContent,
  fetchPwPdf,
  fetchPwSchedule,
  getPwTeacherName,
  stripHtml,
  pwEnrollBatch
} from '../services/pwApi';
import { useCourse } from '../context/CourseContext';
import { useRouter } from '../context/RouterContext';
import { SkeletonLoader } from './ui';

export default function PwBatchBrowser({ 
  batch, 
  onBack, 
  onPlayVideo, 
  onViewPdf,
  onOpenPwLogin
}) {
  const { 
    isLectureCompleted, 
    toggleLectureComplete, 
    toggleBookmark, 
    isBookmarked, 
    isEnrolled, 
    toggleEnroll,
    pwUser,
    masterActive
  } = useCourse();
  const { route, navigate } = useRouter();

  const [loadingBatch, setLoadingBatch] = useState(true);
  const [batchDetails, setBatchDetails] = useState(null);
  const [activeSubject, setActiveSubject] = useState(null);

  const [loadingChapters, setLoadingChapters] = useState(false);
  const [chapters, setChapters] = useState([]);
  const [selectedChapter, setSelectedChapter] = useState(null);

  // Content tabs: 'videos' | 'notes' | 'dppNotes' | 'dppVideos' | 'schedule'
  const [activeTab, setActiveTab] = useState(route.tab || 'videos');
  const [loadingContent, setLoadingContent] = useState(false);
  const [contentItems, setContentItems] = useState([]);

  // Schedule
  const [scheduleItems, setScheduleItems] = useState([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);

  // Search in chapter contents
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileChapterMenuOpen, setMobileChapterMenuOpen] = useState(false);
  const [enrolling, setEnrolling] = useState(false);

  const enrolled = isEnrolled(batch?.id);

  // Clean description - guaranteed to never output raw HTML tags or styles
  const cleanDescription = useMemo(() => {
    const raw = batchDetails?.description || batch?.description || batchDetails?.rawDescription || '';
    const cleaned = stripHtml(raw);
    if (cleaned) return cleaned;
    const examInfo = (batchDetails?.exam || batch?.exam) ? `targeted for ${batchDetails?.exam || batch?.exam}` : '';
    const classInfo = (batchDetails?.class || batch?.class) ? `(Class ${batchDetails?.class || batch?.class})` : '';
    const by = (batchDetails?.byName || batch?.byName) ? `designed ${batchDetails?.byName || batch?.byName}` : 'curated by Physics Wallah';
    return `${batchDetails?.title || batch?.title || 'Physics Wallah Batch'} is an educational course ${examInfo} ${classInfo}, ${by}. Explore batch schedule, syllabus target, and enrollment information freely.`;
  }, [batchDetails?.description, batch?.description, batchDetails?.rawDescription, batchDetails?.exam, batch?.exam, batchDetails?.class, batch?.class, batchDetails?.byName, batch?.byName, batchDetails?.title, batch?.title]);

  // Formatted start and validity dates
  const formattedDates = useMemo(() => {
    const start = batchDetails?.startDate || batch?.startDate || batchDetails?.start_date || batch?.start_date;
    const end = batchDetails?.endDate || batch?.endDate || batchDetails?.end_date || batch?.end_date;
    let startStr = null;
    let endStr = null;
    try {
      if (start) startStr = new Date(start).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {}
    try {
      if (end) endStr = new Date(end).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {}
    return { startStr, endStr };
  }, [batchDetails?.startDate, batch?.startDate, batchDetails?.start_date, batch?.start_date, batchDetails?.endDate, batch?.endDate, batchDetails?.end_date, batch?.end_date]);

  // Schedule loader declared first
  const loadBatchSchedule = useCallback(async () => {
    setLoadingSchedule(true);
    try {
      const schedule = await fetchPwSchedule(batch.id);
      setScheduleItems(Array.isArray(schedule) ? schedule : []);
    } catch (err) {
      console.warn('Failed to fetch schedule:', err);
    } finally {
      setLoadingSchedule(false);
    }
  }, [batch.id]);

  // Sync route.tab
  useEffect(() => {
    if (route.tab && route.tab !== activeTab) {
      setActiveTab(route.tab);
    }
  }, [route.tab, activeTab]);

  // 1. Fetch live batch details on mount or when user authenticates
  const loadDetails = useCallback(async () => {
    setLoadingBatch(true);
    try {
      const details = await fetchPwBatchDetails(batch.id);
      setBatchDetails(details || batch);
      const subs = details?.subjects || batch?.subjects || [];
      if (subs.length > 0) {
        let targetSub = subs.find(s => !s.isResources) || subs[0];
        if (route.subjectId) {
          const matched = subs.find(s => String(s._id || s.id) === String(route.subjectId));
          if (matched) targetSub = matched;
        }
        setActiveSubject(targetSub);
      } else {
        setActiveSubject(null);
      }
    } catch (err) {
      console.error('Failed to load PW batch details:', err);
    } finally {
      setLoadingBatch(false);
    }
  }, [batch.id, batch, route.subjectId]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails, pwUser, masterActive]);

  // Handle Free Enrollment with live PW sync
  const handleEnrollToggle = async () => {
    if (!enrolled && !pwUser && !masterActive && onOpenPwLogin) {
      onOpenPwLogin();
      return;
    }

    toggleEnroll(batch.id);

    if (pwUser) {
      setEnrolling(true);
      try {
        await pwEnrollBatch(batch.id, batchDetails?.title || batch.title || 'PW Batch');
        const updated = await fetchPwBatchDetails(batch.id);
        if (updated) {
          setBatchDetails(updated);
          const subs = updated.subjects || [];
          if (subs.length > 0 && !activeSubject) {
            setActiveSubject(subs[0]);
          }
        }
      } catch (err) {
        console.warn('Live PW enrollment sync error:', err);
      } finally {
        setEnrolling(false);
      }
    }
  };

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
          const chList = Array.isArray(list) ? list : [];
          setChapters(chList);
          if (chList.length > 0) {
            let targetCh = chList[0];
            if (route.chapterId) {
              const matched = chList.find(c => String(c._id || c.id) === String(route.chapterId));
              if (matched) targetCh = matched;
            }
            setSelectedChapter(targetCh);
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
  }, [batch.id, activeSubject, route.chapterId]);

  const handlePlayVideoItem = (video) => {
    const teacherName = video.faculty || video.teacherName || getPwTeacherName(video, activeSubject?.subject || activeSubject?.subjectName || activeSubject?.name);
    const videoUrl = video.videoUrl || video.url || video.link || video.videoDetails?.videoUrl || video.videoDetails?.hls_url || '';
    const formattedItem = {
      ...video,
      id: video._id || video.id,
      entity_id: video._id || video.id,
      title: video.topic || video.title || 'Physics Wallah Lecture',
      course_id: batch.id,
      provider: 'pw',
      teacherName,
      faculty: teacherName,
      playlist: contentItems.filter(it => it.isVideoLecture !== false),
      chapterName: selectedChapter?.name || selectedChapter?.topicName || selectedChapter?.title || 'Chapter Content',
      subjectName: activeSubject?.subject || activeSubject?.subjectName || 'Subject',
      data: {
        file_url: videoUrl,
        thumbnail: video.thumbnail || video.previewImage || video.videoDetails?.image || batch.thumbnail,
        duration: video.duration || video.videoDetails?.duration || 0,
        video_type: videoUrl?.includes('youtube') ? 1 : 2
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
          const resolved = Array.isArray(items) ? items : [];
          setContentItems(resolved);

          // Deep link trigger for PDF or Video
          if (route.pdfId) {
            const matchDoc = resolved.find(d => String(d._id || d.id) === String(route.pdfId));
            if (matchDoc) handleOpenPdfItem(matchDoc);
          } else if (route.videoId) {
            const matchVid = resolved.find(v => String(v._id || v.id) === String(route.videoId));
            if (matchVid) handlePlayVideoItem(matchVid);
          }
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
  }, [batch.id, activeSubject, selectedChapter, activeTab, loadBatchSchedule]);

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return contentItems;
    const q = searchQuery.toLowerCase().trim();
    return contentItems.filter(item => {
      const t = (item.topic || item.title || item.name || '').toLowerCase();
      return t.includes(q);
    });
  }, [contentItems, searchQuery]);

  const subjectsList = batchDetails?.subjects || batch?.subjects || [];

  const handleSelectSubject = (subj) => {
    setActiveSubject(subj);
    navigate({ subjectId: String(subj._id || subj.id), chapterId: null }, { push: true });
  };

  const handleSelectChapter = (ch) => {
    setSelectedChapter(ch);
    setMobileChapterMenuOpen(false);
    navigate({ chapterId: String(ch._id || ch.id) }, { push: true });
  };

  const handleSelectTab = (tabKey) => {
    setActiveTab(tabKey);
    navigate({ tab: tabKey }, { replace: true });
  };

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
            onClick={handleEnrollToggle}
            disabled={enrolling}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 btn-press ${
              enrolled
                ? 'bg-[#457B9D]/20 text-[#A8DADC] border border-[#457B9D]/40'
                : 'bg-[#457B9D] hover:bg-[#386684] text-[#F1FAEE] shadow-sm'
            }`}
          >
            {enrolling ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#A8DADC]" />
                <span>Enrolling...</span>
              </>
            ) : enrolled ? (
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
      <div className="relative mb-6 sm:mb-8 rounded-3xl card-surface overflow-hidden p-4 sm:p-8">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-5 sm:gap-6">
          <div className="w-full md:w-64 aspect-video md:h-40 rounded-2xl overflow-hidden shrink-0 border border-[var(--color-border)] bg-[var(--color-surface-hover)] shadow-sm">
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
              {(batchDetails?.exam || batch?.exam) && (
                <span className="px-2.5 py-0.5 rounded-md bg-[#1D3557] border border-[#457B9D]/40 text-[10px] font-bold text-[#A8DADC] uppercase tracking-wider">
                  {batchDetails?.exam || batch?.exam}
                </span>
              )}
              {(batchDetails?.class || batch?.class) && (
                <span className="px-2.5 py-0.5 rounded-md bg-[var(--color-surface-hover)] border border-[var(--color-border)] text-[10px] font-semibold text-[var(--color-text-secondary)]">
                  Class {batchDetails?.class || batch?.class}
                </span>
              )}
              <span className="px-2.5 py-0.5 rounded-md bg-[var(--color-surface-hover)] text-[10px] font-semibold text-[var(--color-text-secondary)] border border-[var(--color-border)]">
                {batchDetails?.language || batch?.language || 'Hinglish'}
              </span>
              <span className="px-2.5 py-0.5 rounded-md bg-[#457B9D]/20 border border-[#457B9D]/40 text-[10px] font-bold text-[#A8DADC] uppercase tracking-wider">
                {(batchDetails?.amount === 0 || batch?.amount === 0 || !batchDetails?.amount) ? 'Free Catalogue Batch' : `Catalogue MRP: ₹${batchDetails?.amount || batch?.amount}`}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-[#F1FAEE] tracking-tight">
              {batchDetails?.title || batch?.title}
            </h1>

            <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] mt-2 line-clamp-2 max-w-3xl leading-relaxed">
              {cleanDescription}
            </p>

            <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-[var(--color-text-secondary)]">
              <div className="flex items-center gap-1.5 text-[var(--color-text-primary)]">
                <User className="w-3.5 h-3.5 text-[#A8DADC]" />
                <span>{batchDetails?.byName || batch?.byName || 'PW Faculty'}</span>
              </div>
              {formattedDates.startStr && (
                <>
                  <span>•</span>
                  <div className="flex items-center gap-1.5 text-[var(--color-text-primary)]">
                    <Calendar className="w-3.5 h-3.5 text-[#A8DADC]" />
                    <span>Starts: {formattedDates.startStr}</span>
                  </div>
                </>
              )}
              {formattedDates.endStr && (
                <>
                  <span>•</span>
                  <div className="flex items-center gap-1.5 text-[var(--color-text-primary)]">
                    <CalendarCheck className="w-3.5 h-3.5 text-[#A8DADC]" />
                    <span>Valid: {formattedDates.endStr}</span>
                  </div>
                </>
              )}
              <span>•</span>
              <div className="flex items-center gap-1.5 text-[var(--color-text-primary)]">
                <BookOpen className="w-3.5 h-3.5 text-[#A8DADC]" />
                <span>{subjectsList.length} Live Subjects</span>
              </div>
              <div className="ml-auto">
                <a
                  href={`https://www.pw.live/study/batches/${batch.id || batchDetails?.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border)] hover:border-[#457B9D] text-[11px] font-semibold text-[#A8DADC] hover:text-[#F1FAEE] transition-all btn-press"
                >
                  <span>Official PW Portal</span>
                  <ChevronRight className="w-3 h-3" />
                </a>
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
          <div className="p-6 card-surface rounded-3xl border border-[var(--color-border)] shadow-md">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 mb-5 pb-5 border-b border-[var(--color-border)]">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#1D3557] border border-[#457B9D]/40 flex items-center justify-center shrink-0">
                  <BookOpen className="w-6 h-6 text-[#A8DADC]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#F1FAEE] flex items-center gap-2">
                    <span>Batch Catalogue Overview</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#457B9D]/20 text-[#A8DADC] border border-[#457B9D]/40 font-semibold">
                      Public Catalogue Entry
                    </span>
                  </h3>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1 max-w-2xl leading-relaxed">
                    This batch is registered in the official Physics Wallah catalogue. You can explore complete course metadata, targeted exam specifications, and academic validity below.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
                <a
                  href={`https://www.pw.live/study/batches/${batch.id || batchDetails?.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-[#457B9D] hover:bg-[#386684] text-[#F1FAEE] text-xs font-bold transition-all flex items-center justify-center gap-2 btn-press shadow-sm"
                >
                  <span>Open Official Portal</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </a>
                <button
                  onClick={onBack}
                  className="px-4 py-2.5 rounded-xl bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border)] text-xs font-semibold text-[var(--color-text-primary)] transition-all flex items-center justify-center gap-1.5 btn-press"
                >
                  <span>Browse More</span>
                </button>
              </div>
            </div>

            {/* Structured Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="p-3.5 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)]">
                <span className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider block">Target Exam</span>
                <span className="text-xs font-bold text-[#F1FAEE] mt-0.5 block truncate">{batchDetails?.exam || batch?.exam || 'Comprehensive'}</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)]">
                <span className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider block">Target Class</span>
                <span className="text-xs font-bold text-[#F1FAEE] mt-0.5 block truncate">{batchDetails?.class || batch?.class ? `Class ${batchDetails?.class || batch?.class}` : 'General'}</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)]">
                <span className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider block">Medium</span>
                <span className="text-xs font-bold text-[#F1FAEE] mt-0.5 block truncate">{batchDetails?.language || batch?.language || 'Hinglish'}</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)]">
                <span className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider block">Start Date</span>
                <span className="text-xs font-bold text-[#F1FAEE] mt-0.5 block truncate">{formattedDates.startStr || 'Scheduled'}</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)]">
                <span className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider block">Valid Until</span>
                <span className="text-xs font-bold text-[#F1FAEE] mt-0.5 block truncate">{formattedDates.endStr || 'Academic Term'}</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)]">
                <span className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider block">Fee Status</span>
                <span className="text-xs font-bold text-[#A8DADC] mt-0.5 block truncate">{(batchDetails?.amount === 0 || batch?.amount === 0 || !batchDetails?.amount) ? 'Free' : `₹${batchDetails?.amount || batch?.amount}`}</span>
              </div>
            </div>

            {/* Legitimacy and Access Guidance Note */}
            <div className="mt-4 p-3.5 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] flex items-start gap-3">
              <ShieldCheck className="w-4 h-4 text-[#A8DADC] shrink-0 mt-0.5" />
              <p className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed">
                Free Educational Index: Batch information, schedule dates, and curriculum details are provided without cost. Live lecture streams, interactive doubts, and test series remain hosted on authorized Physics Wallah platforms.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none">
            {subjectsList.map((subj) => {
              const subjId = subj._id || subj.id;
              const isSelected = (activeSubject?._id || activeSubject?.id) === subjId;
              return (
                <button
                  key={subjId}
                  onClick={() => handleSelectSubject(subj)}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 shrink-0 border btn-press ${
                    isSelected
                      ? 'bg-[#457B9D] text-[#F1FAEE] border-[#457B9D] shadow-sm'
                      : 'card-surface text-[var(--color-text-secondary)] hover:text-[#F1FAEE] hover:border-[#A8DADC]'
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-[#F1FAEE]' : 'bg-[#A8DADC]'}`} />
                  <span>{subj.subject || subj.subjectName || subj.name || 'Subject'}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Content Layout: Chapters Sidebar + Content Items Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Chapters / Units List (Desktop Sidebar) */}
        <div className="hidden lg:flex lg:col-span-4 card-surface rounded-3xl p-4 sm:p-5 flex-col h-[650px]">
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
              <SkeletonLoader variant="chapter-list" count={5} />
            ) : chapters.length === 0 ? (
              !pwUser && !masterActive ? (
                <div className="text-center py-16 px-4 flex flex-col items-center justify-center text-[var(--color-text-muted)] text-xs">
                  <ShieldCheck className="w-10 h-10 text-[#A8DADC]/60 mb-2.5" />
                  <p className="font-semibold text-[var(--color-text-primary)] mb-1">Chapters Locked</p>
                  <p className="text-[11px] text-[var(--color-text-secondary)] mb-4 max-w-xs text-center">
                    Login with your PW mobile number to unlock live chapters, recordings, and study notes.
                  </p>
                  {onOpenPwLogin && (
                    <button
                      onClick={onOpenPwLogin}
                      className="px-3.5 py-1.5 rounded-xl bg-[#457B9D] hover:bg-[#386684] text-[#F1FAEE] text-xs font-bold transition-all flex items-center gap-1.5 btn-press shadow-sm"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>Connect PW Account</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-[var(--color-text-muted)] text-xs">
                  No chapters found for this subject.
                </div>
              )
            ) : (
              chapters.map((ch, idx) => {
                const chId = ch._id || ch.id;
                const isSelected = (selectedChapter?._id || selectedChapter?.id) === chId;
                const chapterTitle = ch.name || ch.topicName || ch.title || `Chapter ${idx + 1}`;

                return (
                  <button
                    key={chId || idx}
                    onClick={() => handleSelectChapter(ch)}
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
          
          {/* Mobile Chapter Selector (Visible only on mobile/tablet < lg screens) */}
          <div className="block lg:hidden card-surface rounded-2xl p-3.5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#A8DADC] uppercase tracking-wider mb-0.5">
                  <Layers className="w-3.5 h-3.5 text-[#A8DADC]" />
                  <span>
                    Chapter {selectedChapter ? `#${chapters.findIndex(c => (c._id || c.id) === (selectedChapter?._id || selectedChapter?.id)) + 1} of ${chapters.length}` : 'Selection'}
                  </span>
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-[var(--color-text-primary)] truncate">
                  {selectedChapter?.name || selectedChapter?.topicName || selectedChapter?.title || 'Select a Chapter'}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setMobileChapterMenuOpen(!mobileChapterMenuOpen)}
                className="px-3 py-1.5 rounded-xl bg-[var(--color-surface-hover)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[#F1FAEE] text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-all btn-press"
              >
                <span>{mobileChapterMenuOpen ? 'Hide' : 'Change'}</span>
                {mobileChapterMenuOpen ? (
                  <ChevronUp className="w-3.5 h-3.5 text-[#A8DADC]" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-[#A8DADC]" />
                )}
              </button>
            </div>

            {/* Collapsible Mobile Chapter List */}
            {mobileChapterMenuOpen && (
              <div className="mt-3 pt-3 border-t border-[var(--color-border)] max-h-60 overflow-y-auto space-y-1.5 custom-scrollbar pr-1 animate-in fade-in duration-150">
                {loadingChapters ? (
                  <div className="flex items-center justify-center py-6 text-[var(--color-text-secondary)]">
                    <Loader2 className="w-5 h-5 animate-spin text-[#A8DADC] mr-2" />
                    <span className="text-xs">Loading live chapters...</span>
                  </div>
                ) : chapters.length === 0 ? (
                  <div className="text-center py-4 text-xs text-[var(--color-text-muted)]">
                    {!pwUser && !masterActive ? 'PW account connection required to load chapters.' : 'No chapters found for this subject.'}
                  </div>
                ) : (
                  chapters.map((ch, idx) => {
                    const chId = ch._id || ch.id;
                    const isSelected = (selectedChapter?._id || selectedChapter?.id) === chId;
                    const chapterTitle = ch.name || ch.topicName || ch.title || `Chapter ${idx + 1}`;

                    return (
                      <button
                        key={chId || idx}
                        type="button"
                        onClick={() => handleSelectChapter(ch)}
                        className={`w-full text-left p-2.5 rounded-xl text-xs font-medium transition-all flex items-center justify-between gap-2.5 ${
                          isSelected
                            ? 'bg-[#1D3557] border border-[#457B9D] text-[#F1FAEE] font-bold shadow-sm'
                            : 'bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate min-w-0">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                            isSelected ? 'bg-[#457B9D] text-[#F1FAEE]' : 'bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)]'
                          }`}>
                            #{idx + 1}
                          </span>
                          <span className="truncate">{chapterTitle}</span>
                        </div>
                        <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-[#A8DADC]' : 'text-[var(--color-text-muted)]'}`} />
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Content Sub-Navigation Bar */}
          <div className="p-3 card-surface rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            
            {/* Content Tabs */}
            <div className="flex items-center gap-1.5 bg-[var(--color-bg)] p-1 rounded-xl border border-[var(--color-border)] overflow-x-auto scrollbar-none">
              <button
                onClick={() => handleSelectTab('videos')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-all btn-press ${
                  activeTab === 'videos'
                    ? 'bg-[#457B9D] text-[#F1FAEE] shadow-sm'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                <Video className="w-3.5 h-3.5" />
                <span>Lectures</span>
              </button>

              <button
                onClick={() => handleSelectTab('notes')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-all btn-press ${
                  activeTab === 'notes'
                    ? 'bg-[#457B9D] text-[#F1FAEE] shadow-sm'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Notes & Slides</span>
              </button>

              <button
                onClick={() => handleSelectTab('dppNotes')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-all btn-press ${
                  activeTab === 'dppNotes'
                    ? 'bg-[#457B9D] text-[#F1FAEE] shadow-sm'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>DPP Sheets</span>
              </button>

              <button
                onClick={() => handleSelectTab('dppVideos')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-all btn-press ${
                  activeTab === 'dppVideos'
                    ? 'bg-[#457B9D] text-[#F1FAEE] shadow-sm'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                <Play className="w-3.5 h-3.5" />
                <span>DPP Solutions</span>
              </button>

              <button
                onClick={() => handleSelectTab('schedule')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-all btn-press ${
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
              <div className="relative w-full sm:w-auto min-w-0 sm:min-w-[180px]">
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
                  <span>{selectedChapter?.name || selectedChapter?.topicName || selectedChapter?.title || 'Chapter Content'}</span>
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
                  <SkeletonLoader variant="content-grid" count={3} />
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
              !pwUser && !masterActive ? (
                <div className="flex-1 flex flex-col items-center justify-center py-20 text-[var(--color-text-muted)] text-xs text-center px-4">
                  <ShieldCheck className="w-12 h-12 mx-auto mb-3 text-[#A8DADC]/60" />
                  <h4 className="font-bold text-sm text-[var(--color-text-primary)] mb-1">Lectures & Notes Protected</h4>
                  <p className="text-xs text-[var(--color-text-secondary)] max-w-md mb-4 leading-relaxed">
                    Physics Wallah video streams and PDF study materials require student authentication. Connect your PW account once via OTP to start streaming lectures ad-free.
                  </p>
                  {onOpenPwLogin && (
                    <button
                      onClick={onOpenPwLogin}
                      className="px-4 py-2 rounded-xl bg-[#457B9D] hover:bg-[#386684] text-[#F1FAEE] text-xs font-bold transition-all flex items-center gap-2 btn-press shadow-md"
                    >
                      <LogIn className="w-4 h-4" />
                      <span>Connect PW Account</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center py-20 text-[var(--color-text-muted)] text-xs">
                  <Layers className="w-10 h-10 mx-auto mb-2 text-[var(--color-text-muted)]" />
                  <p>No {activeTab} available for this chapter yet.</p>
                </div>
              )
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredItems.map((item, idx) => {
                  const itemId = item._id || item.id || idx;
                  const itemTitle = item.topic || item.title || item.name || `${activeTab} ${idx + 1}`;
                  const teacher = item.faculty || item.teacherName || getPwTeacherName(item, activeSubject?.subject || activeSubject?.subjectName || activeSubject?.name);
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
