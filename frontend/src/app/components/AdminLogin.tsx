import { useState, useEffect } from 'react';
import { Mail, Lock, Shield, AlertCircle, CheckCircle, LogOut, Eye, EyeOff } from 'lucide-react';
import bonoriyaLogo from '../../imports/Bonoriya_2___1_.png';
import AdminDashboard from './AdminDashboard';
import {
  validateAdminLogin, initializeAdminAccount, resetAdminPassword,
  sendPasswordResetEmail, checkLoginRateLimit, recordFailedLogin, clearLoginAttempts
} from '../utils/auth';

interface AdminLoginProps {
  isAdminLoggedIn: boolean;
  setIsAdminLoggedIn: (value: boolean) => void;
}

export default function AdminLogin({ isAdminLoggedIn, setIsAdminLoggedIn }: AdminLoginProps) {
  const [credentials, setCredentials] = useState({ userId: '', password: '' });
  const [error, setError]             = useState('');
  const [loading, setLoading]         = useState(false);
  const [showPwd, setShowPwd]         = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail]   = useState('');
  const [resetCode, setResetCode]     = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [resetStep, setResetStep]     = useState<'email' | 'code' | 'password'>('email');
  const [successMessage, setSuccessMessage] = useState('');
  const [lockoutUntil, setLockoutUntil] = useState(0);
  const [remaining, setRemaining]     = useState(5);
  const RATE_KEY = 'admin_login';

  useEffect(() => {
    initializeAdminAccount();
    const { remaining: r, lockedUntil } = checkLoginRateLimit(RATE_KEY);
    setRemaining(r);
    if (lockedUntil) setLockoutUntil(lockedUntil);
  }, []);

  useEffect(() => {
    if (lockoutUntil <= Date.now()) return;
    const t = setInterval(() => {
      if (Date.now() >= lockoutUntil) { setLockoutUntil(0); setError(''); clearLoginAttempts(RATE_KEY); setRemaining(5); clearInterval(t); }
    }, 1000);
    return () => clearInterval(t);
  }, [lockoutUntil]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const { allowed, lockedUntil: lu } = checkLoginRateLimit(RATE_KEY);
    if (!allowed) { const m = Math.ceil((lu! - Date.now()) / 60000); setError(`Too many failed attempts. Try again in ${m} minute${m > 1 ? 's' : ''}.`); setLockoutUntil(lu!); return; }
    if (!credentials.userId || !credentials.password) { setError('Please enter both User ID and Password'); return; }
    setLoading(true);
    try {
      const isValid = await validateAdminLogin(credentials.userId, credentials.password);
      if (isValid) { clearLoginAttempts(RATE_KEY); setIsAdminLoggedIn(true); setCredentials({ userId: '', password: '' }); }
      else {
        const s = recordFailedLogin(RATE_KEY);
        setRemaining(s.remaining);
        if (!s.allowed) { const m = Math.ceil((s.lockedUntil! - Date.now()) / 60000); setError(`Account locked for ${m} min after too many failed attempts.`); setLockoutUntil(s.lockedUntil!); }
        else setError(`Invalid credentials. ${s.remaining} attempt${s.remaining !== 1 ? 's' : ''} remaining before lockout.`);
      }
    } finally { setLoading(false); }
  };

  const handleLogout = () => { setIsAdminLoggedIn(false); setCredentials({ userId: '', password: '' }); };

  const handleSendResetCode = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!resetEmail.includes('@')) { setError('Enter a valid email address'); return; }
    const bytes = crypto.getRandomValues(new Uint8Array(3));
    const code = Array.from(bytes).map(b => b.toString(10).padStart(3,'0')).join('').slice(0, 6);
    setGeneratedCode(code);
    sendPasswordResetEmail(resetEmail, code);
    setSuccessMessage(`Reset code sent to ${resetEmail}. Check your email.`);
    setResetStep('code');
  };

  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (resetCode !== generatedCode) { setError('Invalid reset code. Please check your email.'); return; }
    setSuccessMessage('Code verified! Set your new password.');
    setResetStep('password');
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }
    if (newPassword.length < 8) { setError('Password must be at least 8 characters'); return; }
    setLoading(true);
    try {
      const ok = await resetAdminPassword(resetEmail, newPassword);
      if (ok) {
        setSuccessMessage('Password reset successful! You can now log in.');
        setTimeout(() => { setShowForgotPassword(false); setResetStep('email'); setResetEmail(''); setResetCode(''); setNewPassword(''); setConfirmPassword(''); setGeneratedCode(''); setSuccessMessage(''); }, 2000);
      } else setError('Failed to reset password. Please try again.');
    } finally { setLoading(false); }
  };

  const Brand = () => (
    <div className="text-center mb-8">
      <img src={bonoriyaLogo} alt="BONORIYA" className="h-20 mx-auto mb-4 object-contain" />
      <div className="text-white/60 text-xs space-x-3">
        <span>🌐 bonoriya.com</span>
        <span>📞 +91-9864282966</span>
        <span>✉️ admin@bonoriya.com</span>
      </div>
    </div>
  );

  const BrandFooter = () => (
    <div className="mt-6 text-center space-y-1">
      <p className="text-white/30 text-xs">
        <a href="https://bonoriya.com/privacy" className="hover:text-white/60 transition-colors">Privacy Policy</a>
        {' · '}
        <a href="https://bonoriya.com/terms" className="hover:text-white/60 transition-colors">Terms of Service</a>
      </p>
      <p className="text-white/20 text-xs">🔒 Protected by BONORIYA Security · Unauthorized access prohibited</p>
    </div>
  );

  const Err = ({ msg }: { msg: string }) => (
    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm mb-4">
      <AlertCircle className="h-4 w-4 flex-shrink-0" /><span>{msg}</span>
    </div>
  );

  const Succ = ({ msg }: { msg: string }) => (
    <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-600 text-sm mb-4">
      <CheckCircle className="h-4 w-4 flex-shrink-0" /><span>{msg}</span>
    </div>
  );

  if (isAdminLoggedIn) return (
    <div>
      <div className="fixed top-4 right-4 z-50">
        <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 shadow-lg"><LogOut className="h-4 w-4" /> Logout</button>
      </div>
      <AdminDashboard />
    </div>
  );

  const layout = (title: string, sub: string, children: React.ReactNode) => (
    <div className="min-h-screen bg-[#0F2218] flex flex-col items-center justify-center py-12 px-4">
      <Brand />
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-1">{title}</h2>
        <p className="text-sm text-muted-foreground mb-6">{sub}</p>
        {children}
      </div>
      <BrandFooter />
    </div>
  );

  if (showForgotPassword) {
    if (resetStep === 'email') return layout('Reset Admin Password', 'Enter your admin email to receive a reset code', (
      <form onSubmit={handleSendResetCode} className="space-y-4">
        {error && <Err msg={error} />}{successMessage && <Succ msg={successMessage} />}
        <div><label className="block mb-2 text-sm font-medium">Admin Email</label>
          <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input type="email" className="w-full pl-10 pr-4 py-3 bg-input-background rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring" placeholder="admin@bonoriya.com" value={resetEmail} onChange={e => setResetEmail(e.target.value)} required /></div></div>
        <button type="submit" className="w-full py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90">Send Reset Code</button>
        <button type="button" onClick={() => setShowForgotPassword(false)} className="w-full py-2 text-sm text-muted-foreground hover:text-foreground">← Back to Login</button>
      </form>
    ));

    if (resetStep === 'code') return layout('Enter Reset Code', 'Check your email for the 6-digit code', (
      <form onSubmit={handleVerifyCode} className="space-y-4">
        {error && <Err msg={error} />}{successMessage && <Succ msg={successMessage} />}
        <input type="text" className="w-full px-4 py-3 bg-input-background rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring text-center text-3xl tracking-widest" placeholder="000000" maxLength={6} value={resetCode} onChange={e => setResetCode(e.target.value.replace(/\D/g, ''))} required />
        <button type="submit" className="w-full py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90">Verify Code</button>
        <button type="button" onClick={() => setResetStep('email')} className="w-full py-2 text-sm text-muted-foreground hover:text-foreground">Resend Code</button>
      </form>
    ));

    return layout('Set New Password', 'Choose a strong password for your admin account', (
      <form onSubmit={handleResetPassword} className="space-y-4">
        {error && <Err msg={error} />}{successMessage && <Succ msg={successMessage} />}
        <div><label className="block mb-2 text-sm font-medium">New Password</label>
          <div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input type={showPwd ? 'text' : 'password'} className="w-full pl-10 pr-10 py-3 bg-input-background rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Min 8 characters" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
            <button type="button" onClick={() => setShowPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">{showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div>
        <div><label className="block mb-2 text-sm font-medium">Confirm Password</label>
          <div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input type="password" className="w-full pl-10 pr-4 py-3 bg-input-background rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Re-enter password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required /></div></div>
        <button type="submit" disabled={loading} className="w-full py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50">{loading ? 'Saving…' : 'Reset Password'}</button>
      </form>
    ));
  }

  return layout('BONORIYA Admin Portal', 'Secure access for authorised administrators only', (
    <>
      <div className="flex items-center gap-2 mb-5 p-3 bg-primary/5 rounded-xl border border-primary/10">
        <Shield className="h-5 w-5 text-primary flex-shrink-0" />
        <div><p className="text-xs font-semibold text-foreground">Authorised Personnel Only</p>
          <p className="text-xs text-muted-foreground">All login activity is logged and monitored</p></div>
      </div>

      {lockoutUntil > Date.now() && (
        <div className="mb-4 p-3 bg-red-50 border border-red-300 rounded-lg text-red-700 text-sm">
          <p className="font-medium">Account temporarily locked</p>
          <p className="text-xs mt-0.5">Too many failed attempts. Wait {Math.ceil((lockoutUntil - Date.now()) / 60000)} min.</p>
        </div>
      )}
      {error && !lockoutUntil && <Err msg={error} />}

      <form onSubmit={handleLogin} className="space-y-4">
        <div><label className="block mb-2 text-sm font-medium">User ID / Email</label>
          <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input type="text" autoComplete="username" className="w-full pl-10 pr-4 py-3 bg-input-background rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring" placeholder="admin@bonoriya.com" value={credentials.userId} onChange={e => setCredentials({ ...credentials, userId: e.target.value })} required disabled={lockoutUntil > Date.now()} /></div></div>
        <div><label className="block mb-2 text-sm font-medium">Password</label>
          <div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input type={showPwd ? 'text' : 'password'} autoComplete="current-password" className="w-full pl-10 pr-10 py-3 bg-input-background rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Enter password" value={credentials.password} onChange={e => setCredentials({ ...credentials, password: e.target.value })} required disabled={lockoutUntil > Date.now()} />
            <button type="button" onClick={() => setShowPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">{showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div>

        {remaining < 5 && remaining > 0 && <p className="text-xs text-orange-600">⚠ {remaining} attempt{remaining !== 1 ? 's' : ''} remaining before 15-min lockout</p>}

        <div className="flex justify-end"><button type="button" onClick={() => setShowForgotPassword(true)} className="text-sm text-primary hover:underline">Forgot Password?</button></div>

        <button type="submit" disabled={loading || lockoutUntil > Date.now()} className="w-full py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
          {loading ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Verifying…</> : 'Sign In to Admin Panel'}
        </button>
      </form>

      <div className="mt-5 pt-4 border-t border-border text-center space-y-1">
        <p className="text-xs text-muted-foreground">Rate-limited · 15-min lockout after 5 failed attempts</p>
        <p className="text-xs text-muted-foreground">Passwords hashed with SHA-256 · No credentials stored in browser</p>
      </div>
    </>
  ));
}
