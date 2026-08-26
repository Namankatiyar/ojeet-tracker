import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { triggerMassiveConfetti } from '../../../shared/utils/confetti';
import { useTheme } from '../../../core/context/ThemeContext';
import { useRemoteAuth } from '../../../core/context/RemoteAuthContext';
import { AuthModal } from '../../../shared/components/ui/AuthModal';

// --- Doodles & Icons ---
const DoodleHeart = ({
  className = '',
  style = {},
}: {
  className?: string;
  style?: React.CSSProperties;
}) => (
  <svg
    className={`doodle-overlay red ${className}`}
    style={style}
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="currentColor"
    stroke="none"
    aria-hidden="true"
  >
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
  </svg>
);

const DoodleStar = ({
  className = '',
  style = {},
}: {
  className?: string;
  style?: React.CSSProperties;
}) => (
  <svg
    className={`doodle-overlay ${className}`}
    style={style}
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const DoodleArrow = ({
  className = '',
  style = {},
}: {
  className?: string;
  style?: React.CSSProperties;
}) => (
  <svg
    className={`doodle-overlay red ${className}`}
    style={style}
    width="40"
    height="40"
    viewBox="0 0 60 60"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M10 10 Q 30 5, 50 30 M 40 30 L 50 30 L 45 20" />
  </svg>
);

// Sparkle icon for the CTA button
const SparkleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 0L14.59 8.41L23 11L14.59 13.59L12 22L9.41 13.59L1 11L9.41 8.41L12 0Z" />
  </svg>
);

// Share / Megaphone icon for the secondary button
const ShareIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </svg>
);

