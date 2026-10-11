import React, { useState } from 'react';
import { 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ShieldCheck, 
  AlertCircle, 
  Sparkles,
  KeyRound
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import appLogo from '../assets/app-logo.png';

export default function AuthGate() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shaking, setShaking] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please provide both email and password.');
      triggerShake();
      return;
    }

    setLoading(true);

    // Snappy authentication verification
    setTimeout(() => {
      const res = login(email, password, rememberMe);
      if (!res.success) {
        setError(res.error || 'Invalid credentials.');
        triggerShake();
        setLoading(false);
      }
    }, 400);
  };

  const triggerShake = () => {
    setShaking(true);
    setTimeout(() => setShaking(false), 600);
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text-primary)] flex flex-col justify-center items-center px-4 relative overflow-hidden select-none transition-colors duration-200">
      {/* Subtle Background Brand Glows */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-[#1D3557]/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-[#457B9D]/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#A8DADC]/5 rounded-full blur-[140px] pointer-events-none" />

      {/* Main Gate Card */}
      <div 
        className={`w-full max-w-md relative z-10 transition-transform duration-200 ${
          shaking ? 'animate-[shake_0.5s_ease-in-out]' : ''
        }`}
      >
        <div className="p-8 sm:p-10 rounded-3xl card-surface shadow-2xl relative overflow-hidden">
          
          {/* Brand Accent Strip */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#1D3557] via-[#457B9D] to-[#A8DADC]" />

          {/* EduMate Brand Logo & Title */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="relative mb-4 group">
              <div className="absolute -inset-1 bg-gradient-to-r from-[#1D3557] to-[#457B9D] rounded-2xl blur-sm opacity-50 group-hover:opacity-100 transition duration-300" />
              <div className="relative w-16 h-16 rounded-2xl bg-[#112033] p-1 border border-[var(--color-border)] overflow-hidden flex items-center justify-center shadow-sm">
                <img 
                  src={appLogo} 
                  alt="EduMate Logo" 
                  className="w-full h-full object-cover rounded-xl"
                />
              </div>
            </div>

            <div className="flex items-center gap-1.5 mb-1.5">
              <h1 className="text-2xl font-black tracking-tight text-[#F1FAEE] font-heading">
                EDU<span className="text-[#A8DADC]">MATE</span>
              </h1>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[#1D3557] text-[#A8DADC] border border-[#457B9D]/40">
                PRO
              </span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-bg)] border border-[var(--color-border)] text-xs font-medium text-[var(--color-text-secondary)] mt-1">
              <Lock className="w-3.5 h-3.5 text-[#A8DADC]" />
              <span>Protected Access Gateway</span>
            </div>

            <p className="text-xs text-[var(--color-text-secondary)] mt-2.5 max-w-xs leading-relaxed">
              Sign in with your authorized credentials to unlock the unified learning platform.
            </p>
          </div>

          {/* Error Message Banner */}
          {error && (
            <div className="mb-6 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="leading-snug">{error}</div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Email Field */}
            <div>
              <label className="block text-[11px] font-bold tracking-wider text-[var(--color-text-secondary)] uppercase mb-1.5">
                Authorized Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[var(--color-text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input 
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="support@edumate.study"
                  autoComplete="email"
                  required
                  className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] text-xs rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-[#457B9D] focus:ring-2 focus:ring-[#457B9D]/20 transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-[11px] font-bold tracking-wider text-[var(--color-text-secondary)] uppercase mb-1.5">
                Master Password
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-[var(--color-text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input 
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  required
                  className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] text-xs rounded-xl pl-10 pr-10 py-3 focus:outline-none focus:border-[#457B9D] focus:ring-2 focus:ring-[#457B9D]/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors p-0.5"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Options: Remember me & Hint */}
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">
                <input 
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-[var(--color-border)] text-[#457B9D] focus:ring-0 focus:ring-offset-0 cursor-pointer accent-[#457B9D]"
                />
                <span>Stay signed in</span>
              </label>

              <span className="text-[11px] text-[var(--color-text-muted)]">
                EduMate Guard v2.4
              </span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 px-4 rounded-xl bg-[#457B9D] hover:bg-[#386684] text-[#F1FAEE] font-bold text-xs tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer btn-press"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Unlock EduMate Workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Security Guarantee Badge */}
          <div className="mt-8 pt-6 border-t border-[var(--color-border)] flex items-center justify-center gap-4 text-[11px] text-[var(--color-text-muted)]">
            <div className="flex items-center gap-1.5 text-[#A8DADC] font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-[#A8DADC]" />
              <span>256-bit Encrypted</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1.5 text-[#A8DADC] font-medium">
              <Sparkles className="w-3.5 h-3.5 text-[#A8DADC]" />
              <span>Physics Wallah & NT</span>
            </div>
          </div>

        </div>
      </div>

      {/* Footer Branding */}
      <div className="mt-8 text-center text-xs text-[var(--color-text-muted)] relative z-10">
        EduMate Unified Study Platform &copy; {new Date().getFullYear()} • All Rights Reserved
      </div>
    </div>
  );
}
