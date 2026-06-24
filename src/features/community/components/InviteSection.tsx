import { useState, useCallback } from 'react';
import { Copy, Check, UserPlus } from 'lucide-react';
import { DiscordIcon } from '../../../shared/components/ui/DiscordInviteModal';

interface InviteSectionProps {
    inviteCode: string;
    onInviteFriendClick?: () => void;
}

export function InviteSection({ inviteCode, onInviteFriendClick }: InviteSectionProps) {
    const [copied, setCopied] = useState(false);

    const inviteUrl = inviteCode
        ? `https://tracker.ojeet.tech/invite/${inviteCode}`
        : '';

    const handleCopy = useCallback(() => {
        if (!inviteUrl) return;
        navigator.clipboard.writeText(inviteUrl).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    }, [inviteUrl]);

    if (!inviteCode) return null;

    return (
        <div className="community-invite-section">
            <div className="invite-badge-wrapper">
                <div className="invite-code-badge">
                    <span className="invite-badge-label-inside">INVITE CODE:</span>
                    <span className="invite-code-text">{inviteCode}</span>
                    <button
                        className={`invite-copy-btn ${copied ? 'copied' : ''}`}
                        onClick={handleCopy}
                        title={copied ? 'Copied link!' : 'Copy invite link'}
                    >
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                </div>
            </div>

            <button 
                type="button" 
                className="invite-friend-btn"
                onClick={onInviteFriendClick}
            >
                <UserPlus size={14} />
                <span>Invite friend</span>
            </button>
            
            <a 
                href="https://discord.gg/6dKrbVQU8W" 
                target="_blank" 
                rel="noopener noreferrer"
                className="discord-server-btn"
            >
                <DiscordIcon size={16} />
                <span className="discord-btn-text">Join Discord</span>
            </a>
        </div>
    );
}
