import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useRemoteAuth } from '../../../core/context/RemoteAuthContext';
import { AuthForm } from './AuthForm';

export interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  onSuccess?: () => void;
  showOfflineOption?: boolean;
  onOffline?: () => void;
  initialMode?: 'signin' | 'signup';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  title = 'Sign in',
  subtitle,
  onSuccess,
  showOfflineOption = false,
  onOffline,
  initialMode = 'signin',
}) => {
  const { user } = useRemoteAuth();

  useEffect(() => {
    if (isOpen && user) {
      onSuccess?.();
      onClose();
    }
  }, [isOpen, user, onSuccess, onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="modal-overlay motion-animated"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
        >
          <motion.div
            className="modal-content auth-modal glass-panel motion-animated"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ type: 'spring' as const, duration: 0.6, bounce: 0 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 id="auth-modal-title">{title}</h2>
              <button
                type="button"
                className="close-btn"
                onClick={onClose}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body auth-modal-body">
              {subtitle && <p className="auth-modal-subtitle">{subtitle}</p>}
              <AuthForm
                initialMode={initialMode}
                onSuccess={() => {
                  onSuccess?.();
                  onClose();
                }}
                onOffline={
                  onOffline
                    ? () => {
                        onOffline();
                        onClose();
                      }
                    : undefined
                }
                showOfflineOption={showOfflineOption}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
