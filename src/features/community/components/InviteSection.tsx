import { useState, useCallback } from 'react';
import { Copy, Check } from 'lucide-react';

interface InviteSectionProps {
    inviteCode: string;
}

export function InviteSection({ inviteCode }: InviteSectionProps) {
    const [copied, setCopied] = useState(false);

    const inviteUrl = inviteCode
        ? `https://ojee-tracker.web.app/invite/${inviteCode}`
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
            <div className="community-invite-input-group">
                <span className="community-invite-url">{inviteUrl}</span>
                <button
                    className={`community-invite-copy-btn ${copied ? 'copied' : ''}`}
                    onClick={handleCopy}
                    title={copied ? 'Copied!' : 'Copy invite link'}
                >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                </button>
            </div>
        </div>
    );
}
