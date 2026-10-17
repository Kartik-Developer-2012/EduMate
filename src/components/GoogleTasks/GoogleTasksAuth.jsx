import React, { useEffect } from 'react';
import { LogIn, Loader } from 'lucide-react';
import { useGoogleTasks } from '../../context/GoogleTasksContext';
import { Button } from '../ui';

export default function GoogleTasksAuth() {
  const { isAuthenticated, loginWithGoogle, handleOAuthCallback, loading } = useGoogleTasks();

  // Handle OAuth callback on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');

    if (code && !isAuthenticated) {
      handleOAuthCallback(code);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [isAuthenticated, handleOAuthCallback]);

  if (isAuthenticated) {
    return null; // Don't show auth component if already authenticated
  }

  return (
    <div className="w-full max-w-md mx-auto p-6 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#5B21B6] to-[#06B6D4] mx-auto flex items-center justify-center">
          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
            Sync with Google Tasks
          </h2>
          <p className="text-sm text-[var(--color-text-muted)] mt-2">
            Connect your Google account to sync study goals, track tasks, and never miss a deadline
          </p>
        </div>

        <div className="space-y-3 pt-2">
          <Button
            variant="primary"
            size="lg"
            icon={loading ? Loader : LogIn}
            onClick={loginWithGoogle}
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Connecting...' : 'Login with Google'}
          </Button>

          <p className="text-xs text-[var(--color-text-muted)]">
            🔒 Your data is secure. We only access your Google Tasks.
          </p>
        </div>

        <div className="pt-4 space-y-2 text-left">
          <h3 className="text-xs font-semibold text-[var(--color-text-primary)] uppercase tracking-wide">
            What you'll get:
          </h3>
          <ul className="text-xs text-[var(--color-text-muted)] space-y-1">
            <li>✅ Sync study goals from Google Tasks</li>
            <li>✅ See missed tasks and catch-up plans</li>
            <li>✅ Create/edit tasks right here</li>
            <li>✅ Track which tasks are for which dates</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
