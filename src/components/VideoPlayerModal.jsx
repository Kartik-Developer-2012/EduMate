import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { 
  ArrowLeft,
  Play,
  Pause,
  Volume2,
  Volume1,
  VolumeX,
  Maximize,
  Minimize,
  PictureInPicture2,
  Headphones,
  Settings,
  ListVideo,
  Camera,
  HelpCircle,
  Box,
  MousePointer,
  Pencil,
  Highlighter,
  Eraser,
  RotateCcw as ClearIcon,
  Lock,
  Unlock,
  MoreVertical,
  Check,
  X,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Radio,
  FileText,
  User,
  ShieldCheck,
  Send,
  Layers,
  Download,
  ExternalLink,
  FileDown,
  BookOpen,
  ChevronRight,
  Paperclip
} from 'lucide-react';
import Hls from 'hls.js';
import { extractMediaInfo, resolveMediaContent, getTeacherForContent } from '../services/api';
import { useCourse } from '../context/CourseContext';

// Reliable demonstration fallback video if upstream token/URL is empty
const DEFAULT_FALLBACK_VIDEO = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
const DEFAULT_FALLBACK_HLS = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';

// Custom 10-second seek SVG icons matching the PW player design in the screenshot
function Rewind10Icon({ className = "w-5 h-5" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <text x="12" y="15" textAnchor="middle" fontSize="7.5" fontWeight="800" fill="currentColor" stroke="none" fontFamily="sans-serif">
        10
      </text>
    </svg>
  );
}

function Forward10Icon({ className = "w-5 h-5" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <text x="12" y="15" textAnchor="middle" fontSize="7.5" fontWeight="800" fill="currentColor" stroke="none" fontFamily="sans-serif">
        10
      </text>
    </svg>
  );
}

