import { useState, useCallback } from 'react';
import { Copy, Check, UserPlus, Link } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DiscordIcon } from '../../../shared/components/ui/DiscordInviteModal';
import { useRemoteAuth } from '../../../core/context/RemoteAuthContext';

interface InviteSectionProps {
  inviteCode: string;
  onInviteFriendClick?: () => void;
  onSignInClick?: () => void;
}

export function InviteSection({
  inviteCode,
  onInviteFriendClick,
  onSignInClick,
}: InviteSectionProps) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const { user } = useRemoteAuth();

  const inviteUrl = inviteCode ? `https://tracker.ojeet.tech/invite/${inviteCode}` : '';

  const handleCopyCode = useCallback(() => {
    if (!inviteCode) return;
    navigator.clipboard.writeText(inviteCode).then(() => {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    });
  }, [inviteCode]);

  const handleCopyLink = useCallback(() => {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    });
  }, [inviteUrl]);

  return (
    <div className="community-invite-section">
      {user ? (
        <>
          {inviteCode && (
            <div className="invite-badge-wrapper">
              <div className="invite-code-badge">
                <span className="invite-badge-label-inside">INVITE CODE:</span>
                <span className="invite-code-text">{inviteCode}</span>
                <button
                  type="button"
                  className={`invite-copy-btn ${copiedCode ? 'copied' : ''}`}
                  onClick={handleCopyCode}
                  title={copiedCode ? 'Copied code!' : 'Copy invite code'}
                >
                  {copiedCode ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
              <motion.button
                type="button"
                className={`invite-link-btn ${copiedLink ? 'copied' : ''}`}
                onClick={handleCopyLink}
                title={copiedLink ? 'Copied link!' : 'Copy invite link'}
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.15 }}
              >
                <AnimatePresence mode="wait">
                  {copiedLink ? (
                    <motion.span
                      key="copied"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.12 }}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}
                    >
                      <Check size={14} />
                      <span>Copied!</span>
                    </motion.span>
                  ) : (
                    <motion.span
                      key="copy"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.12 }}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}
                    >
                      <Link size={14} />
                      <span>Copy link</span>
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            </div>
          )}

          <button type="button" className="invite-friend-btn" onClick={onInviteFriendClick}>
            <UserPlus size={14} />
            <span>Add friend</span>
          </button>
        </>
      ) : (
        <button type="button" className="invite-signin-hint" onClick={onSignInClick}>
          <span>Sign in to get a personal invite code</span>
        </button>
      )}

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
