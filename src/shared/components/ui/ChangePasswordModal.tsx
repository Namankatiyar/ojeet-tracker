import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, KeyRound, Loader, X, CheckCircle } from 'lucide-react';
import { useRemoteAuth } from '../../../core/context/RemoteAuthContext';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';
import { usePasswordStrength } from '../../hooks/usePasswordStrength';
import { validatePassword, formatAuthError } from '../../utils/auth';

export interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { updatePassword } = useRemoteAuth();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const { score } = usePasswordStrength(password);

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
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setError(null);
    setSuccess(false);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setError(null);
    setSuccess(false);

    const validation = validatePassword(password, confirmPassword);
    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    setLoading(true);
    try {
      const result = await updatePassword(password);
      if (result.error) {
        setError(formatAuthError(result.error));
      } else {
        setSuccess(true);
        setTimeout(() => {
          handleClose();
        }, 1200);
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
    !password ||
    !confirmPassword ||
    score < 2 ||
    password !== confirmPassword ||
    success;

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
            aria-labelledby="change-password-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <KeyRound size={20} className="auth-banner-icon" />
                <h2 id="change-password-modal-title">Change Password</h2>
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

            <form onSubmit={handleSubmit} className="auth-form" style={{ marginTop: 'var(--space-2)' }}>
              <div className="auth-input-group">
                <label className="auth-label" htmlFor="change-new-password">
                  New password
                </label>
                <div className="auth-password-wrapper">
                  <input
                    id="change-new-password"
                    type={showPassword ? 'text' : 'password'}
                    className="auth-input"
                    placeholder="Enter new password (min 8 chars)"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError(null);
                    }}
                    autoComplete="new-password"
                    disabled={loading || success}
                    required
                  />
                  <button
                    type="button"
                    className="auth-password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <PasswordStrengthMeter password={password} />
              </div>

              <div className="auth-input-group">
                <label className="auth-label" htmlFor="change-confirm-password">
                  Confirm new password
                </label>
                <div className="auth-password-wrapper">
                  <input
                    id="change-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="auth-input"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setError(null);
                    }}
                    autoComplete="new-password"
                    disabled={loading || success}
                    required
                  />
                  <button
                    type="button"
                    className="auth-password-toggle"
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
                <div className="auth-error" role="alert">
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="auth-success" role="status">
                  <CheckCircle size={16} />
                  <span>Password updated successfully!</span>
                </div>
              )}

              <div className="modal-footer" style={{ marginTop: 'var(--space-4)' }}>
                <button
                  type="button"
                  className="action-btn outline small"
                  onClick={handleClose}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="action-btn primary small"
                  disabled={isSubmitDisabled}
                >
                  {loading ? (
                    <>
                      <Loader size={14} className="spin-icon" />
                      <span>Updating...</span>
                    </>
                  ) : (
                    'Update password'
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    modalRoot
  );
};

export default ChangePasswordModal;
