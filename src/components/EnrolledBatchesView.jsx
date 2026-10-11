import React from 'react';
import { BookOpen, Bookmark, CheckCircle2, Layers } from 'lucide-react';
import { useCourse } from '../context/CourseContext';
import BatchCard from './BatchCard';

export default function EnrolledBatchesView({ batches, onSelectBatch, onBrowseBatches }) {
  const { enrolledBatches, completedLectures, bookmarks } = useCourse();

  // Match IDs by string to support both numeric Next Toppers IDs and string PW IDs
  const myBatches = batches.filter((b) => 
    enrolledBatches.some(id => String(id) === String(b.id || b.batchId))
  );

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="p-5 rounded-2xl card-surface flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#1D3557] border border-[#457B9D]/40 flex items-center justify-center shrink-0">
            <BookOpen className="w-6 h-6 text-[#A8DADC]" />
          </div>
          <div>
            <div className="text-xl font-bold text-[#F1FAEE]">{myBatches.length}</div>
            <div className="text-xs text-[var(--color-text-secondary)]">Enrolled Batches</div>
          </div>
        </div>

        <div className="p-5 rounded-2xl card-surface flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#1D3557] border border-[#457B9D]/40 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6 text-[#A8DADC]" />
          </div>
          <div>
            <div className="text-xl font-bold text-[#F1FAEE]">{completedLectures.length}</div>
            <div className="text-xs text-[var(--color-text-secondary)]">Lectures Completed</div>
          </div>
        </div>

        <div className="p-5 rounded-2xl card-surface flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#1D3557] border border-[#457B9D]/40 flex items-center justify-center shrink-0">
            <Bookmark className="w-6 h-6 text-[#A8DADC]" />
          </div>
          <div>
            <div className="text-xl font-bold text-[#F1FAEE]">{bookmarks.length}</div>
            <div className="text-xs text-[var(--color-text-secondary)]">Saved Notes & Materials</div>
          </div>
        </div>
      </div>

      {/* Heading */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-heading text-xl font-bold text-[#F1FAEE]">My Enrolled Courses</h2>
          <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">Quick access to all your registered Physics Wallah & Next Toppers batches</p>
        </div>

        <button
          onClick={onBrowseBatches}
          className="px-3.5 py-1.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-xs font-semibold text-[var(--color-text-secondary)] hover:text-[#F1FAEE] hover:border-[#457B9D] flex items-center gap-1.5 transition-all btn-press"
        >
          <Layers className="w-3.5 h-3.5 text-[#A8DADC]" />
          <span>Browse All</span>
        </button>
      </div>

      {myBatches.length === 0 ? (
        <div className="text-center py-20 card-surface rounded-3xl p-8">
          <div className="w-14 h-14 rounded-2xl bg-[#1D3557] border border-[#457B9D]/40 flex items-center justify-center mx-auto mb-3">
            <BookOpen className="w-7 h-7 text-[#A8DADC]" />
          </div>
          <h3 className="text-base font-bold text-[var(--color-text-primary)] mb-1">No batches enrolled yet</h3>
          <p className="text-xs text-[var(--color-text-secondary)] mb-5 max-w-sm mx-auto">
            You haven't enrolled in any batches yet. Explore the batch catalog and click "Enroll".
          </p>
          <button
            onClick={onBrowseBatches}
            className="px-5 py-2.5 rounded-xl bg-[#457B9D] hover:bg-[#386684] text-[#F1FAEE] font-bold text-xs transition-all shadow-sm btn-press"
          >
            Explore Batches
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {myBatches.map((batch) => (
            <BatchCard key={batch.id} batch={batch} onSelect={onSelectBatch} />
          ))}
        </div>
      )}
    </div>
  );
}
