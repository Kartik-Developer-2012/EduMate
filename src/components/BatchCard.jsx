import React from 'react';
import { Play, Plus, Check } from 'lucide-react';
import { useCourse } from '../context/CourseContext';
import { Button, Badge, Card } from './ui';
import appLogo from '../assets/app-logo.png';

export default function BatchCard({ batch, onSelect }) {
  const { isEnrolled, toggleEnroll } = useCourse();
  const enrolled = isEnrolled(batch.id);

  const isPw = batch.provider === 'pw' || Boolean(batch.batchId) || Boolean(batch.raw?.batchId) || String(batch.id).startsWith('pw') || (batch.title && batch.title.includes('Physics Wallah'));

  // Extract clean grade tag from title
  const matchGrade = (batch.title || '').match(/(10th|9th|11th|12th|Class 7|Class 8|Class 10|Class 9|Class 11|Class 12|CUET|IOQM|NEET|JEE|UDAAN|NEEV|LAKSHYA|ARJUNA|YAKEEN|PRAYAS)/i);
  const gradeTag = matchGrade ? matchGrade[0].toUpperCase() : (isPw ? 'PW BATCH' : 'BATCH');

  // Progress bar (TODO: Connect to actual progress data)
  const progressPercent = 0;

  return (
    <Card
      onClick={() => onSelect(batch)}
      hover={true}
      className="group flex flex-col overflow-hidden hover:shadow-[0_0_20px_rgba(91,33,182,0.2)] transition-all duration-300"
    >
      {/* Thumbnail Banner - Modern with subtle overlay */}
      <div className="relative w-full aspect-[16/9] bg-[var(--color-surface-hover)] overflow-hidden border-b border-[var(--color-border)]">
        <img
          src={batch.thumbnail || batch.batchImage || 'https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/2cd05c71-3897-4e88-9c73-3e307e0dde03.jpg'}
          alt={batch.title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.05]"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = isPw
              ? 'https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/2cd05c71-3897-4e88-9c73-3e307e0dde03.jpg'
              : appLogo;
          }}
        />

        {/* Subtle dark overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>

        {/* Minimal badge - only provider, no grade tag overlay */}
        <div className="absolute top-2 left-2">
          <Badge variant="primary" size="xs" className="backdrop-blur-md">
            {isPw ? 'Physics Wallah' : 'Next Toppers'}
          </Badge>
        </div>

        {/* Free tag - subtle */}
        <div className="absolute top-2 right-2">
          <Badge variant="success" size="xs" className="backdrop-blur-md">
            FREE
          </Badge>
        </div>
      </div>

      {/* Content Area - Clean and minimal */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-semibold text-sm leading-snug line-clamp-2 text-[var(--color-text-primary)] group-hover:text-[#5B21B6] transition-colors">
            {batch.title || batch.batchName}
          </h3>

          {/* Subtle meta info */}
          <p className="text-[11px] text-[var(--color-text-muted)] mt-1">
            {gradeTag}
          </p>
        </div>

        {/* Progress Bar - Subtle at bottom */}
        {progressPercent > 0 && (
          <div className="mt-3 mb-2">
            <div className="w-full h-1.5 rounded-full bg-[var(--color-surface-hover)] overflow-hidden border border-[var(--color-border)]">
              <div
                className="h-full bg-gradient-to-r from-[#5B21B6] to-[#06B6D4] transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
            <p className="text-[9px] text-[var(--color-text-muted)] mt-1 text-right">
              {progressPercent}% complete
            </p>
          </div>
        )}

        {/* Action Controls - Modern buttons */}
        <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-[var(--color-border)]">
          <Button
            variant={enrolled ? 'enrolled' : 'secondary'}
            size="md"
            icon={enrolled ? Check : Plus}
            onClick={(e) => {
              e.stopPropagation();
              toggleEnroll(batch.id);
            }}
            className="text-[11px]"
          >
            {enrolled ? 'Saved' : 'Save'}
          </Button>

          <Button
            variant="primary"
            size="md"
            icon={Play}
            iconPosition="right"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(batch);
            }}
            className="text-[11px]"
          >
            Study
          </Button>
        </div>
      </div>
    </Card>
  );
}
