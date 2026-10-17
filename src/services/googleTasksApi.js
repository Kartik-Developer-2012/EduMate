/**
 * Google Tasks API Service
 * Handles OAuth 2.0 authentication and real-time task synchronization
 *
 * Features:
 * - Google OAuth 2.0 authentication
 * - Fetch tasks from Google Tasks API
 * - Push task updates back to Google
 * - Real-time sync every 5 minutes
 * - Handle conflicts intelligently
 */

// Google OAuth Configuration
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = import.meta.env.VITE_GOOGLE_CLIENT_SECRET || '';
const REDIRECT_URI = `${window.location.origin}/auth/google/callback`;

// Google Tasks API Configuration
const GOOGLE_TASKS_API_URL = 'https://www.googleapis.com/tasks/v1';
const SCOPES = ['https://www.googleapis.com/auth/tasks'];

class GoogleTasksService {
  constructor() {
    this.accessToken = localStorage.getItem('google_access_token') || null;
    this.refreshToken = localStorage.getItem('google_refresh_token') || null;
    this.tokenExpiry = localStorage.getItem('google_token_expiry') || null;
    this.syncInterval = null;
    this.lastSyncTime = localStorage.getItem('google_last_sync') || null;
    this.tasks = [];
    this.taskLists = [];
  }

  getRedirectUri() {
    if (typeof window === 'undefined') return '';
    return import.meta.env.VITE_GOOGLE_REDIRECT_URI || `${window.location.origin}/auth/google/callback`;
  }

  /**
   * Initiate Google OAuth 2.0 Login Flow
   */
  initiateLogin(usePopup = true) {
    const redirectUri = this.getRedirectUri();
    try {
      sessionStorage.setItem('google_oauth_redirect_uri', redirectUri);
    } catch {}

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.append('client_id', GOOGLE_CLIENT_ID);
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', SCOPES.join(' '));
    authUrl.searchParams.append('access_type', 'offline');
    authUrl.searchParams.append('prompt', 'consent');

    if (usePopup && typeof window !== 'undefined') {
      const width = 520;
      const height = 650;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2.5;

      const popup = window.open(
        authUrl.toString(),
        'google_oauth_popup',
        `width=${width},height=${height},left=${left},top=${top},status=no,menubar=no,toolbar=no`
      );

      if (popup) return popup;
    }

    window.location.href = authUrl.toString();
  }

  /**
   * Exchange authorization code for access token
   * Called after OAuth callback
   */
  async exchangeCodeForToken(code) {
    let redirectUri = this.getRedirectUri();
    try {
      const stored = sessionStorage.getItem('google_oauth_redirect_uri');
      if (stored) redirectUri = stored;
    } catch {}

    try {
      const bodyParams = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }).toString();

