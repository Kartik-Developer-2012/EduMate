import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import googleTasksService from '../services/googleTasksApi';

const GoogleTasksContext = createContext();

export function GoogleTasksProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(googleTasksService.isAuthenticated());
  const [tasks, setTasks] = useState([]);
  const [taskLists, setTaskLists] = useState([]);
  const [selectedTaskList, setSelectedTaskList] = useState('@default');
  const [loading, setLoading] = useState(false);
  const [syncStats, setSyncStats] = useState(null);
  const [missedTasks, setMissedTasks] = useState([]);
  const [todaysTasks, setTodaysTasks] = useState([]);
  const [upcomingTasks, setUpcomingTasks] = useState([]);
  const [error, setError] = useState(null);

  /**
   * Initialize Google Tasks after login
   */
  const initializeTasks = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch task lists
      const lists = await googleTasksService.fetchTaskLists();
      setTaskLists(lists);

      // Fetch tasks from default list
      const allTasks = await googleTasksService.fetchTasks(selectedTaskList);
      setTasks(allTasks);

      // Calculate missed, today's, and upcoming tasks
      const missed = googleTasksService.getOverdueTasks();
      const today = googleTasksService.getTodaysTasks();
      const upcoming = googleTasksService.getUpcomingTasks();

      setMissedTasks(missed);
      setTodaysTasks(today);
      setUpcomingTasks(upcoming);

      // Start auto-sync
      googleTasksService.startAutoSync(selectedTaskList, (updatedTasks) => {
        setTasks(updatedTasks);
        setMissedTasks(googleTasksService.getOverdueTasks());
        setTodaysTasks(googleTasksService.getTodaysTasks());
        setUpcomingTasks(googleTasksService.getUpcomingTasks());
      });

      setError(null);
    } catch (err) {
      console.error('Failed to initialize tasks:', err);
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
      } else {
        setError('Failed to authenticate with Google');
      }
    } catch (err) {
      console.error('OAuth callback failed:', err);
      setError('Authentication failed');
    } finally {
      setLoading(false);
    }
  }, [initializeTasks]);

  /**
   * Logout
   */
  const logout = useCallback(() => {
    googleTasksService.logout();
    setIsAuthenticated(false);
    setTasks([]);
    setTaskLists([]);
    setMissedTasks([]);
    setTodaysTasks([]);
    setUpcomingTasks([]);
    setError(null);
  }, []);

  /**
   * Create new task
   */
  const createTask = useCallback(async (title, dueDate = null, notes = '') => {
    try {
      const newTask = await googleTasksService.createTask(
        title,
        selectedTaskList,
        dueDate,
        notes
      );

      if (newTask) {
        // Refresh tasks
        const updated = await googleTasksService.fetchTasks(selectedTaskList);
        setTasks(updated);
        setMissedTasks(googleTasksService.getOverdueTasks());
        setTodaysTasks(googleTasksService.getTodaysTasks());
        setUpcomingTasks(googleTasksService.getUpcomingTasks());
        return newTask;
      }
    } catch (err) {
      console.error('Failed to create task:', err);
      setError('Failed to create task');
    }
    return null;
  }, [selectedTaskList]);

  /**
   * Update task
   */
  const updateTask = useCallback(async (taskId, updates) => {
    try {
      const updated = await googleTasksService.updateTask(
        selectedTaskList,
        taskId,
        updates
      );

      if (updated) {
        // Refresh tasks
        const allTasks = await googleTasksService.fetchTasks(selectedTaskList);
        setTasks(allTasks);
        setMissedTasks(googleTasksService.getOverdueTasks());
        setTodaysTasks(googleTasksService.getTodaysTasks());
        setUpcomingTasks(googleTasksService.getUpcomingTasks());
        return updated;
      }
    } catch (err) {
      console.error('Failed to update task:', err);
      setError('Failed to update task');
    }
    return null;
  }, [selectedTaskList]);

  /**
   * Complete task
   */
  const completeTask = useCallback(async (taskId) => {
    return await updateTask(taskId, { status: 'completed' });
  }, [updateTask]);

  /**
   * Delete task
   */
  const deleteTask = useCallback(async (taskId) => {
    try {
      const success = await googleTasksService.deleteTask(selectedTaskList, taskId);
      if (success) {
        const updated = await googleTasksService.fetchTasks(selectedTaskList);
        setTasks(updated);
        setMissedTasks(googleTasksService.getOverdueTasks());
        setTodaysTasks(googleTasksService.getTodaysTasks());
        setUpcomingTasks(googleTasksService.getUpcomingTasks());
        return true;
      }
    } catch (err) {
      console.error('Failed to delete task:', err);
      setError('Failed to delete task');
    }
    return false;
  }, [selectedTaskList]);

  /**
   * Manually sync tasks
   */
  const manualSync = useCallback(async () => {
    setLoading(true);
    try {
      const updated = await googleTasksService.fetchTasks(selectedTaskList);
      setTasks(updated);
      setMissedTasks(googleTasksService.getOverdueTasks());
      setTodaysTasks(googleTasksService.getTodaysTasks());
      setUpcomingTasks(googleTasksService.getUpcomingTasks());
      setSyncStats(googleTasksService.getSyncStats());
      setError(null);
    } catch (err) {
      console.error('Manual sync failed:', err);
      setError('Failed to sync tasks');
    } finally {
      setLoading(false);
    }
  }, [selectedTaskList]);

  /**
   * Get catch-up plan for missed tasks
   */
  const getCatchUpPlan = useCallback(() => {
    return missedTasks.map((task, index) => ({
      ...task,
      estimatedTime: Math.ceil(Math.random() * 60) + 10, // 10-70 min estimate
      priority: index === 0 ? 'high' : 'medium',
      order: index + 1,
    }));
  }, [missedTasks]);

  // Initialize on mount if authenticated
  useEffect(() => {
    if (isAuthenticated && tasks.length === 0) {
      initializeTasks();
    }

    return () => {
      googleTasksService.stopAutoSync();
    };
  }, [isAuthenticated]);

  const value = {
    // State
    isAuthenticated,
    tasks,
    taskLists,
    selectedTaskList,
    loading,
    error,
    syncStats,

    // Task categories
    missedTasks,
    todaysTasks,
    upcomingTasks,

    // Actions
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
