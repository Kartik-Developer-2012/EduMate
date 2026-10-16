import React, { useState, useEffect } from 'react';
import { 
  X, 
  Download, 
  Bookmark, 
  FileText, 
  User, 
  ShieldCheck, 
  Maximize, 
  Minimize, 
  RotateCcw, 
  Loader2,
  AlertTriangle,
  ExternalLink,
  Layers,
  Sparkles,
  ArrowLeft
} from 'lucide-react';
import { extractMediaInfo, resolvePdfDocument, getTeacherForContent } from '../services/api';
import { useCourse } from '../context/CourseContext';

export default function PdfViewerModal({ item, courseId, onClose }) {
  const { toggleBookmark, isBookmarked } = useCourse();
  const [resolving, setResolving] = useState(true);
  const [streamUrl, setStreamUrl] = useState('');
  const [resolvedUrl, setResolvedUrl] = useState('');
  const [errorMsg, setErrorMsg] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewerMode, setViewerMode] = useState('stream'); // 'stream' | 'google' | 'direct'

  const bookmarked = isBookmarked(item?.entity_id);
  const teacherName = item?.teacherName || getTeacherForContent(item, item?.folderHistory || [], item?.batchTitle || item?.courseTitle || '');

  // Auto-resolve PDF stream on mount
  useEffect(() => {
    let isCancelled = false;

    async function loadPdf() {
      setResolving(true);
      setErrorMsg(null);

      // Check if item or extractMediaInfo already has a valid direct document URL
      const media = extractMediaInfo(item);
      const directPdf = item.data?.file_url || item.attachmentUrl || item.fileUrl || media.url;
      if (directPdf && (directPdf.includes('.pdf') || directPdf.includes('cloudfront.net') || item.provider === 'pw')) {
        if (!isCancelled) {
          setResolvedUrl(directPdf);
          setStreamUrl(`/api/stream/pdf?url=${encodeURIComponent(directPdf)}`);
          setResolving(false);
        }
        return;
      }

      // Asynchronously resolve direct document URL from multiple sources
      const res = await resolvePdfDocument(courseId, item);
      if (!isCancelled) {
        if (res.success && res.url) {
          setResolvedUrl(res.url);
          setStreamUrl(res.streamUrl || `/api/stream/pdf?url=${encodeURIComponent(res.url)}`);
          setResolving(false);
        } else {
          setErrorMsg(res.message || 'Unable to load PDF document directly.');
          setResolving(false);
        }
      }
    }

    loadPdf();

    return () => {
      isCancelled = true;
    };
  }, [item, courseId]);

  const toggleModalFullscreen = () => {
    const el = document.getElementById('pdf-modal-container');
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const handleDownload = () => {
    if (!resolvedUrl) return;
    const downloadHref = `/api/stream/pdf?url=${encodeURIComponent(resolvedUrl)}&download=true&name=${encodeURIComponent((item.title || 'Notes') + '.pdf')}`;
    const a = document.createElement('a');
    a.href = downloadHref;
    a.download = `${item.title || 'EduMate-Notes'}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const currentIframeSrc = React.useMemo(() => {
    if (!resolvedUrl && !streamUrl) return '';
    if (viewerMode === 'google' && resolvedUrl) {
      return `https://docs.google.com/viewer?url=${encodeURIComponent(resolvedUrl)}&embedded=true`;
    }
    if (viewerMode === 'direct' && resolvedUrl) {
      return resolvedUrl;
    }
    return streamUrl;
  }, [viewerMode, streamUrl, resolvedUrl]);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div 
        id="pdf-modal-container"
        className="w-full max-w-6xl h-[92vh] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden shadow-2xl flex flex-col"
      >
        {/* Top Header Bar */}
        <div className="p-3.5 sm:p-4 bg-[var(--color-surface)] border-b border-[var(--color-border)] flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--color-surface-hover)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[#F1FAEE] hover:border-[#457B9D] text-xs font-semibold transition-all btn-press shrink-0"
            title="Go Back to Chapter"
          >
            <ArrowLeft className="w-4 h-4 text-[#A8DADC]" />
            <span className="hidden sm:inline">Back</span>
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="px-2 py-0.5 rounded bg-[#1D3557] text-[#F1FAEE] text-[10px] font-bold border border-[#457B9D]/40">
                DOCUMENT / NOTES
              </span>
              <span className="text-[11px] text-[#A8DADC] font-medium flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-[#A8DADC]" />
                <span className="truncate max-w-[150px] sm:max-w-none">{teacherName}</span>
              </span>
              <span className="text-[var(--color-text-muted)] hidden sm:inline">•</span>
              <span className="text-[11px] text-[#A8DADC] font-medium hidden sm:flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#A8DADC]" />
                <span>Zero Ads</span>
              </span>
            </div>
            <h3 className="text-[var(--color-text-primary)] text-xs sm:text-sm font-semibold truncate leading-tight">
              {item.title}
            </h3>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Viewer Mode Selector */}
            {resolvedUrl && (
              <div className="hidden sm:flex items-center bg-[var(--color-bg)] p-1 rounded-xl border border-[var(--color-border)] text-xs">
                <button
                  type="button"
                  onClick={() => setViewerMode('stream')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                    viewerMode === 'stream'
                      ? 'bg-[#457B9D] text-[#F1FAEE] shadow-sm'
                      : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                  }`}
                  title="In-App High Speed Stream Viewer"
                >
                  Stream View
                </button>
                <button
                  type="button"
                  onClick={() => setViewerMode('google')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                    viewerMode === 'google'
                      ? 'bg-[#457B9D] text-[#F1FAEE] shadow-sm'
                      : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                  }`}
                  title="Google Docs Cloud Viewer (Universal Compatibility)"
                >
                  Cloud View
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => toggleBookmark(item)}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all btn-press ${
                bookmarked
                  ? 'bg-[#457B9D]/20 border border-[#457B9D]/40 text-[#A8DADC]'
                  : 'bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] border border-[var(--color-border)]'
              }`}
              title="Bookmark Document"
            >
              <Bookmark className="w-3.5 h-3.5" fill={bookmarked ? 'currentColor' : 'none'} />
              <span className="hidden md:inline">{bookmarked ? 'Saved' : 'Save'}</span>
            </button>

            {resolvedUrl && (
              <>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-[#457B9D] hover:bg-[#386684] text-[#F1FAEE] text-xs font-semibold flex items-center gap-1.5 transition-all btn-press shadow-sm"
                  title="Download PDF directly"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Download</span>
                </button>

                <a
                  href={resolvedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-[var(--color-surface-hover)] hover:bg-[#1D3557] text-[var(--color-text-secondary)] hover:text-[#A8DADC] border border-[var(--color-border)] text-xs font-semibold flex items-center gap-1.5 transition-all btn-press"
                  title="Open PDF directly in a new browser tab"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Open Tab</span>
                </a>
              </>
            )}

            <button
              type="button"
              onClick={toggleModalFullscreen}
              className="p-1.5 rounded-lg bg-[var(--color-surface-hover)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-[var(--color-surface-hover)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
              title="Close Viewer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* In-App PDF Viewing Canvas */}
        <div className="flex-1 w-full bg-[var(--color-bg)] relative overflow-hidden flex flex-col items-center justify-center">
          {resolving ? (
            <div className="flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-200">
              <div className="w-14 h-14 rounded-2xl bg-[#1D3557] border border-[#457B9D]/40 flex items-center justify-center mb-4">
                <Loader2 className="w-7 h-7 text-[#A8DADC] animate-spin" />
              </div>
              <h4 className="text-base font-bold text-[var(--color-text-primary)] mb-1">
                Opening Notes Document...
              </h4>
              <p className="text-xs text-[var(--color-text-secondary)] max-w-sm">
                Preparing your study notes for independent in-app reading without external redirects.
              </p>
            </div>
          ) : errorMsg ? (
            <div className="flex flex-col items-center justify-center p-8 text-center max-w-md">
              <div className="w-14 h-14 rounded-2xl bg-[#1D3557] border border-[#457B9D]/40 flex items-center justify-center mb-4">
                <AlertTriangle className="w-7 h-7 text-[#A8DADC]" />
              </div>
              <h4 className="text-sm font-bold text-[var(--color-text-primary)] mb-1">
                Document Notice
              </h4>
              <p className="text-xs text-[var(--color-text-secondary)] mb-5">
                {errorMsg}
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setResolving(true);
                    setErrorMsg(null);
                    resolvePdfDocument(courseId, item).then(res => {
                      if (res.success && res.url) {
                        setResolvedUrl(res.url);
                        setStreamUrl(res.streamUrl || `/api/stream/pdf?url=${encodeURIComponent(res.url)}`);
                        setResolving(false);
                      } else {
                        setErrorMsg(res.message || 'Document stream retry failed.');
                        setResolving(false);
                      }
                    });
                  }}
                  className="px-4 py-2 bg-[#457B9D] hover:bg-[#386684] text-[#F1FAEE] text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors btn-press shadow-sm"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retry Loading</span>
                </button>

                {resolvedUrl && (
                  <a
                    href={resolvedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-[#1D3557] hover:bg-[#223E5E] border border-[#457B9D]/40 text-[#A8DADC] text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open in Tab</span>
                  </a>
                )}
              </div>
            </div>
          ) : currentIframeSrc ? (
            <div className="w-full h-full relative flex flex-col">
              <iframe
                key={currentIframeSrc}
                src={currentIframeSrc}
                title={item.title || 'Study Material PDF'}
                className="w-full flex-1 border-0 bg-neutral-900"
              />

              {/* Bottom Quick Help Bar */}
              <div className="py-1.5 px-4 bg-[var(--color-surface)] border-t border-[var(--color-border)] flex items-center justify-between text-[11px] text-[var(--color-text-muted)] shrink-0">
                <span className="flex items-center gap-1.5 truncate">
                  <Sparkles className="w-3 h-3 text-[#A8DADC] shrink-0" />
                  <span>Document loaded • If your browser blocks inline rendering:</span>
                </span>
                <div className="flex items-center gap-3 shrink-0 ml-2">
                  <button
                    type="button"
                    onClick={() => setViewerMode(viewerMode === 'stream' ? 'google' : 'stream')}
                    className="text-[#A8DADC] hover:underline font-semibold"
                  >
                    {viewerMode === 'stream' ? 'Switch to Cloud View' : 'Switch to Stream View'}
                  </button>
                  {resolvedUrl && (
                    <>
                      <span>•</span>
                      <a
                        href={resolvedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#A8DADC] hover:underline font-semibold"
                      >
                        Open Direct PDF ↗
                      </a>
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
