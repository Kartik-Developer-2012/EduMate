import React, { useEffect, useRef, useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  CheckCircle2, 
  Maximize, 
  Gauge, 
  User, 
  AlertCircle, 
  RotateCcw,
  Loader2,
  Tv
} from 'lucide-react';
import Hls from 'hls.js';
import { extractMediaInfo, resolveMediaContent, getTeacherForContent } from '../services/api';
import { useCourse } from '../context/CourseContext';

export default function VideoPlayerModal({ item, courseId, onClose }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const { isLectureCompleted, toggleLectureComplete } = useCourse();

  const [resolving, setResolving] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [currentSrc, setCurrentSrc] = useState('');
  const [streamType, setStreamType] = useState('hls'); // 'hls' | 'youtube' | 'mp4'
  const [hlsLevels, setHlsLevels] = useState([]);
  const [currentLevel, setCurrentLevel] = useState(-1); // -1 = Auto
  const [hasPlaybackError, setHasPlaybackError] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const mediaInfo = extractMediaInfo(item);
  const completed = isLectureCompleted(item?.entity_id);
  const teacherName = getTeacherForContent(item);
  const effectiveCourseId = courseId || item?.course_id || item?.data?.course_id;

  // 1. Resolve media stream on mount
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

      // Check if item already has direct .m3u8 or playable video url (e.g. PW streams or CloudFront)
      const directVideo = item.data?.file_url || item.videoUrl || item.url || mediaInfo.url;
      if (directVideo && (directVideo.includes('.m3u8') || directVideo.includes('.mp4') || directVideo.includes('cloudfront.net') || item.provider === 'pw')) {
        if (!isCancelled) {
          setCurrentSrc(directVideo);
          setStreamType(directVideo.includes('.m3u8') ? 'hls' : (mediaInfo.type || 'mp4'));
          setResolving(false);
        }
        return;
      }

      // Automatically resolve direct HLS / video stream from live API
      try {
        const resolved = await resolveMediaContent(effectiveCourseId, item.entity_id);
        if (!isCancelled) {
          if (resolved.success && resolved.url) {
            setCurrentSrc(resolved.url);
            setStreamType(resolved.type || (resolved.url.includes('.m3u8') ? 'hls' : 'mp4'));
            setResolving(false);
          } else {
            // Fallback to mediaInfo url if resolution didn't succeed
            if (mediaInfo.url) {
              setCurrentSrc(mediaInfo.url);
              setStreamType(mediaInfo.type);
            } else {
              setHasPlaybackError(true);
              setErrorMessage(resolved.message || 'Stream source currently unavailable');
            }
            setResolving(false);
          }
        }
      } catch (err) {
        if (!isCancelled) {
          console.error('Stream initialization error:', err);
          setHasPlaybackError(true);
          setErrorMessage('Unable to load video stream');
          setResolving(false);
        }
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

  // 2. Attach Hls or MP4 stream to video element
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
        backBufferLength: 90,
      });

      hlsRef.current = hls;

      hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        setHasPlaybackError(false);
        if (data.levels && data.levels.length > 0) {
          const parsed = data.levels.map((lvl, index) => ({
            index,
            height: lvl.height,
            bitrate: lvl.bitrate,
            label: `${lvl.height}p`,
          }));
          // Sort highest resolution first
          parsed.sort((a, b) => b.height - a.height);
          setHlsLevels(parsed);
        }

        video.play().catch((err) => {
          console.warn('Auto-play blocked or waiting for user interaction:', err);
        });
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.warn('Fatal network error encountered, trying to recover...', data);
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.warn('Fatal media error encountered, trying to recover...', data);
              hls.recoverMediaError();
              break;
            default:
              console.error('Fatal unrecoverable HLS error:', data);
              hls.destroy();
              setHasPlaybackError(true);
              setErrorMessage('Streaming connection interrupted');
              break;
          }
        }
      });

      hls.loadSource(currentSrc);
      hls.attachMedia(video);

      return () => {
        hls.destroy();
      };
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support for Safari
      video.src = currentSrc;
      video.play().catch(() => {});
    } else {
      // Direct MP4 fallback
      video.src = currentSrc;
      video.load();
      video.play().catch(() => {});
    }
  }, [currentSrc, streamType, resolving]);

  const changeSpeed = (speed) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
    setPlaybackSpeed(speed);
  };

  const handleLevelChange = (levelIndex) => {
    setCurrentLevel(levelIndex);
    if (hlsRef.current) {
      hlsRef.current.currentLevel = levelIndex;
    }
  };

  const toggleFullscreen = () => {
    const container = document.getElementById('player-modal-container');
    if (!container) return;
    if (!document.fullscreenElement) {
      container.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  const retryPlayback = () => {
    setResolving(true);
    setHasPlaybackError(false);
    resolveMediaContent(effectiveCourseId, item.entity_id).then((res) => {
      if (res.success && res.url) {
        setCurrentSrc(res.url);
        setStreamType(res.type || (res.url.includes('.m3u8') ? 'hls' : 'mp4'));
      }
      setResolving(false);
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-6 animate-in fade-in duration-200">
      <div 
        id="player-modal-container"
        className="w-full max-w-5xl bg-[#141419] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[95vh]"
      >
        {/* Top Header */}
        <div className="p-3.5 sm:p-4 bg-[#141419] border-b border-white/[0.08] flex items-center justify-between gap-4 shrink-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded bg-amber-400 text-black text-[10px] font-bold">
                LECTURE
              </span>
              <span className="text-[11px] text-amber-400 font-medium flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-amber-400" />
                <span>{teacherName}</span>
              </span>
              <span className="text-neutral-500">•</span>
              <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Zero Ads</span>
              </span>
            </div>
            <h3 className="text-white text-xs sm:text-sm font-semibold truncate">
              {item.title}
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Canvas Container */}
        <div className="relative aspect-video w-full bg-black flex items-center justify-center overflow-hidden">
          {resolving ? (
            <div className="flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-200">
              <div className="w-14 h-14 rounded-2xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center mb-4">
                <Loader2 className="w-7 h-7 text-amber-400 animate-spin" />
              </div>
              <h4 className="text-sm font-bold text-white mb-1">
                Connecting to HD Stream...
              </h4>
              <p className="text-xs text-neutral-400 max-w-sm">
                Bypassing ads and preparing high-definition lecture playback.
              </p>
            </div>
          ) : streamType === 'youtube' ? (
            <iframe
              src={currentSrc}
              title={item.title}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : (
            <div className="w-full h-full relative">
              <video
                ref={videoRef}
                controls
                playsInline
                preload="auto"
                poster={mediaInfo.thumbnail}
                onError={() => setHasPlaybackError(true)}
                className="w-full h-full object-contain"
              />

              {/* Error Recovery / In-Player Stream Reload */}
              {hasPlaybackError && (
                <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center p-6 text-center z-20">
                  <AlertCircle className="w-10 h-10 text-amber-400 mb-2" />
                  <h4 className="text-sm font-bold text-white mb-1">
                    Stream Notice
                  </h4>
                  <p className="text-xs text-neutral-400 max-w-md mb-4">
                    {errorMessage || 'The video stream encountered a momentary interruption. Click below to reconnect.'}
                  </p>
                  <button
                    type="button"
                    onClick={retryPlayback}
                    className="px-4 py-2 bg-amber-400 text-black text-xs font-bold rounded-lg flex items-center gap-1.5 hover:bg-yellow-400 transition-colors btn-press shadow-md"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reconnect Stream</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Controls Toolbar */}
        <div className="p-3 sm:p-4 bg-[#111116] border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          {/* Speed Buttons */}
          {streamType !== 'youtube' && (
            <div className="flex items-center gap-1.5">
              <span className="text-neutral-400 flex items-center gap-1 mr-1">
                <Gauge className="w-3.5 h-3.5 text-amber-400" />
                <span>Speed:</span>
              </span>
              {[0.75, 1.0, 1.25, 1.5, 2.0].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => changeSpeed(s)}
                  className={`px-2 py-1 rounded-md font-mono text-[11px] font-semibold transition-colors ${
                    playbackSpeed === s
                      ? 'bg-amber-400 text-black font-bold'
                      : 'bg-neutral-800 text-neutral-300 hover:text-white'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          )}

          {/* Quality Selector (Auto, 720p, 480p, 360p, 240p) */}
          {hlsLevels.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-neutral-400 flex items-center gap-1 mr-1">
                <Tv className="w-3.5 h-3.5 text-amber-400" />
                <span>Quality:</span>
              </span>

              {/* Auto Quality */}
              <button
                type="button"
                onClick={() => handleLevelChange(-1)}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                  currentLevel === -1
                    ? 'bg-amber-400 text-black font-bold'
                    : 'bg-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                Auto
              </button>

              {/* Available levels from master playlist */}
              {hlsLevels.map((lvl) => (
                <button
                  key={lvl.index}
                  type="button"
                  onClick={() => handleLevelChange(lvl.index)}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                    currentLevel === lvl.index
                      ? 'bg-amber-400 text-black font-bold'
                      : 'bg-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  {lvl.label}
                </button>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={() => toggleLectureComplete(item.entity_id)}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 text-xs transition-colors ${
                completed
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'bg-neutral-800 text-neutral-300 hover:text-white'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{completed ? 'Watched' : 'Mark as Watched'}</span>
            </button>

            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white"
              title="Fullscreen"
            >
              <Maximize className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
