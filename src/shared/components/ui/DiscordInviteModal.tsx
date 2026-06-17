import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles, Users, Zap } from 'lucide-react';

interface DiscordInviteModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function DiscordIcon({ size = 20, className = "" }: { size?: number; className?: string }) {
    return (
        <svg 
            width={size} 
            height={size} 
            viewBox="0 0 127.14 96.36" 
            fill="currentColor" 
            className={className}
            aria-hidden="true"
        >
            <path d="M107.7,8.07A105.15,105.15,0,0,0,77.26,0a77.19,77.19,0,0,0-3.3,6.83A96.67,96.67,0,0,0,52.88,6.83,77.19,77.19,0,0,0,49.58,0,105.15,105.15,0,0,0,19.14,8.07C3,33.79-1.5,59,2,83.93a104.75,104.75,0,0,0,32,16.15,78.83,78.83,0,0,0,6.79-11.08,68.6,68.6,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.65-2a75.58,75.58,0,0,0,64.32,0c.85.71,1.74,1.39,2.65,2a68.6,68.6,0,0,1-10.85,5.18,78.83,78.83,0,0,0,6.79,11.08,104.75,104.75,0,0,0,32-16.15C129.66,51.87,124.27,26.86,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53S36.18,40.36,42.45,40.36,53.83,46,53.83,53,48.72,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.24,60,73.24,53S78.41,40.36,84.69,40.36,96.07,46,96.07,53,91,65.69,84.69,65.69Z" />
        </svg>
    );
}

export function DiscordInviteModal({ isOpen, onClose }: DiscordInviteModalProps) {
    const [shouldRender, setShouldRender] = useState(isOpen);

    useEffect(() => {
        setShouldRender(isOpen);
    }, [isOpen]);

    if (!shouldRender) return null;

    const handleJoin = () => {
        localStorage.setItem('ojee_discord_dismissed', 'true');
        window.open('https://discord.gg/6dKrbVQU8W', '_blank', 'noopener,noreferrer');
        onClose();
    };

    const handleDismiss = () => {
        localStorage.setItem('ojee_discord_dismissed', 'true');
        onClose();
    };

    return createPortal(
        <div className="modal-overlay" onClick={handleDismiss}>
            <div className="modal-content discord-modal glass-panel" onClick={(e) => e.stopPropagation()}>
                <button className="discord-close-btn" onClick={handleDismiss} aria-label="Close modal">
                    <X size={18} />
                </button>
                
                <div className="discord-modal-banner">
                    <div className="discord-logo-floating">
                        <DiscordIcon size={32} className="discord-brand-logo" />
                    </div>
                </div>

                <div className="discord-modal-content">
                    <h2 className="discord-modal-title">Join our Community!</h2>
                    <p className="discord-modal-subtitle">
                        Level up your preparation. Connect with fellow aspirants, share strategies, and stay motivated together.
                    </p>

                    <div className="discord-inline-tags">
                        <span className="discord-tag"><Users size={14} /> Study Rooms</span>
                        <span className="discord-tag"><Sparkles size={14} /> Tracker Tips</span>
                        <span className="discord-tag"><Zap size={14} /> Motivation</span>
                    </div>

                    <div className="discord-modal-actions">
                        <button className="discord-join-btn-large" onClick={handleJoin}>
                            <DiscordIcon size={20} />
                            Accept Invitation
                        </button>
                        <button className="discord-dismiss-btn" onClick={handleDismiss}>
                            Maybe Later
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
