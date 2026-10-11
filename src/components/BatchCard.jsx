import React from 'react';
import { Play, Plus, Check } from 'lucide-react';
import { useCourse } from '../context/CourseContext';
import appLogo from '../assets/app-logo.png';

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
      className="group card-surface rounded-2xl overflow-hidden flex flex-col cursor-pointer border border-[var(--color-border)] hover:border-[#A8DADC] transition-all duration-200"
    >
      {/* Thumbnail Banner */}
      <div className="relative w-full aspect-[16/9] bg-[var(--color-surface-hover)] overflow-hidden border-b border-[var(--color-border)]">
        <img
          src={batch.thumbnail || batch.batchImage || 'https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/2cd05c71-3897-4e88-9c73-3e307e0dde03.jpg'}
          alt={batch.title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = isPw 
              ? 'https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/2cd05c71-3897-4e88-9c73-3e307e0dde03.jpg'
              : appLogo;
          }}
        />

        {/* Provider Tag */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
          <span className="px-2 py-0.5 rounded-md backdrop-blur-md text-[10px] font-bold bg-[#1D3557]/90 text-[#F1FAEE] border border-white/20">
            {isPw ? 'Physics Wallah' : 'Next Toppers'}
          </span>
          <span className="px-1.5 py-0.5 rounded-md bg-[var(--color-surface)]/80 backdrop-blur-md text-[9px] font-semibold text-[var(--color-text-primary)] border border-[var(--color-border)]">
            {gradeTag}
          </span>
        </div>

        {/* Free Tag */}
        <div className="absolute top-2.5 right-2.5">
          <span className="px-2 py-0.5 rounded-md bg-[#457B9D]/90 backdrop-blur-md border border-[#A8DADC]/40 text-[9px] font-bold text-[#F1FAEE] tracking-wider">
            FREE
          </span>
        </div>
      </div>

      {/* Details Area */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-semibold text-sm leading-snug line-clamp-2 text-[var(--color-text-primary)] group-hover:text-[#A8DADC] transition-colors">
            {batch.title || batch.batchName}
          </h3>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-[var(--color-border)]">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleEnroll(batch.id);
            }}
            className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors btn-press min-h-[38px] ${
              enrolled
                ? 'bg-[#457B9D]/20 text-[#A8DADC] border border-[#457B9D]/40'
                : 'bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] border border-[var(--color-border)]'
            }`}
          >
            {enrolled ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#A8DADC]" />
                <span>Enrolled</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
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
            className="px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 bg-[#457B9D] hover:bg-[#386684] text-[#F1FAEE] transition-all btn-press shadow-sm min-h-[38px]"
          >
            <span>Let's Study</span>
            <Play className="w-3 h-3 fill-[#F1FAEE]" />
          </button>
        </div>
      </div>
    </div>
  );
}
