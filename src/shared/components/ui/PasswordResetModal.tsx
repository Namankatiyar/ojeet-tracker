import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, KeyRound, Loader, X } from 'lucide-react';
import { useRemoteAuth } from '../../../core/context/RemoteAuthContext';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';
import { usePasswordStrength } from '../../hooks/usePasswordStrength';
import { validatePassword } from '../../utils/auth';

export const PasswordResetModal: React.FC = () => {
  const { isPasswordRecovery, updatePassword, clearPasswordRecovery } = useRemoteAuth();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { score } = usePasswordStrength(password);

  const handleClose = () => {
    setPassword('');
    setConfirmPassword('');
    setError(null);
    clearPasswordRecovery();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validation = validatePassword(password, confirmPassword);
    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    setLoading(true);
    try {
      const result = await updatePassword(password);
      if (result.error) {
        setError(result.error);
      } else {
        handleClose();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      {isPasswordRecovery && (
        <motion.div
          className="modal-overlay motion-animated"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={handleClose}
        >
          <motion.div
            className="modal-content password-reset-modal glass-panel motion-animated"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ type: 'spring' as const, duration: 0.6, bounce: 0 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="password-reset-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="password-reset-header-content">
                <div className="password-reset-icon-badge">
                  <KeyRound size={20} />
                </div>
                <div>
                  <h2 id="password-reset-title" className="password-reset-title">
                    Set new password
                  </h2>
                  <p className="password-reset-subtitle">
                    Please enter and confirm your new password below.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={handleClose}
                aria-label="Close password reset modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="password-reset-form">
              <div className="ob-input-group">
                <label className="ob-label" htmlFor="reset-new-password">
                  New password
                </label>
                <div className="ob-password-wrapper">
                  <input
                    id="reset-new-password"
                    type={showPassword ? 'text' : 'password'}
                    className="ob-input"
                    placeholder="Enter new password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    disabled={loading}
                    required
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
                <label className="ob-label" htmlFor="reset-confirm-password">
                  Confirm new password
                </label>
                <div className="ob-password-wrapper">
                  <input
                    id="reset-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="ob-input"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    disabled={loading}
                    required
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

              <div className="modal-footer">
                <button
                  type="button"
                  className="modal-btn cancel"
                  onClick={handleClose}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="modal-btn primary"
                  disabled={
                    loading ||
                    !password ||
                    !confirmPassword ||
                    score < 2 ||
                    password !== confirmPassword
                  }
                >
                  {loading ? <Loader size={16} className="spin-icon" /> : 'Update password'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