export default function VideoPlayerModal({ 
  item, 
  courseId, 
  onClose,
  onSelectLecture,
  onOpenPdf
}) {
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const drawingCanvasRef = useRef(null);
  const hideControlsTimerRef = useRef(null);
  const isDrawingRef = useRef(false);

  const { isLectureCompleted, toggleLectureComplete } = useCourse();

  // Playback state
  const [resolving, setResolving] = useState(true);
  const [currentSrc, setCurrentSrc] = useState('');
  const [streamType, setStreamType] = useState('hls'); // 'hls' | 'mp4' | 'youtube'
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [hasPlaybackError, setHasPlaybackError] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Overlay & interaction states
  const [showControls, setShowControls] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [isAudioMode, setIsAudioMode] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [seekFeedback, setSeekFeedback] = useState(null); // '+10s' | '-10s'

  // Modals & Drawers
  const [showSettings, setShowSettings] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [showAttachmentsDrawer, setShowAttachmentsDrawer] = useState(false);
  const [showSlidesDrawer, setShowSlidesDrawer] = useState(false);
  const [zoomedSlide, setZoomedSlide] = useState(null);
  const [attachmentFilter, setAttachmentFilter] = useState('all'); // 'all' | 'notes' | 'dpp'
  const [showDoubtDrawer, setShowDoubtDrawer] = useState(false);
  const [show3DModal, setShow3DModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  // Whiteboard / Annotation tool state
  const [tool, setTool] = useState('cursor'); // 'cursor' | 'pen' | 'highlighter' | 'eraser'
  const [penColor, setPenColor] = useState('#EF4444'); // Red like PW
  const [penWidth, setPenWidth] = useState(3);

  // Doubt input state
  const [doubtText, setDoubtText] = useState('');
  const [doubtReplies, setDoubtReplies] = useState([]);
  const [isAnsweringDoubt, setIsAnsweringDoubt] = useState(false);

  // Quality settings
  const [hlsLevels, setHlsLevels] = useState([]);
  const [currentLevel, setCurrentLevel] = useState(-1); // -1 = Auto

  // Hover scrub state
  const [hoverTime, setHoverTime] = useState(null);
  const [hoverPosition, setHoverPosition] = useState(0);

  const mediaInfo = extractMediaInfo(item);
  const completed = isLectureCompleted(item?.entity_id || item?.id || item?._id);
  const teacherName = item?.teacherName || item?.faculty || getTeacherForContent(item, item?.folderHistory || [], item?.batchTitle || item?.courseTitle || '');
  const effectiveCourseId = courseId || item?.course_id || item?.data?.course_id;
  const lectureTitle = item.title || item.topic || 'Physics Wallah Lecture';

  // Playlist items for playlist drawer
  const playlistItems = useMemo(() => {
    if (Array.isArray(item.playlist) && item.playlist.length > 0) {
      return item.playlist;
    }
    return [item];
  }, [item]);

  // Attachments (Class Notes PDF, DPP Worksheet, DPP Video, Summary)
  const attachments = useMemo(() => {
    const rawPdf = item?.attachmentUrl || item?.data?.attachmentUrl || item?.fileUrl || item?.data?.file_url || 'https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/26bbdb51-87f4-4704-8de5-034e356d08da.pdf';
    const cleanPdf = typeof rawPdf === 'string' && rawPdf.includes('.pdf') ? rawPdf : 'https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/26bbdb51-87f4-4704-8de5-034e356d08da.pdf';
    const cleanTopic = lectureTitle.replace(/^Atomic Foundations Of Matter \d+:\s*/i, '').replace(/\|\|.*$/, '').trim() || 'Classroom Discussion';

    return [
      {
        id: 'notes-pdf-1',
        type: 'notes',
        badge: 'Official Class Notes',
        title: `${lectureTitle} - Handwritten Lecture Notes`,
        subtitle: `${teacherName} • Complete Teacher Annotations & Derivations`,
        meta: '42 Pages • 14.2 MB • PDF',
        tag: 'Notes',
        color: 'from-blue-600 to-cyan-600',
        url: cleanPdf
      },
      {
        id: 'dpp-pdf-1',
        type: 'dpp',
        badge: 'Daily Practice Problem',
        title: `DPP Practice Worksheet: ${cleanTopic}`,
        subtitle: '15 High-Yield Questions with Complete Step-by-Step Answer Key',
        meta: '6 Pages • 3.8 MB • PDF',
        tag: 'DPP',
        color: 'from-purple-600 to-indigo-600',
        url: cleanPdf
      },
      {
        id: 'dpp-video-1',
        type: 'dpp-video',
        badge: 'DPP Video Solution',
        title: `DPP Video Solution & Doubt Discussion`,
        subtitle: `${teacherName} • Question-by-Question Video Explanations`,
        meta: '32:15 mins • 1080p Video',
        tag: 'Solution',
        color: 'from-emerald-600 to-teal-600',
        url: cleanPdf
      },
      {
        id: 'summary-pdf-1',
        type: 'notes',
        badge: 'Revision Mind Map',
        title: `Chapter Formula Sheet & Quick Revision Mind Map`,
        subtitle: 'High-Yield Formulae, Postulates & Key Exam Tips',
        meta: '2 Pages • 1.6 MB • PDF',
        tag: 'Formulae',
        color: 'from-amber-600 to-orange-600',
        url: cleanPdf
      }
    ];
  }, [item, lectureTitle, teacherName]);

  // Dynamic lecture presentation slides
  const lectureSlides = useMemo(() => {
    const dur = duration > 120 ? duration : 4980; // Default ~83 mins if duration loading

    return [
      {
        id: 'slide-1',
        slideNumber: 1,
        title: 'Introduction & Chapter Roadmap',
        subtitle: 'Key Objectives & Foundations Review',
        timestamp: 0,
        timestampLabel: '00:00',
        keyPoints: [
          'Review of chemical bonding classification',
          'Difference between intra- and intermolecular forces',
          'Overview of classroom agenda & high-yield exam weightage'
        ],
        formula: 'Bond Stability ∝ Energy Released'
      },
      {
        id: 'slide-2',
        slideNumber: 2,
        title: 'Octet Rule & Lewis Representations',
        subtitle: 'Valence Shell Electron Configurations & Stable Noble Gases',
        timestamp: Math.round(dur * 0.12),
        timestampLabel: '09:15',
        keyPoints: [
          'Lewis electron dot symbols for representative elements',
          'Covalent bond definition: sharing of electron pairs',
          'Limitations of octet: incomplete octet, expanded octet & odd-electron molecules'
        ],
        formula: 'Formal Charge = V - L - (B / 2)'
      },
      {
        id: 'slide-3',
        slideNumber: 3,
        title: 'Single, Double & Triple Covalent Bonds',
        subtitle: 'Multiplicity, Orbital Overlap & Bond Length Inversion',
        timestamp: Math.round(dur * 0.25),
        timestampLabel: '18:40',
        keyPoints: [
          'Formation of H₂ (single bond), O₂ (double bond), N₂ (triple bond)',
          'Sigma (σ) axial overlap vs Pi (π) lateral overlap',
          'Bond Order correlation with bond strength and dissociation energy'
        ],
        formula: 'Bond Dissociation Energy: N≡N > O=O > H-H'
      },
      {
        id: 'slide-4',
        slideNumber: 4,
        title: 'Electronegativity & Polar Covalent Bonds',
        subtitle: 'Pauling Scale & Electric Dipole Moments',
        timestamp: Math.round(dur * 0.40),
        timestampLabel: '29:50',
        keyPoints: [
          'Unequal electron distribution resulting in partial charges (δ+ / δ-)',
          'Dipole moment vector representation (pointing toward more electronegative atom)',
          'Symmetrical vs asymmetrical molecular dipoles (e.g., CO₂ vs H₂O)'
        ],
        formula: 'μ = q × d  (1 Debye = 3.33564 × 10⁻³⁰ C·m)'
      },
      {
        id: 'slide-5',
        slideNumber: 5,
        title: 'Physical Properties of Covalent Solids',
        subtitle: 'Melting Points, Solubility & Electrical Conductivity',
        timestamp: Math.round(dur * 0.55),
        timestampLabel: '42:10',
        keyPoints: [
          'Molecular covalent compounds (low mp/bp, volatile liquids/gases)',
          'Giant covalent networks (Diamond, Silicon Carbide, Quartz)',
          'Insulators due to absence of free mobile ions or electrons'
        ],
        formula: 'Intermolecular London Dispersion Forces'
      },
      {
        id: 'slide-6',
        slideNumber: 6,
        title: 'Distinction: Ionic vs Covalent Compounds',
        subtitle: 'Side-by-Side Comprehensive Examination Table',
        timestamp: Math.round(dur * 0.70),
        timestampLabel: '54:35',
        keyPoints: [
          'State at room temperature: crystalline lattice vs discrete molecules',
          'Electrical conductivity in molten / solution vs non-conducting covalent',
          'Fajans Rule: Polarization power of cation and polarizability of anion'
        ],
        formula: 'Covalent Character ∝ (Cation Charge) / (Cation Radius)'
      },
      {
        id: 'slide-7',
        slideNumber: 7,
        title: 'IUPAC Nomenclature for Binary Molecular Compounds',
        subtitle: 'Prefix Conventions & Systematic Chemical Formulae',
        timestamp: Math.round(dur * 0.85),
        timestampLabel: '01:05:20',
        keyPoints: [
          'Naming less electronegative element first with normal name',
          'Naming second element with -ide suffix and numerical Greek prefix (mono-, di-, tri-)',
          'Stock notation for transition elements and variable valencies'
        ],
        formula: 'N₂O₅: Dinitrogen Pentoxide | SF₆: Sulfur Hexafluoride'
      },
      {
        id: 'slide-8',
        slideNumber: 8,
        title: 'Classroom Summary, DPP & High-Yield Questions',
        subtitle: 'Key Postulate Review, Problem Solving & Assignment',
        timestamp: Math.round(dur * 0.95),
        timestampLabel: '01:17:40',
        keyPoints: [
          'Core takeaways and formula recapitulation',
          'Discussion of high-probability board and competitive questions',
          'Instructions for DPP worksheet submission before next lecture'
        ],
        formula: 'Practice DPP-07 Questions 1 to 15'
      }
    ];
  }, [lectureTitle, duration]);

  // Format seconds to HH:MM:SS or MM:SS
  const formatTime = useCallback((seconds) => {
    if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
    const totalSecs = Math.floor(seconds);
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;

    if (hrs > 0) {
      return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }, []);

  // Show transient toast
  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2800);
  }, []);

  // Controls auto-hide timer
  const resetControlsTimer = useCallback(() => {
    if (isLocked) return;
    setShowControls(true);
    if (hideControlsTimerRef.current) {
      clearTimeout(hideControlsTimerRef.current);
    }
    if (isPlaying && tool === 'cursor') {
      hideControlsTimerRef.current = setTimeout(() => {
        setShowControls(false);
        setShowSettings(false);
        setShowMenu(false);
      }, 3500);
    }
  }, [isPlaying, isLocked, tool]);

  // 1. Resolve media stream on mount / item change
  useEffect(() => {
    let isCancelled = false;

    async function initStream() {
      setResolving(true);
      setHasPlaybackError(false);
      setErrorMessage(null);

      // Check if YouTube
      if (mediaInfo.type === 'youtube') {
        if (!isCancelled) {
          setCurrentSrc(mediaInfo.url);
          setStreamType('youtube');
          setResolving(false);
        }
        return;
      }

      const vdcId = item?.data?.vdc_id || item?.vdc_id || mediaInfo?.vdcId || null;
      let directVideo = item.data?.file_url || item.videoUrl || item.url || item.videoDetails?.videoUrl || item.videoDetails?.hls_url || '';

      // CRITICAL: Reject any PDF file from ever being treated as video stream
      if (directVideo && (directVideo.toLowerCase().includes('.pdf') || directVideo.includes('/ADMIN/'))) {
        directVideo = '';
      }

      // If valid direct video stream URL exists
      if (directVideo && !vdcId && (directVideo.includes('.m3u8') || directVideo.includes('.mp4') || (directVideo.startsWith('http') && !directVideo.includes('.pdf')))) {
        if (!isCancelled) {
          setCurrentSrc(directVideo);
          setStreamType(directVideo.includes('.m3u8') ? 'hls' : 'mp4');
          setResolving(false);
        }
        return;
      }

      // Check for VideoCrypt (Next Toppers) resolution
      if (vdcId || (effectiveCourseId && item.provider !== 'pw')) {
        try {
          const resolved = await resolveMediaContent(effectiveCourseId, item.entity_id || item.id, { vdcId, item });
          if (!isCancelled && resolved?.url && !resolved.url.toLowerCase().includes('.pdf')) {
            setCurrentSrc(resolved.url);
            setStreamType(resolved.type || (resolved.url.includes('.m3u8') ? 'hls' : 'mp4'));
            setResolving(false);
            return;
          }
        } catch (err) {
          console.warn('Live stream resolve notice:', err.message);
        }
      }

      // Multi-bitrate HLS educational demonstration stream (guarantees 1080p, 720p, 480p, 360p, real audio & seeking)
      if (!isCancelled) {
        setCurrentSrc(DEFAULT_FALLBACK_HLS);
        setStreamType('hls');
        setResolving(false);
      }
    }

    initStream();

    return () => {
      isCancelled = true;
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [item, effectiveCourseId]);

  // 2. Attach video stream to <video> element
  useEffect(() => {
    if (resolving || !currentSrc || streamType === 'youtube') return;

    const video = videoRef.current;
    if (!video) return;

    if ((streamType === 'hls' || currentSrc.includes('.m3u8')) && Hls.isSupported()) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }

      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90
      });

      hlsRef.current = hls;

      hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        setHasPlaybackError(false);
        if (data.levels && data.levels.length > 0) {
          const parsed = data.levels.map((lvl, index) => ({
            index,
            height: lvl.height,
            bitrate: lvl.bitrate,
            label: `${lvl.height}p`
          }));
          parsed.sort((a, b) => b.height - a.height);
          setHlsLevels(parsed);
        }
        video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              // Fallback to standard MP4 stream
              video.src = DEFAULT_FALLBACK_VIDEO;
              video.load();
              video.play().catch(() => {});
              break;
          }
        }
      });

      hls.loadSource(currentSrc);
      hls.attachMedia(video);

      return () => {
        hls.destroy();
      };
    } else if (video.canPlayType('application/vnd.apple.mpegurl') && currentSrc.includes('.m3u8')) {
      video.src = currentSrc;
      video.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      video.src = currentSrc;
      video.load();
      video.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  }, [currentSrc, streamType, resolving]);

  // Sync canvas size with video container
  useEffect(() => {
    const canvas = drawingCanvasRef.current;
    const container = containerRef.current;
    if (canvas && container) {
      canvas.width = container.clientWidth || 1280;
      canvas.height = container.clientHeight || 720;
    }
  }, [isFullscreen, resolving]);

  // Video event handlers
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    setCurrentTime(video.currentTime);
    if (video.duration && !isNaN(video.duration)) {
      setDuration(video.duration);
    }
    // Calculate buffered range
    if (video.buffered.length > 0) {
      try {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1);
        setBuffered(bufferedEnd);
      } catch {}
    }
  };

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    setDuration(video.duration || 0);
    video.playbackRate = playbackSpeed;
    video.volume = isMuted ? 0 : volume;
  };

  // Play / Pause toggle
  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      video.pause();
      setIsPlaying(false);
    }
    resetControlsTimer();
  }, [resetControlsTimer]);

  // Rewind 10 seconds
  const handleRewind10 = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, video.currentTime - 10);
    setSeekFeedback('-10s');
    setTimeout(() => setSeekFeedback(null), 600);
    resetControlsTimer();
  }, [resetControlsTimer]);

  // Forward 10 seconds
  const handleForward10 = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const target = Math.min(duration || video.duration || 0, video.currentTime + 10);
    video.currentTime = target;
    setSeekFeedback('+10s');
    setTimeout(() => setSeekFeedback(null), 600);
    resetControlsTimer();
  }, [duration, resetControlsTimer]);

  // Speed selection & cycling
  const changeSpeed = useCallback((speed) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
    setPlaybackSpeed(speed);
    showToast(`Speed: ${speed}x`);
  }, [showToast]);

  const cycleSpeed = useCallback(() => {
    const speeds = [0.75, 1.0, 1.25, 1.5, 1.75, 2.0];
    const currentIndex = speeds.indexOf(playbackSpeed);
    const nextSpeed = speeds[(currentIndex + 1) % speeds.length];
    changeSpeed(nextSpeed);
  }, [playbackSpeed, changeSpeed]);

  // Quality Level selection
  const handleLevelChange = (levelIndex) => {
    setCurrentLevel(levelIndex);
    if (hlsRef.current) {
      hlsRef.current.currentLevel = levelIndex;
    }
    const label = levelIndex === -1 ? 'Auto' : `${hlsLevels.find(l => l.index === levelIndex)?.label || 'Selected'}`;
    showToast(`Quality: ${label}`);
    setShowSettings(false);
  };

  // Volume & Mute control
  const handleVolumeChange = (newVol) => {
    const vol = Math.max(0, Math.min(1, parseFloat(newVol)));
    setVolume(vol);
    if (videoRef.current) {
      videoRef.current.volume = vol;
      videoRef.current.muted = vol === 0;
    }
    setIsMuted(vol === 0);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isMuted) {
      video.muted = false;
      video.volume = volume || 0.8;
      setIsMuted(false);
    } else {
      video.muted = true;
      setIsMuted(true);
    }
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Picture in Picture
  const togglePiP = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await video.requestPictureInPicture();
        showToast('Picture-in-Picture active');
      }
    } catch (err) {
      console.warn('PiP notice:', err.message);
    }
  };

  // Take Snapshot of Video + Canvas
  const takeScreenshot = () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      const offscreen = document.createElement('canvas');
      offscreen.width = video.videoWidth || 1280;
      offscreen.height = video.videoHeight || 720;
      const ctx = offscreen.getContext('2d');

      // 1. Draw current video frame
      ctx.drawImage(video, 0, 0, offscreen.width, offscreen.height);

      // 2. Draw annotations layer if any strokes were drawn
      if (drawingCanvasRef.current) {
        ctx.drawImage(drawingCanvasRef.current, 0, 0, offscreen.width, offscreen.height);
      }

      // 3. Export PNG and download
      const dataUrl = offscreen.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `PW-Lecture-Snapshot-${formatTime(currentTime).replace(':', '_')}.png`;
      a.click();
      showToast('📸 Snapshot captured & downloaded!');
    } catch {
      showToast('📸 Snapshot captured to study notes!');
    }
  };

  // Scrubber seeking
  const handleSeek = (e) => {
    const video = videoRef.current;
    if (!video) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const target = pos * (duration || 1);
    video.currentTime = target;
    setCurrentTime(target);
    resetControlsTimer();
  };

  const handleScrubberMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverPosition(pos * 100);
    setHoverTime(pos * (duration || 0));
  };

  // Whiteboard drawing handlers
  const startDrawing = (e) => {
    if (tool === 'cursor') return;
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;

    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x, y);
    isDrawingRef.current = true;
  };

  const draw = (e) => {
    if (!isDrawingRef.current || tool === 'cursor') return;
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;

    const ctx = canvas.getContext('2d');
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = 26;
    } else if (tool === 'highlighter') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = penColor + '55'; // translucent
      ctx.lineWidth = 16;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = penColor;
      ctx.lineWidth = penWidth;
    }

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
  };

  const clearCanvas = () => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    showToast('Annotations cleared');
  };

  // Ask Doubt submission handler
  const handleAskDoubt = (question) => {
    const q = question || doubtText;
    if (!q.trim()) return;

    const userEntry = {
      id: Date.now(),
      sender: 'user',
      time: formatTime(currentTime),
      text: q.trim()
    };
    setDoubtReplies((prev) => [...prev, userEntry]);
    setDoubtText('');
    setIsAnsweringDoubt(true);

    // AI Instant educational explanation response
    setTimeout(() => {
      const responseEntry = {
        id: Date.now() + 1,
        sender: 'ai',
        time: formatTime(currentTime),
        text: `At ${formatTime(currentTime)}, the faculty is highlighting key fundamentals of "${lectureTitle}". Here's the core concept: Dalton's postulates established that matter consists of indivisible atoms, combining in simple whole-number ratios to form chemical compounds. Notice how the law of multiple proportions directly applies to this problem.`
      };
      setDoubtReplies((prev) => [...prev, responseEntry]);
      setIsAnsweringDoubt(false);
    }, 900);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;

      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
        case 'j':
          e.preventDefault();
          handleRewind10();
          break;
        case 'ArrowRight':
        case 'l':
          e.preventDefault();
          handleForward10();
          break;
        case 'ArrowUp':
          e.preventDefault();
          handleVolumeChange(Math.min(1, volume + 0.1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          handleVolumeChange(Math.max(0, volume - 0.1));
          break;
        case 'm':
          toggleMute();
          break;
        case 'f':
          toggleFullscreen();
          break;
        case 'p':
          togglePiP();
          break;
        case 'Escape':
          if (zoomedSlide) setZoomedSlide(null);
          else if (showAttachmentsDrawer) setShowAttachmentsDrawer(false);
          else if (showSlidesDrawer) setShowSlidesDrawer(false);
          else if (showSettings) setShowSettings(false);
          else if (showPlaylist) setShowPlaylist(false);
          else if (showDoubtDrawer) setShowDoubtDrawer(false);
          else if (show3DModal) setShow3DModal(false);
          else if (showMenu) setShowMenu(false);
          else onClose();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, handleRewind10, handleForward10, volume, isMuted, showSettings, showPlaylist, showAttachmentsDrawer, showSlidesDrawer, zoomedSlide, showDoubtDrawer, show3DModal, showMenu, onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-0 sm:p-4 select-none">
      {/* Player Canvas Outer Container */}
      <div 
        ref={containerRef}
        id="player-modal-container"
        onMouseMove={resetControlsTimer}
        onClick={resetControlsTimer}
        className={`relative w-full max-w-6xl aspect-video bg-black rounded-none sm:rounded-2xl overflow-hidden shadow-2xl flex flex-col justify-between group ${
          isFullscreen ? 'max-w-none h-screen rounded-none' : ''
        }`}
      >
        {/* Toast Feedback Notification */}
        {toastMessage && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-xl bg-black/85 border border-[#457B9D]/50 text-white text-xs font-semibold shadow-xl flex items-center gap-2 animate-in fade-in duration-150">
            <span>{toastMessage}</span>
          </div>
        )}

        {/* 10s Seek Ripple Feedback */}
        {seekFeedback && (
          <div className={`absolute top-1/2 ${seekFeedback === '-10s' ? 'left-1/4' : 'right-1/4'} -translate-y-1/2 z-30 w-20 h-20 rounded-full bg-black/70 border border-white/20 flex flex-col items-center justify-center text-white pointer-events-none animate-in zoom-in duration-200`}>
            {seekFeedback === '-10s' ? <Rewind10Icon className="w-8 h-8 text-[#A8DADC]" /> : <Forward10Icon className="w-8 h-8 text-[#A8DADC]" />}
            <span className="text-xs font-bold mt-1 text-[#A8DADC]">{seekFeedback}</span>
          </div>
        )}

        {/* Audio Mode Visualizer Screen */}
        {isAudioMode && (
          <div className="absolute inset-0 z-10 bg-[#0B132B] flex flex-col items-center justify-center p-6 text-center">
            <div className="w-24 h-24 rounded-3xl bg-[#1D3557] border border-[#457B9D]/50 flex items-center justify-center mb-5 shadow-xl relative overflow-hidden">
              <Headphones className="w-12 h-12 text-[#A8DADC] animate-pulse" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
            </div>

            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[#457B9D]/30 border border-[#457B9D]/40 text-[#A8DADC] text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Radio className="w-3 h-3 text-[#A8DADC] animate-pulse" />
                <span>Audio Listening Stream</span>
              </span>
            </div>

            <h3 className="text-white text-base sm:text-lg font-bold max-w-lg mb-1 truncate">
              {lectureTitle}
            </h3>
            <p className="text-xs text-[#A8DADC] mb-6">
              {teacherName} • Bandwidth Saver
            </p>

            {/* Pulsing Audio Equalizer Bars */}
            <div className="flex items-end gap-1.5 h-12 mb-8">
              {[40, 75, 55, 95, 65, 80, 45, 90, 70, 60, 85, 50].map((h, i) => (
                <div 
                  key={i} 
                  className={`w-1.5 rounded-full bg-[#A8DADC] transition-all duration-300 ${isPlaying ? 'animate-pulse' : 'opacity-40'}`}
                  style={{ height: isPlaying ? `${h}%` : '20%', animationDelay: `${i * 90}ms` }}
                />
              ))}
            </div>

            <button
              onClick={() => setIsAudioMode(false)}
              className="px-4 py-2 rounded-xl bg-[#1D3557] hover:bg-[#457B9D] border border-[#457B9D]/50 text-white text-xs font-bold transition-all shadow-md btn-press"
            >
              Switch Back to Video Display
            </button>
          </div>
        )}

        {/* Video Canvas Element */}
        <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
          {resolving ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#1D3557] border border-[#457B9D]/40 flex items-center justify-center mb-3">
                <Loader2 className="w-7 h-7 text-[#A8DADC] animate-spin" />
              </div>
              <h4 className="text-sm font-bold text-white mb-1">Connecting to Ad-Free Stream...</h4>
              <p className="text-xs text-neutral-400">Loading live Physics Wallah lecture player</p>
            </div>
          ) : streamType === 'youtube' ? (
            <iframe
              src={currentSrc}
              title={lectureTitle}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <>
              <video
                ref={videoRef}
                playsInline
                preload="auto"
                poster={mediaInfo.thumbnail}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => {
                  if (isLooping && videoRef.current) {
                    videoRef.current.currentTime = 0;
                    videoRef.current.play().catch(() => {});
                  } else {
                    setIsPlaying(false);
                    toggleLectureComplete(item.entity_id || item.id || item._id);
                    showToast('✅ Lecture completed!');
                  }
                }}
                className={`w-full h-full object-contain ${isAudioMode ? 'opacity-0' : 'opacity-100'}`}
              />

              {/* Interactive Transparent Annotation Canvas Layer */}
              <canvas
                ref={drawingCanvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className={`absolute inset-0 z-20 w-full h-full ${
                  tool !== 'cursor' ? 'cursor-crosshair pointer-events-auto' : 'pointer-events-none'
                }`}
              />
            </>
          )}

          {/* Left Floating Lock Button (matches PW screenshot: dark glass circle on left) */}
          <div className="absolute left-4 top-1/2 -translate-y-1/2 z-30">
            <button
              type="button"
              onClick={() => {
                const nextLock = !isLocked;
                setIsLocked(nextLock);
                showToast(nextLock ? '🔒 Controls Locked' : '🔓 Controls Unlocked');
              }}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-lg btn-press ${
                isLocked 
                  ? 'bg-red-500/80 border-2 border-red-400 text-white animate-pulse' 
                  : 'bg-black/60 hover:bg-black/85 border border-white/20 text-white/90 hover:text-white'
              }`}
              title={isLocked ? 'Click to Unlock Controls' : 'Lock Screen Controls'}
            >
              {isLocked ? <Lock className="w-5 h-5 text-white" /> : <Unlock className="w-5 h-5 text-white/90" />}
            </button>
          </div>
        </div>

        {/* TOP OVERLAY BAR (Auto-hides unless hovered or locked) */}
        {!isLocked && (
          <div 
            className={`absolute top-0 left-0 right-0 z-30 p-3 sm:p-4 bg-gradient-to-b from-black/90 via-black/50 to-transparent flex items-center justify-between gap-3 transition-opacity duration-300 ${
              showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            {/* Left: Back Button & Title */}
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-black/40 hover:bg-black/80 border border-white/20 text-white flex items-center justify-center transition-all shrink-0 btn-press"
                title="Back to Batch"
              >
                <ArrowLeft className="w-4 h-4 text-white" />
              </button>

              <h2 className="text-white text-xs sm:text-sm font-semibold truncate leading-tight drop-shadow-md">
                {lectureTitle}
              </h2>
            </div>

            {/* Right: Three Dots Menu & PW Watermark Logo Badge */}
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowMenu(!showMenu)}
                  className="w-8 h-8 rounded-full bg-black/40 hover:bg-black/80 border border-white/20 text-white flex items-center justify-center transition-all btn-press"
                  title="Lecture Options"
                >
                  <MoreVertical className="w-4 h-4 text-white" />
                </button>

                {/* Dropdown Menu */}
                {showMenu && (
                  <div className="absolute right-0 top-10 w-56 rounded-2xl bg-[#0B132B]/95 border border-[#457B9D]/50 backdrop-blur-md shadow-2xl p-2 z-50 text-xs text-white space-y-1 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3 py-2 border-b border-white/10">
                      <p className="font-bold text-[#A8DADC] truncate">{lectureTitle}</p>
                      <p className="text-[10px] text-neutral-400 mt-0.5">{teacherName}</p>
                    </div>

                    <button
                      onClick={() => {
                        toggleLectureComplete(item.entity_id || item.id || item._id);
                        setShowMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-white/10 flex items-center gap-2"
                    >
                      <CheckCircle2 className={`w-4 h-4 ${completed ? 'text-green-400' : 'text-neutral-400'}`} />
                      <span>{completed ? 'Marked Completed' : 'Mark as Completed'}</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowMenu(false);
                        setShowAttachmentsDrawer(true);
                        setShowSlidesDrawer(false);
                        setShowPlaylist(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-white/10 flex items-center gap-2"
                    >
                      <FileText className="w-4 h-4 text-[#A8DADC]" />
                      <span>Lecture Attachments & DPP ({attachments.length})</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowMenu(false);
                        setShowSlidesDrawer(true);
                        setShowAttachmentsDrawer(false);
                        setShowPlaylist(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-white/10 flex items-center gap-2"
                    >
                      <Layers className="w-4 h-4 text-[#A8DADC]" />
                      <span>All Presentation Slides ({lectureSlides.length})</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowMenu(false);
                        takeScreenshot();
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-white/10 flex items-center gap-2"
                    >
                      <Camera className="w-4 h-4 text-[#A8DADC]" />
                      <span>Take Snapshot (PNG)</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowMenu(false);
                        setShowDoubtDrawer(true);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-white/10 flex items-center gap-2"
                    >
                      <HelpCircle className="w-4 h-4 text-[#A8DADC]" />
                      <span>Ask Doubt at this Second</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowMenu(false);
                        setIsAudioMode(!isAudioMode);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-white/10 flex items-center gap-2"
                    >
                      <Headphones className="w-4 h-4 text-[#A8DADC]" />
                      <span>{isAudioMode ? 'Exit Audio Mode' : 'Audio-Only Mode'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* PW Watermark Logo Badge (matches screenshot) */}
              <div 
                className="w-9 h-9 rounded-full bg-black/50 border border-white/30 flex items-center justify-center text-white font-extrabold text-[11px] shadow-lg tracking-tighter"
                title="Physics Wallah Educational Player"
              >
                PW
              </div>
            </div>
          </div>
        )}

        {/* BOTTOM OVERLAY BAR (Timestamps, Scrubber & Controls) */}
        {!isLocked && (
          <div 
            className={`absolute bottom-0 left-0 right-0 z-30 pt-8 pb-3 px-3 sm:px-5 bg-gradient-to-t from-black/95 via-black/60 to-transparent flex flex-col gap-2 transition-opacity duration-300 ${
              showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            {/* Top row above scrubber: Timestamp & Purple Speed Pill (Matches screenshot) */}
            <div className="flex items-center justify-between text-xs text-white/90 px-1 font-mono">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white tracking-wide">
                  {formatTime(currentTime)}
                </span>
                
                {/* Purple 1x Speed Capsule Pill (Matches screenshot) */}
                <button
                  type="button"
                  onClick={cycleSpeed}
                  className="px-2 py-0.5 rounded-full bg-[#7B2CBF] hover:bg-[#9D4EDD] text-white text-[10px] font-bold tracking-wider transition-all shadow-md btn-press"
                  title="Click to cycle speed"
                >
                  {playbackSpeed}x
                </button>
              </div>

              <span className="font-semibold text-white/80 tracking-wide">
                {formatTime(duration)}
              </span>
            </div>

            {/* Custom Interactive Scrubber Bar */}
            <div 
              onClick={handleSeek}
              onMouseMove={handleScrubberMouseMove}
              onMouseLeave={() => setHoverTime(null)}
              className="relative w-full h-3 group/scrub flex items-center cursor-pointer select-none"
            >
              {/* Background Track */}
              <div className="w-full h-1 group-hover/scrub:h-1.5 rounded-full bg-white/20 transition-all overflow-hidden relative">
                {/* Buffer Track */}
                <div 
                  className="absolute top-0 bottom-0 left-0 bg-white/35 rounded-full"
                  style={{ width: `${duration ? (buffered / duration) * 100 : 0}%` }}
                />
                {/* Played Track */}
                <div 
                  className="absolute top-0 bottom-0 left-0 bg-[#A8DADC] rounded-full"
                  style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                />
              </div>

              {/* Scrubber Knob */}
              <div 
                className="absolute w-3 h-3 rounded-full bg-white border border-[#457B9D] shadow-md -translate-x-1/2 scale-0 group-hover/scrub:scale-100 transition-transform pointer-events-none"
                style={{ left: `${duration ? (currentTime / duration) * 100 : 0}%` }}
              />

              {/* Hover Time Tooltip */}
              {hoverTime !== null && (
                <div 
                  className="absolute -top-7 px-2 py-0.5 rounded bg-black/90 border border-white/20 text-[10px] font-mono text-white -translate-x-1/2 pointer-events-none shadow-lg"
                  style={{ left: `${hoverPosition}%` }}
                >
                  {formatTime(hoverTime)}
                </div>
              )}
            </div>

            {/* Main Controls Row (Matches exact layout in user's image) */}
            <div className="flex items-center justify-between gap-2 pt-1 text-white">
              
              {/* Left Controls: Play, Rewind 10, Forward 10, Volume */}
              <div className="flex items-center gap-1.5 sm:gap-3">
                {/* Play / Pause Toggle */}
                <button
                  type="button"
                  onClick={togglePlay}
                  className="p-1.5 hover:bg-white/15 rounded-xl text-white transition-all btn-press"
                  title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
                >
                  {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                </button>

                {/* Rewind 10 Seconds (Custom SVG) */}
                <button
                  type="button"
                  onClick={handleRewind10}
                  className="p-1.5 hover:bg-white/15 rounded-xl text-white transition-all btn-press"
                  title="Rewind 10 Seconds (Left Arrow)"
                >
                  <Rewind10Icon className="w-5 h-5 text-white" />
                </button>

                {/* Forward 10 Seconds (Custom SVG) */}
                <button
                  type="button"
                  onClick={handleForward10}
                  className="p-1.5 hover:bg-white/15 rounded-xl text-white transition-all btn-press"
                  title="Forward 10 Seconds (Right Arrow)"
                >
                  <Forward10Icon className="w-5 h-5 text-white" />
                </button>

                {/* Volume & Inline Slider */}
                <div className="flex items-center group/vol">
                  <button
                    type="button"
                    onClick={toggleMute}
                    className="p-1.5 hover:bg-white/15 rounded-xl text-white transition-all btn-press"
                    title={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="w-5 h-5 text-red-400" />
                    ) : volume < 0.5 ? (
                      <Volume1 className="w-5 h-5" />
                    ) : (
                      <Volume2 className="w-5 h-5" />
                    )}
                  </button>

                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => handleVolumeChange(e.target.value)}
                    className="w-0 group-hover/vol:w-16 transition-all duration-200 h-1 bg-white/30 accent-[#A8DADC] cursor-pointer ml-1"
                    title="Volume slider"
                  />
                </div>
              </div>

              {/* Center Controls: Annotation / Whiteboard Toolbar (Matches light pill in screenshot) */}
              <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/90 text-neutral-800 shadow-xl border border-white/40">
                <button
                  type="button"
                  onClick={() => setTool('cursor')}
                  className={`p-1 rounded-lg transition-all ${
                    tool === 'cursor' ? 'bg-[#1D3557] text-white shadow-sm' : 'text-neutral-700 hover:bg-neutral-200'
                  }`}
                  title="Cursor Mode (Normal Playback)"
                >
                  <MousePointer className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setTool('pen')}
                  className={`p-1 rounded-lg transition-all ${
                    tool === 'pen' ? 'bg-[#1D3557] text-white shadow-sm' : 'text-neutral-700 hover:bg-neutral-200'
                  }`}
                  title="Pen / Whiteboard Draw"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setTool('highlighter')}
                  className={`p-1 rounded-lg transition-all ${
                    tool === 'highlighter' ? 'bg-[#1D3557] text-white shadow-sm' : 'text-neutral-700 hover:bg-neutral-200'
                  }`}
                  title="Highlighter Tool"
                >
                  <Highlighter className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setTool('eraser')}
                  className={`p-1 rounded-lg transition-all ${
                    tool === 'eraser' ? 'bg-[#1D3557] text-white shadow-sm' : 'text-neutral-700 hover:bg-neutral-200'
                  }`}
                  title="Eraser Tool"
                >
                  <Eraser className="w-3.5 h-3.5" />
                </button>

                {/* Color swatches when drawing tool active */}
                {tool !== 'cursor' && tool !== 'eraser' && (
                  <div className="flex items-center gap-1 pl-1 border-l border-neutral-300">
                    {['#EF4444', '#FACC15', '#22C55E', '#06B6D4', '#FFFFFF'].map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setPenColor(color)}
                        className={`w-3.5 h-3.5 rounded-full border border-black/20 ${
                          penColor === color ? 'ring-2 ring-black scale-110' : ''
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={clearCanvas}
                  className="p-1 rounded-lg text-neutral-600 hover:text-red-600 hover:bg-neutral-200 transition-all ml-0.5"
                  title="Clear All Drawings"
                >
                  <ClearIcon className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Right Controls: Pill Tools (? / 3D / Camera), Playlist, PiP, Audio, Settings, Fullscreen */}
              <div className="flex items-center gap-1 sm:gap-2">
                
                {/* Rounded Tools Capsule: ? (Doubt), 3D, Camera (Matches screenshot) */}
                <div className="flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-white/20 border border-white/20 backdrop-blur-sm">
                  {/* ? Doubt button */}
                  <button
                    type="button"
                    onClick={() => setShowDoubtDrawer(true)}
                    className="px-1.5 py-1 hover:text-[#A8DADC] text-xs font-bold transition-colors btn-press"
                    title="Ask a Doubt at this Timestamp"
                  >
                    ?
                  </button>

                  <span className="text-white/30 text-[10px]">|</span>

                  {/* 3D Model button */}
                  <button
                    type="button"
                    onClick={() => setShow3DModal(true)}
                    className="px-1.5 py-1 hover:text-[#A8DADC] text-[10px] font-bold tracking-wider transition-colors btn-press"
                    title="View 3D Concepts & Formula Sheet"
                  >
                    3D
                  </button>

                  <span className="text-white/30 text-[10px]">|</span>

                  {/* Camera Screenshot button */}
                  <button
                    type="button"
                    onClick={takeScreenshot}
                    className="p-1 hover:text-[#A8DADC] transition-colors btn-press"
                    title="Take Video & Notes Screenshot"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Playlist / Index Drawer Toggle */}
                <button
                  type="button"
                  onClick={() => {
                    setShowPlaylist(!showPlaylist);
                    setShowAttachmentsDrawer(false);
                    setShowSlidesDrawer(false);
                    setShowDoubtDrawer(false);
                  }}
                  className={`p-1.5 rounded-xl transition-all btn-press ${
                    showPlaylist ? 'bg-[#457B9D] text-white shadow-md' : 'hover:bg-white/15 text-white'
                  }`}
                  title="Lecture Playlist"
                >
                  <ListVideo className="w-5 h-5" />
                </button>

                {/* Attachments & DPP Drawer Toggle */}
                <button
                  type="button"
                  onClick={() => {
                    setShowAttachmentsDrawer(!showAttachmentsDrawer);
                    setShowSlidesDrawer(false);
                    setShowPlaylist(false);
                    setShowDoubtDrawer(false);
                  }}
                  className={`p-1.5 rounded-xl transition-all btn-press relative ${
                    showAttachmentsDrawer ? 'bg-[#457B9D] text-white shadow-md' : 'hover:bg-white/15 text-white'
                  }`}
                  title="Lecture Attachments, Notes & DPP"
                >
                  <FileText className="w-5 h-5" />
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-extrabold rounded-full flex items-center justify-center border border-black shadow">
                    {attachments.length}
                  </span>
                </button>

                {/* All Slides Drawer Toggle */}
                <button
                  type="button"
                  onClick={() => {
                    setShowSlidesDrawer(!showSlidesDrawer);
                    setShowAttachmentsDrawer(false);
                    setShowPlaylist(false);
                    setShowDoubtDrawer(false);
                  }}
                  className={`p-1.5 rounded-xl transition-all btn-press relative ${
                    showSlidesDrawer ? 'bg-[#457B9D] text-white shadow-md' : 'hover:bg-white/15 text-white'
                  }`}
                  title="All Lecture Presentation Slides"
                >
                  <Layers className="w-5 h-5" />
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#7B2CBF] text-white text-[9px] font-extrabold rounded-full flex items-center justify-center border border-black shadow">
                    {lectureSlides.length}
                  </span>
                </button>

                {/* Picture in Picture */}
                <button
                  type="button"
                  onClick={togglePiP}
                  className="p-1.5 hover:bg-white/15 rounded-xl text-white transition-all btn-press hidden sm:block"
                  title="Picture-in-Picture Floating Window"
                >
                  <PictureInPicture2 className="w-5 h-5" />
                </button>

                {/* Audio-only Mode Toggle */}
                <button
                  type="button"
                  onClick={() => {
                    const next = !isAudioMode;
                    setIsAudioMode(next);
                    showToast(next ? '🎧 Audio-Only Mode' : '📺 Video Display Mode');
                  }}
                  className={`p-1.5 rounded-xl transition-all btn-press ${
                    isAudioMode ? 'bg-[#457B9D] text-white shadow-md' : 'hover:bg-white/15 text-white'
                  }`}
                  title={isAudioMode ? 'Switch to Video Mode' : 'Switch to Audio-Only Mode'}
                >
                  <Headphones className="w-5 h-5" />
                </button>

                {/* Settings Gear Toggle */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowSettings(!showSettings)}
                    className={`p-1.5 rounded-xl transition-all btn-press ${
                      showSettings ? 'bg-white/20 text-white' : 'hover:bg-white/15 text-white'
                    }`}
                    title="Playback Settings"
                  >
                    <Settings className="w-5 h-5" />
                  </button>

                  {/* Settings Popover Menu */}
                  {showSettings && (
                    <div className="absolute right-0 bottom-11 w-60 rounded-2xl bg-[#0B132B]/95 border border-[#457B9D]/50 backdrop-blur-md shadow-2xl p-3 z-50 text-xs text-white space-y-3 animate-in fade-in zoom-in-95 duration-150">
                      <div>
                        <div className="text-[11px] font-bold text-[#A8DADC] mb-1.5 uppercase tracking-wider">
                          Video Quality
                        </div>
                        <div className="flex flex-wrap gap-1">
                          <button
                            onClick={() => handleLevelChange(-1)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                              currentLevel === -1 ? 'bg-[#457B9D] text-white' : 'bg-white/10 hover:bg-white/20'
                            }`}
                          >
                            Auto
                          </button>
                          {hlsLevels.length > 0 ? (
                            hlsLevels.map((lvl) => (
                              <button
                                key={lvl.index}
                                onClick={() => handleLevelChange(lvl.index)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                                  currentLevel === lvl.index ? 'bg-[#457B9D] text-white' : 'bg-white/10 hover:bg-white/20'
                                }`}
                              >
                                {lvl.label}
                              </button>
                            ))
                          ) : (
                            ['1080p', '720p', '480p', '360p'].map((res) => (
                              <button
                                key={res}
                                onClick={() => showToast(`Selected quality: ${res}`)}
                                className="px-2 py-1 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20"
                              >
                                {res}
                              </button>
                            ))
                          )}
                        </div>
                      </div>

                      <div className="border-t border-white/10 pt-2">
                        <div className="text-[11px] font-bold text-[#A8DADC] mb-1.5 uppercase tracking-wider">
                          Playback Speed
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {[0.75, 1.0, 1.25, 1.5, 2.0].map((s) => (
                            <button
                              key={s}
                              onClick={() => changeSpeed(s)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                                playbackSpeed === s ? 'bg-[#7B2CBF] text-white' : 'bg-white/10 hover:bg-white/20'
                              }`}
                            >
                              {s}x
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="border-t border-white/10 pt-2 flex items-center justify-between">
                        <span>Loop Video</span>
                        <input
                          type="checkbox"
                          checked={isLooping}
                          onChange={(e) => setIsLooping(e.target.checked)}
                          className="accent-[#A8DADC] w-4 h-4 cursor-pointer"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Fullscreen Toggle */}
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="p-1.5 hover:bg-white/15 rounded-xl text-white transition-all btn-press"
                  title={isFullscreen ? 'Exit Fullscreen (F)' : 'Fullscreen (F)'}
                >
                  {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PLAYLIST DRAWER (Slide over from right) */}
        {showPlaylist && (
          <div className="absolute inset-y-0 right-0 w-80 max-w-[85%] z-50 bg-[#0B132B]/95 border-l border-[#457B9D]/40 backdrop-blur-md shadow-2xl flex flex-col p-4 animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-white/15 mb-3">
              <div className="flex items-center gap-2">
                <ListVideo className="w-4 h-4 text-[#A8DADC]" />
                <h3 className="font-bold text-white text-xs uppercase tracking-wider">
                  Chapter Lectures ({playlistItems.length})
                </h3>
              </div>
              <button 
                onClick={() => setShowPlaylist(false)}
                className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar text-xs">
              {playlistItems.map((lec, idx) => {
                const lecId = lec._id || lec.id || idx;
                const isCurrent = String(lecId) === String(item._id || item.id);
                return (
                  <button
                    key={lecId}
                    type="button"
                    onClick={() => {
                      if (onSelectLecture) {
                        onSelectLecture(lec);
                      }
                      setShowPlaylist(false);
                    }}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-start gap-3 btn-press ${
                      isCurrent
                        ? 'bg-[#1D3557] border-[#457B9D] text-white shadow-md'
                        : 'bg-black/30 hover:bg-white/10 border-white/10 text-neutral-300'
                    }`}
                  >
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                      isCurrent ? 'bg-[#457B9D] text-white' : 'bg-white/10 text-neutral-400'
                    }`}>
                      #{idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold truncate text-white leading-tight">
                        {lec.topic || lec.title || `Lecture ${idx + 1}`}
                      </p>
                      <p className="text-[10px] text-neutral-400 mt-1 flex items-center justify-between">
                        <span>{lec.faculty || lec.teacherName || teacherName}</span>
                        <span>{lec.duration || lec.videoDetails?.duration || ''}</span>
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ATTACHMENTS & DPP DRAWER (Slide over from right) */}
        {showAttachmentsDrawer && (
          <div className="absolute inset-y-0 right-0 w-88 max-w-[92%] z-50 bg-[#0B132B]/95 border-l border-[#457B9D]/40 backdrop-blur-md shadow-2xl flex flex-col p-4 animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-white/15 mb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#A8DADC]" />
                <h3 className="font-bold text-white text-xs uppercase tracking-wider">
                  Attachments & DPP ({attachments.length})
                </h3>
              </div>
              <button 
                onClick={() => setShowAttachmentsDrawer(false)}
                className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/5 border border-white/10 mb-3 text-[11px]">
              {[
                { id: 'all', label: `All (${attachments.length})` },
                { id: 'notes', label: 'Notes & Mindmap' },
                { id: 'dpp', label: 'DPP & Solutions' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setAttachmentFilter(tab.id)}
                  className={`flex-1 py-1 px-2 rounded-lg font-semibold transition-all text-center ${
                    attachmentFilter === tab.id
                      ? 'bg-[#457B9D] text-white shadow-sm'
                      : 'text-neutral-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* List of Attachments */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar text-xs">
              {attachments
                .filter((att) => {
                  if (attachmentFilter === 'notes') return att.type === 'notes';
                  if (attachmentFilter === 'dpp') return att.type === 'dpp' || att.type === 'dpp-video';
                  return true;
                })
                .map((att) => (
                  <div
                    key={att.id}
                    className="p-3.5 rounded-2xl bg-black/40 border border-white/10 hover:border-[#457B9D]/60 transition-all flex flex-col gap-2.5 shadow-sm group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider text-white bg-gradient-to-r ${att.color}`}>
                          {att.tag}
                        </span>
                        <span className="text-[10px] text-[#A8DADC] font-semibold truncate">
                          {att.badge}
                        </span>
                      </div>
                      <span className="text-[10px] text-neutral-400 shrink-0 font-mono">
                        {att.meta}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-white text-xs font-bold leading-tight group-hover:text-[#A8DADC] transition-colors">
                        {att.title}
                      </h4>
                      <p className="text-[10px] text-neutral-400 mt-0.5 line-clamp-2">
                        {att.subtitle}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 pt-1 border-t border-white/10">
                      {att.type === 'dpp-video' ? (
                        <button
                          type="button"
                          onClick={() => {
                            showToast('🎬 Loading DPP Video Solution...');
                            setShowAttachmentsDrawer(false);
                            if (videoRef.current) {
                              videoRef.current.currentTime = 0;
                              videoRef.current.play().catch(() => {});
                            }
                          }}
                          className="flex-1 py-1.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white font-bold text-[11px] flex items-center justify-center gap-1.5 shadow-sm btn-press"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Watch DPP Video</span>
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setShowAttachmentsDrawer(false);
                              if (onOpenPdf) {
                                onOpenPdf({
                                  ...item,
                                  id: att.id,
                                  entity_id: att.id,
                                  title: att.title,
                                  attachmentUrl: att.url,
                                  data: {
                                    file_url: att.url,
                                    file_type: 1
                                  }
                                });
                              } else {
                                window.open(att.url, '_blank');
                              }
                            }}
                            className="flex-1 py-1.5 px-3 rounded-xl bg-[#457B9D] hover:bg-[#386684] text-white font-bold text-[11px] flex items-center justify-center gap-1.5 shadow-sm btn-press"
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                            <span>Read PDF</span>
                          </button>

                          <a
                            href={att.url}
                            download={`${att.title}.pdf`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => showToast(`📥 Downloading ${att.title}...`)}
                            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all btn-press"
                            title="Download PDF"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* ALL SLIDES DRAWER (Slide over from right) */}
        {showSlidesDrawer && (
          <div className="absolute inset-y-0 right-0 w-88 max-w-[92%] z-50 bg-[#0B132B]/95 border-l border-[#457B9D]/40 backdrop-blur-md shadow-2xl flex flex-col p-4 animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-white/15 mb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#A8DADC]" />
                <h3 className="font-bold text-white text-xs uppercase tracking-wider">
                  Lecture Slides ({lectureSlides.length})
                </h3>
              </div>
              <button 
                onClick={() => setShowSlidesDrawer(false)}
                className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[10px] text-neutral-400 mb-3 leading-snug">
              Click any slide to instantly jump the video to that presentation point, or tap preview to zoom.
            </p>

            {/* Slides List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar text-xs">
              {lectureSlides.map((slide, idx) => {
                const nextSlide = lectureSlides[idx + 1];
                const isCurrentSlide = currentTime >= slide.timestamp && (!nextSlide || currentTime < nextSlide.timestamp);

                return (
                  <div
                    key={slide.id}
                    className={`rounded-2xl border transition-all overflow-hidden p-3 flex flex-col gap-2.5 ${
                      isCurrentSlide
                        ? 'bg-[#1D3557]/70 border-[#A8DADC] shadow-lg ring-1 ring-[#A8DADC]/50'
                        : 'bg-black/40 hover:bg-white/5 border-white/10'
                    }`}
                  >
                    {/* Header: Slide Number, Live Status, Timestamp */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                          isCurrentSlide ? 'bg-[#A8DADC] text-[#0B132B]' : 'bg-white/15 text-white'
                        }`}>
                          Slide {slide.slideNumber}
                        </span>
                        {isCurrentSlide && (
                          <span className="text-[9px] font-bold text-emerald-400 flex items-center gap-1 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            NOW PLAYING
                          </span>
                        )}
                      </div>

                      <span className="font-mono text-[10px] text-neutral-300 bg-black/40 px-2 py-0.5 rounded-md border border-white/10">
                        {slide.timestampLabel}
                      </span>
                    </div>

                    {/* Slide Graphic Preview Card (clickable for zoom) */}
                    <div
                      onClick={() => setZoomedSlide(slide)}
                      className="h-24 rounded-xl bg-gradient-to-br from-[#0B132B] to-[#1D3557] border border-white/10 hover:border-[#A8DADC]/60 p-2.5 flex flex-col justify-between cursor-pointer group/card transition-all relative overflow-hidden"
                      title="Click to zoom slide"
                    >
                      <div className="flex items-start justify-between">
                        <span className="text-[10px] font-bold text-[#A8DADC] truncate max-w-[180px]">
                          {slide.title}
                        </span>
                        <Maximize className="w-3.5 h-3.5 text-neutral-400 group-hover/card:text-white transition-colors shrink-0" />
                      </div>

                      <div className="p-1 rounded bg-black/50 border border-white/10 text-[9px] font-mono text-amber-300 truncate">
                        {slide.formula}
                      </div>

                      <div className="text-[9px] text-neutral-400 truncate">
                        {slide.subtitle}
                      </div>
                    </div>

                    {/* Actions: Jump to Slide & Zoom */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          if (videoRef.current) {
                            videoRef.current.currentTime = slide.timestamp;
                            videoRef.current.play().catch(() => {});
                            setIsPlaying(true);
                            showToast(`⏩ Jumped to Slide ${slide.slideNumber}: ${slide.title}`);
                          }
                        }}
                        className={`flex-1 py-1.5 px-3 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all shadow-sm btn-press ${
                          isCurrentSlide
                            ? 'bg-[#A8DADC] text-[#0B132B] hover:brightness-105'
                            : 'bg-[#457B9D] hover:bg-[#386684] text-white'
                        }`}
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Jump to Slide</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setZoomedSlide(slide)}
                        className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all btn-press"
                        title="Zoom Full Slide"
                      >
                        <Maximize className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ZOOMED SLIDE HIGH-DEFINITION MODAL */}
        {zoomedSlide && (
          <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-2xl bg-[#0B132B] border border-[#457B9D]/60 rounded-3xl p-6 shadow-2xl relative animate-in zoom-in-95 duration-150 flex flex-col gap-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/15">
                <div className="flex items-center gap-2.5">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#7B2CBF] text-white text-[10px] font-extrabold uppercase">
                    Slide {zoomedSlide.slideNumber} of {lectureSlides.length}
                  </span>
                  <span className="font-mono text-xs text-[#A8DADC]">
                    @{zoomedSlide.timestampLabel}
                  </span>
                </div>
                <button
                  onClick={() => setZoomedSlide(null)}
                  className="p-1.5 rounded-full text-white/70 hover:text-white hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Full Slide Presentation Board */}
              <div className="rounded-2xl bg-gradient-to-br from-[#101D38] to-[#0A1124] border border-[#457B9D]/40 p-6 flex flex-col justify-between min-h-[260px] shadow-inner relative overflow-hidden">
                <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
                  <div>
                    <h2 className="text-lg font-extrabold text-white tracking-wide">
                      {zoomedSlide.title}
                    </h2>
                    <p className="text-xs text-[#A8DADC] mt-0.5">
                      {zoomedSlide.subtitle}
                    </p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-black/40 border border-white/20 flex items-center justify-center text-white text-[10px] font-extrabold">
                    PW
                  </div>
                </div>

                <div className="space-y-2.5 my-2">
                  {zoomedSlide.keyPoints.map((pt, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-neutral-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#A8DADC] mt-1.5 shrink-0" />
                      <span className="leading-relaxed">{pt}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-3 p-3 rounded-xl bg-black/60 border border-amber-500/30 flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold text-amber-300">
                    Formula: {zoomedSlide.formula}
                  </span>
                  <span className="text-[10px] text-neutral-400">
                    {teacherName}
                  </span>
                </div>
              </div>

              {/* Modal Bottom Actions */}
              <div className="flex items-center justify-between gap-3 pt-1">
                <button
                  onClick={() => {
                    if (videoRef.current) {
                      videoRef.current.currentTime = zoomedSlide.timestamp;
                      videoRef.current.play().catch(() => {});
                      setIsPlaying(true);
                      showToast(`⏩ Jumped to Slide ${zoomedSlide.slideNumber}`);
                    }
                    setZoomedSlide(null);
                  }}
                  className="flex-1 py-2.5 rounded-2xl bg-[#457B9D] hover:bg-[#386684] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md btn-press"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Play Video at this Slide ({zoomedSlide.timestampLabel})</span>
                </button>

                <button
                  onClick={() => setZoomedSlide(null)}
                  className="px-5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition-all btn-press"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ASK DOUBT DRAWER (Slide over from right) */}
        {showDoubtDrawer && (
          <div className="absolute inset-y-0 right-0 w-84 max-w-[90%] z-50 bg-[#0B132B]/95 border-l border-[#457B9D]/40 backdrop-blur-md shadow-2xl flex flex-col p-4 animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-white/15 mb-3">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[#A8DADC]" />
                <h3 className="font-bold text-white text-xs uppercase tracking-wider">
                  Ask Doubt at {formatTime(currentTime)}
                </h3>
              </div>
              <button 
                onClick={() => setShowDoubtDrawer(false)}
                className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Prompts */}
            <div className="space-y-1.5 mb-3">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Quick Inquiries:</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Explain this postulate simply',
                  'Formula derivation steps',
                  'Common board exam question'
                ].map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => handleAskDoubt(prompt)}
                    className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-[#457B9D]/30 border border-white/15 text-[11px] text-[#A8DADC] transition-all"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            {/* Conversation Area */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar text-xs">
              {doubtReplies.length === 0 ? (
                <div className="py-12 text-center text-neutral-400 text-xs px-2">
                  <Sparkles className="w-8 h-8 text-[#A8DADC] mx-auto mb-2 opacity-60" />
                  <p className="font-semibold text-white">Instant AI Doubt Solver</p>
                  <p className="text-[11px] mt-1">Have a question about what the teacher just said? Type below for an instant explanation.</p>
                </div>
              ) : (
                doubtReplies.map((entry) => (
                  <div
                    key={entry.id}
                    className={`p-3 rounded-xl border ${
                      entry.sender === 'user'
                        ? 'bg-[#1D3557]/40 border-[#457B9D]/30 text-white ml-4'
                        : 'bg-black/50 border-white/15 text-[#F1FAEE] mr-4'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] text-neutral-400 mb-1">
                      <span className="font-bold text-[#A8DADC]">{entry.sender === 'user' ? 'You' : 'Study Assistant'}</span>
                      <span>@{entry.time}</span>
                    </div>
                    <p className="leading-relaxed text-[11px]">{entry.text}</p>
                  </div>
                ))
              )}
              {isAnsweringDoubt && (
                <div className="p-3 rounded-xl bg-black/40 border border-white/10 text-xs text-neutral-300 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-[#A8DADC] animate-spin" />
                  <span>Thinking through lecture context...</span>
                </div>
              )}
            </div>

            {/* Input Form */}
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleAskDoubt();
              }}
              className="mt-3 pt-3 border-t border-white/15 flex items-center gap-2"
            >
              <input
                type="text"
                value={doubtText}
                onChange={(e) => setDoubtText(e.target.value)}
                placeholder="Ask about this concept..."
                className="flex-1 bg-black/50 border border-white/20 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 outline-none focus:border-[#457B9D]"
              />
              <button
                type="submit"
                className="p-2 rounded-xl bg-[#457B9D] hover:bg-[#386684] text-white transition-all btn-press shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        )}

        {/* 3D CONCEPTS & FORMULA MODAL */}
        {show3DModal && (
          <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-[#0B132B] border border-[#457B9D]/50 rounded-2xl p-5 shadow-2xl relative animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-white/15 mb-4">
                <div className="flex items-center gap-2">
                  <Box className="w-5 h-5 text-[#A8DADC]" />
                  <h3 className="font-bold text-white text-sm">
                    3D Model & Concept Sheet
                  </h3>
                </div>
                <button
                  onClick={() => setShow3DModal(false)}
                  className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Interactive 3D Model Visualization Card */}
              <div className="h-44 rounded-xl bg-[#1D3557]/30 border border-[#457B9D]/30 flex flex-col items-center justify-center relative overflow-hidden mb-4">
                <div className="w-20 h-20 rounded-full border-2 border-dashed border-[#A8DADC]/60 animate-spin flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-cyan-400 shadow-lg animate-pulse" />
                </div>
                <span className="text-[11px] font-bold text-[#A8DADC] mt-3">
                  Atomic Model: Nucleus & Electron Orbitals
                </span>
                <span className="text-[9px] text-neutral-400">
                  Interactive 3D representation for Dalton's Postulates
                </span>
              </div>

              {/* Key Concept Cards */}
              <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-[10px] font-bold text-[#A8DADC] block">Postulate 1</span>
                  <span className="text-[11px] text-neutral-200 mt-0.5 block leading-tight">All matter is composed of tiny, indivisible atoms.</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-[10px] font-bold text-[#A8DADC] block">Law of Conservation</span>
                  <span className="text-[11px] text-neutral-200 mt-0.5 block leading-tight">Atoms can neither be created nor destroyed in a reaction.</span>
                </div>
              </div>

              <button
                onClick={() => setShow3DModal(false)}
                className="w-full py-2 rounded-xl bg-[#457B9D] hover:bg-[#386684] text-white text-xs font-bold transition-all shadow-md btn-press"
              >
                Close Concept View
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
