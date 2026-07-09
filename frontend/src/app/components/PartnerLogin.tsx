import { useState } from 'react';
import { Mail, Lock, User, Phone, MapPin, Building2, AlertCircle, CheckCircle } from 'lucide-react';
import heroImage from '../../imports/Partner-login.png';
import PartnerDashboard from './PartnerDashboard';
import ForgotPassword from './ForgotPassword';
import { WA } from '../utils/whatsapp';
import { PixelEvents } from '../utils/seo';
import { ImageWithFallback } from './figma/ImageWithFallback';
import Footer from './Footer';
import { registerPartner, validatePartnerLoginAsync, isValidEmail, isValidPassword, getPasswordStrength, sendWelcomeEmail, checkLoginRateLimit, recordFailedLogin, clearLoginAttempts } from '../utils/auth';
import { generateAndUploadAgreementPDF, sendPartnerAgreementEmail } from '../utils/partnerAgreement';

interface PartnerLoginProps {
  isPartnerLoggedIn: boolean;
  setIsPartnerLoggedIn: (value: boolean) => void;
  setCurrentPage: (page: string, section?: string) => void;
}

export default function PartnerLogin({ isPartnerLoggedIn, setIsPartnerLoggedIn, setCurrentPage }: PartnerLoginProps) {
  const [showRegistration, setShowRegistration] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [sendingAgreement, setSendingAgreement] = useState(false);
  const [formData, setFormData] = useState({
    partnerName: '',
    address: '',
    businessName: '',
    gstNumber: '',
    email: '',
    mobile: '',
    password: '',
    confirmPassword: ''
  });
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentPartner, setCurrentPartner] = useState<any>(null);

  const handleRegistration = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!formData.partnerName.trim()) {
      setError('Please enter partner name');
      return;
    }

    if (!formData.businessName.trim()) {
      setError('Please enter business name');
      return;
    }

    if (!isValidEmail(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (formData.mobile.length < 10) {
      setError('Please enter a valid mobile number');
      return;
    }

    if (!isValidPassword(formData.password)) {
      setError('Password must be at least 8 characters with uppercase, lowercase, and number');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Register partner
    const registered = registerPartner(
      formData.email,
      formData.password,
      formData.partnerName,
      formData.mobile,
      formData.businessName,
      formData.gstNumber
    );

    if (registered) {
      // 1. Send welcome email
      sendWelcomeEmail('partner', formData.email, formData.partnerName);
      PixelEvents.partnerSignup();
      WA.newPartner({ name: formData.partnerName, businessName: formData.businessName, email: formData.email });

      setSuccess('Registration successful! Generating your Partnership Agreement PDF and sending emails…');
      setSendingAgreement(true);

      // 2. Generate agreement PDF, upload to Supabase Storage, email to partner + admin
      const agreementData = {
        partnerName: formData.partnerName,
        businessName: formData.businessName,
        email: formData.email,
        mobile: formData.mobile,
        address: formData.address,
        gstNumber: formData.gstNumber,
        acceptedAt: new Date().toISOString(),
      };
      generateAndUploadAgreementPDF(agreementData)
        .then(pdf => sendPartnerAgreementEmail(agreementData, pdf))
        .then(() => {
          setSendingAgreement(false);
          setSuccess('Registration successful! Partnership Agreement PDF sent as email attachment to ' + formData.email + ' and info@bonoriya.com. Your account will be activated within 24-48 hours.');
        })
        .catch(e => {
          console.error('[Agreement email]', e);
          setSendingAgreement(false);
          setSuccess('Registration successful! Your account will be activated within 24-48 hours. You can login after approval.');
        });

      // Reset form and show login after 5 seconds
      setTimeout(() => {
        setShowRegistration(false);
        setAgreedToTerms(false);
        setFormData({
          partnerName: '',
          address: '',
          businessName: '',
          gstNumber: '',
          email: '',
          mobile: '',
          password: '',
          confirmPassword: ''
        });
        setSuccess('');
      }, 4000);
    } else {
      setError('Email already registered. Please login or use a different email.');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!isValidEmail(loginData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    const result = await validatePartnerLoginAsync(loginData.email, loginData.password);

    if (result.success && result.partner) {
      if (result.partner.rejected) {
        setError('Your registration has been declined. Please contact BONORIYA at info@bonoriya.com for more information.');
        return;
      }
      if (!result.partner.approved) {
        setError('Your account is pending approval. You will be notified once approved by BONORIYA.');
        return;
      }

      setCurrentPartner(result.partner);
      setIsPartnerLoggedIn(true);
      setSuccess('Login successful! Welcome back!');
      setLoginData({ email: '', password: '' });
    } else {
      setError('Invalid email or password. Please try again or register.');
    }
  };

  if (isPartnerLoggedIn && currentPartner) {
    return <PartnerDashboard
      partnerId={currentPartner.id}
      partnerName={currentPartner.name}
      partnerEmail={currentPartner.email}
      businessName={currentPartner.businessName}
    />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Image */}
      <div className="w-full bg-black">
        <ImageWithFallback
          src={heroImage}
          alt="Northeast India"
          className="w-full h-auto object-contain"
        />
      </div>

      {/* Auth Forms Section */}
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-background to-muted/30">
        <div className="max-w-md w-full">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl md:text-3xl mb-4 leading-snug">
              BONORIYA welcomes Enthusiastic Property Owners to associate with us!
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Share your business journey with us. We empower local landowners and hospitality entrepreneurs across the Northeast.
            </p>
          </div>

          {/* Auth Card */}
          <div className="bg-card rounded-xl shadow-xl p-8">

            {/* Forgot Password flow */}
            {showForgotPassword && (
              <ForgotPassword
                accountType="partner"
                onBack={() => setShowForgotPassword(false)}
                onSuccess={() => { setShowForgotPassword(false); setShowRegistration(false); }}
              />
            )}

            {!showForgotPassword && (<>
            {/* Toggle Tabs */}
            <div className="flex gap-2 mb-6 bg-muted/50 p-1 rounded-lg">
              <button
                onClick={() => { setShowRegistration(true); setError(''); setSuccess(''); setAgreedToTerms(false); }}
                className={`flex-1 py-3 rounded-md transition-colors font-medium ${
                  showRegistration ? 'bg-primary text-primary-foreground shadow-sm' : 'hover:bg-muted/30'
                }`}
              >
                New Registration
              </button>
              <button
                onClick={() => { setShowRegistration(false); setError(''); setSuccess(''); }}
                className={`flex-1 py-3 rounded-md transition-colors font-medium ${
                  !showRegistration ? 'bg-primary text-primary-foreground shadow-sm' : 'hover:bg-muted/30'
                }`}
              >
                <span className={!showRegistration ? '' : ''}>Partner Login</span>
              </button>
            </div>

            {/* Error/Success Messages */}
            {error && (
              <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="mb-4 flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-600 text-sm">
                <CheckCircle className="h-4 w-4 flex-shrink-0" />
                <span>{success}</span>
              </div>
            )}

            {/* Registration Form */}
            {showRegistration ? (
              <form onSubmit={handleRegistration} className="space-y-4">
                <div>
                  <label className="block mb-2 text-sm">Partner Name *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <input
                      type="text"
                      className="w-full pl-10 pr-4 py-3 bg-input-background rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="Enter partner name"
                      autoComplete="name"
                      name="partnerName"
                      value={formData.partnerName}
                      onChange={(e) => setFormData({ ...formData, partnerName: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block mb-2 text-sm">Address *</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <input
                      type="text"
                      className="w-full pl-10 pr-4 py-3 bg-input-background rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="Enter address"
                      autoComplete="street-address"
                      name="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block mb-2 text-sm">Business Name *</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <input
                      type="text"
                      className="w-full pl-10 pr-4 py-3 bg-input-background rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="Enter business name"
                      autoComplete="organization"
                      name="businessName"
                      value={formData.businessName}
                      onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block mb-2 text-sm">Email ID *</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <input
                      type="email"
                      className="w-full pl-10 pr-4 py-3 bg-input-background rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="Enter email address"
                      autoComplete="email"
                      name="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block mb-2 text-sm">Mobile Number *</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <input
                      type="tel"
                      className="w-full pl-10 pr-4 py-3 bg-input-background rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="Enter mobile number"
                      autoComplete="tel"
                      name="mobile"
                      value={formData.mobile}
                      onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block mb-2 text-sm">GST Number (Optional)</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <input
                      type="text"
                      className="w-full pl-10 pr-4 py-3 bg-input-background rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="Enter GST number"
                      autoComplete="off"
                      name="gstNumber"
                      value={formData.gstNumber}
                      onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block mb-2 text-sm">Password *</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <input
                      type="password"
                      className="w-full pl-10 pr-4 py-3 bg-input-background rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="Create a password (min 8 chars)"
                      autoComplete="new-password"
                      name="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                    />
                  </div>
                  {formData.password && (
                    <p className="text-xs mt-1 text-muted-foreground">
                      Password strength: <span className={`font-medium ${getPasswordStrength(formData.password).strength >= 5 ? 'text-green-600' : getPasswordStrength(formData.password).strength >= 3 ? 'text-orange-600' : 'text-red-600'}`}>
                        {getPasswordStrength(formData.password).message}
                      </span>
                    </p>
                  )}
                </div>
                <div>
                  <label className="block mb-2 text-sm">Confirm Password *</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <input
                      type="password"
                      className="w-full pl-10 pr-4 py-3 bg-input-background rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="Confirm your password"
                      autoComplete="new-password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
                  <p><strong>Note:</strong> Your registration will be reviewed by BONORIYA. You will be notified once your account is approved.</p>
                </div>

                {/* Terms & Conditions checkbox — required before Register Now activates */}
                <div className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${agreedToTerms ? 'bg-green-50 border-green-300' : 'bg-gray-50 border-border'}`}
                  onClick={() => setAgreedToTerms(v => !v)}>
                  <div className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${agreedToTerms ? 'bg-primary border-primary' : 'border-gray-400 bg-white'}`}>
                    {agreedToTerms && <CheckCircle className="h-3.5 w-3.5 text-white fill-current" />}
                  </div>
                  <p className="text-xs leading-relaxed text-gray-700 select-none">
                    I have obtained all necessary licenses and documents from local authorities. I agree to the{' '}
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); window.open('/partner-terms', '_blank'); }}
                      className="text-primary font-semibold hover:underline"
                    >
                      Partner Terms &amp; Conditions
                    </button>
                    {' '}and acknowledge that BONORIYA is not liable for operational lapses or host-guest disputes.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={!agreedToTerms || sendingAgreement}
                  className={`w-full py-3 rounded-lg transition-all font-medium text-sm ${
                    agreedToTerms && !sendingAgreement
                      ? 'bg-primary text-primary-foreground hover:opacity-90 cursor-pointer'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {sendingAgreement
                    ? '⏳ Sending agreement emails…'
                    : !agreedToTerms
                      ? '✓ Please agree to Terms & Conditions to continue'
                      : 'Register Now'}
                </button>
              </form>
            ) : (
              /* Login Form */
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block mb-2 text-sm">Email ID</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <input
                      type="email"
                      className="w-full pl-10 pr-4 py-3 bg-input-background rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="Enter your email"
                      autoComplete="email"
                      name="email"
                      value={loginData.email}
                      onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block mb-2 text-sm">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <input
                      type="password"
                      className="w-full pl-10 pr-4 py-3 bg-input-background rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      name="password"
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="rounded" />
                    <span>Remember me</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-primary hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
                <button
                  type="submit"
                  className="w-full py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
                >
                  Sign In
                </button>
              </form>
            )}
            </>)}
          </div>
        </div>
      </div>

      <Footer setCurrentPage={setCurrentPage} />
    </div>
  );
}
