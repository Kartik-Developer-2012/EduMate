import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import googleTasksService from '../services/googleTasksApi';

const GoogleTasksContext = createContext(null);

const LOCAL_TASKS_KEY = 'edumate_local_tasks';

// Default initial tasks if student starts fresh
const INITIAL_DEMO_TASKS = [
  {
    id: 'task-1',
    title: 'Complete 1 Pomodoro study session (25 mins)',
    notes: 'Focus on core concepts without distractions',
    dueDate: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    completed: false,
    created: new Date().toISOString(),
    status: 'due-today',
    priority: 'high',
  },
  {
    id: 'task-2',
    title: 'Review lecture notes & formula sheet',
    notes: 'Summarize key equations in notebook',
    dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    completed: false,
    created: new Date().toISOString(),
    status: 'due-soon',
    priority: 'medium',
  },
];

function getStoredLocalTasks() {
  try {
    const raw = localStorage.getItem(LOCAL_TASKS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to parse local tasks:', e);
  }
  return INITIAL_DEMO_TASKS;
}

function saveLocalTasks(tasks) {
  try {
    localStorage.setItem(LOCAL_TASKS_KEY, JSON.stringify(tasks));
  } catch (e) {
    console.warn('Failed to save local tasks:', e);
  }
}

export function GoogleTasksProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(googleTasksService.isAuthenticated());
  const [localTasks, setLocalTasks] = useState(() => getStoredLocalTasks());
  const [googleTasks, setGoogleTasks] = useState([]);
  const [taskLists, setTaskLists] = useState([]);
  const [selectedTaskList, setSelectedTaskList] = useState('@default');
  const [loading, setLoading] = useState(false);
  const [syncStats, setSyncStats] = useState(null);
  const [error, setError] = useState(null);

  // Active tasks depend on whether user is logged into Google Tasks or using local study tasks
  const rawTasks = isAuthenticated ? googleTasks : localTasks;

  // Process and categorize tasks
  const { tasks, missedTasks, todaysTasks, upcomingTasks } = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const todayEnd = todayStart + 24 * 60 * 60 * 1000;
    const sevenDaysLater = now.getTime() + 7 * 24 * 60 * 60 * 1000;

    const processed = (rawTasks || []).map((t) => {
      const dueTime = t.dueDate ? new Date(t.dueDate).getTime() : null;
      let status = 'on-track';
      let priority = t.priority || 'medium';

      if (t.completed) {
        status = 'completed';
      } else if (dueTime) {
        if (dueTime < todayStart) {
          status = 'overdue';
          priority = 'high';
        } else if (dueTime >= todayStart && dueTime < todayEnd) {
          status = 'due-today';
          priority = 'high';
        } else if (dueTime <= sevenDaysLater) {
          status = 'due-soon';
        }
      } else {
        // No due date: treat as today's backlog
        status = 'due-today';
      }

      return {
        ...t,
        status,
        priority,
      };
    });

    const missed = processed.filter((t) => t.status === 'overdue' && !t.completed);
    const today = processed.filter((t) => (t.status === 'due-today' || !t.dueDate) && !t.completed);
    const upcoming = processed.filter((t) => t.status === 'due-soon' && !t.completed);

    return {
      tasks: processed,
      missedTasks: missed,
      todaysTasks: today,
      upcomingTasks: upcoming,
    };
  }, [rawTasks]);

  /**
   * Initialize Google Tasks after login
   */
  const initializeTasks = useCallback(async () => {
    setLoading(true);
    try {
      const lists = await googleTasksService.fetchTaskLists();
      setTaskLists(lists);

      const allTasks = await googleTasksService.fetchTasks(selectedTaskList);
      setGoogleTasks(allTasks);

      googleTasksService.startAutoSync(selectedTaskList, (updatedTasks) => {
        setGoogleTasks(updatedTasks);
      });

      setSyncStats(googleTasksService.getSyncStats());
      setError(null);
    } catch (err) {
      console.error('Failed to initialize tasks from Google Tasks:', err);
      setError('Failed to load tasks from Google Tasks');
    } finally {
      setLoading(false);
    }
  }, [selectedTaskList]);

  /**
   * Login with Google
   */
  const loginWithGoogle = useCallback(() => {
    googleTasksService.initiateLogin();
  }, []);

  /**
   * Handle OAuth callback
   */
  const handleOAuthCallback = useCallback(async (code) => {
    setLoading(true);
    try {
      const success = await googleTasksService.exchangeCodeForToken(code);
      if (success) {
        setIsAuthenticated(true);
        await initializeTasks();
        setError(null);
        return true;
      } else {
        setError('Failed to authenticate with Google Tasks');
        return false;
      }
    } catch (err) {
      console.error('OAuth callback failed:', err);
      setError('Authentication failed. Check Google OAuth configuration.');
      return false;
    } finally {
      setLoading(false);
    }
  }, [initializeTasks]);

  /**
   * Logout from Google Tasks (switches back to local study tasks)
   */
  const logout = useCallback(() => {
    googleTasksService.logout();
    setIsAuthenticated(false);
    setGoogleTasks([]);
    setTaskLists([]);
    setError(null);
  }, []);

  /**
   * Create new task
   */
  const createTask = useCallback(async (title, dueDate = null, notes = '') => {
    if (!title || !title.trim()) return null;

    if (isAuthenticated) {
      try {
        const newTask = await googleTasksService.createTask(
          title.trim(),
          selectedTaskList,
          dueDate,
          notes
        );
        if (newTask) {
          const updated = await googleTasksService.fetchTasks(selectedTaskList);
          setGoogleTasks(updated);
          return newTask;
        }
      } catch (err) {
        console.error('Failed to create Google task:', err);
      }
    }

    // Local task creation (offline / pre-Google auth)
    const localNewTask = {
      id: 'local-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      title: title.trim(),
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      notes: notes || '',
      completed: false,
      created: new Date().toISOString(),
      status: dueDate ? 'on-track' : 'due-today',
      priority: 'medium',
    };

    setLocalTasks((prev) => {
      const next = [localNewTask, ...prev];
      saveLocalTasks(next);
      return next;
    });

    return localNewTask;
  }, [isAuthenticated, selectedTaskList]);

  /**
   * Update task
   */
  const updateTask = useCallback(async (taskId, updates) => {
    if (isAuthenticated) {
      try {
        const updated = await googleTasksService.updateTask(
          selectedTaskList,
          taskId,
          updates
        );
        if (updated) {
          const allTasks = await googleTasksService.fetchTasks(selectedTaskList);
          setGoogleTasks(allTasks);
          return updated;
        }
      } catch (err) {
        console.error('Failed to update Google task:', err);
      }
    }

    // Local update
    setLocalTasks((prev) => {
      const next = prev.map((t) => (t.id === taskId ? { ...t, ...updates } : t));
      saveLocalTasks(next);
      return next;
    });

    return true;
  }, [isAuthenticated, selectedTaskList]);

  /**
   * Complete task toggle
   */
  const completeTask = useCallback(async (taskId) => {
    const existing = (rawTasks || []).find((t) => t.id === taskId);
    const newStatus = existing?.completed ? false : true;

    if (isAuthenticated) {
      return await updateTask(taskId, {
        status: newStatus ? 'completed' : 'needsAction',
      });
    }

    setLocalTasks((prev) => {
      const next = prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              completed: newStatus,
              status: newStatus ? 'completed' : (t.dueDate ? 'on-track' : 'due-today'),
            }
          : t
      );
      saveLocalTasks(next);
      return next;
    });
    return true;
  }, [isAuthenticated, rawTasks, updateTask]);

  /**
   * Delete task
   */
  const deleteTask = useCallback(async (taskId) => {
    if (isAuthenticated) {
      try {
        const success = await googleTasksService.deleteTask(selectedTaskList, taskId);
        if (success) {
          const updated = await googleTasksService.fetchTasks(selectedTaskList);
          setGoogleTasks(updated);
          return true;
        }
      } catch (err) {
        console.error('Failed to delete Google task:', err);
      }
    }

    // Local deletion
    setLocalTasks((prev) => {
      const next = prev.filter((t) => t.id !== taskId);
      saveLocalTasks(next);
      return next;
    });
    return true;
  }, [isAuthenticated, selectedTaskList]);

  /**
   * Manually sync tasks
   */
  const manualSync = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const updated = await googleTasksService.fetchTasks(selectedTaskList);
      setGoogleTasks(updated);
      setSyncStats(googleTasksService.getSyncStats());
      setError(null);
    } catch (err) {
      console.error('Manual sync failed:', err);
      setError('Failed to sync tasks');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, selectedTaskList]);

  /**
   * Get catch-up plan for missed tasks
   */
  const getCatchUpPlan = useCallback(() => {
    return missedTasks.map((task, index) => ({
      ...task,
      estimatedTime: Math.min(60, 20 + index * 15),
      priority: index === 0 ? 'high' : 'medium',
      order: index + 1,
    }));
  }, [missedTasks]);

  // Check URL or popup message for OAuth callback
  useEffect(() => {
    // 1. Popup postMessage listener on main window
    const handlePopupMessage = async (event) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'GOOGLE_AUTH_CALLBACK' && event.data?.code) {
        await handleOAuthCallback(event.data.code);
      }
    };
    window.addEventListener('message', handlePopupMessage);

    // 2. If this window was opened as a popup callback, notify opener and close
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) {
      if (window.opener && window.opener !== window) {
        try {
          window.opener.postMessage({ type: 'GOOGLE_AUTH_CALLBACK', code }, window.location.origin);
          window.close();
          return;
        } catch (e) {
          console.warn('Popup postMessage failed:', e);
        }
      }

      // Full page redirect flow
      if (!isAuthenticated) {
        handleOAuthCallback(code).then((ok) => {
          if (ok) {
            const url = new URL(window.location.href);
            url.searchParams.delete('code');
            url.searchParams.delete('scope');
            url.searchParams.delete('authuser');
            url.searchParams.delete('prompt');
            url.searchParams.delete('state');
            window.history.replaceState({}, document.title, url.pathname + (url.search || '?view=tasks'));
          }
        });
      }
    }

    return () => {
      window.removeEventListener('message', handlePopupMessage);
    };
  }, [isAuthenticated, handleOAuthCallback]);

  // Auto-init if authenticated
  useEffect(() => {
    if (isAuthenticated && googleTasks.length === 0) {
      initializeTasks();
    }
    return () => {
      googleTasksService.stopAutoSync();
    };
  }, [isAuthenticated, initializeTasks, googleTasks.length]);

  const value = {
    isAuthenticated,
    tasks,
    taskLists,
    selectedTaskList,
    loading,
    error,
    syncStats,
    missedTasks,
    todaysTasks,
    upcomingTasks,
    loginWithGoogle,
    handleOAuthCallback,
    logout,
    createTask,
    updateTask,
    completeTask,
    deleteTask,
    manualSync,
    setSelectedTaskList,
    initializeTasks,
    getCatchUpPlan,
  };

  return (
    <GoogleTasksContext.Provider value={value}>
      {children}
    </GoogleTasksContext.Provider>
  );
}

export function useGoogleTasks() {
  const context = useContext(GoogleTasksContext);
  if (!context) {
    throw new Error('useGoogleTasks must be used within GoogleTasksProvider');
  }
  return context;
}

export default GoogleTasksContext;
