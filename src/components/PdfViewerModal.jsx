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
  AlertTriangle
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

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div 
        id="pdf-modal-container"
        className="w-full max-w-6xl h-[92vh] bg-[#121217] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
      >
        {/* Top Header Bar */}
        <div className="p-3.5 sm:p-4 bg-[#16161c] border-b border-white/[0.08] flex items-center justify-between gap-3 shrink-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded bg-red-500/15 text-red-400 text-[10px] font-bold border border-red-500/25">
                DOCUMENT / NOTES
              </span>
              <span className="text-[11px] text-neutral-400 font-medium flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-neutral-400" />
                <span>{teacherName}</span>
              </span>
              <span className="text-neutral-600 hidden sm:inline">•</span>
              <span className="text-[11px] text-emerald-400 font-medium hidden sm:flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Zero Ads</span>
              </span>
            </div>
            <h3 className="text-white text-xs sm:text-sm font-semibold truncate leading-tight">
              {item.title}
            </h3>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => toggleBookmark(item)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                bookmarked
                  ? 'bg-amber-400/20 border border-amber-400/30 text-amber-400'
                  : 'bg-white/5 text-neutral-400 hover:text-white border border-white/10'
              }`}
              title="Bookmark Document"
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{bookmarked ? 'Saved' : 'Save'}</span>
            </button>

            {resolvedUrl && (
              <button
                type="button"
                onClick={handleDownload}
                className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition-colors btn-press"
                title="Download PDF directly"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Download</span>
              </button>
            )}

            <button
              type="button"
              onClick={toggleModalFullscreen}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-neutral-400 hover:text-white transition-colors"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-neutral-400 hover:text-white transition-colors"
              title="Close Viewer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* In-App PDF Viewing Canvas */}
        <div className="flex-1 w-full bg-[#0d0d11] relative overflow-hidden flex items-center justify-center">
          {resolving ? (
            <div className="flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-200">
              <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
                <Loader2 className="w-7 h-7 text-red-400 animate-spin" />
              </div>
              <h4 className="text-base font-bold text-white mb-1">
                Opening Notes Document...
              </h4>
              <p className="text-xs text-neutral-400 max-w-sm">
                Preparing your study notes for independent in-app reading without external redirects.
              </p>
            </div>
          ) : errorMsg ? (
            <div className="flex flex-col items-center justify-center p-8 text-center max-w-md">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4">
                <AlertTriangle className="w-7 h-7 text-amber-400" />
              </div>
              <h4 className="text-sm font-bold text-white mb-1">
                Document Notice
              </h4>
              <p className="text-xs text-neutral-400 mb-5">
                {errorMsg}
              </p>
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
                className="px-4 py-2 bg-amber-400 text-black text-xs font-bold rounded-lg flex items-center gap-1.5 hover:bg-yellow-400 transition-colors btn-press"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retry Loading</span>
              </button>
            </div>
          ) : streamUrl ? (
            <iframe
              src={streamUrl}
              title={item.title || 'Study Material PDF'}
              className="w-full h-full border-0 bg-neutral-900"
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
