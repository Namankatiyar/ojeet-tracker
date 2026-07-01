import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Check, Loader, WifiOff } from 'lucide-react';

const stagger = {
  animate: { transition: { staggerChildren: 0.06 } },
};

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, duration: 0.5, bounce: 0 },
  },
};

interface StepAuthProps {
  isSignedIn: boolean;
  userEmail?: string;
  onGoogle: () => void;
  onOffline: () => void;
  onBack: () => void;
}

export function StepAuth({
  isSignedIn,
  userEmail,
  onGoogle,
  onOffline,
  onBack,
}: StepAuthProps) {
  const [loading, setLoading] = useState(false);

  const handleGoogle = () => {
    setLoading(true);
    onGoogle();
  };

  if (isSignedIn) {
    return (
      <motion.div variants={stagger} initial="initial" animate="animate">
        <motion.h1 className="ob-step-heading" variants={fadeUp}>
          You're all set
        </motion.h1>
        <motion.p className="ob-step-subtext" variants={fadeUp}>
          Your progress will sync across devices automatically.
        </motion.p>
        <motion.div className="ob-signed-in-badge" variants={fadeUp}>
          <Check size={18} className="ob-signed-in-icon" />
          <span>
            Signed in as{' '}
            <span className="ob-signed-in-email">{userEmail}</span>
          </span>
        </motion.div>
        <motion.div className="ob-nav-row" variants={fadeUp}>
          <button
            className="ob-back-btn"
            onClick={onBack}
            type="button"
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <button className="primary-btn ob-continue-btn" onClick={onOffline} type="button">
            Enter workspace
          </button>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div variants={stagger} initial="initial" animate="animate">
      <motion.h1 className="ob-step-heading" variants={fadeUp}>
        One last thing
      </motion.h1>
      <motion.p className="ob-step-subtext" variants={fadeUp}>
        Sign in to sync your progress across devices, or continue offline with
        local storage only.
      </motion.p>
      <motion.div className="ob-auth-options" variants={fadeUp}>
        <button
          className="ob-auth-btn ob-google-btn"
          onClick={handleGoogle}
          disabled={loading}
          type="button"
        >
          {loading ? (
            <Loader size={18} className="spin-icon" />
          ) : (
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <path
                d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
                fill="#4285F4"
              />
              <path
                d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
                fill="#34A853"
              />
              <path
                d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
                fill="#FBBC05"
              />
              <path
                d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 2.58 9 3.58z"
                fill="#EA4335"
              />
            </svg>
          )}
          Continue with Google
        </button>
        <div className="ob-auth-divider">or</div>
        <button
          className="ob-auth-btn ob-offline-btn"
          onClick={onOffline}
          disabled={loading}
          type="button"
        >
          <WifiOff size={18} />
          Continue offline
        </button>
      </motion.div>
      <motion.div className="ob-nav-row" variants={fadeUp}>
        <button
          className="ob-back-btn"
          onClick={onBack}
          type="button"
          disabled={loading}
        >
          <ArrowLeft size={16} />
          Back
        </button>
      </motion.div>
    </motion.div>
  );
}