      let response = await fetch('/api/google-oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: bodyParams,
      }).catch(() => null);

      if (!response || !response.ok) {
        response = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: bodyParams,
        });
      }

      const data = await response.json();

      if (data.access_token) {
        this.setTokens(data.access_token, data.refresh_token, data.expires_in);
        return true;
      }
      console.warn('OAuth token exchange returned no access token:', data);
      return false;
    } catch (error) {
      console.error('Token exchange failed:', error);
      return false;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken() {
    if (!this.refreshToken) {
      console.warn('No refresh token available');
      return false;
    }

    try {
      const bodyParams = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: this.refreshToken,
        grant_type: 'refresh_token',
      }).toString();

      let response = await fetch('/api/google-oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: bodyParams,
      }).catch(() => null);

      if (!response || !response.ok) {
        response = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: bodyParams,
        });
      }

      const data = await response.json();

      if (data.access_token) {
        this.setTokens(data.access_token, this.refreshToken, data.expires_in);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  }

  /**
   * Store tokens in memory and localStorage
   */
  setTokens(accessToken, refreshToken, expiresIn) {
    this.accessToken = accessToken;
    if (refreshToken) this.refreshToken = refreshToken;

    const expiryTime = Date.now() + (expiresIn * 1000);
    this.tokenExpiry = expiryTime;

    localStorage.setItem('google_access_token', accessToken);
    if (refreshToken) localStorage.setItem('google_refresh_token', refreshToken);
    localStorage.setItem('google_token_expiry', expiryTime);
  }

  /**
   * Check if token is expired and refresh if needed
   */
  async ensureValidToken() {
    if (!this.accessToken) return false;

    const now = Date.now();
    const expiryTime = parseInt(this.tokenExpiry || 0);

    // Refresh if token expires within 5 minutes
    if (now > expiryTime - (5 * 60 * 1000)) {
      return await this.refreshAccessToken();
    }

    return true;
  }

  /**
   * Fetch all task lists from Google Tasks
   */
  async fetchTaskLists() {
    if (!await this.ensureValidToken()) return [];

    try {
      const response = await fetch(`${GOOGLE_TASKS_API_URL}/users/@me/lists`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      this.taskLists = data.items || [];
      return this.taskLists;
    } catch (error) {
      console.error('Failed to fetch task lists:', error);
      return [];
    }
  }

  /**
   * Fetch tasks from a specific task list
   */
  async fetchTasks(taskListId = '@default') {
    if (!await this.ensureValidToken()) return [];

    try {
      const response = await fetch(
        `${GOOGLE_TASKS_API_URL}/lists/${taskListId}/tasks?showCompleted=true&showDeleted=false`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();
      const tasks = data.items || [];

      // Store and process tasks
      this.tasks = this.processTasksForUI(tasks);
      localStorage.setItem('google_last_sync', new Date().toISOString());
      this.lastSyncTime = new Date().toISOString();

      return this.tasks;
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
      return [];
    }
  }

  /**
   * Process tasks and categorize them
   */
  processTasksForUI(tasks) {
    const now = new Date();

    return tasks.map(task => ({
      id: task.id,
      title: task.title,
      notes: task.notes || '',
      dueDate: task.due ? new Date(task.due) : null,
      completed: task.status === 'completed',
      created: new Date(task.updated),

      // Calculate task status
      status: this.calculateTaskStatus(task, now),
      priority: this.calculatePriority(task, now),

      // Raw Google data
      googleTask: task,
    }));
  }

  /**
   * Calculate task status (overdue, due-soon, on-track, completed)
   */
  calculateTaskStatus(task, now) {
    if (task.status === 'completed') return 'completed';

    if (!task.due) return 'no-due-date';

    const dueDate = new Date(task.due);
    const daysUntilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

    if (daysUntilDue < 0) return 'overdue';
    if (daysUntilDue === 0) return 'due-today';
    if (daysUntilDue <= 2) return 'due-soon';

    return 'on-track';
  }

  /**
   * Calculate task priority (high, medium, low)
   */
  calculatePriority(task, now) {
    if (!task.due) return 'low';

    const dueDate = new Date(task.due);
    const hoursUntilDue = (dueDate - now) / (1000 * 60 * 60);

    if (hoursUntilDue < 0) return 'high'; // Overdue
    if (hoursUntilDue <= 24) return 'high'; // Due in 24 hours
    if (hoursUntilDue <= 72) return 'medium'; // Due in 3 days

    return 'low';
  }

  /**
   * Create a new task in Google Tasks
   */
  async createTask(title, taskListId = '@default', dueDate = null, notes = '') {
    if (!await this.ensureValidToken()) return null;

    try {
      const taskData = {
        title,
        notes,
      };

      if (dueDate) {
        taskData.due = new Date(dueDate).toISOString();
      }

      const response = await fetch(
        `${GOOGLE_TASKS_API_URL}/lists/${taskListId}/tasks`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(taskData),
        }
      );

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to create task:', error);
      return null;
    }
  }

  /**
   * Update an existing task
   */
  async updateTask(taskListId = '@default', taskId, updates) {
    if (!await this.ensureValidToken()) return null;

    try {
      const response = await fetch(
        `${GOOGLE_TASKS_API_URL}/lists/${taskListId}/tasks/${taskId}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updates),
        }
      );

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to update task:', error);
      return null;
    }
  }

  /**
   * Mark task as complete
   */
  async completeTask(taskListId = '@default', taskId) {
    return await this.updateTask(taskListId, taskId, { status: 'completed' });
  }

  /**
   * Delete a task
   */
  async deleteTask(taskListId = '@default', taskId) {
    if (!await this.ensureValidToken()) return false;

    try {
      await fetch(
        `${GOOGLE_TASKS_API_URL}/lists/${taskListId}/tasks/${taskId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
          },
        }
      );

      return true;
    } catch (error) {
      console.error('Failed to delete task:', error);
      return false;
    }
  }

  /**
   * Start automatic sync (every 5 minutes)
   */
  startAutoSync(taskListId = '@default', onSync = null) {
    // Initial sync
    this.fetchTasks(taskListId);

    // Set up interval (5 minutes = 300000ms)
    this.syncInterval = setInterval(async () => {
      const tasks = await this.fetchTasks(taskListId);
      if (onSync) onSync(tasks);
    }, 5 * 60 * 1000);
  }

  /**
   * Stop automatic sync
   */
  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Get today's tasks
   */
  getTodaysTasks() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.tasks.filter(task => {
      if (task.completed) return false;
      if (!task.dueDate) return false;

      const taskDate = new Date(task.dueDate);
      taskDate.setHours(0, 0, 0, 0);

      return taskDate.getTime() === today.getTime();
    });
  }

  /**
   * Get overdue tasks
   */
  getOverdueTasks() {
    const now = new Date();
    return this.tasks.filter(task => task.status === 'overdue' && !task.completed);
  }

  /**
   * Get upcoming tasks (next 7 days)
   */
  getUpcomingTasks() {
    const now = new Date();
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    return this.tasks.filter(task => {
      if (task.completed || !task.dueDate) return false;

      const taskDate = new Date(task.dueDate);
      return taskDate > now && taskDate <= sevenDaysLater;
    }).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return !!this.accessToken;
  }

  /**
   * Logout and clear tokens
   */
  logout() {
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiry = null;
    this.tasks = [];
    this.taskLists = [];
    this.stopAutoSync();

    localStorage.removeItem('google_access_token');
    localStorage.removeItem('google_refresh_token');
    localStorage.removeItem('google_token_expiry');
    localStorage.removeItem('google_last_sync');
  }

  /**
   * Get sync statistics
   */
  getSyncStats() {
    return {
      lastSync: this.lastSyncTime,
      totalTasks: this.tasks.length,
      completedTasks: this.tasks.filter(t => t.completed).length,
      overdueTasks: this.getOverdueTasks().length,
      todaysTasks: this.getTodaysTasks().length,
      isAuthenticated: this.isAuthenticated(),
      hasAccessToken: !!this.accessToken,
    };
  }
}

// Export singleton instance
export const googleTasksService = new GoogleTasksService();
export default googleTasksService;
