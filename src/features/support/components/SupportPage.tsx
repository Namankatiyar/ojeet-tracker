import React, { useState, useEffect } from 'react';
import { triggerConfetti } from '../../../shared/utils/confetti';
import { useTheme } from '../../../core/context/ThemeContext';

// --- Doodles & Icons ---
const DoodleHeart = ({ className = '', style = {} }: { className?: string; style?: React.CSSProperties }) => (
    <svg className={`doodle-overlay red ${className}`} style={style} width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
    </svg>
);

const DoodleStar = ({ className = '', style = {} }: { className?: string; style?: React.CSSProperties }) => (
    <svg className={`doodle-overlay ${className}`} style={style} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
);

const DoodleArrow = ({ className = '', style = {} }: { className?: string; style?: React.CSSProperties }) => (
    <svg className={`doodle-overlay red ${className}`} style={style} width="40" height="40" viewBox="0 0 60 60" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M10 10 Q 30 5, 50 30 M 40 30 L 50 30 L 45 20" />
    </svg>
);

// Sparkle icon for the CTA button
const SparkleIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 0L14.59 8.41L23 11L14.59 13.59L12 22L9.41 13.59L1 11L9.41 8.41L12 0Z"/>
    </svg>
);

const AMOUNTS = [
    { value: '₹49', label: 'A cup of chai ☕', emoji: '☕' },
    { value: '₹99', label: 'A study snack 🍪', emoji: '🍪' },
    { value: '₹199', label: "A week's fuel 🚀", emoji: '🚀' },
];

