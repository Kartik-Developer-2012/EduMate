import React, { useState } from 'react';
import {
  Check,
  Plus,
  Trash2,
  Calendar,
  AlertCircle,
  Clock,
  ListTodo,
  Sparkles,
  Flame,
} from 'lucide-react';
import { useGoogleTasks } from '../../context/GoogleTasksContext';
import GoogleTasksAuth from './GoogleTasksAuth';
import { Button } from '../ui';

export default function TaskList({ onStartTimer = null }) {
  const {
    tasks: allTasks,
    todaysTasks,
    missedTasks,
    upcomingTasks,
    completeTask,
    deleteTask,
    createTask,
    getCatchUpPlan,
    isAuthenticated,
  } = useGoogleTasks();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({ title: '', dueDate: '', notes: '' });
  const [activeTab, setActiveTab] = useState('today'); // 'today', 'missed', 'upcoming', 'all'
  const [showCatchUpPlan, setShowCatchUpPlan] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleCreateTask = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!formData.title.trim()) return;

    setSubmitting(true);
    try {
      await createTask(formData.title.trim(), formData.dueDate || null, formData.notes.trim());
      setFormData({ title: '', dueDate: '', notes: '' });
      setShowCreateForm(false);
    } finally {
      setSubmitting(false);
    }
  };

  const catchUpPlan = getCatchUpPlan();

  const getFilteredTasks = () => {
    switch (activeTab) {
      case 'missed':
        return missedTasks;
      case 'upcoming':
        return upcomingTasks;
      case 'all':
        return allTasks;
      case 'today':
      default:
        return todaysTasks;
    }
  };

  const tasks = getFilteredTasks();

  return (
    <div className="w-full space-y-5">
      {/* Google Tasks Auth Banner / Status */}
      <GoogleTasksAuth compact={isAuthenticated} />

      {/* Header and Tab Navigation */}
      <div className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[var(--color-border)] pb-3">
          <div>
            <h2 className="text-base font-bold text-[var(--color-text-primary)] flex items-center gap-2">
              <ListTodo className="w-5 h-5 text-[#06B6D4]" />
              <span>Study Tasks & Goals</span>
            </h2>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
              Organize your chapters, homework, and revision schedule
            </p>
          </div>

          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={() => setShowCreateForm(true)}
            className="bg-[#5B21B6] hover:bg-[#6D28D9] text-[#F8FAFC] border-none shadow-sm"
          >
            New Task
          </Button>
        </div>

        {/* Tab Pills */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab('today')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'today'
                ? 'bg-[#06B6D4] text-[#0F172A] shadow-sm font-bold'
                : 'bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Today</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              activeTab === 'today' ? 'bg-[#0F172A]/20 text-[#0F172A]' : 'bg-[var(--color-border)] text-[var(--color-text-secondary)]'
            }`}>
              {todaysTasks.length}
            </span>
          </button>

          {missedTasks.length > 0 && (
            <button
              onClick={() => setActiveTab('missed')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'missed'
                  ? 'bg-red-500 text-white shadow-sm font-bold'
                  : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Missed</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-red-900/40 text-red-200 font-bold">
                {missedTasks.length}
              </span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('upcoming')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'upcoming'
                ? 'bg-[#5B21B6] text-white shadow-sm font-bold'
                : 'bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Upcoming</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              activeTab === 'upcoming' ? 'bg-white/20 text-white' : 'bg-[var(--color-border)] text-[var(--color-text-secondary)]'
            }`}>
              {upcomingTasks.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('all')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'all'
                ? 'bg-[var(--color-text-primary)] text-[var(--color-text-inverse)] shadow-sm font-bold'
                : 'bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            <ListTodo className="w-3.5 h-3.5" />
            <span>All Tasks</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              activeTab === 'all' ? 'bg-black/20 text-black' : 'bg-[var(--color-border)] text-[var(--color-text-secondary)]'
            }`}>
              {allTasks.length}
            </span>
          </button>
        </div>

        {/* Missed Tasks Alert with Catch-up Plan */}
        {activeTab === 'missed' && missedTasks.length > 0 && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex-1">
                <h3 className="font-bold text-red-400 flex items-center gap-2 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  You have {missedTasks.length} overdue task{missedTasks.length !== 1 ? 's' : ''}
                </h3>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                  Catch-up schedule breaks them into focused Pomodoro sessions.
                </p>
              </div>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setShowCatchUpPlan(!showCatchUpPlan)}
              >
                {showCatchUpPlan ? 'Hide Schedule' : 'View Catch-up Plan'}
              </Button>
            </div>

            {showCatchUpPlan && (
              <div className="mt-4 pt-3 border-t border-red-500/20 space-y-2">
                <h4 className="font-semibold text-xs text-[var(--color-text-primary)] uppercase tracking-wider">
                  Recommended Sequence:
                </h4>
                {catchUpPlan.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 p-2.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]"
                  >
                    <div className="w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px] font-bold">
                      {task.order}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-[var(--color-text-primary)] truncate">
                        {task.title}
                      </p>
                      <p className="text-[10px] text-[var(--color-text-muted)]">
                        Est: {task.estimatedTime} min focus
                      </p>
                    </div>
                    {onStartTimer && (
                      <button
                        onClick={() => onStartTimer(task)}
                        className="flex items-center gap-1 px-2 py-1 rounded bg-[#5B21B6] hover:bg-[#6D28D9] text-white text-[10px] font-bold transition-all"
                      >
                        <Flame className="w-3 h-3" />
                        <span>Start</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Create Task Form */}
        {showCreateForm && (
          <form
            onSubmit={handleCreateTask}
            className="p-4 rounded-xl bg-[var(--color-surface-hover)] border border-[var(--color-border)] space-y-3 transition-all"
          >
            <div className="flex items-center justify-between pb-1">
              <span className="text-xs font-bold text-[var(--color-text-primary)] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#06B6D4]" />
                <span>Create New Study Task</span>
              </span>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
              >
                ✕
              </button>
            </div>

            <input
              type="text"
              placeholder="What do you need to study? (e.g. Physics Wave Optics Notes)"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[#06B6D4]"
              autoFocus
              required
            />

            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1">
                <label className="text-[10px] text-[var(--color-text-muted)] block mb-1">
                  Due Date (optional):
                </label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[#06B6D4]"
                />
              </div>
              <div className="flex-2">
                <label className="text-[10px] text-[var(--color-text-muted)] block mb-1">
                  Notes / Chapter details (optional):
                </label>
                <input
                  type="text"
                  placeholder="e.g. Chapter 4, Exercise 1-20"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[#06B6D4]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowCreateForm(false);
                  setFormData({ title: '', dueDate: '', notes: '' });
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={submitting}
                className="bg-[#06B6D4] hover:bg-[#0891B2] text-[#0F172A] font-bold"
              >
                Save Task
              </Button>
            </div>
          </form>
        )}

        {/* Task List Items */}
        <div className="space-y-2 pt-1">
          {tasks.length === 0 ? (
            <div className="text-center py-10 px-4 rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg)]/50">
              <ListTodo className="w-8 h-8 text-[var(--color-text-muted)] mx-auto mb-2 opacity-50" />
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                No {activeTab} tasks found
              </p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                {activeTab === 'today'
                  ? 'All caught up for today! Click "New Task" to plan your next session.'
                  : 'Add study goals to stay organized and maintain your momentum.'}
              </p>
              {!showCreateForm && (
                <Button
                  variant="secondary"
                  size="sm"
                  icon={Plus}
                  onClick={() => setShowCreateForm(true)}
                  className="mt-3 mx-auto"
                >
                  Add a Study Task
                </Button>
              )}
            </div>
          ) : (
            tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-start sm:items-center gap-3 p-3 sm:p-3.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] hover:border-[var(--color-border-hover)] transition-all group"
              >
                {/* Checkbox */}
                <button
                  type="button"
                  onClick={() => completeTask(task.id)}
                  title={task.completed ? 'Mark incomplete' : 'Mark completed'}
                  className={`flex-shrink-0 w-5 h-5 rounded-lg border-2 mt-0.5 sm:mt-0 flex items-center justify-center transition-all ${
                    task.completed
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : 'border-[var(--color-border)] hover:border-[#06B6D4]'
                  }`}
                >
                  {task.completed && <Check className="w-3.5 h-3.5" />}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-xs sm:text-sm font-medium leading-snug transition-all ${
                      task.completed
                        ? 'line-through text-[var(--color-text-muted)]'
                        : 'text-[var(--color-text-primary)]'
                    }`}
                  >
                    {task.title}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    {task.dueDate && (
                      <span className="text-[10px] text-[var(--color-text-muted)] flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>
                          {new Date(task.dueDate).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </span>
                    )}
                    {task.notes && (
                      <span className="text-[10px] text-[var(--color-text-muted)] italic truncate max-w-xs">
                        {task.notes}
                      </span>
                    )}
                  </div>
                </div>

                {/* Status Badge */}
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      task.completed
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : task.status === 'overdue'
                        ? 'bg-red-500/20 text-red-400'
                        : task.status === 'due-today'
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)]'
                    }`}
                  >
                    {task.completed
                      ? 'Done'
                      : task.status === 'overdue'
                      ? 'Overdue'
                      : task.status === 'due-today'
                      ? 'Today'
                      : 'Upcoming'}
                  </span>

                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={() => deleteTask(task.id)}
                    title="Delete task"
                    className="p-1 rounded text-[var(--color-text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-70 group-hover:opacity-100"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
