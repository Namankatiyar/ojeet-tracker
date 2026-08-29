import React, { useState } from 'react';
import { CheckCircle, Eye, EyeOff, Loader, WifiOff } from 'lucide-react';
import { useRemoteAuth } from '../../../core/context/RemoteAuthContext';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';
import { usePasswordStrength } from '../../hooks/usePasswordStrength';
import { validatePassword, formatAuthError } from '../../utils/auth';

export interface AuthFormProps {
  onSuccess?: () => void;
  onOffline?: () => void;
  onPendingConfirmationChange?: (pending: boolean) => void;
  showOfflineOption?: boolean;
  initialMode?: 'signin' | 'signup';
  initialDisplayName?: string;
  className?: string;
}

interface FormInputProps {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  disabled?: boolean;
  autoComplete?: string;
  required?: boolean;
}

function FormInput({
  id,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  disabled,
  autoComplete,
  required = true,
}: FormInputProps) {
  return (
    <div className="auth-input-group ob-input-group">
      <label className="auth-label ob-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        className="auth-input ob-input"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required={required}
        autoComplete={autoComplete}
      />
    </div>
  );
}

interface PasswordInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  disabled?: boolean;
  autoComplete?: string;
  required?: boolean;
  children?: React.ReactNode;
}

function PasswordInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  disabled,
  autoComplete,
  required = true,
  children,
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="auth-input-group ob-input-group">
      <label className="auth-label ob-label" htmlFor={id}>
        {label}
      </label>
      <div className="auth-password-wrapper ob-password-wrapper">
        <input
          id={id}
          type={showPassword ? 'text' : 'password'}
          className="auth-input ob-input"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          required={required}
          autoComplete={autoComplete}
        />
        <button
          type="button"
          className="auth-password-toggle ob-password-toggle"
          onClick={() => setShowPassword((prev) => !prev)}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          tabIndex={-1}
        >
          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {children}
    </div>
  );
}

interface SignInFlowProps {
  onSuccess?: () => void;
  onForgotPassword: () => void;
}

function SignInFlow({ onSuccess, onForgotPassword }: SignInFlowProps) {
  const { signInWithPassword, resendConfirmationEmail } = useRemoteAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isUnconfirmed, setIsUnconfirmed] = useState(false);
  const [resendingConfirm, setResendingConfirm] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setError(null);
    setIsUnconfirmed(false);
    setResendSuccess(false);
    setResendError(null);
    setLoading(true);

    try {
      const res = await signInWithPassword(email.trim(), password);
      if (res.error) {
        setError(formatAuthError(res.error));
        const isUnconf =
          res.error.toLowerCase().includes('email not confirmed') ||
          res.error.toLowerCase().includes('not confirmed') ||
          res.error.toLowerCase().includes('email_not_confirmed');
        setIsUnconfirmed(isUnconf);
        setLoading(false);
      } else {
        onSuccess?.();
      }
    } catch (err: unknown) {
      setError(formatAuthError(err));
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!email.trim()) return;
    setResendingConfirm(true);
    setResendError(null);
    setResendSuccess(false);

    try {
      const res = await resendConfirmationEmail(email.trim());
      if (res.error) {
        setResendError(formatAuthError(res.error));
      } else {
        setResendSuccess(true);
      }
    } catch (err: unknown) {
      setResendError(formatAuthError(err));
    } finally {
      setResendingConfirm(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="auth-form ob-email-form">
      <FormInput
        id="signin-email"
        label="Email address"
        type="email"
        placeholder="name@example.com"
        value={email}
        onChange={(val) => {
          setEmail(val);
          setIsUnconfirmed(false);
          setResendSuccess(false);
          setResendError(null);
        }}
        disabled={loading}
        autoComplete="email"
      />

      <PasswordInput
        id="signin-password"
        label="Password"
        placeholder="Enter password"
        value={password}
        onChange={setPassword}
        disabled={loading}
        autoComplete="current-password"
      />

      <button type="button" className="auth-forgot-link ob-forgot-link" onClick={onForgotPassword}>
        Forgot password?
      </button>

      {error && (
        <div className="auth-error ob-auth-error" role="alert">
          <span>{error}</span>
        </div>
      )}

      {isUnconfirmed && (
        <div className="auth-unconfirmed-section ob-unconfirmed-section" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
          <button
            type="button"
            className="auth-resend-link ob-resend-link"
            onClick={handleResendConfirmation}
            disabled={resendingConfirm}
            style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--accent)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              textDecoration: 'underline',
              alignSelf: 'flex-start',
              fontFamily: 'inherit',
            }}
          >
            {resendingConfirm ? 'Resending...' : 'Resend confirmation email'}
          </button>
          {resendSuccess && (
            <div className="auth-success ob-auth-success" role="status">
              <CheckCircle size={16} />
              <span>Confirmation email sent. Check your inbox.</span>
            </div>
          )}
          {resendError && (
            <div className="auth-error ob-auth-error" role="alert">
              <span>{resendError}</span>
            </div>
          )}
        </div>
      )}

      <button
        className="primary-btn auth-btn ob-auth-btn"
        type="submit"
        disabled={loading || !email.trim() || !password}
      >
        {loading ? <Loader size={18} className="spin-icon" /> : 'Sign in'}
      </button>
    </form>
  );
}

