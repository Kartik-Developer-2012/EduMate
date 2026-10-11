import React, { useState, useEffect } from 'react';
import { 
  X, 
  Smartphone, 
  MessageSquare, 
  PhoneCall, 
  ArrowRight, 
  ShieldCheck, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  KeyRound
} from 'lucide-react';
import { pwSendOtp, pwVerifyOtp, pwResendOtp } from '../services/pwApi';
import { useCourse } from '../context/CourseContext';

export default function PwAuthModal({ isOpen, onClose, onSuccess }) {
  const { setPwUser } = useCourse();

  const [step, setStep] = useState('phone'); // 'phone' | 'otp'
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [smsType, setSmsType] = useState('1'); // '1' = WhatsApp, '0' = SMS
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setStep('phone');
      setPhone('');
      setOtp('');
      setError('');
      setSuccessMsg('');
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
      <div className="relative w-full max-w-md bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden">
        
        {/* Top gradient highlight bar */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#1D3557] via-[#457B9D] to-[#A8DADC]"></div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] rounded-full hover:bg-[var(--color-surface-hover)] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-[#1D3557] border border-[#457B9D]/40 flex items-center justify-center mb-3 shadow-sm">
            <Sparkles className="w-6 h-6 text-[#A8DADC]" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F1FAEE]">
            {step === 'phone' ? 'Physics Wallah Login' : 'Enter Verification Code'}
          </h2>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1 leading-relaxed">
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
            <div className="flex items-center gap-1.5 p-1 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl">
              <button
                type="button"
                onClick={() => setSmsType('1')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all btn-press ${
                  smsType === '1'
                    ? 'bg-[#457B9D] text-[#F1FAEE] shadow-sm'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>WhatsApp OTP</span>
              </button>

              <button
                type="button"
                onClick={() => setSmsType('0')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all btn-press ${
                  smsType === '0'
                    ? 'bg-[#1D3557] text-[#F1FAEE] shadow-sm'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>SMS OTP</span>
              </button>
            </div>

            {/* Phone Input */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[var(--color-text-secondary)] tracking-wider uppercase block">
                Mobile Number
              </label>
              <div className="flex items-center bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl overflow-hidden focus-within:border-[#457B9D] focus-within:ring-2 focus-within:ring-[#457B9D]/20 transition-all pr-3">
                <span className="pl-4 pr-2 py-3 text-[#A8DADC] font-bold border-r border-[var(--color-border)] text-sm">
                  +91
                </span>
                <Smartphone className="w-4 h-4 text-[var(--color-text-muted)] ml-3 mr-2 shrink-0" />
                <input
                  type="tel"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value.replace(/\D/g, ''));
                    if (error) setError('');
                  }}
                  className="flex-1 py-3 bg-transparent text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] outline-none text-sm font-medium tracking-wide"
                  placeholder="Enter 10-digit number"
                  autoFocus
                />
              </div>
            </div>

            {/* Tip Box */}
            <div className="bg-[#112033] border border-[#223E5E] rounded-2xl p-3 space-y-1">
              <div className="flex items-start space-x-2">
                <ShieldCheck className="w-4 h-4 text-[#A8DADC] mt-0.5 shrink-0" />
                <p className="text-[11px] text-[var(--color-text-primary)] leading-relaxed">
                  OTP will be sent directly via{' '}
                  <strong className="text-[#A8DADC]">
                    {smsType === '1' ? 'WhatsApp (Fast & Recommended)' : 'SMS'}
                  </strong>.
                </p>
              </div>
              <p className="text-[10.5px] text-[var(--color-text-secondary)] pl-6 leading-relaxed">
                ⚡ <span className="text-[#A8DADC] font-medium">Tip:</span> WhatsApp OTP arrives instantly. Ensure your mobile number is registered on Physics Wallah.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-xs font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              disabled={loading || phone.length !== 10}
              type="submit"
              className="w-full relative group overflow-hidden bg-[#457B9D] hover:bg-[#386684] text-[#F1FAEE] font-bold py-3.5 rounded-xl transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed btn-press"
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
            <div className="flex items-center justify-between bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-4 py-2.5">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-[#A8DADC]" />
                <span className="text-xs font-semibold text-[var(--color-text-primary)] tracking-wide">
                  +91 {phone}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1D3557] text-[#A8DADC] border border-[#457B9D]/40 font-medium">
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
                className="text-xs text-[#A8DADC] hover:underline font-medium transition-colors"
              >
                Change
              </button>
            </div>

            {/* OTP Input */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[var(--color-text-secondary)] tracking-wider uppercase block">
                Verification Code
              </label>
              <div className="flex items-center bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl overflow-hidden focus-within:border-[#457B9D] focus-within:ring-2 focus-within:ring-[#457B9D]/20 transition-all pr-3">
                <KeyRound className="w-4 h-4 text-[var(--color-text-muted)] ml-4 mr-2 shrink-0" />
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => {
                    setOtp(e.target.value.replace(/\D/g, ''));
                    if (error) setError('');
                  }}
                  className="flex-1 py-3 bg-transparent text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] outline-none text-base font-bold tracking-widest"
                  placeholder="• • • •"
                  autoFocus
                />
              </div>
            </div>

            {/* Resend actions */}
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-[var(--color-text-secondary)]">
                {timer > 0 ? (
                  <span>Resend code in <strong className="text-[#A8DADC]">{timer}s</strong></span>
                ) : (
                  <span>Didn't receive code?</span>
                )}
              </span>

              {timer === 0 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleResendOtp('1')}
                    className="text-[#A8DADC] hover:underline font-semibold"
                  >
                    WhatsApp
                  </button>
                  <span className="text-[var(--color-text-muted)]">•</span>
                  <button
                    type="button"
                    onClick={() => handleResendOtp('0')}
                    className="text-[#A8DADC] hover:underline font-semibold"
                  >
                    SMS
                  </button>
                </div>
              )}
            </div>

            {/* Messages */}
            {error && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-xs font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="flex items-center gap-2 bg-[#457B9D]/20 border border-[#457B9D]/40 rounded-xl p-3 text-[#A8DADC] text-xs font-medium">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Verify Button */}
            <button
              disabled={loading || otp.length < 4}
              type="submit"
              className="w-full relative group overflow-hidden bg-[#457B9D] hover:bg-[#386684] text-[#F1FAEE] font-bold py-3.5 rounded-xl transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed btn-press"
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
        <div className="mt-6 text-center border-t border-[var(--color-border)] pt-4">
          <p className="text-[10px] text-[var(--color-text-muted)] font-medium tracking-wider uppercase">
            Powered by <span className="text-[#A8DADC] font-bold tracking-normal text-xs ml-1">EduMate</span>
          </p>
        </div>
      </div>
    </div>
  );
}
