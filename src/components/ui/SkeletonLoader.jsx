import React from 'react';

/**
 * SkeletonLoader Component
 * Shows animated placeholder while content loads
 * Improves perceived performance dramatically (2-3x faster feel)
 */
export default function SkeletonLoader({ variant = 'card', count = 1, className = '' }) {
  const baseClasses = 'animate-pulse rounded-2xl bg-[var(--color-surface-hover)]';

  const variants = {
    card: 'p-4 space-y-3',
    batch: 'aspect-[16/9] rounded-2xl',
    button: 'h-10 rounded-xl',
    text: 'h-4 rounded-lg w-full',
    title: 'h-6 rounded-lg w-3/4',
    avatar: 'w-12 h-12 rounded-xl',
    line: 'h-3 rounded-lg w-full mb-2',
  };

  if (variant === 'card') {
    return (
      <div className={`${baseClasses} space-y-3 ${className}`}>
        <div className="aspect-video rounded-xl bg-[var(--color-border)]" />
        <div className="space-y-2 p-2">
          <div className="h-4 rounded bg-[var(--color-border)]" />
          <div className="h-3 rounded bg-[var(--color-border)] w-5/6" />
        </div>
      </div>
    );
  }

  if (variant === 'batch-grid') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {Array.from({ length: count || 4 }).map((_, i) => (
          <div key={i} className={`${baseClasses} space-y-3`}>
            <div className="aspect-video rounded-xl bg-[var(--color-border)]" />
            <div className="space-y-2 p-2">
              <div className="h-4 rounded bg-[var(--color-border)]" />
              <div className="h-3 rounded bg-[var(--color-border)] w-5/6" />
              <div className="flex gap-2 pt-2">
                <div className="h-8 rounded-lg bg-[var(--color-border)] flex-1" />
                <div className="h-8 rounded-lg bg-[var(--color-border)] flex-1" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'chapter-list') {
    return (
      <div className="space-y-2">
        {Array.from({ length: count || 5 }).map((_, i) => (
          <div key={i} className={`${baseClasses} h-12 rounded-xl`} />
        ))}
      </div>
    );
  }

  if (variant === 'content-grid') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: count || 3 }).map((_, i) => (
          <div key={i} className={`${baseClasses} p-4 space-y-3`}>
            <div className="h-4 rounded bg-[var(--color-border)]" />
            <div className="h-3 rounded bg-[var(--color-border)] w-5/6" />
            <div className="h-8 rounded-lg bg-[var(--color-border)]" />
          </div>
        ))}
      </div>
    );
  }

  // Simple line skeleton
  return (
    <div className={`${baseClasses} ${variants[variant] || variants.text} ${className}`} />
  );
}