export const SupportPage: React.FC = () => {
    const { setSupportOverride } = useTheme();

    useEffect(() => {
        setSupportOverride(true);
        return () => {
            setSupportOverride(false);
        };
    }, [setSupportOverride]);

    const [selectedAmount, setSelectedAmount] = useState<string | null>(null);
    const [customAmount, setCustomAmount] = useState('');
    const [note, setNote] = useState('');
    const [isCustom, setIsCustom] = useState(false);

    const handleAmountSelect = (value: string) => {
        setSelectedAmount(value);
        setIsCustom(false);
    };

    const handleCustomToggle = () => {
        setIsCustom(true);
        setSelectedAmount(null);
    };

    const handleSupportClick = () => {
        triggerConfetti('#e63946');
    };

    return (
        <div className="support-page-container">
            <main className="support-content">
                {/* Doodles scattered around */}
                <DoodleStar style={{ top: '5%', left: '-5%', transform: 'rotate(15deg)' }} />
                <DoodleStar style={{ top: '25%', right: '-8%', transform: 'rotate(-20deg)', width: '15px' }} />
                <DoodleStar style={{ bottom: '15%', left: '-2%', transform: 'rotate(45deg)' }} />

                <header className="support-header">
                    <div className="header-doodle-container">
                        <DoodleHeart style={{ position: 'relative', width: '32px', height: '32px', transform: 'rotate(-15deg)' }} />
                    </div>
                    <p className="support-tiny-note">
                        Free for students. Built independently. Kept alive with support. ♡
                    </p>
                </header>

                <section className="letter-section">
                    <h1>Hi, fellow aspirant.</h1>
                    <p>
                        OJEE-Tracker was built during my own JEE prep to make studying feel a little less unorganized. It helps track chapters, tasks, study sessions, and progress across Physics, Chemistry, and Maths.
                    </p>
                    <p>
                        It is free to use, and I hope to keep it that way. If it has helped you stay on track, a small contribution can help maintain cloud sync, fix bugs, and improve the project for more aspirants.
                    </p>
                    <div className="hand-drawn-divider">
                        <DoodleStar className="divider-doodle" style={{ width: '16px', height: '16px' }} />
                    </div>
                </section>

                <section className="donation-card-container" style={{ position: 'relative' }}>
                    <DoodleArrow style={{ position: 'absolute', top: '-30px', right: '10%', transform: 'scaleX(-1) rotate(20deg)' }} />

                    {/* Floating ambient hearts */}
                    <div className="floating-hearts" aria-hidden="true">
                        <span className="float-heart" style={{ left: '5%', animationDelay: '0s' }}>♡</span>
                        <span className="float-heart" style={{ left: '85%', animationDelay: '1.2s' }}>♡</span>
                        <span className="float-heart" style={{ left: '45%', animationDelay: '2.5s' }}>♡</span>
                        <span className="float-heart" style={{ left: '70%', animationDelay: '3.8s' }}>♡</span>
                    </div>

                    <div className="donation-card">
                        {/* Card header with decorative accent */}
                        <div className="donation-card-header">
                            <span className="donation-card-eyebrow">Choose what feels right</span>
                            <h2 className="donation-card-title">Even a small contribution means a lot.</h2>
                            <div className="donation-card-accent-line" aria-hidden="true" />
                        </div>

                        {/* Amount cards grid */}
                        <div className="amount-cards-grid">
                            {AMOUNTS.map(({ value, label, emoji }) => (
                                <button
                                    key={value}
                                    className={`amount-card ${selectedAmount === value ? 'selected' : ''}`}
                                    onClick={() => handleAmountSelect(value)}
                                >
                                    <span className="amount-card-emoji">{emoji}</span>
                                    <span className="amount-card-value">{value}</span>
                                    <span className="amount-card-label">{label}</span>
                                    {selectedAmount === value && (
                                        <span className="amount-card-check" aria-label="Selected">✓</span>
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Custom amount toggle */}
                        <button
                            className={`custom-toggle ${isCustom ? 'active' : ''}`}
                            onClick={handleCustomToggle}
                        >
                            <span className="custom-toggle-icon">✎</span>
                            <span>or enter your own amount</span>
                        </button>

                        {/* Custom amount input */}
                        {isCustom && (
                            <div className="custom-amount-reveal">
                                <div className="custom-input-row">
                                    <span className="currency-prefix">₹</span>
                                    <input
                                        type="number"
                                        className="handwritten-input custom-amount-input"
                                        placeholder="any amount"
                                        value={customAmount}
                                        onChange={e => setCustomAmount(e.target.value)}
                                        min="1"
                                        autoFocus
                                    />
                                </div>
                                <span className="support-tiny-note" style={{ marginTop: '0.25rem' }}>
                                    Whatever feels comfortable — no pressure at all.
                                </span>
                            </div>
                        )}

                        {/* Wavy divider */}
                        <div className="card-wavy-divider" aria-hidden="true">
                            <svg viewBox="0 0 400 12" preserveAspectRatio="none">
                                <path d="M0 6 Q 25 0, 50 6 T 100 6 T 150 6 T 200 6 T 250 6 T 300 6 T 350 6 T 400 6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                            </svg>
                        </div>

                        {/* Note input */}
                        <div className="note-input-wrapper">
                            <label>Leave a tiny note, if you'd like</label>
                            <div className="note-input-field-wrap">
                                <input
                                    type="text"
                                    className="handwritten-input"
                                    placeholder={'"This helped me stay on track. Thank you!"'}
                                    value={note}
                                    onChange={e => setNote(e.target.value)}
                                />
                                <span className="note-pencil-icon" aria-hidden="true">✏️</span>
                            </div>
                        </div>

                        {/* CTA Button */}
                        <button className="cta-button" onClick={handleSupportClick}>
                            <SparkleIcon />
                            <span>Support OJEE-Tracker</span>
                            <span className="cta-heart-beat">❤️</span>
                        </button>

                        {/* Trust badges row */}
                        <div className="trust-badges">
                            <span className="trust-badge">
                                <span className="trust-badge-icon">🔒</span>
                                Secure payment
                            </span>
                            <span className="trust-badge-dot">·</span>
                            <span className="trust-badge">
                                <span className="trust-badge-icon">👤</span>
                                No account needed
                            </span>
                            <span className="trust-badge-dot">·</span>
                            <span className="trust-badge">
                                <span className="trust-badge-icon">💚</span>
                                100% to the project
                            </span>
                        </div>

                        <p className="donation-disclaimer">
                            Contributions are voluntary and do not unlock paid features. OJEE-Tracker stays free for everyone.
                        </p>
                    </div>
                </section>

                <footer className="support-footer">
                    {/* Hand-drawn wave separator */}
                    <svg className="footer-wave" viewBox="0 0 400 20" preserveAspectRatio="none" aria-hidden="true">
                        <path d="M0 10 C 40 0, 60 20, 100 10 S 160 0, 200 10 S 260 20, 300 10 S 360 0, 400 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    <p className="footer-gratitude-title">With a lot of gratitude,</p>
                    <p className="footer-signature">— Naman, creator of OJEE-Tracker 🌸</p>
                    <div className="footer-hearts">
                        <DoodleHeart style={{ position: 'relative', width: '20px', height: '20px' }} />
                        <DoodleHeart style={{ position: 'relative', width: '20px', height: '20px' }} />
                        <DoodleHeart style={{ position: 'relative', width: '20px', height: '20px' }} />
                    </div>
                    <p className="support-tiny-note">
                        Made during JEE prep, with late-night debugging, caffeine, and a stubborn belief that preparation should feel less chaotic.
                    </p>
                    <a href="https://github.com/namankatiyar/ojee-tracker" target="_blank" rel="noopener noreferrer" className="github-link">
                        Want to see how it is built? Explore the project on GitHub.
                    </a>
                </footer>
            </main>
        </div>
    );
};
