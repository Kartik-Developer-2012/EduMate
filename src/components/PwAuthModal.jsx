import React, { useState, useEffect } from 'react';
import { 
  X, 
  Smartphone, 
  MessageSquare, 
  PhoneCall, 
  ArrowRight, 
  ShieldCheck, 
  Sparkles, 
  RotateCw, 
  CheckCircle2, 
  AlertCircle, 
  KeyRound,
  Search,
  ExternalLink
} from 'lucide-react';
import { pwSendOtp, pwVerifyOtp, pwResendOtp, fetchPwServerInfo } from '../services/pwApi';
import { useCourse } from '../context/CourseContext';

export default function PwAuthModal({ isOpen, onClose, onSuccess }) {
  const { setPwUser, pwUser } = useCourse();

  const [step, setStep] = useState('phone'); // 'phone' | 'otp'
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [smsType, setSmsType] = useState('1'); // '1' = WhatsApp, '0' = SMS
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [timer, setTimer] = useState(0);
  const [serverInfo, setServerInfo] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setStep('phone');
      setPhone('');
      setOtp('');
      setError('');
      setSuccessMsg('');
      fetchPwServerInfo().then(info => setServerInfo(info)).catch(() => {});
    }
  }, [isOpen]);

  useEffect(() => {
    let interval = null;
    if (timer > 0) {
      interval = setInterval(() => setTimer(t => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  if (!isOpen) return null;

  const handleSendOtp = async (e) => {
    e.preventDefault();
    const cleanPhone = phone.trim().replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length !== 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const res = await pwSendOtp(cleanPhone, smsType);
      if (res && res.success !== false) {
        setStep('otp');
        setTimer(45);
        setSuccessMsg(res.message || `OTP sent via ${smsType === '1' ? 'WhatsApp' : 'SMS'}!`);
      } else {
        setError(res?.message || 'Failed to send OTP. Please try again.');
      }
    } catch (err) {
      console.error('Send OTP error:', err);
      setError(err.message || 'Failed to connect to Physics Wallah authentication service.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const cleanOtp = otp.trim().replace(/\D/g, '');
    if (!cleanOtp || cleanOtp.length < 4) {
      setError('Please enter the complete OTP code.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const res = await pwVerifyOtp(phone, cleanOtp);
      if (res && res.success !== false) {
        setSuccessMsg(res.message || 'OTP Verified Successfully!');
        if (res.user) {
          setPwUser(res.user);
        } else {
          setPwUser({ phoneNumber: phone, name: 'PW Student' });
        }
        setTimeout(() => {
          if (onSuccess) onSuccess();
          onClose();
        }, 800);
      } else {
        setError(res?.message || 'OTP verification failed. Please try again.');
      }
    } catch (err) {
      console.error('Verify OTP error:', err);
      setError(err.message || 'An error occurred during OTP verification.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async (newType) => {
    if (timer > 0 || loading) return;
    setError('');
    setLoading(true);
    try {
      const res = await pwResendOtp(phone, newType || smsType);
      if (res && res.success !== false) {
        setTimer(45);
        if (newType) setSmsType(newType);
        setSuccessMsg(res.message || `OTP resent via ${newType === '1' ? 'WhatsApp' : 'SMS'}!`);
      } else {
        setError(res?.message || 'Failed to resend OTP.');
      }
    } catch (err) {
      setError(err.message || 'Error resending OTP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      
      {/* Background ambient light effects */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full bg-purple-600/20 blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full bg-cyan-600/20 blur-[100px] pointer-events-none"></div>

      <div className="relative w-full max-w-md bg-[#0a0a14] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(147,51,234,0.2)] overflow-hidden">
        
        {/* Top gradient highlight bar */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-purple-500 to-transparent"></div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-white rounded-full hover:bg-white/5 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center mb-3 shadow-[0_0_20px_rgba(147,51,234,0.4)]">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            {step === 'phone' ? 'Physics Wallah Login' : 'Enter Verification Code'}
          </h2>
          <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
            {step === 'phone' 
              ? 'Access live enrolled batches, lectures, notes & DPPs directly'
              : `Enter the code sent to +91 ${phone} on ${smsType === '1' ? 'WhatsApp' : 'SMS'}`
            }
          </p>
        </div>

        {/* Forms */}
        {step === 'phone' ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            
            {/* Delivery Method Selector (WhatsApp / SMS) */}
            <div className="flex items-center gap-2 p-1 bg-white/5 border border-white/10 rounded-xl">
              <button
                type="button"
                onClick={() => setSmsType('1')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                  smsType === '1'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>WhatsApp OTP</span>
              </button>

              <button
                type="button"
                onClick={() => setSmsType('0')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                  smsType === '0'
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-[0_0_12px_rgba(99,102,241,0.3)]'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>SMS OTP</span>
              </button>
            </div>

            {/* Phone Input */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-purple-300 tracking-wider uppercase block">
                Mobile Number
              </label>
              <div className="flex items-center bg-white/5 border border-white/10 rounded-xl overflow-hidden focus-within:border-purple-500 focus-within:shadow-[0_0_15px_rgba(168,85,247,0.25)] focus-within:bg-white/10 transition-all pr-3">
                <span className="pl-4 pr-2 py-3 text-purple-300 font-semibold border-r border-white/10 text-sm">
                  +91
                </span>
                <Smartphone className="w-4 h-4 text-neutral-400 ml-3 mr-2 shrink-0" />
                <input
                  type="tel"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value.replace(/\D/g, ''));
                    if (error) setError('');
                  }}
                  className="flex-1 py-3 bg-transparent text-white placeholder-neutral-500 outline-none text-sm font-medium tracking-wide"
                  placeholder="Enter 10-digit number"
                  autoFocus
                />
              </div>
            </div>

            {/* Tip Box */}
            <div className="bg-white/5 border border-white/5 rounded-2xl p-3 space-y-1">
              <div className="flex items-start space-x-2">
                <ShieldCheck className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
                <p className="text-[11px] text-neutral-300 leading-relaxed">
                  OTP will be sent directly via{' '}
                  <strong className={smsType === '1' ? 'text-emerald-400' : 'text-cyan-400'}>
                    {smsType === '1' ? 'WhatsApp (Fast & Recommended)' : 'SMS'}
                  </strong>.
                </p>
              </div>
              <p className="text-[10.5px] text-neutral-400 pl-6 leading-relaxed">
                ⚡ <span className="text-purple-300 font-medium">Tip:</span> WhatsApp OTP arrives instantly. Ensure your mobile number is registered on Physics Wallah.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 bg-red-950/40 border border-red-500/30 rounded-xl p-3 text-red-400 text-xs font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              disabled={loading || phone.length !== 10}
              type="submit"
              className="w-full relative group overflow-hidden bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold py-3.5 rounded-xl transition-all shadow-[0_4px_20px_rgba(147,51,234,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Sending OTP...</span>
                  </div>
                ) : (
                  <>
                    <span>Send OTP Code</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </span>
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            
            {/* Phone Info Badge with Edit button */}
            <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-4 py-2.5">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-semibold text-white tracking-wide">
                  +91 {phone}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-medium">
                  {smsType === '1' ? 'WhatsApp' : 'SMS'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setStep('phone');
                  setOtp('');
                  setError('');
                }}
                className="text-xs text-purple-300 hover:text-white font-medium transition-colors"
              >
                Change
              </button>
            </div>

            {/* OTP Input */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-purple-300 tracking-wider uppercase block">
                Verification Code
              </label>
              <div className="flex items-center bg-white/5 border border-white/10 rounded-xl overflow-hidden focus-within:border-purple-500 focus-within:shadow-[0_0_15px_rgba(168,85,247,0.25)] focus-within:bg-white/10 transition-all pr-3">
                <KeyRound className="w-4 h-4 text-neutral-400 ml-4 mr-2 shrink-0" />
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => {
                    setOtp(e.target.value.replace(/\D/g, ''));
                    if (error) setError('');
                  }}
                  className="flex-1 py-3 bg-transparent text-white placeholder-neutral-500 outline-none text-base font-bold tracking-widest"
                  placeholder="• • • •"
                  autoFocus
                />
              </div>
            </div>

            {/* Resend actions */}
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-neutral-400">
                {timer > 0 ? (
                  <span>Resend code in <strong className="text-purple-300">{timer}s</strong></span>
                ) : (
                  <span>Didn't receive code?</span>
                )}
              </span>

              {timer === 0 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleResendOtp('1')}
                    className="text-emerald-400 hover:text-emerald-300 font-semibold"
                  >
                    WhatsApp
                  </button>
                  <span className="text-neutral-600">•</span>
                  <button
                    type="button"
                    onClick={() => handleResendOtp('0')}
                    className="text-purple-400 hover:text-purple-300 font-semibold"
                  >
                    SMS
                  </button>
                </div>
              )}
            </div>

            {/* Messages */}
            {error && (
              <div className="flex items-center gap-2 bg-red-950/40 border border-red-500/30 rounded-xl p-3 text-red-400 text-xs font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="flex items-center gap-2 bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-3 text-emerald-400 text-xs font-medium">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Verify Button */}
            <button
              disabled={loading || otp.length < 4}
              type="submit"
              className="w-full relative group overflow-hidden bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold py-3.5 rounded-xl transition-all shadow-[0_4px_20px_rgba(147,51,234,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Verifying Code...</span>
                  </div>
                ) : (
                  <>
                    <span>Verify & Login</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </>
                )}
              </span>
            </button>
          </form>
        )}

        {/* Footer */}
        <div className="mt-6 text-center border-t border-white/5 pt-4">
          <p className="text-[10px] text-neutral-500 font-medium tracking-wider uppercase">
            Powered by <span className="text-purple-400 font-bold tracking-normal text-xs ml-1">EduMate</span>
          </p>
        </div>
      </div>
    </div>
  );
}
