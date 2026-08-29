import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, X, Loader } from 'lucide-react';
import { useRemoteAuth } from '../../../core/context/RemoteAuthContext';
import { formatAuthError } from '../../../shared/utils/auth';

export interface EmailConfirmationBannerProps {
  email?: string;
  onDismiss?: () => void;
  className?: string;
}

export function EmailConfirmationBanner({
  email,
  onDismiss,
  className = '',
}: EmailConfirmationBannerProps) {
  const { user, unconfirmedEmail, resendConfirmationEmail } = useRemoteAuth();
  const [resending, setResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusText, setStatusText] = useState('');

  const targetEmail = (email || unconfirmedEmail || user?.email || '').trim();

  const handleResend = async () => {
    if (!targetEmail.trim() || resending) return;

    setResending(true);
    setResendStatus('idle');
    setStatusText('');

    try {
      const res = await resendConfirmationEmail(targetEmail.trim());
      if (res.error) {
        setResendStatus('error');
        setStatusText(formatAuthError(res.error));
      } else {
        setResendStatus('success');
        setStatusText('Confirmation email resent!');
      }
    } catch (err: unknown) {
      setResendStatus('error');
      setStatusText(formatAuthError(err));
    } finally {
      setResending(false);
    }
  };

  const containerClass = ['auth-banner', 'ob-confirm-banner', className].filter(Boolean).join(' ');

  return (
    <motion.div
      className={containerClass}
      role="status"
      aria-live="polite"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
    >
      <div className="auth-banner-content ob-confirm-banner-content">
        <Mail size={16} className="auth-banner-icon ob-confirm-banner-icon" />
        <div className="auth-banner-text ob-confirm-banner-text">
          <span>
            {targetEmail
              ? `Check your inbox at ${targetEmail} to confirm your account.`
              : 'Check your inbox to confirm your account.'}
          </span>
          {resendStatus === 'success' && (
            <span className="auth-banner-status success">{statusText}</span>
          )}
          {resendStatus === 'error' && (
            <span className="auth-banner-status error">{statusText}</span>
          )}
        </div>
      </div>

      <div className="auth-banner-actions">
        {targetEmail && (
          <button
            type="button"
            className="auth-banner-btn"
            onClick={handleResend}
            disabled={resending || resendStatus === 'success'}
          >
            {resending ? (
              <>
                <Loader size={12} className="spin-icon" />
                <span>Sending...</span>
              </>
            ) : resendStatus === 'success' ? (
              'Sent'
            ) : (
              'Resend link'
            )}
          </button>
        )}
        {onDismiss && (
          <button
            type="button"
            className="auth-banner-close ob-confirm-banner-close"
            onClick={onDismiss}
            aria-label="Dismiss email confirmation banner"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </motion.div>
  );
}

export default EmailConfirmationBanner;

