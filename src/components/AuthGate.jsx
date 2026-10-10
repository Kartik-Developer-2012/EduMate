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
  KeyRound,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AuthGate() {
  const { login, masterEmail } = useAuth();
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

    // Simulate snappy authentication verification
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
    <div className="min-h-screen bg-[#070709] text-neutral-100 flex flex-col justify-center items-center px-4 relative overflow-hidden select-none">
      {/* Dynamic Background Glows */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-purple-600/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-amber-500/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Main Glassmorphic Gate Card */}
      <div 
        className={`w-full max-w-md relative z-10 transition-transform duration-200 ${
          shaking ? 'animate-[shake_0.5s_ease-in-out]' : ''
        }`}
      >
        <div className="p-8 sm:p-10 rounded-3xl bg-[#0f0f16]/90 border border-white/[0.08] backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] relative overflow-hidden">
          
          {/* Subtle Card Header Ambient Strip */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-indigo-500 to-amber-400" />

          {/* EduMate Brand Logo & Title */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="relative mb-4 group">
              <div className="absolute -inset-1.5 bg-gradient-to-r from-purple-600 via-indigo-500 to-amber-400 rounded-2xl blur-md opacity-70 group-hover:opacity-100 transition duration-500" />
              <div className="relative w-16 h-16 rounded-2xl bg-black p-1 border border-white/10 overflow-hidden flex items-center justify-center">
                <img 
                  src="https://i.ibb.co/yF4mhNPB/f493d534-fbf8-4b31-b741-83b343f8a9e1.jpg" 
                  alt="EduMate Logo" 
                  className="w-full h-full object-cover rounded-xl"
                />
              </div>
            </div>

            <div className="flex items-center gap-1.5 mb-1.5">
              <h1 className="text-2xl font-black tracking-tight text-white font-heading">
                EDU<span className="text-amber-400">MATE</span>
              </h1>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30">
                PRO
              </span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs font-medium text-neutral-300 mt-1">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Protected Access Gateway</span>
            </div>

            <p className="text-xs text-neutral-400 mt-2.5 max-w-xs leading-relaxed">
              Sign in with your authorized credentials to unlock the unified learning platform.
            </p>
          </div>

          {/* Error Message Banner */}
          {error && (
            <div className="mb-6 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="leading-snug">{error}</div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Email Field */}
            <div>
              <label className="block text-[11px] font-bold tracking-wider text-neutral-300 uppercase mb-1.5">
                Authorized Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
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
                  className="w-full bg-[#161622] border border-white/10 text-white placeholder-neutral-500 text-xs rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-purple-400 focus:bg-[#1a1a2b] transition-colors"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-[11px] font-bold tracking-wider text-neutral-300 uppercase mb-1.5">
                Master Password
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
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
                  className="w-full bg-[#161622] border border-white/10 text-white placeholder-neutral-500 text-xs rounded-xl pl-10 pr-10 py-3 focus:outline-none focus:border-purple-400 focus:bg-[#1a1a2b] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors p-0.5"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Options: Remember me & Hint */}
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-neutral-400 hover:text-neutral-300">
                <input 
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-neutral-700 bg-neutral-900 text-purple-600 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-purple-600"
                />
                <span>Stay signed in</span>
              </label>

              <span className="text-[11px] text-neutral-500">
                Edumate Guard v2.4
              </span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-amber-500 hover:from-purple-500 hover:via-indigo-500 hover:to-amber-400 text-white font-bold text-xs tracking-wider flex items-center justify-center gap-2 shadow-[0_4px_25px_rgba(147,51,234,0.35)] hover:shadow-[0_4px_30px_rgba(147,51,234,0.5)] active:scale-[0.99] transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
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
          <div className="mt-8 pt-6 border-t border-white/[0.06] flex items-center justify-center gap-4 text-[11px] text-neutral-500">
            <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>256-bit Encrypted</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1.5 text-purple-400 font-medium">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Physics Wallah & NT</span>
            </div>
          </div>

        </div>
      </div>

      {/* Footer Branding */}
      <div className="mt-8 text-center text-xs text-neutral-600 relative z-10">
        EduMate Unified Study Platform &copy; {new Date().getFullYear()} • All Rights Reserved
      </div>
    </div>
  );
}
