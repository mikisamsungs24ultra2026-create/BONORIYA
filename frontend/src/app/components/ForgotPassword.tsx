import { useState } from 'react';
import { Mail, Lock, CheckCircle, AlertCircle, ArrowLeft, Shield } from 'lucide-react';
import {
  generateOtp, validateOtp, sendOtpEmail,
  resetGuestPassword, resetPartnerPassword,
  isValidEmail, isValidPassword, getPasswordStrength,
  getGuestByEmail, getPartnerByEmail
} from '../utils/auth';

interface ForgotPasswordProps {
  accountType: 'guest' | 'partner';
  onBack: () => void;
  onSuccess?: () => void;
}

type Step = 'email' | 'otp' | 'newpassword' | 'done';

export default function ForgotPassword({ accountType, onBack, onSuccess }: ForgotPasswordProps) {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCount, setResendCount] = useState(0);

  const label = accountType === 'partner' ? 'Partner' : 'Guest';

  // ── Step 1: Email ──────────────────────────────────────────────────────────

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!isValidEmail(email)) { setError('Please enter a valid email address.'); return; }

    // Verify account exists
    const account = accountType === 'partner' ? getPartnerByEmail(email) : getGuestByEmail(email);
    if (!account) {
      setError(`No ${label.toLowerCase()} account found with this email address.`);
      return;
    }

    setLoading(true);
    const generatedOtp = generateOtp(email);
    sendOtpEmail(email, generatedOtp, account.name);
    setLoading(false);
    setInfo(`A 6-digit OTP has been sent to ${email}. Valid for 10 minutes.`);
    setStep('otp');
  };

  // ── Step 2: OTP ────────────────────────────────────────────────────────────

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (otp.length !== 6) { setError('Please enter the complete 6-digit OTP.'); return; }

    const result = validateOtp(email, otp);
    if (result === 'valid') {
      setInfo('');
      setStep('newpassword');
    } else if (result === 'expired') {
      setError('The OTP has expired. Please request a new one.');
    } else if (result === 'used') {
      setError('This OTP has already been used. Please request a new one.');
    } else if (result === 'too_many_attempts') {
      setError('Too many incorrect attempts. Please request a new OTP.');
    } else {
      setError('Incorrect OTP. Please check and try again.');
    }
  };

  const handleResend = () => {
    if (resendCount >= 3) { setError('Maximum resend limit reached. Please try again later.'); return; }
    const account = accountType === 'partner' ? getPartnerByEmail(email) : getGuestByEmail(email);
    const generatedOtp = generateOtp(email);
    sendOtpEmail(email, generatedOtp, account?.name || '');
    setResendCount(c => c + 1);
    setOtp('');
    setError('');
    setInfo(`A new OTP has been sent to ${email}.`);
  };

  // ── Step 3: New password ───────────────────────────────────────────────────

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!isValidPassword(newPassword)) {
      setError('Password must be at least 8 characters with uppercase, lowercase, and a number.');
      return;
    }
    if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return; }

    const success = accountType === 'partner'
      ? resetPartnerPassword(email, newPassword)
      : resetGuestPassword(email, newPassword);

    if (success) {
      setStep('done');
      setTimeout(() => { onSuccess?.(); onBack(); }, 2500);
    } else {
      setError('Failed to update password. Please try again.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <button onClick={onBack} className="p-1 hover:bg-muted rounded-lg transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h2 className="text-xl font-medium">Reset Password</h2>
          <p className="text-sm text-muted-foreground">{label} Account Recovery</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-4">
        {(['email', 'otp', 'newpassword', 'done'] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${step === s ? 'bg-primary text-primary-foreground' : (['otp', 'newpassword', 'done'].indexOf(step) > i) ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'}`}>
              {(['otp', 'newpassword', 'done'].indexOf(step) > i) ? '✓' : i + 1}
            </div>
            {i < 3 && <div className={`w-8 h-0.5 mx-1 transition-colors ${(['otp', 'newpassword', 'done'].indexOf(step) > i) ? 'bg-green-500' : 'bg-muted'}`} />}
          </div>
        ))}
        <span className="text-xs text-muted-foreground ml-2">
          {step === 'email' ? 'Enter email' : step === 'otp' ? 'Verify OTP' : step === 'newpassword' ? 'New password' : 'Done'}
        </span>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" /> {error}
        </div>
      )}
      {info && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
          <Shield className="h-4 w-4 flex-shrink-0" /> {info}
        </div>
      )}

      {/* ── Step 1: Email ── */}
      {step === 'email' && (
        <form onSubmit={handleEmailSubmit} className="space-y-4">
          <p className="text-sm text-muted-foreground">Enter your registered {label.toLowerCase()} email address and we'll send you a one-time password (OTP).</p>
          <div>
            <label className="block mb-2 text-sm">Registered Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                type="email"
                className="w-full pl-10 pr-4 py-3 bg-input-background rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder={`your@email.com`}
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
          </div>
          <button type="submit" disabled={loading} className="w-full py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-60 transition-opacity">
            {loading ? 'Sending OTP…' : 'Send OTP'}
          </button>
        </form>
      )}

      {/* ── Step 2: OTP ── */}
      {step === 'otp' && (
        <form onSubmit={handleOtpSubmit} className="space-y-4">
          <p className="text-sm text-muted-foreground">Enter the 6-digit OTP sent to <strong>{email}</strong>. The OTP is valid for 10 minutes and can only be used once.</p>
          <div>
            <label className="block mb-2 text-sm">One-Time Password (OTP)</label>
            <input
              type="text"
              maxLength={6}
              className="w-full px-4 py-4 bg-input-background rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring text-center text-3xl tracking-[0.5em] font-mono"
              placeholder="000000"
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
              required
            />
            <p className="text-xs text-muted-foreground mt-1 text-center">Enter digits only · All emails sent from admin@bonoriya.com</p>
          </div>
          <button type="submit" className="w-full py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity">Verify OTP</button>
          <div className="text-center">
            {resendCount < 3 ? (
              <button type="button" onClick={handleResend} className="text-sm text-primary hover:underline">Didn't receive the OTP? Resend</button>
            ) : (
              <p className="text-sm text-muted-foreground">Resend limit reached. Please try after some time.</p>
            )}
          </div>
        </form>
      )}

      {/* ── Step 3: New password ── */}
      {step === 'newpassword' && (
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <p className="text-sm text-muted-foreground">OTP verified! Create a new password for your account.</p>
          <div>
            <label className="block mb-2 text-sm">New Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                type="password"
                className="w-full pl-10 pr-4 py-3 bg-input-background rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Min 8 chars, upper+lower+number"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
              />
            </div>
            {newPassword && (() => {
              const s = getPasswordStrength(newPassword);
              return <p className="text-xs mt-1">Strength: <span className={s.strength >= 5 ? 'text-green-600 font-medium' : s.strength >= 3 ? 'text-orange-500 font-medium' : 'text-red-600 font-medium'}>{s.message}</span></p>;
            })()}
          </div>
          <div>
            <label className="block mb-2 text-sm">Confirm New Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                type="password"
                className="w-full pl-10 pr-4 py-3 bg-input-background rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-xs text-red-600 mt-1">Passwords do not match.</p>
            )}
          </div>
          <button type="submit" className="w-full py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity">Set New Password</button>
        </form>
      )}

      {/* ── Step 4: Done ── */}
      {step === 'done' && (
        <div className="text-center py-6 space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h3 className="text-xl">Password Reset Successful!</h3>
          <p className="text-sm text-muted-foreground">Your password has been updated. Redirecting to login…</p>
        </div>
      )}
    </div>
  );
}
