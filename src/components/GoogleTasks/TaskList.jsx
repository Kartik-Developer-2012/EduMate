import React, { useState } from 'react';
import { Check, Plus, Trash2, Calendar, AlertCircle, Clock } from 'lucide-react';
import { useGoogleTasks } from '../../context/GoogleTasksContext';
import { Button } from '../ui';

export default function TaskList() {
  const {
    todaysTasks,
    missedTasks,
    upcomingTasks,
    completeTask,
    deleteTask,
    createTask,
    getCatchUpPlan,
  } = useGoogleTasks();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({ title: '', dueDate: '', notes: '' });
  const [activeTab, setActiveTab] = useState('today'); // 'today', 'missed', 'upcoming'
  const [showCatchUpPlan, setShowCatchUpPlan] = useState(false);

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (formData.title.trim()) {
      await createTask(formData.title, formData.dueDate || null, formData.notes);
      setFormData({ title: '', dueDate: '', notes: '' });
      setShowCreateForm(false);
    }
  };

  const handleCompleteTask = async (taskId) => {
    await completeTask(taskId);
  };

  const handleDeleteTask = async (taskId) => {
    if (confirm('Are you sure you want to delete this task?')) {
      await deleteTask(taskId);
    }
  };

  const catchUpPlan = getCatchUpPlan();

  const getTasks = () => {
    switch (activeTab) {
      case 'missed':
        return missedTasks;
      case 'upcoming':
        return upcomingTasks;
      default:
        return todaysTasks;
    }
  };

  const tasks = getTasks();

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-[var(--color-border)] pb-4">
        <button
          onClick={() => setActiveTab('today')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'today'
              ? 'bg-[var(--color-primary)] text-white'
              : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
          }`}
        >
          <Calendar size={16} />
          Today ({todaysTasks.length})
        </button>

        {missedTasks.length > 0 && (
          <button
            onClick={() => setActiveTab('missed')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'missed'
                ? 'bg-red-600 text-white'
                : 'text-red-500 hover:bg-red-500/10'
            }`}
          >
            <AlertCircle size={16} />
            Missed ({missedTasks.length})
          </button>
        )}

        <button
          onClick={() => setActiveTab('upcoming')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'upcoming'
              ? 'bg-[var(--color-secondary)] text-white'
              : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
          }`}
        >
          <Clock size={16} />
          Upcoming ({upcomingTasks.length})
        </button>
      </div>

      {/* Missed Tasks Alert with Catch-up Plan */}
      {activeTab === 'missed' && missedTasks.length > 0 && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-red-500 flex items-center gap-2">
                <AlertCircle size={18} />
                You have {missedTasks.length} overdue task{missedTasks.length !== 1 ? 's' : ''}
              </h3>
              <p className="text-sm text-[var(--color-text-muted)] mt-1">
                Let's create a catch-up plan to get back on track
              </p>
            </div>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowCatchUpPlan(!showCatchUpPlan)}
            >
              {showCatchUpPlan ? 'Hide' : 'Show'} Plan
            </Button>
          </div>

          {/* Catch-up Plan */}
          {showCatchUpPlan && (
            <div className="mt-4 space-y-2">
              <h4 className="font-medium text-sm text-[var(--color-text-primary)]">
                Your Catch-up Schedule:
              </h4>
              {catchUpPlan.map((task, idx) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]"
                >
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs font-bold">
                    {task.order}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">
                      {task.title}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      Est. {task.estimatedTime} min
                    </p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-red-500/20 text-red-500 font-medium">
                    {task.priority}
                  </span>
                </div>
              ))}
              <Button
                variant="primary"
                size="md"
                className="w-full mt-4"
              >
                Start Catch-up
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Task List */}
      <div className="space-y-2">
        {tasks.length === 0 ? (
          <div className="text-center py-8 text-[var(--color-text-muted)]">
            <p className="text-sm">No {activeTab} tasks</p>
            <p className="text-xs mt-2">Great job staying on track! 🎉</p>
          </div>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center gap-3 p-4 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-border-hover)] transition-colors group"
            >
              {/* Checkbox */}
              <button
                onClick={() => handleCompleteTask(task.id)}
                className={`flex-shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${
                  task.completed
                    ? 'bg-[var(--color-accent)] border-[var(--color-accent)]'
                    : 'border-[var(--color-border)] hover:border-[var(--color-accent)]'
                }`}
              >
                {task.completed && <Check size={16} className="text-white" />}
              </button>

              {/* Task Content */}
              <div className="flex-1">
                <p
                  className={`font-medium transition-all ${
                    task.completed
                      ? 'line-through text-[var(--color-text-muted)]'
                      : 'text-[var(--color-text-primary)]'
                  }`}
                >
                  {task.title}
                </p>
                {task.dueDate && (
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">
                    Due: {new Date(task.dueDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                )}
              </div>

              {/* Status Badge */}
              <div className={`text-xs px-2 py-1 rounded-full font-medium ${
                task.status === 'overdue'
                  ? 'bg-red-500/20 text-red-500'
                  : task.status === 'due-today'
                  ? 'bg-orange-500/20 text-orange-500'
                  : task.status === 'due-soon'
                  ? 'bg-yellow-500/20 text-yellow-500'
                  : 'bg-[var(--color-highlight-tint)] text-[var(--color-text-secondary)]'
              }`}>
                {task.status === 'overdue' ? 'Overdue' :
                 task.status === 'due-today' ? 'Due Today' :
                 task.status === 'due-soon' ? 'Due Soon' :
                 task.status === 'completed' ? 'Done' :
                 'On Track'}
              </div>

              {/* Delete Button */}
              <button
                onClick={() => handleDeleteTask(task.id)}
                className="flex-shrink-0 p-2 text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Create Task Form */}
      <div className="mt-6 pt-4 border-t border-[var(--color-border)]">
        {!showCreateForm ? (
          <Button
            variant="secondary"
            size="md"
            icon={Plus}
            onClick={() => setShowCreateForm(true)}
            className="w-full"
          >
            Add New Task
          </Button>
        ) : (
          <form onSubmit={handleCreateTask} className="space-y-3 p-4 rounded-lg bg-[var(--color-surface)]">
            <input
              type="text"
              placeholder="Task title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:border-[var(--color-secondary)] outline-none"
              autoFocus
            />

            <input
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-primary)] focus:border-[var(--color-secondary)] outline-none"
            />

            <textarea
              placeholder="Notes (optional)"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:border-[var(--color-secondary)] outline-none resize-none h-20"
            />

            <div className="flex gap-2">
              <Button
                variant="primary"
                size="md"
                onClick={handleCreateTask}
                className="flex-1"
              >
                Create Task
              </Button>
              <Button
                variant="ghost"
                size="md"
                onClick={() => {
                  setShowCreateForm(false);
                  setFormData({ title: '', dueDate: '', notes: '' });
                }}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
