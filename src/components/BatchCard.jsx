import React from 'react';
import { Play, Plus, Check, Sparkles, BookOpen } from 'lucide-react';
import { useCourse } from '../context/CourseContext';

export default function BatchCard({ batch, onSelect }) {
  const { isEnrolled, toggleEnroll } = useCourse();
  const enrolled = isEnrolled(batch.id);

  const isPw = batch.provider === 'pw' || Boolean(batch.batchId) || Boolean(batch.raw?.batchId) || String(batch.id).startsWith('pw') || (batch.title && batch.title.includes('Physics Wallah'));

  // Extract clean grade tag from title
  const matchGrade = (batch.title || '').match(/(10th|9th|11th|12th|Class 7|Class 8|Class 10|Class 9|Class 11|Class 12|CUET|IOQM|NEET|JEE|UDAAN|NEEV|LAKSHYA|ARJUNA|YAKEEN|PRAYAS)/i);
  const gradeTag = matchGrade ? matchGrade[0].toUpperCase() : (isPw ? 'PW BATCH' : 'BATCH');

  return (
    <div 
      onClick={() => onSelect(batch)}
      className={`group card-surface rounded-2xl overflow-hidden flex flex-col cursor-pointer border transition-all duration-200 ${
        isPw 
          ? 'border-purple-500/20 hover:border-purple-400 hover:shadow-[0_0_20px_rgba(147,51,234,0.2)]' 
          : 'border-white/[0.08] hover:border-amber-400/50 hover:shadow-[0_0_20px_rgba(251,191,36,0.15)]'
      }`}
    >
      {/* Thumbnail Banner */}
      <div className="relative w-full aspect-[16/9] bg-neutral-950 overflow-hidden border-b border-white/[0.06]">
        <img
          src={batch.thumbnail || batch.batchImage || 'https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/2cd05c71-3897-4e88-9c73-3e307e0dde03.jpg'}
          alt={batch.title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = isPw 
              ? 'https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/2cd05c71-3897-4e88-9c73-3e307e0dde03.jpg'
              : 'https://i.ibb.co/yF4mhNPB/f493d534-fbf8-4b31-b741-83b343f8a9e1.jpg';
          }}
        />

        {/* Provider Tag */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
          <span className={`px-2 py-0.5 rounded-md backdrop-blur-md text-[10px] font-bold border ${
            isPw 
              ? 'bg-purple-950/80 border-purple-400/40 text-purple-300'
              : 'bg-black/80 border-white/10 text-amber-400'
          }`}>
            {isPw ? 'Physics Wallah' : 'Next Toppers'}
          </span>
          <span className="px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[9px] font-semibold text-neutral-300">
            {gradeTag}
          </span>
        </div>

        {/* Free Tag */}
        <div className="absolute top-2.5 right-2.5">
          <span className="px-2 py-0.5 rounded-md bg-emerald-950/80 backdrop-blur-md border border-emerald-500/30 text-[9px] font-bold text-emerald-400 tracking-wider">
            FREE
          </span>
        </div>
      </div>

      {/* Details Area */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <h3 className={`font-semibold text-sm leading-snug line-clamp-2 transition-colors ${
            isPw ? 'text-neutral-100 group-hover:text-purple-300' : 'text-neutral-100 group-hover:text-amber-400'
          }`}>
            {batch.title || batch.batchName}
          </h3>
          <p className="text-[11px] text-neutral-400 mt-1 flex items-center gap-1.5">
            <span>{batch.byName || (isPw ? 'PW Star Faculty' : 'Next Toppers Faculty')}</span>
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-white/[0.06]">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleEnroll(batch.id);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors btn-press ${
              enrolled
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'bg-neutral-800/80 text-neutral-300 hover:text-white hover:bg-neutral-700/80 border border-white/5'
            }`}
          >
            {enrolled ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Enrolled</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5 text-neutral-400" />
                <span>Enroll</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(batch);
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors btn-press ${
              isPw
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-[0_0_12px_rgba(147,51,234,0.3)]'
                : 'bg-amber-400 hover:bg-yellow-400 text-black shadow-[0_0_12px_rgba(251,191,36,0.2)]'
            }`}
          >
            <span>Let's Study</span>
            <Play className={`w-3 h-3 ${isPw ? 'fill-white' : 'fill-black'}`} />
          </button>
        </div>
      </div>
    </div>
  );
}
