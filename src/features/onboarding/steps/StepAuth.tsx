import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Check, CheckCircle, Eye, EyeOff, Loader, WifiOff } from 'lucide-react';
import { useRemoteAuth } from '../../../core/context/RemoteAuthContext';
import { PasswordStrengthMeter } from '../../../shared/components/ui/PasswordStrengthMeter';
import { usePasswordStrength } from '../../../shared/hooks/usePasswordStrength';
import { validatePassword } from '../../../shared/utils/auth';

const stagger = {
  animate: { transition: { staggerChildren: 0.06 } },
};

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, duration: 0.5, bounce: 0 },
  },
};

interface StepAuthProps {
  onOffline: () => void;
  onNext: () => void;
  onPendingConfirmationChange?: (pending: boolean) => void;
}

export function StepAuth({
  onOffline,
  onNext,
  onPendingConfirmationChange,
}: StepAuthProps) {
  const {
    user,
    signInWithGoogle,
    signInWithPassword,
    signUpWithEmail,
    resetPassword,
  } = useRemoteAuth();

  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingForm, setLoadingForm] = useState(false);

  const { score } = usePasswordStrength(password);

  const handleGoogle = () => {
    setLoadingGoogle(true);
    signInWithGoogle();
  };

  const handleTabChange = (mode: 'signin' | 'signup') => {
    setAuthMode(mode);
    setIsForgotMode(false);
    setError(null);
    setResetSent(false);
  };

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setError(null);
    setLoadingForm(true);

    try {
      const res = await signInWithPassword(email.trim(), password);
      if (res.error) {
        setError(res.error);
        setLoadingForm(false);
      } else {
        onNext();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to sign in.');
      setLoadingForm(false);
    }
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setError(null);

    const validation = validatePassword(password, confirmPassword);
    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    setLoadingForm(true);

    try {
      const res = await signUpWithEmail(email.trim(), password);
      if (res.error) {
        setError(res.error);
        setLoadingForm(false);
      } else {
        if (res.confirmationRequired) {
          onPendingConfirmationChange?.(true);
        }
        onNext();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to sign up.');
      setLoadingForm(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setError(null);
    setResetSent(false);
    setLoadingForm(true);

    try {
      const res = await resetPassword(email.trim());
      if (res.error) {
        setError(res.error);
      } else {
        setResetSent(true);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send reset link.');
    } finally {
      setLoadingForm(false);
    }
  };

  if (user) {
    return (
      <motion.div variants={stagger} initial="initial" animate="animate">
        <motion.h1 className="ob-step-heading" variants={fadeUp}>
          You're all set
        </motion.h1>
        <motion.p className="ob-step-subtext" variants={fadeUp}>
          Your progress will sync across devices automatically.
        </motion.p>
        <motion.div className="ob-signed-in-badge" variants={fadeUp}>
          <Check size={18} className="ob-signed-in-icon" />
          <span>
            Signed in as{' '}
            <span className="ob-signed-in-email">{user.email}</span>
          </span>
        </motion.div>
        <motion.div className="ob-nav-row end-only" variants={fadeUp}>
          <button className="primary-btn ob-continue-btn" onClick={onNext} type="button">
            Continue
            <ArrowRight size={16} />
          </button>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div variants={stagger} initial="initial" animate="animate">
      <motion.h1 className="ob-step-heading" variants={fadeUp}>
        Sign in
      </motion.h1>
      <motion.p className="ob-step-subtext" variants={fadeUp}>
        Sync your progress across devices, or continue offline.
      </motion.p>
      <motion.div className="ob-auth-options" variants={fadeUp}>
        <button
          className="ob-auth-btn ob-google-btn"
          onClick={handleGoogle}
          disabled={loadingGoogle || loadingForm}
          type="button"
        >
          {loadingGoogle ? (
            <Loader size={16} className="spin-icon" />
          ) : (
            <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true">
              <path
                d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
                fill="#4285F4"
              />
              <path
                d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
                fill="#34A853"
              />
              <path
                d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
                fill="#FBBC05"
              />
              <path
                d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 2.58 9 3.58z"
                fill="#EA4335"
              />
            </svg>
          )}
          Continue with Google
        </button>

        <div className="ob-auth-divider">or</div>

        {isForgotMode ? (
          <form onSubmit={handleForgotSubmit} className="ob-email-form">
            <div className="ob-input-group">
              <label className="ob-label" htmlFor="forgot-email">
                Email address
              </label>
              <input
                id="forgot-email"
                type="email"
                className="ob-input"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loadingForm || resetSent}
                required
                autoComplete="email"
              />
            </div>

            {error && (
              <div className="ob-auth-error" role="alert">
                <span>{error}</span>
              </div>
            )}

            {resetSent && (
              <div className="ob-auth-success" role="status">
                <CheckCircle size={16} />
                <span>Check your email for the password reset link.</span>
              </div>
            )}

            <button
              className="primary-btn ob-auth-btn"
              type="submit"
              disabled={loadingForm || !email.trim() || resetSent}
            >
              {loadingForm ? <Loader size={18} className="spin-icon" /> : 'Send reset link'}
            </button>

            <button
              type="button"
              className="ob-forgot-back-btn"
              onClick={() => {
                setIsForgotMode(false);
                setError(null);
                setResetSent(false);
              }}
            >
              Back to sign in
            </button>
          </form>
        ) : (
          <div>
            <div className="ob-auth-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={authMode === 'signin'}
                className={`ob-auth-tab ${authMode === 'signin' ? 'active' : ''}`}
                onClick={() => handleTabChange('signin')}
              >
                Sign in
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={authMode === 'signup'}
                className={`ob-auth-tab ${authMode === 'signup' ? 'active' : ''}`}
                onClick={() => handleTabChange('signup')}
              >
                Sign up
              </button>
            </div>

            {authMode === 'signin' ? (
              <form onSubmit={handleSignInSubmit} className="ob-email-form">
                <div className="ob-input-group">
                  <label className="ob-label" htmlFor="signin-email">
                    Email address
                  </label>
                  <input
                    id="signin-email"
                    type="email"
                    className="ob-input"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loadingForm}
                    required
                    autoComplete="email"
                  />
                </div>

                <div className="ob-input-group">
                  <label className="ob-label" htmlFor="signin-password">
                    Password
                  </label>
                  <div className="ob-password-wrapper">
                    <input
                      id="signin-password"
                      type={showPassword ? 'text' : 'password'}
                      className="ob-input"
                      placeholder="Enter password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loadingForm}
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      className="ob-password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  className="ob-forgot-link"
                  onClick={() => {
                    setIsForgotMode(true);
                    setError(null);
                  }}
                >
                  Forgot password?
                </button>

                {error && (
                  <div className="ob-auth-error" role="alert">
                    <span>{error}</span>
                  </div>
                )}

                <button
                  className="primary-btn ob-auth-btn"
                  type="submit"
                  disabled={loadingForm || !email.trim() || !password}
                >
                  {loadingForm ? <Loader size={18} className="spin-icon" /> : 'Sign in'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleSignUpSubmit} className="ob-email-form">
                <div className="ob-input-group">
                  <label className="ob-label" htmlFor="signup-email">
                    Email address
                  </label>
                  <input
                    id="signup-email"
                    type="email"
                    className="ob-input"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loadingForm}
                    required
                    autoComplete="email"
                  />
                </div>

                <div className="ob-input-group">
                  <label className="ob-label" htmlFor="signup-password">
                    Password
                  </label>
                  <div className="ob-password-wrapper">
                    <input
                      id="signup-password"
                      type={showPassword ? 'text' : 'password'}
                      className="ob-input"
                      placeholder="Create password (min 8 chars)"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loadingForm}
                      required
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="ob-password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <PasswordStrengthMeter password={password} />
                </div>

                <div className="ob-input-group">
                  <label className="ob-label" htmlFor="signup-confirm-password">
                    Confirm password
                  </label>
                  <div className="ob-password-wrapper">
                    <input
                      id="signup-confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      className="ob-input"
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={loadingForm}
                      required
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="ob-password-toggle"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={
                        showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'
                      }
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="ob-auth-error" role="alert">
                    <span>{error}</span>
                  </div>
                )}

                <button
                  className="primary-btn ob-auth-btn"
                  type="submit"
                  disabled={
                    loadingForm ||
                    !email.trim() ||
                    score < 2 ||
                    password !== confirmPassword ||
                    !confirmPassword
                  }
                >
                  {loadingForm ? <Loader size={18} className="spin-icon" /> : 'Sign up'}
                </button>
              </form>
            )}
          </div>
        )}

        <div className="ob-auth-divider">or</div>

        <button
          className="ob-auth-btn ob-offline-btn"
          onClick={onOffline}
          disabled={loadingGoogle || loadingForm}
          type="button"
        >
          <WifiOff size={16} />
          Continue offline
        </button>
      </motion.div>
    </motion.div>
  );
}
