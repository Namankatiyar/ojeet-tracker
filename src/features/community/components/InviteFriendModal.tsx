import { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle, Loader2, UserPlus } from 'lucide-react';
import { triggerSmallConfetti } from '../../../shared/utils/confetti';
import { useTheme } from '../../../core/context/ThemeContext';

interface InviteFriendModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function InviteFriendModal({ isOpen, onClose }: InviteFriendModalProps) {
    const [code, setCode] = useState('');
    const [status, setStatus] = useState<'idle' | 'submitting' | 'success'>('idle');
    const { accentColor } = useTheme();

    // Reset states when the modal is opened
    useEffect(() => {
        if (isOpen) {
            setCode('');
            setStatus('idle');
        }
    }, [isOpen]);

    const handleCodeChange = useCallback((raw: string) => {
        // Force uppercase alphanumeric, max 4 characters
        const cleaned = raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 4);
        setCode(cleaned);
    }, []);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (code.length !== 4 || status === 'submitting') return;

        setStatus('submitting');
        
        // Simulate a network request
        setTimeout(() => {
            setStatus('success');
            triggerSmallConfetti(accentColor);
        }, 1000);
    }, [code, status, accentColor]);

    if (!isOpen) return null;

    return createPortal(
        <div className="profile-edit-overlay" onClick={onClose}>
            <div
                className="invite-friend-modal glass-panel"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="profile-edit-header">
                    <h2>Invite friend</h2>
                    <button className="profile-edit-close" onClick={onClose} aria-label="Close modal">
                        <X size={20} />
                    </button>
                </div>
                <div className="invite-modal-divider" />

                {status !== 'success' ? (
                    <form onSubmit={handleSubmit} className="profile-edit-section">
                        <p className="invite-modal-desc">
                            Enter your friend's invite code to connect, compare progress, and study together.
                        </p>
                        
                        <div className="invite-code-input-wrapper">
                            <label htmlFor="invite-friend-code">Invite code</label>
                            <input
                                id="invite-friend-code"
                                type="text"
                                value={code}
                                onChange={(e) => handleCodeChange(e.target.value)}
                                placeholder="ABCD"
                                maxLength={4}
                                disabled={status === 'submitting'}
                                autoFocus
                                required
                            />
                            <span className="invite-code-input-hint">4 characters, alphanumeric</span>
                        </div>

                        <div className="invite-modal-actions">
                            <button
                                type="button"
                                className="secondary-btn"
                                onClick={onClose}
                                disabled={status === 'submitting'}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="primary-btn"
                                disabled={code.length !== 4 || status === 'submitting'}
                            >
                                {status === 'submitting' ? (
                                    <>
                                        <Loader2 size={16} className="spinner-icon" />
                                        <span>Inviting...</span>
                                    </>
                                ) : (
                                    <>
                                        <UserPlus size={16} />
                                        <span>Invite</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="invite-success-view">
                        <CheckCircle size={48} className="invite-success-icon" />
                        <h3 className="invite-success-title">Invitation sent!</h3>
                        <p className="invite-success-desc">
                            Successfully sent invitation to code <strong>{code}</strong>. They will appear in your friends list once connected.
                        </p>
                        <div className="invite-modal-actions" style={{ width: '100%', marginTop: 'var(--space-2)' }}>
                            <button
                                type="button"
                                className="primary-btn"
                                style={{ width: '100%' }}
                                onClick={onClose}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
}
