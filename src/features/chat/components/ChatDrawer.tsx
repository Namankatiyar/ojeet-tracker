/**
 * src/features/chat/components/ChatDrawer.tsx
 * Phase 5: Glassmorphic sidebar chat drawer + FAB toggle
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Bot, X, Send, Key, CheckCircle2, XCircle, RefreshCw, AlertTriangle, Sparkles } from 'lucide-react';
import { useAgentChat, type ChatMessage } from '../hooks/useAgentChat';
import { saveApiKey, loadApiKey, clearApiKey } from '../../../shared/lib/gemini';

// ── Simple markdown renderer ──────────────────────────────────────────────────
function renderMarkdown(text: string): string {
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/^#{1,3} (.+)$/gm, '<strong>$1</strong>')
        .replace(/^\* (.+)$/gm, '• $1')
        .replace(/^- (.+)$/gm, '• $1')
        .replace(/\n{2,}/g, '</p><p>')
        .replace(/\n/g, '<br/>');
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
        <div className={`chat-confirm-card ${isCancelled ? 'chat-confirm-card--cancelled' : ''} ${isConfirmed ? 'chat-confirm-card--confirmed' : ''}`}>
            <div className="chat-confirm-title">
                {isConfirmed ? (
                    <><CheckCircle2 size={12} /> Action Confirmed</>
                ) : isCancelled ? (
                    <><XCircle size={12} /> Action Cancelled</>
                ) : (
                    <><AlertTriangle size={12} /> Confirm Destructive Action</>
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
                        Delete — I'm sure
                    </button>
                </div>
            )}
            {isDone && (
                <div className="chat-confirm-result">
                    {isConfirmed ? '✓ Deleted successfully.' : '✗ Cancelled — no changes made.'}
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
                    <Bot size={13} />
                </div>
                <ConfirmCard
                    message={message}
                    onConfirm={() => onConfirm(actionId)}
                    onCancel={() => onCancel(actionId)}
                />
            </div>
        );
    }

    const isUser = role === 'user';

    return (
        <div className={`chat-bubble-row ${isUser ? 'chat-bubble-row--user' : ''}`}>
            {!isUser && (
                <div className="chat-bubble-avatar chat-bubble-avatar--aria">
                    <Bot size={13} />
                </div>
            )}
            <div className={`chat-bubble ${isUser ? 'chat-bubble--user' : 'chat-bubble--model'}`}>
                {isStreaming ? (
                    <div className="chat-typing-dots">
                        <div className="chat-typing-dot" />
                        <div className="chat-typing-dot" />
                        <div className="chat-typing-dot" />
                    </div>
                ) : (
                    <span dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }} />
                )}
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
    const currentKey = loadApiKey();
    const hasKey = !!currentKey;

    const handleSave = () => {
        if (keyInput.trim()) {
            saveApiKey(keyInput.trim());
            setKeyInput('');
            onSaved();
        }
    };

    const handleClear = () => {
        clearApiKey();
        onSaved();
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
                    <button id="chat-apikey-clear" className="chat-apikey-clear-btn" onClick={handleClear}>
                        Remove
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
                        onChange={e => setKeyInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSave()}
                        autoComplete="off"
                    />
                    <button id="chat-apikey-save" className="chat-apikey-save-btn" onClick={handleSave}>
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
    const [keyVersion, setKeyVersion] = useState(0); // Force re-render on key change

    const { messages, isLoading, sendMessage, confirmPendingAction, cancelPendingAction, clearChat } = useAgentChat();

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [input, setInput] = useState('');

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
        }
    }, [input]);

    // Focus textarea when drawer opens
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => textareaRef.current?.focus(), 350);
        }
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
        setKeyVersion(v => v + 1);
    };

    const toggleOpen = () => setIsOpen(prev => !prev);
    const handleClose = () => setIsOpen(false);

    return (
        <>
            {/* ── Overlay ──────────────────────────────────────────────── */}
            <div
                className={`chat-overlay ${isOpen ? 'chat-overlay--visible' : ''}`}
                onClick={handleClose}
                aria-hidden="true"
            />

            {/* ── Drawer Panel ──────────────────────────────────────────── */}
            <div
                className={`chat-drawer ${isOpen ? 'chat-drawer--open' : ''}`}
                role="dialog"
                aria-label="AI Study Assistant"
                aria-modal="true"
            >
                {/* Header */}
                <div className="chat-header">
                    <div className="chat-header-avatar">
                        <Sparkles size={15} />
                    </div>
                    <div className="chat-header-info">
                        <div className="chat-header-name">
                            Aria
                            <span className="chat-status-dot" title="Active" />
                        </div>
                        <div className="chat-header-subtitle">AI Study Assistant · Gemini</div>
                    </div>
                    <div className="chat-header-actions">
                        <button
                            id="chat-clear-btn"
                            className="chat-icon-btn"
                            onClick={clearChat}
                            title="Clear conversation"
                        >
                            <RefreshCw size={14} />
                        </button>
                        <button
                            id="chat-close-btn"
                            className="chat-icon-btn"
                            onClick={handleClose}
                            title="Close chat"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* API Key Panel */}
                <ApiKeyPanel key={keyVersion} onSaved={handleKeyRefresh} />

                {/* Message Feed */}
                <div className="chat-messages" role="log" aria-live="polite">
                    {messages.map(msg => (
                        <MessageBubble
                            key={msg.id}
                            message={msg}
                            onConfirm={confirmPendingAction}
                            onCancel={cancelPendingAction}
                        />
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="chat-input-area">
                    <div className="chat-input-wrapper">
                        <textarea
                            id="chat-message-input"
                            ref={textareaRef}
                            className="chat-textarea"
                            placeholder="Ask Aria anything… e.g. 'What should I revise today?'"
                            value={input}
                            onChange={e => setInput(e.target.value)}
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
                        Enter to send · Shift+Enter for new line
                    </div>
                </div>
            </div>

            {/* ── FAB ───────────────────────────────────────────────────── */}
            <button
                id="chat-fab-toggle"
                className={`chat-fab ${isOpen ? 'chat-fab--open' : ''}`}
                onClick={toggleOpen}
                aria-label={isOpen ? 'Close AI Assistant' : 'Open AI Assistant'}
                title="AI Study Assistant"
            >
                <span className="chat-fab-icon">
                    {isOpen ? <X size={20} /> : <Sparkles size={20} />}
                </span>
            </button>
        </>
    );
}
