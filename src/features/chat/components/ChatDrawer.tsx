/**
 * src/features/chat/components/ChatDrawer.tsx
 * Phase 5: Glassmorphic sidebar chat drawer + FAB toggle
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Send,
  Key,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Copy,
  History,
  Plus,
  Trash2,
  ChevronRight,
} from 'lucide-react';
import { useAgentChat, type ChatMessage } from '../hooks/useAgentChat';
import { saveApiKey, loadApiKey, clearApiKey } from '../../../shared/lib/gemini';
import { useLocalStorage } from '../../../shared/hooks/useLocalStorage';

// ── Robust Markdown Renderer ──────────────────────────────────────────────────
function renderMarkdown(text: string): string {
  // 1. Escape HTML to prevent XSS issues
  let html = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // 2. Parse code blocks: ```lang ... ```
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre class="chat-code-block"><div class="chat-code-header"><span>${lang || 'code'}</span><button class="chat-code-copy-btn" onclick="navigator.clipboard.writeText(decodeURIComponent('${encodeURIComponent(code.trim())}'))"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Copy</button></div><code>${code.trim()}</code></pre>`;
  });

  // 3. Parse inline code: `code`
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // 4. Parse bold and italic
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // 5. Parse headings
  html = html.replace(/^### (.*?)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.*?)$/gm, '<h1>$1</h1>');

  // 6. Parse links
  html = html.replace(
    /\[(.*?)\]\((.*?)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
  );

  // 7. Parse lists
  html = html.replace(/^\s*[*-]\s+(.*?)$/gm, '<li>$1</li>');
  html = html.replace(/^\s*\d+\.\s+(.*?)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*?<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`);

  // 8. Process paragraphs and linebreaks for text outside blocks
  const parts = html.split(
    /(<pre[\s\S]*?<\/pre>|<ul[\s\S]*?<\/ul>|<ol[\s\S]*?<\/ol>|<h[1-3]>.*?<\/h[1-3]>)/g
  );
  const processedParts = parts.map((part) => {
    if (
      part.startsWith('<pre') ||
      part.startsWith('<ul') ||
      part.startsWith('<ol') ||
      part.startsWith('<h')
    ) {
      return part;
    }
    const p = part.trim();
    if (!p) return '';
    return p
      .split(/\n{2,}/)
      .map((para) => `<p>${para.replace(/\n/g, '<br/>')}</p>`)
      .join('');
  });

  return processedParts.join('');
}

// ── Confirm Card ──────────────────────────────────────────────────────────────
interface ConfirmCardProps {
  message: ChatMessage;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmCard({ message, onConfirm, onCancel }: ConfirmCardProps) {
  const isConfirmed = message.isConfirmed;
  const isCancelled = message.isCancelled;
  const isDone = isConfirmed || isCancelled;

  return (
    <div
      className={`chat-confirm-card ${isCancelled ? 'chat-confirm-card--cancelled' : ''} ${isConfirmed ? 'chat-confirm-card--confirmed' : ''}`}
    >
      <div className="chat-confirm-title">
        {isConfirmed ? (
          <>
            <CheckCircle2 size={12} /> Action Confirmed
          </>
        ) : isCancelled ? (
          <>
            <XCircle size={12} /> Action Cancelled
          </>
        ) : (
          <>
            <AlertTriangle size={12} /> Confirm Action
          </>
        )}
      </div>
      <div className="chat-confirm-description">
        {message.pendingAction?.description ?? message.content}
      </div>
      {!isDone && (
        <div className="chat-confirm-actions">
          <button
            id={`chat-confirm-cancel-${message.id}`}
            className="chat-confirm-btn chat-confirm-btn--cancel"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            id={`chat-confirm-proceed-${message.id}`}
            className="chat-confirm-btn chat-confirm-btn--confirm"
            onClick={onConfirm}
          >
            Confirm
          </button>
        </div>
      )}
      {isDone && (
        <div className="chat-confirm-result">
          {isConfirmed ? '✓ Executed successfully.' : '✗ Cancelled — no changes made.'}
        </div>
      )}
    </div>
  );
}

// ── Message Bubble ────────────────────────────────────────────────────────────
interface BubbleProps {
  message: ChatMessage;
  onConfirm: (id: string) => void;
  onCancel: (id: string) => void;
}

function MessageBubble({ message, onConfirm, onCancel }: BubbleProps) {
  const { role, content, isStreaming, pendingAction, actionId } = message;
  const [copied, setCopied] = useState(false);

  const timeString = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (role === 'system') {
    return (
      <div className="chat-bubble-row chat-bubble-row--system">
        <div
          className="chat-bubble chat-bubble--system"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
        />
      </div>
    );
  }

  if (pendingAction && actionId) {
    return (
      <div className="chat-bubble-row">
        <div className="chat-bubble-avatar chat-bubble-avatar--aria">
          <img src="/blueBot.png" alt="Blue" className="chat-avatar-img" />
        </div>
        <div className="chat-bubble-container">
          <ConfirmCard
            message={message}
            onConfirm={() => onConfirm(actionId)}
            onCancel={() => onCancel(actionId)}
          />
          <div className="chat-bubble-time">{timeString}</div>
        </div>
      </div>
    );
  }

  const isUser = role === 'user';

  return (
    <div className={`chat-bubble-row ${isUser ? 'chat-bubble-row--user' : ''}`}>
      {!isUser && (
        <div className="chat-bubble-avatar chat-bubble-avatar--aria">
          <img src="/blueBot.png" alt="Blue" className="chat-avatar-img" />
        </div>
      )}
      <div className="chat-bubble-container">
        <div className={`chat-bubble ${isUser ? 'chat-bubble--user' : 'chat-bubble--model'}`}>
          {isStreaming ? (
            <div
              className="chat-streaming-container"
              style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}
            >
              {content && (
                <span
                  className="chat-streaming-content"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
                />
              )}
              <div className="chat-typing-dots">
                <div className="chat-typing-dot" />
                <div className="chat-typing-dot" />
                <div className="chat-typing-dot" />
              </div>
            </div>
          ) : (
            <>
              <span dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }} />
              {!isUser && (
                <button
                  className={`chat-bubble-copy-btn ${copied ? 'chat-bubble-copy-btn--copied' : ''}`}
                  onClick={handleCopy}
                  title="Copy response"
                  aria-label="Copy response"
                >
                  {copied ? <CheckCircle2 size={12} /> : <Copy size={12} />}
                </button>
              )}
            </>
          )}
        </div>
        <div className="chat-bubble-time">{timeString}</div>
      </div>
    </div>
  );
}

// ── API Key Panel ─────────────────────────────────────────────────────────────
interface ApiKeyPanelProps {
  onSaved: () => void;
}

function ApiKeyPanel({ onSaved }: ApiKeyPanelProps) {
  const [keyInput, setKeyInput] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const currentKey = loadApiKey();
  const hasKey = !!currentKey;

  const handleSave = () => {
    if (keyInput.trim()) {
      saveApiKey(keyInput.trim());
      setKeyInput('');
      onSaved();
    }
  };

  const handleClearClick = () => {
    if (confirmDelete) {
      clearApiKey();
      setConfirmDelete(false);
      onSaved();
    } else {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
    }
  };

  return (
    <div className="chat-apikey-banner">
      <div className="chat-apikey-banner-title">
        <Key size={11} />
        Gemini API Key
      </div>
      {hasKey ? (
        <div className="chat-apikey-configured">
          <span className="chat-apikey-configured-text">
            <CheckCircle2 size={11} style={{ color: 'var(--priority-low)' }} />
            API key configured
          </span>
          <button
            id="chat-apikey-clear"
            className={`chat-apikey-clear-btn ${confirmDelete ? 'chat-apikey-clear-btn--confirm' : ''}`}
            onClick={handleClearClick}
            aria-label="Remove API Key"
            title={confirmDelete ? 'Click again to confirm removal' : 'Remove API Key'}
          >
            {confirmDelete ? (
              <>
                <AlertTriangle size={11} /> Confirm?
              </>
            ) : (
              <>
                <Trash2 size={11} /> Remove
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="chat-apikey-form">
          <input
            id="chat-apikey-input"
            type="password"
            className="chat-apikey-input"
            placeholder="AIza..."
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            autoComplete="off"
          />
          <button
            id="chat-apikey-save"
            className="chat-apikey-save-btn"
            onClick={handleSave}
            aria-label="Save API Key"
          >
            Save
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main Drawer Component ─────────────────────────────────────────────────────
export function ChatDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [keyVersion, setKeyVersion] = useState(0);
  const [showApiKeyPanel, setShowApiKeyPanel] = useState(() => !loadApiKey());
  const [activeView, setActiveView] = useState<'chat' | 'history'>('chat');
  const [confirmClear, setConfirmClear] = useState(false);
  const [tooltipDismissed, setTooltipDismissed] = useLocalStorage<boolean>(
    'fab_tooltip_dismissed_chat',
    false
  );

  const {
    sessions,
    activeSessionId,
    startNewSession,
    switchSession,
    deleteSession,
    messages,
    isLoading,
    sendMessage,
    confirmPendingAction,
    cancelPendingAction,
    clearActiveSession,
  } = useAgentChat();

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState('');

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]); // also scroll when streaming starts

  // Auto-resize textarea — grow with content up to max-height, then scroll
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      const capped = Math.min(el.scrollHeight, 120);
      el.style.height = `${capped}px`;
      // Only show scrollbar once we've hit the max-height cap
      el.style.overflowY = el.scrollHeight > 120 ? 'auto' : 'hidden';
    }
  }, [input]);

  // Focus textarea when drawer opens and activeView is chat
  useEffect(() => {
    if (isOpen && activeView === 'chat') {
      setTimeout(() => textareaRef.current?.focus(), 350);
    }
  }, [isOpen, activeView]);

  // Prevent background scrolling when chat drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    setInput('');
    sendMessage(trimmed);
  }, [input, isLoading, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleKeyRefresh = () => {
    setKeyVersion((v) => v + 1);
    if (loadApiKey()) setShowApiKeyPanel(false); // auto-hide when configured
  };

  const handleClearClick = () => {
    if (confirmClear) {
      clearActiveSession();
      setConfirmClear(false);
    } else {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 3000);
    }
  };

  const toggleOpen = () => setIsOpen((prev) => !prev);
  const handleClose = () => setIsOpen(false);
  const handleSuggestionClick = (text: string) => {
    if (isLoading) return;
    sendMessage(text);
  };

  const suggestions = [
    'What should I revise today?',
    'Check my syllabus progress',
    'Log a mock exam score',
    'Give me a study plan suggestion',
  ];

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* ── Overlay ──────────────────────────────────────────────── */}
            <motion.div
              className="chat-overlay motion-animated chat-overlay--visible"
              onClick={handleClose}
              aria-hidden="true"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />

            {/* ── Drawer Panel ──────────────────────────────────────────── */}
            <motion.div
              className="chat-drawer motion-animated chat-drawer--open"
              role="dialog"
              aria-label="AI Study Assistant"
              aria-modal="true"
              initial={isMobile ? { y: '100%', x: 0 } : { x: '100%', y: 0 }}
              animate={{ x: 0, y: 0 }}
              exit={isMobile ? { y: '100%', x: 0 } : { x: '100%', y: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
            >
        {/* Header */}
        <div className="chat-header">
          <div className="chat-header-avatar">
            <img src="/blueBot.png" alt="Blue" className="chat-avatar-img" />
          </div>
          <div className="chat-header-info">
            <div className="chat-header-name">
              Blue
              <span className="chat-status-dot" title="Active" />
            </div>
          </div>
          <div className="chat-header-actions">
            <button
              id="chat-history-toggle-btn"
              className={`chat-icon-btn ${activeView === 'history' ? 'chat-icon-btn--active' : ''}`}
              onClick={() => setActiveView((prev) => (prev === 'chat' ? 'history' : 'chat'))}
              title={activeView === 'chat' ? 'View past chats' : 'Back to active chat'}
              aria-label={activeView === 'chat' ? 'View past chats' : 'Back to active chat'}
            >
              <History size={14} />
            </button>
            <button
              id="chat-settings-btn"
              className={`chat-icon-btn ${showApiKeyPanel ? 'chat-icon-btn--active' : ''}`}
              onClick={() => setShowApiKeyPanel((prev) => !prev)}
              title="Toggle API Key Settings"
              aria-label="Toggle API Key Settings"
            >
              <Key size={14} />
            </button>
            <button
              id="chat-clear-btn"
              className={`chat-icon-btn ${confirmClear ? 'chat-icon-btn--danger' : ''}`}
              onClick={handleClearClick}
              title={confirmClear ? 'Click again to confirm' : 'Clear conversation'}
              aria-label={confirmClear ? 'Confirm clear conversation' : 'Clear conversation'}
              disabled={activeView === 'history'}
            >
              {confirmClear ? <AlertTriangle size={14} /> : <Trash2 size={14} />}
            </button>
            <button
              id="chat-close-btn"
              className="chat-icon-btn"
              onClick={handleClose}
              title="Close chat"
              aria-label="Close chat"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* API Key Panel */}
        {showApiKeyPanel && <ApiKeyPanel key={keyVersion} onSaved={handleKeyRefresh} />}

        {activeView === 'history' ? (
          /* ── History List View ───────────────────────────────────────── */
          <div className="chat-sessions-list">
            <div className="chat-sessions-header">
              <h3>Past Conversations</h3>
              <button
                className="chat-new-session-btn"
                onClick={() => {
                  startNewSession();
                  setActiveView('chat');
                }}
              >
                <Plus size={14} /> New Chat
              </button>
            </div>
            <div className="chat-sessions-feed">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={`chat-session-item ${session.id === activeSessionId ? 'chat-session-item--active' : ''}`}
                >
                  <div
                    className="chat-session-item-content"
                    onClick={() => {
                      switchSession(session.id);
                      setActiveView('chat');
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={`Switch to chat ${session.title}`}
                  >
                    <div className="chat-session-item-title">{session.title}</div>
                    <div className="chat-session-item-date">
                      {new Date(session.lastUpdated).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                  <button
                    className="chat-session-item-delete"
                    onClick={() => deleteSession(session.id)}
                    title="Delete conversation"
                    aria-label="Delete conversation"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* ── Active Chat View ───────────────────────────────────────── */
          <>
            {messages.length === 1 ? (
              <div className="chat-empty-state">
                {!loadApiKey() ? (
                  <div className="chat-welcome-card chat-welcome-card--setup glass-panel">
                    <div className="chat-welcome-avatar chat-welcome-avatar--setup">
                      <Key size={20} />
                    </div>
                    <h2>Gemini API Key Required</h2>
                    <p className="chat-welcome-desc">
                      Blue runs entirely in your browser using your own API key. Setting it up is
                      free and takes less than a minute.
                    </p>
                    <div className="chat-setup-instructions">
                      <ol>
                        <li>
                          Go to{' '}
                          <a
                            href="https://aistudio.google.com/"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Google AI Studio
                          </a>{' '}
                          and click <strong>Get API key</strong>.
                        </li>
                        <li>
                          Copy your generated key (starts with <code>AIza</code>).
                        </li>
                        <li>
                          Paste the key into the setup field below and click <strong>Save</strong>.
                        </li>
                      </ol>
                    </div>
                    <div className="chat-setup-actions">
                      <a
                        href="https://aistudio.google.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="chat-setup-btn chat-setup-btn--primary"
                      >
                        Get Free API Key
                      </a>
                      {!showApiKeyPanel && (
                        <button
                          className="chat-setup-btn chat-setup-btn--secondary"
                          onClick={() => setShowApiKeyPanel(true)}
                        >
                          Enter Key
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="chat-welcome-card glass-panel">
                      <div className="chat-welcome-avatar">
                        <img src="/blueBot.png" alt="Blue" className="chat-avatar-img" />
                      </div>
                      <h2>Hello, I'm Blue</h2>
                      <p className="chat-welcome-desc">
                        Your AI study companion. Ask me to track syllabus progress, schedule tasks,
                        log mock scores, or suggest revision plans.
                      </p>
                    </div>
                    <div className="chat-suggestions-grid">
                      <div className="chat-suggestions-title">Suggested Actions</div>
                      {suggestions.map((sug, idx) => (
                        <button
                          key={idx}
                          className="chat-suggestion-card"
                          onClick={() => handleSuggestionClick(sug)}
                        >
                          <span className="chat-suggestion-text">{sug}</span>
                          <ChevronRight size={16} className="chat-suggestion-arrow" />
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="chat-messages" role="log" aria-live="polite">
                {messages.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    onConfirm={confirmPendingAction}
                    onCancel={cancelPendingAction}
                  />
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}

            {/* Input Area */}
            {loadApiKey() && (
              <div className="chat-input-area">
                <div
                  className={`chat-input-wrapper ${isLoading ? 'chat-input-wrapper--disabled' : ''}`}
                >
                  <textarea
                    id="chat-message-input"
                    ref={textareaRef}
                    className="chat-textarea"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={1}
                    disabled={isLoading}
                    aria-label="Message input"
                  />
                  <button
                    id="chat-send-btn"
                    className="chat-send-btn"
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading}
                    title="Send message (Enter)"
                    aria-label="Send message"
                  >
                    <Send size={14} />
                  </button>
                </div>
                <div className="chat-input-hint">
                  <kbd>Enter</kbd> to send · <kbd>Shift</kbd>+<kbd>Enter</kbd> for new line
                </div>
              </div>
            )}
          </>
        )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── FAB ───────────────────────────────────────────────────── */}
      {!isOpen && (
        <button
          id="chat-fab-toggle"
          className="chat-fab"
          onClick={toggleOpen}
          aria-label="Open AI Assistant"
          title="AI Study Assistant"
        >
          <span className="chat-fab-icon">
            <img src="/blueBot.png" alt="Blue" className="chat-avatar-img" />
          </span>
          {!tooltipDismissed && (
            <div
              className="fab-info-tooltip fab-info-tooltip--right"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="fab-info-tooltip-text">You can disable this feature in Settings.</div>
              <button
                className="fab-info-tooltip-close"
                onClick={(e) => {
                  e.stopPropagation();
                  setTooltipDismissed(true);
                }}
                aria-label="Dismiss tooltip"
              >
                <X size={12} />
              </button>
            </div>
          )}
        </button>
      )}
    </>
  );
}
