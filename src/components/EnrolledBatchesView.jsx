import React from 'react';
import { BookOpen, Bookmark, CheckCircle2, Play, Layers } from 'lucide-react';
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
        <div className="p-5 rounded-2xl bg-[#121215] border border-white/5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
            <BookOpen className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <div className="text-xl font-bold text-white">{myBatches.length}</div>
            <div className="text-xs text-neutral-400">Enrolled Batches</div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#121215] border border-white/5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <div className="text-xl font-bold text-white">{completedLectures.length}</div>
            <div className="text-xs text-neutral-400">Lectures Completed</div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#121215] border border-white/5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
            <Bookmark className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <div className="text-xl font-bold text-white">{bookmarks.length}</div>
            <div className="text-xs text-neutral-400">Saved Notes & Materials</div>
          </div>
        </div>
      </div>

      {/* Heading */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-heading text-xl font-bold text-white">My Enrolled Courses</h2>
          <p className="text-xs text-neutral-400 mt-0.5">Quick access to all your registered Physics Wallah & Next Toppers batches</p>
        </div>

        <button
          onClick={onBrowseBatches}
          className="px-3.5 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs font-semibold text-neutral-300 hover:text-white flex items-center gap-1.5 transition-colors"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Browse All</span>
        </button>
      </div>

      {myBatches.length === 0 ? (
        <div className="text-center py-20 bg-neutral-900/40 rounded-3xl border border-white/5">
          <BookOpen className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white mb-1">No batches enrolled yet</h3>
          <p className="text-xs text-neutral-500 mb-5 max-w-sm mx-auto">
            You haven't enrolled in any batches yet. Explore the batch catalog and click "Enroll".
          </p>
          <button
            onClick={onBrowseBatches}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs transition-colors shadow-md"
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