interface SignUpFlowProps {
  onSuccess?: () => void;
  onPendingConfirmationChange?: (pending: boolean) => void;
  initialDisplayName?: string;
}

function SignUpFlow({ onSuccess, onPendingConfirmationChange, initialDisplayName = '' }: SignUpFlowProps) {
  const { signUpWithEmail } = useRemoteAuth();
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { score } = usePasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setError(null);

    const validation = validatePassword(password, confirmPassword);
    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    setLoading(true);

    try {
      const res = await signUpWithEmail(email.trim(), password, displayName.trim() || undefined);
      if (res.error) {
        setError(formatAuthError(res.error));
        setLoading(false);
      } else {
        if (res.confirmationRequired) {
          onPendingConfirmationChange?.(true);
        }
        onSuccess?.();
      }
    } catch (err: unknown) {
      setError(formatAuthError(err));
      setLoading(false);
    }
  };

  const isSubmitDisabled =
    loading ||
    !email.trim() ||
    score < 2 ||
    password !== confirmPassword ||
    !confirmPassword;

  return (
    <form onSubmit={handleSubmit} className="auth-form ob-email-form">
      <FormInput
        id="signup-name"
        label="Your name (optional)"
        type="text"
        placeholder="e.g. Rahul Sharma"
        value={displayName}
        onChange={setDisplayName}
        disabled={loading}
        autoComplete="name"
        required={false}
      />

      <FormInput
        id="signup-email"
        label="Email address"
        type="email"
        placeholder="name@example.com"
        value={email}
        onChange={setEmail}
        disabled={loading}
        autoComplete="email"
      />

      <PasswordInput
        id="signup-password"
        label="Password"
        placeholder="Create password (min 8 chars)"
        value={password}
        onChange={setPassword}
        disabled={loading}
        autoComplete="new-password"
      >
        <PasswordStrengthMeter password={password} />
      </PasswordInput>

      <PasswordInput
        id="signup-confirm-password"
        label="Confirm password"
        placeholder="Confirm your password"
        value={confirmPassword}
        onChange={setConfirmPassword}
        disabled={loading}
        autoComplete="new-password"
      />

      {error && (
        <div className="auth-error ob-auth-error" role="alert">
          <span>{error}</span>
        </div>
      )}

      <button
        className="primary-btn auth-btn ob-auth-btn"
        type="submit"
        disabled={isSubmitDisabled}
      >
        {loading ? <Loader size={18} className="spin-icon" /> : 'Sign up'}
      </button>
    </form>
  );
}

interface ForgotPasswordFlowProps {
  onBackToSignIn: () => void;
}

