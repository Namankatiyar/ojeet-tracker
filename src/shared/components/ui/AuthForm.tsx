import React, { useState } from 'react';
import { CheckCircle, Eye, EyeOff, Loader, WifiOff } from 'lucide-react';
import { useRemoteAuth } from '../../../core/context/RemoteAuthContext';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';
import { usePasswordStrength } from '../../hooks/usePasswordStrength';
import { validatePassword } from '../../utils/auth';

export interface AuthFormProps {
  onSuccess?: () => void;
  onOffline?: () => void;
  onPendingConfirmationChange?: (pending: boolean) => void;
  showOfflineOption?: boolean;
  initialMode?: 'signin' | 'signup';
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
    <div className="ob-input-group">
      <label className="ob-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        className="ob-input"
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
    <div className="ob-input-group">
      <label className="ob-label" htmlFor={id}>
        {label}
      </label>
      <div className="ob-password-wrapper">
        <input
          id={id}
          type={showPassword ? 'text' : 'password'}
          className="ob-input"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          required={required}
          autoComplete={autoComplete}
        />
        <button
          type="button"
          className="ob-password-toggle"
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
  const { signInWithPassword } = useRemoteAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setError(null);
    setLoading(true);

    try {
      const res = await signInWithPassword(email.trim(), password);
      if (res.error) {
        setError(res.error);
        setLoading(false);
      } else {
        onSuccess?.();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to sign in.');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="ob-email-form">
      <FormInput
        id="signin-email"
        label="Email address"
        type="email"
        placeholder="name@example.com"
        value={email}
        onChange={setEmail}
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

      <button type="button" className="ob-forgot-link" onClick={onForgotPassword}>
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
}

function SignUpFlow({ onSuccess, onPendingConfirmationChange }: SignUpFlowProps) {
  const { signUpWithEmail } = useRemoteAuth();
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
      const res = await signUpWithEmail(email.trim(), password);
      if (res.error) {
        setError(res.error);
        setLoading(false);
      } else {
        if (res.confirmationRequired) {
          onPendingConfirmationChange?.(true);
        }
        onSuccess?.();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to sign up.');
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
    <form onSubmit={handleSubmit} className="ob-email-form">
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
        <div className="ob-auth-error" role="alert">
          <span>{error}</span>
        </div>
      )}

      <button
        className="primary-btn ob-auth-btn"
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
        setError(res.error);
      } else {
        setResetSent(true);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send reset link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="ob-email-form">
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
        disabled={loading || !email.trim() || resetSent}
      >
        {loading ? <Loader size={18} className="spin-icon" /> : 'Send reset link'}
      </button>

      <button type="button" className="ob-forgot-back-btn" onClick={onBackToSignIn}>
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
        setGoogleError(res.error);
        setLoadingGoogle(false);
      }
    } catch (err: unknown) {
      setGoogleError(err instanceof Error ? err.message : 'Failed to sign in with Google.');
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
    <div className={`ob-auth-options ${className}`.trim()}>
      <button
        className="ob-auth-btn ob-google-btn"
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
        <div className="ob-auth-error" role="alert">
          <span>{googleError}</span>
        </div>
      )}

      <div className="ob-auth-divider">or</div>

      {isForgotMode ? (
        <ForgotPasswordFlow onBackToSignIn={() => setIsForgotMode(false)} />
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
            <SignInFlow
              onSuccess={onSuccess}
              onForgotPassword={() => setIsForgotMode(true)}
            />
          ) : (
            <SignUpFlow
              onSuccess={onSuccess}
              onPendingConfirmationChange={onPendingConfirmationChange}
            />
          )}
        </div>
      )}

      {hasOffline && (
        <>
          <div className="ob-auth-divider">or</div>
          <button
            className="ob-auth-btn ob-offline-btn"
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