const AMOUNTS = [
  { value: '₹49', emoji: '☕' },
  { value: '₹99', emoji: '🍪' },
  { value: '₹199', emoji: '🚀' },
];

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export const SupportPage: React.FC = () => {
  const { setSupportOverride } = useTheme();
  const { user } = useRemoteAuth();
  const [searchParams] = useSearchParams();

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
  const [showSpreadModal, setShowSpreadModal] = useState(false);
  const [showThankYouModal, setShowThankYouModal] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Auth & Prefill state
  const [prefillName, setPrefillName] = useState('');
  const [prefillEmail, setPrefillEmail] = useState('');

  // Parse query parameters and prefill states on mount
  useEffect(() => {
    const urlAmount = searchParams.get('amount');
    const urlNote = searchParams.get('note');

    // 1. Amount prefilling
    if (urlAmount) {
      const numericAmt = parseInt(urlAmount, 10);
      if (!isNaN(numericAmt) && numericAmt > 0) {
        const matchingPredefined = AMOUNTS.find(
          (a) => parseInt(a.value.replace('₹', ''), 10) === numericAmt
        );
        if (matchingPredefined) {
          setSelectedAmount(matchingPredefined.value);
          setIsCustom(false);
        } else {
          setSelectedAmount(null);
          setIsCustom(true);
          setCustomAmount(numericAmt.toString());
        }
      }
    }

    // 2. Personal info prefilling from user metadata
    setPrefillEmail(user?.email || '');
    setPrefillName(user?.user_metadata?.full_name || user?.user_metadata?.name || '');

    // 3. Note prefilling
    if (urlNote) {
      setNote(urlNote);
    }
  }, [searchParams, user]);

  const handleAmountSelect = (value: string) => {
    setSelectedAmount(value);
    setIsCustom(false);
  };

  const handleCustomToggle = () => {
    setIsCustom(true);
    setSelectedAmount(null);
  };

  const handleSupportClick = async () => {
    let amountInRupees = 0;
    if (isCustom) {
      amountInRupees = parseInt(customAmount, 10);
    } else if (selectedAmount) {
      amountInRupees = parseInt(selectedAmount.replace('₹', ''), 10);
    }

    if (!amountInRupees || amountInRupees < 1) {
      setShowValidationModal(true);
      return;
    }

    const amountInPaise = amountInRupees * 100;

    setIsProcessing(true);
    try {
      const isScriptLoaded = await loadRazorpayScript();
      if (!isScriptLoaded) {
        alert('Failed to load Razorpay SDK. Please check your connection.');
        return;
      }

      // 1. Create order
      const response = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amountInPaise }),
      });

      const order = await response.json();

      if (!response.ok) {
        throw new Error(order.error || 'Failed to create order');
      }

      // 2. Open Razorpay Checkout
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: 'OJEE-Tracker',
        description: 'Support for OJEE-Tracker',
        order_id: order.id,
        prefill: {
          name: prefillName || undefined,
          email: prefillEmail || undefined,
        },
        notes: {
          user_note: note,
        },
        theme: {
          color: '#e63946',
        },
        handler: async function (response: any) {
          try {
            const verifyRes = await fetch('/api/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              triggerMassiveConfetti();
              setShowThankYouModal(true);
              setSelectedAmount(null);
              setCustomAmount('');
              setNote('');
            } else {
              alert('Payment verification failed.');
            }
          } catch (err) {
            console.error('Verification error:', err);
            alert('Payment verified but failed to confirm with server.');
          }
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        alert('Payment failed: ' + response.error.description);
      });
      rzp.open();
    } catch (error: any) {
      console.error('Checkout error:', error);
      alert('Error initiating checkout: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="support-page-container">
      <main className="support-content">
        {/* Doodles scattered around */}
        <DoodleStar style={{ top: '5%', left: '-5%', transform: 'rotate(15deg)' }} />
        <DoodleStar
          style={{ top: '25%', right: '-8%', transform: 'rotate(-20deg)', width: '15px' }}
        />
        <DoodleStar style={{ bottom: '15%', left: '-2%', transform: 'rotate(45deg)' }} />

        <header className="support-header">
          <div className="header-doodle-container">
            <DoodleHeart
              style={{
                position: 'relative',
                width: '32px',
                height: '32px',
                transform: 'rotate(-15deg)',
              }}
            />
          </div>
          <p className="support-tiny-note">
            Free for students. Built independently. Kept alive with support. ♡
          </p>
        </header>

        <section className="letter-section">
          <h1>Hi, fellow aspirant.</h1>
          <p>
            OJEET Tracker was built during my own prep to make studying feel a little less
            unorganized. It helps track chapters, tasks, study sessions, and progress across
            Physics, Chemistry, Maths, and Biology for JEE & NEET.
          </p>
          <p>
            It is free to use, and I hope to keep it that way. If it has helped you stay on track, a
            small contribution can help maintain cloud sync, fix bugs, and improve the project for
            more aspirants.
          </p>
          <div className="hand-drawn-divider">
            <DoodleStar className="divider-doodle" style={{ width: '16px', height: '16px' }} />
          </div>
        </section>

        <section className="donation-card-container" style={{ position: 'relative' }}>
          <DoodleArrow
            style={{
              position: 'absolute',
              top: '-30px',
              right: '10%',
              transform: 'scaleX(-1) rotate(20deg)',
            }}
          />

          {/* Floating ambient hearts */}
          <div className="floating-hearts" aria-hidden="true">
            <span className="float-heart" style={{ left: '5%', animationDelay: '0s' }}>
              ♡
            </span>
            <span className="float-heart" style={{ left: '85%', animationDelay: '1.2s' }}>
              ♡
            </span>
            <span className="float-heart" style={{ left: '45%', animationDelay: '2.5s' }}>
              ♡
            </span>
            <span className="float-heart" style={{ left: '70%', animationDelay: '3.8s' }}>
              ♡
            </span>
          </div>

          <div className="donation-card">
            {/* Card header with decorative accent */}
            <div className="donation-card-header">
              <span className="donation-card-eyebrow">
                {user ? 'Choose what feels right' : 'Sign in required'}
              </span>
              <h2 className="donation-card-title">
                {user ? 'Even a small contribution means a lot.' : 'Join to support OJEE-Tracker'}
              </h2>
              <div className="donation-card-accent-line" aria-hidden="true" />
            </div>

            {!user ? (
              <div
                className="support-login-prompt"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '1.25rem',
                  maxWidth: '400px',
                  marginTop: '1rem',
                }}
              >
                <p style={{ fontSize: '1rem', color: 'var(--pencil-gray)', lineHeight: '1.5' }}>
                  To make a contribution, please sign in first. This helps us secure the checkout
                  process and pre-fill your receipt details.
                </p>
                <button
                  type="button"
                  className="primary-btn"
                  onClick={() => setIsAuthModalOpen(true)}
                >
                  Sign In
                </button>
              </div>
            ) : (
              <>
                {/* Amount cards grid */}
                <div className="amount-cards-grid">
                  {AMOUNTS.map(({ value, emoji }) => (
                    <button
                      key={value}
                      className={`amount-card ${selectedAmount === value ? 'selected' : ''}`}
                      onClick={() => handleAmountSelect(value)}
                    >
                      <span className="amount-card-emoji">{emoji}</span>
                      <span className="amount-card-value">{value}</span>
                      {selectedAmount === value && (
                        <span className="amount-card-check" aria-label="Selected">
                          ✓
                        </span>
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
                        onChange={(e) => setCustomAmount(e.target.value)}
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
                    <path
                      d="M0 6 Q 25 0, 50 6 T 100 6 T 150 6 T 200 6 T 250 6 T 300 6 T 350 6 T 400 6"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
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
                      onChange={(e) => setNote(e.target.value)}
                    />
                    <span className="note-pencil-icon" aria-hidden="true">
                      ✏️
                    </span>
                  </div>
                </div>

                {/* CTA Buttons */}
                <div className="cta-buttons-group">
                  <button
                    className="cta-button"
                    onClick={handleSupportClick}
                    disabled={isProcessing}
                  >
                    <SparkleIcon />
                    <span>{isProcessing ? 'Processing...' : 'Support OJEE-Tracker'}</span>
                    {!isProcessing && <span className="cta-heart-beat">❤️</span>}
                  </button>
                </div>
              </>
            )}

            {/* Secondary Button - Always available */}
            {!user && (
              <div
                className="card-wavy-divider"
                aria-hidden="true"
                style={{ marginTop: '0.5rem', marginBottom: '0.5rem' }}
              >
                <svg viewBox="0 0 400 12" preserveAspectRatio="none">
                  <path
                    d="M0 6 Q 25 0, 50 6 T 100 6 T 150 6 T 200 6 T 250 6 T 300 6 T 350 6 T 400 6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            )}
            <button
              className="cta-secondary-button"
              onClick={() => setShowSpreadModal(true)}
              style={user ? { marginTop: '-0.5rem' } : {}}
            >
              <ShareIcon />
              <span>I can't support financially</span>
            </button>

            <p
              className="support-tiny-note"
              style={{
                textAlign: 'center',
                marginTop: '1rem',
                marginBottom: '-0.5rem',
                opacity: 0.75,
              }}
            >
              Note: The secure checkout gateway may take a few seconds to initialize.
            </p>

            {/* Razorpay Branding Badge */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                marginTop: '1.25rem',
                marginBottom: '0.25rem',
                opacity: 0.9,
                transition: 'opacity 0.2s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.9')}
            >
              <a
                href="https://razorpay.com/"
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'inline-block' }}
              >
                <img
                  referrerPolicy="origin"
                  src="https://badges.razorpay.com/badge-light.png"
                  style={{ height: '45px', width: '113px', display: 'block' }}
                  alt="Razorpay | Payment Gateway | Neobank"
                />
              </a>
            </div>

            <p className="donation-disclaimer">
              Contributions are voluntary and do not unlock paid features. OJEE-Tracker stays free
              for everyone.
            </p>
          </div>
        </section>

        <footer className="support-footer">
          {/* Hand-drawn wave separator */}
          <svg
            className="footer-wave"
            viewBox="0 0 400 20"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              d="M0 10 C 40 0, 60 20, 100 10 S 160 0, 200 10 S 260 20, 300 10 S 360 0, 400 10"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          <p className="footer-gratitude-title">With a lot of gratitude,</p>
          <p className="footer-signature">— Naman, creator of OJEE-Tracker 🌸</p>
          <div className="footer-hearts">
            <DoodleHeart style={{ position: 'relative', width: '20px', height: '20px' }} />
            <DoodleHeart style={{ position: 'relative', width: '20px', height: '20px' }} />
            <DoodleHeart style={{ position: 'relative', width: '20px', height: '20px' }} />
          </div>
          <p className="support-tiny-note">
            Made during JEE prep, with late-night debugging, caffeine, and a stubborn belief that
            preparation should feel less chaotic.
          </p>
          <a
            href="https://github.com/namankatiyar/ojee-tracker"
            target="_blank"
            rel="noopener noreferrer"
            className="github-link"
          >
            Want to see how it is built? Explore the project on GitHub.
          </a>
        </footer>
      </main>

      {/* Spread Awareness Modal */}
      {showSpreadModal && (
        <div className="spread-modal-overlay" onClick={() => setShowSpreadModal(false)}>
          <div className="spread-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="spread-modal-close"
              onClick={() => setShowSpreadModal(false)}
              aria-label="Close"
            >
              ✕
            </button>

            <div className="spread-modal-emoji">🤗</div>

            <h2 className="spread-modal-title">You're already amazing!</h2>

            <div className="spread-modal-body">
              <p>
                Hey, don't worry at all! OJEE-Tracker is <strong>free for everyone</strong> and
                it'll stay that way. You don't need to spend a single rupee.
              </p>
              <p>If you'd still like to help, here's the best thing you can do:</p>

              <div className="spread-modal-action-card">
                <span className="spread-modal-action-emoji">📢</span>
                <div>
                  <strong>Spread the word!</strong>
                  <p>
                    Tell your friends, classmates, or study groups about OJEET Tracker. Share it on
                    Reddit, WhatsApp, Instagram, or just mention it to someone who's preparing for
                    JEE or NEET.
                  </p>
                </div>
              </div>

              <div className="spread-modal-action-card">
                <span className="spread-modal-action-emoji">⭐</span>
                <div>
                  <strong>Star us on GitHub</strong>
                  <p>A star on the repo helps more students discover this tool.</p>
                </div>
              </div>

              <div className="spread-modal-action-card">
                <span className="spread-modal-action-emoji">💬</span>
                <div>
                  <strong>Give feedback</strong>
                  <p>
                    Report bugs, suggest features, or just tell us what you liked. Every bit of
                    feedback makes OJEE-Tracker better for everyone.
                  </p>
                </div>
              </div>
            </div>

            <div className="spread-modal-footer">
              <p>
                Your support doesn't have to be financial.
                <br />
                Every student who benefits from this tool is support enough. ♡
              </p>
            </div>

            <button className="spread-modal-got-it" onClick={() => setShowSpreadModal(false)}>
              Got it, thank you! 🌟
            </button>
          </div>
        </div>
      )}

      {/* Thank You Modal */}
      {showThankYouModal && (
        <div className="spread-modal-overlay" onClick={() => setShowThankYouModal(false)}>
          <div className="spread-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="spread-modal-close"
              onClick={() => setShowThankYouModal(false)}
              aria-label="Close"
            >
              ✕
            </button>

            <div className="spread-modal-emoji">🎉</div>

            <h2 className="spread-modal-title">Thank you so much! ❤️</h2>

            <div className="spread-modal-body">
              <p>
                Your support means the world to me. It directly helps in keeping OJEET Tracker alive,
                maintaining the servers, and improving the experience for every aspirant.
              </p>
              <p>
                Wishing you the absolute best for your JEE & NEET preparation! Keep tracking, keep
                studying, and you'll do great.
              </p>
            </div>

            <div className="spread-modal-footer">
              <p>
                With immense gratitude,
                <br />
                Naman 🌸
              </p>
            </div>

            <button className="spread-modal-got-it" onClick={() => setShowThankYouModal(false)}>
              Continue tracking 🚀
            </button>
          </div>
        </div>
      )}
      {/* Validation Modal */}
      {showValidationModal && (
        <div className="spread-modal-overlay" onClick={() => setShowValidationModal(false)}>
          <div className="spread-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="spread-modal-close"
              onClick={() => setShowValidationModal(false)}
              aria-label="Close"
            >
              ✕
            </button>

            <div className="spread-modal-emoji">🤔</div>

            <h2 className="spread-modal-title">Oops! Missing Amount</h2>

            <div className="spread-modal-body" style={{ textAlign: 'center' }}>
              <p>Please select a valid amount or enter a custom amount before proceeding.</p>
            </div>

            <button className="spread-modal-got-it" onClick={() => setShowValidationModal(false)}>
              Got it
            </button>
          </div>
        </div>
      )}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        title="Sign In to Support"
        subtitle="Sign in to secure the contribution process and save your receipt."
      />
    </div>
  );
};