function ForgotPasswordFlow({ onBackToSignIn }: ForgotPasswordFlowProps) {
  const { resetPassword } = useRemoteAuth();
  const [email, setEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setError(null);
    setResetSent(false);
    setLoading(true);

    try {
      const res = await resetPassword(email.trim());
      if (res.error) {
        setError(formatAuthError(res.error));
      } else {
        setResetSent(true);
      }
    } catch (err: unknown) {
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="auth-form ob-email-form">
      <FormInput
        id="forgot-email"
        label="Email address"
        type="email"
        placeholder="name@example.com"
        value={email}
        onChange={setEmail}
        disabled={loading || resetSent}
        autoComplete="email"
      />

      {error && (
        <div className="auth-error ob-auth-error" role="alert">
          <span>{error}</span>
        </div>
      )}

      {resetSent && (
        <div className="auth-success ob-auth-success" role="status">
          <CheckCircle size={16} />
          <span>Check your email for the password reset link.</span>
        </div>
      )}

      <button
        className="primary-btn auth-btn ob-auth-btn"
        type="submit"
        disabled={loading || !email.trim() || resetSent}
      >
        {loading ? <Loader size={18} className="spin-icon" /> : 'Send reset link'}
      </button>

      <button type="button" className="auth-forgot-back-btn ob-forgot-back-btn" onClick={onBackToSignIn}>
        Back to sign in
      </button>
    </form>
  );
}

export const AuthForm: React.FC<AuthFormProps> = ({
  onSuccess,
  onOffline,
  onPendingConfirmationChange,
  showOfflineOption = false,
  initialMode = 'signin',
  initialDisplayName = '',
  className = '',
}) => {
  const { signInWithGoogle } = useRemoteAuth();
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>(initialMode);
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  const handleGoogle = async () => {
    setLoadingGoogle(true);
    setGoogleError(null);
    try {
      const res = await signInWithGoogle();
      if (res?.error) {
        setGoogleError(formatAuthError(res.error));
        setLoadingGoogle(false);
      }
    } catch (err: unknown) {
      setGoogleError(formatAuthError(err));
      setLoadingGoogle(false);
    }
  };

  const handleTabChange = (mode: 'signin' | 'signup') => {
    setAuthMode(mode);
    setIsForgotMode(false);
    setGoogleError(null);
  };

  const hasOffline = showOfflineOption || Boolean(onOffline);

  return (
    <div className={`auth-options ob-auth-options ${className}`.trim()}>
      <button
        className="auth-btn ob-auth-btn auth-google-btn ob-google-btn"
        onClick={handleGoogle}
        disabled={loadingGoogle}
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

      {googleError && (
        <div className="auth-error ob-auth-error" role="alert">
          <span>{googleError}</span>
        </div>
      )}

      <div className="auth-divider ob-auth-divider">or</div>

      {isForgotMode ? (
        <ForgotPasswordFlow onBackToSignIn={() => setIsForgotMode(false)} />
      ) : (
        <div>
          <div className="auth-tabs ob-auth-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={authMode === 'signin'}
              className={`auth-tab ob-auth-tab ${authMode === 'signin' ? 'active' : ''}`}
              onClick={() => handleTabChange('signin')}
            >
              Sign in
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={authMode === 'signup'}
              className={`auth-tab ob-auth-tab ${authMode === 'signup' ? 'active' : ''}`}
              onClick={() => handleTabChange('signup')}
            >
              Sign up
            </button>
          </div>

          {authMode === 'signin' ? (
            <SignInFlow
              onSuccess={onSuccess}
              onForgotPassword={() => setIsForgotMode(true)}
            />
          ) : (
            <SignUpFlow
              onSuccess={onSuccess}
              onPendingConfirmationChange={onPendingConfirmationChange}
              initialDisplayName={initialDisplayName}
            />
          )}
        </div>
      )}

      {hasOffline && (
        <>
          <div className="auth-divider ob-auth-divider">or</div>
          <button
            className="auth-btn ob-auth-btn auth-offline-btn ob-offline-btn"
            onClick={onOffline}
            disabled={loadingGoogle}
            type="button"
          >
            <WifiOff size={16} />
            Continue offline
          </button>
        </>
      )}
    </div>
  );
};
