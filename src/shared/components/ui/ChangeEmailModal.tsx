import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Loader, X, CheckCircle, Info } from 'lucide-react';
import { useRemoteAuth } from '../../../core/context/RemoteAuthContext';
import { formatAuthError } from '../../utils/auth';

export interface ChangeEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangeEmailModal: React.FC<ChangeEmailModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { user, updateEmail } = useRemoteAuth();

  const [newEmail, setNewEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const currentEmail = user?.email || '';

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading]);

  const handleClose = () => {
    if (loading) return;
    setNewEmail('');
    setError(null);
    setSuccessMessage(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    const trimmed = newEmail.trim().toLowerCase();
    if (!trimmed) return;

    if (trimmed === currentEmail.toLowerCase()) {
      setError('New email must be different from your current email.');
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      const result = await updateEmail(trimmed);
      if (result.error) {
        setError(formatAuthError(result.error));
      } else {
        setSuccessMessage(
          'Confirmation link sent! Please check both your current and new email inboxes to confirm the change.'
        );
      }
    } catch (err: unknown) {
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  if (typeof document === 'undefined') return null;
  const modalRoot = document.getElementById('modal-root') || document.body;

  const isSubmitDisabled =
    loading ||
    !newEmail.trim() ||
    newEmail.trim().toLowerCase() === currentEmail.toLowerCase() ||
    Boolean(successMessage);

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="modal-overlay motion-animated"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={handleClose}
        >
          <motion.div
            className="modal-content glass-panel motion-animated"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ type: 'spring' as const, duration: 0.6, bounce: 0 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="change-email-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="change-email-header-title">
                <Mail size={20} className="auth-banner-icon" />
                <h2 id="change-email-modal-title">Change Email</h2>
              </div>
              <button
                type="button"
                className="close-btn"
                onClick={handleClose}
                aria-label="Close modal"
                disabled={loading}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="auth-form change-email-form">
              <div className="auth-input-group">
                <label className="auth-label">Current email</label>
                <input
                  type="text"
                  className="auth-input auth-input-readonly"
                  value={currentEmail || 'Not signed in'}
                  disabled
                  readOnly
                />
              </div>

              <div className="auth-input-group">
                <label className="auth-label" htmlFor="change-new-email">
                  New email address
                </label>
                <input
                  id="change-new-email"
                  type="email"
                  className="auth-input"
                  placeholder="name@example.com"
                  value={newEmail}
                  onChange={(e) => {
                    setNewEmail(e.target.value);
                    setError(null);
                  }}
                  autoComplete="email"
                  disabled={loading || Boolean(successMessage)}
                  required
                />
              </div>

              <div className="auth-info-note">
                <Info size={16} className="auth-info-icon" />
                <span>
                  Per Supabase security policy, a confirmation link will be sent to both your current email and your new email address.
                </span>
              </div>

              {error && (
                <div className="auth-error" role="alert">
                  <span>{error}</span>
                </div>
              )}

              {successMessage && (
                <div className="auth-success" role="status">
                  <CheckCircle size={16} className="auth-status-icon" />
                  <span>{successMessage}</span>
                </div>
              )}

              <div className="modal-footer">
                <button
                  type="button"
                  className="action-btn outline small"
                  onClick={handleClose}
                  disabled={loading}
                >
                  {successMessage ? 'Close' : 'Cancel'}
                </button>
                {!successMessage && (
                  <button
                    type="submit"
                    className="action-btn primary small"
                    disabled={isSubmitDisabled}
                  >
                    {loading ? (
                      <>
                        <Loader size={14} className="spin-icon" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      'Change email'
                    )}
                  </button>
                )}
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    modalRoot
  );
};

export default ChangeEmailModal;
