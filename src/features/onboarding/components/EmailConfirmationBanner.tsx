import { motion } from 'framer-motion';
import { Mail, X } from 'lucide-react';

export interface EmailConfirmationBannerProps {
  onDismiss?: () => void;
  className?: string;
}

export function EmailConfirmationBanner({
  onDismiss,
  className = '',
}: EmailConfirmationBannerProps) {
  const containerClass = ['ob-confirm-banner', className].filter(Boolean).join(' ');

  return (
    <motion.div
      className={containerClass}
      role="status"
      aria-live="polite"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
    >
      <div className="ob-confirm-banner-content">
        <Mail size={16} className="ob-confirm-banner-icon" />
        <span className="ob-confirm-banner-text">
          Check your email to confirm your account.
        </span>
      </div>
      <button
        type="button"
        className="ob-confirm-banner-close"
        onClick={onDismiss}
        aria-label="Dismiss email confirmation banner"
      >
        <X size={14} />
      </button>
    </motion.div>
  );
}

export default EmailConfirmationBanner;
