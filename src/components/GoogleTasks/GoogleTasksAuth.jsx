import React, { useState } from 'react';
import {
  LogIn,
  LogOut,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  ExternalLink,
  HelpCircle,
  X,
  ShieldCheck,
} from 'lucide-react';
import { useGoogleTasks } from '../../context/GoogleTasksContext';
import { Button } from '../ui';

export default function GoogleTasksAuth({ compact = false }) {
  const {
    isAuthenticated,
    loginWithGoogle,
    logout,
    manualSync,
    loading,
    error,
    syncStats,
  } = useGoogleTasks();

  const [showConfigHelper, setShowConfigHelper] = useState(false);
  const [copiedField, setCopiedField] = useState(null);

  const localRedirectUri = `${window.location.origin}/auth/google/callback`;
  const localOrigin = window.location.origin;

  const handleCopy = (text, fieldName) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (isAuthenticated) {
    return (
      <div className="w-full p-4 rounded-xl bg-gradient-to-r from-[var(--color-surface)] to-[var(--color-surface-hover)] border border-[var(--color-secondary)]/30 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-[var(--color-text-primary)]">
                Google Tasks Connected
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                Live Sync
              </span>
            </div>
            <p className="text-xs text-[var(--color-text-muted)]">
              {syncStats?.lastSync
                ? `Last synced: ${new Date(syncStats.lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                : 'Auto-sync active every 5 minutes'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            variant="secondary"
            size="sm"
            icon={RefreshCw}
            isLoading={loading}
            onClick={manualSync}
            title="Sync tasks now"
          >
            Sync
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={LogOut}
            onClick={logout}
            className="hover:text-red-400"
            title="Disconnect Google Tasks"
          >
            Disconnect
          </Button>
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="w-full p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <span className="text-xs text-[var(--color-text-secondary)] font-medium">
            Sync across devices with Google Tasks
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="secondary"
            size="sm"
            icon={LogIn}
            onClick={loginWithGoogle}
            isLoading={loading}
          >
            Login
          </Button>
          <button
            onClick={() => setShowConfigHelper(true)}
            title="OAuth Setup Helper / Error 400 fix"
            className="p-1.5 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-amber-400 hover:border-amber-400/40"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="w-full p-6 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-md transition-all hover:border-[var(--color-border-hover)]">
        <div className="text-center space-y-4 max-w-md mx-auto">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#5B21B6] to-[#06B6D4] mx-auto p-0.5 shadow-md flex items-center justify-center">
            <div className="w-full h-full bg-[#0F172A] rounded-[10px] flex items-center justify-center">
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
              Sync with Google Tasks
            </h2>
            <p className="text-xs text-[var(--color-text-muted)] mt-1.5 leading-relaxed">
              Connect your Google account to automatically sync your study deadlines, homework, and revision plans across all devices.
            </p>
          </div>

          {error && (
            <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
              {error}
            </div>
          )}

          <div className="pt-2 space-y-2">
            <Button
              variant="primary"
              size="lg"
              icon={LogIn}
              onClick={loginWithGoogle}
              isLoading={loading}
              className="w-full bg-[#4285F4] hover:bg-[#3367D6] text-white border-transparent shadow-md"
            >
              Login with Google
            </Button>

            <button
              type="button"
              onClick={() => setShowConfigHelper(true)}
              className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 hover:underline pt-1 transition-colors"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Saw &ldquo;Error 400: redirect_uri_mismatch&rdquo;? Click for 30-second fix</span>
            </button>

            <p className="text-[11px] text-[var(--color-text-muted)] pt-1">
              🔒 Local study tasks work 100% offline right now even without logging in.
            </p>
          </div>
        </div>
      </div>

      {/* OAuth Configuration Helper Modal */}
      {showConfigHelper && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setShowConfigHelper(false)}
        >
          <div
            className="w-full max-w-lg bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border)] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--color-text-primary)]">
                    How to Fix &ldquo;Error 400: redirect_uri_mismatch&rdquo;
                  </h3>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Takes 30 seconds in your Google Cloud Console
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowConfigHelper(false)}
                className="p-1 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Why this happens */}
            <div className="text-xs text-[var(--color-text-secondary)] bg-[var(--color-bg)] p-3 rounded-xl border border-[var(--color-border)] leading-relaxed">
              Google OAuth requires every URL where your app runs (<code className="text-[#06B6D4]">http://localhost:5173</code>) to be whitelisted in your Google Cloud Console credentials. Currently only Netlify is registered.
            </div>

            {/* Step-by-Step Instructions */}
            <div className="space-y-3">
              <div className="space-y-1">
                <span className="text-xs font-bold text-[var(--color-text-primary)] flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-[#06B6D4] text-[#0F172A] text-[10px] font-black flex items-center justify-center">1</span>
                  <span>Open your Google Cloud Project:</span>
                </span>
                <a
                  href="https://console.cloud.google.com/apis/credentials?project=edumate-511915"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2 px-3 rounded-lg bg-[#5B21B6] hover:bg-[#6D28D9] text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
                >
                  <span>Open Google Cloud Credentials (edumate-511915)</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-bold text-[var(--color-text-primary)] flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-[#06B6D4] text-[#0F172A] text-[10px] font-black flex items-center justify-center">2</span>
                  <span>Click your OAuth 2.0 Client ID and add these URIs:</span>
                </span>

                {/* Redirect URI Box */}
                <div className="space-y-1">
                  <div className="text-[11px] font-semibold text-[var(--color-text-muted)]">
                    Under &ldquo;Authorized redirect URIs&rdquo; &rarr; click &ldquo;+ ADD URI&rdquo;:
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)]">
                    <code className="text-xs text-[#06B6D4] flex-1 font-mono truncate">
                      {localRedirectUri}
                    </code>
                    <button
                      onClick={() => handleCopy(localRedirectUri, 'redirect')}
                      className="px-2 py-1 rounded bg-[var(--color-surface-hover)] text-xs font-semibold text-[var(--color-text-primary)] flex items-center gap-1 hover:border-[#06B6D4] border border-transparent transition-all"
                    >
                      {copiedField === 'redirect' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedField === 'redirect' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                {/* JavaScript Origin Box */}
                <div className="space-y-1 pt-1">
                  <div className="text-[11px] font-semibold text-[var(--color-text-muted)]">
                    Under &ldquo;Authorized JavaScript origins&rdquo; &rarr; click &ldquo;+ ADD URI&rdquo;:
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)]">
                    <code className="text-xs text-[#06B6D4] flex-1 font-mono truncate">
                      {localOrigin}
                    </code>
                    <button
                      onClick={() => handleCopy(localOrigin, 'origin')}
                      className="px-2 py-1 rounded bg-[var(--color-surface-hover)] text-xs font-semibold text-[var(--color-text-primary)] flex items-center gap-1 hover:border-[#06B6D4] border border-transparent transition-all"
                    >
                      {copiedField === 'origin' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedField === 'origin' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-bold text-[var(--color-text-primary)] flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-[#06B6D4] text-[#0F172A] text-[10px] font-black flex items-center justify-center">3</span>
                  <span>Click &ldquo;SAVE&rdquo; at the bottom of Google Cloud Console</span>
                </span>
                <p className="text-[11px] text-[var(--color-text-muted)] pl-5">
                  Changes take about 15–30 seconds to propagate on Google&apos;s servers. Afterwards, click &ldquo;Login with Google&rdquo; again and it will succeed!
                </p>
              </div>

              <div className="pt-2 border-t border-[var(--color-border)] flex items-center justify-between">
                <span className="text-[11px] text-[var(--color-text-muted)]">
                  Google Tasks API enabled?
                </span>
                <a
                  href="https://console.cloud.google.com/apis/library/tasks.googleapis.com?project=edumate-511915"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#06B6D4] hover:underline flex items-center gap-1 font-semibold"
                >
                  <span>Verify Tasks API</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Close Button */}
            <div className="pt-2">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setShowConfigHelper(false)}
                className="w-full"
              >
                Got It
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
