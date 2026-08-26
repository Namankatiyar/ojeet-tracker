import { motion } from 'framer-motion';
import { ArrowRight, Check } from 'lucide-react';
import { useRemoteAuth } from '../../../core/context/RemoteAuthContext';
import { AuthForm } from '../../../shared/components/ui/AuthForm';

const stagger = {
  animate: { transition: { staggerChildren: 0.06 } },
};

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, duration: 0.6, bounce: 0 },
  },
};

interface StepAuthProps {
  onOffline: () => void;
  onNext: () => void;
  onPendingConfirmationChange?: (pending: boolean) => void;
}

export function StepAuth({
  onOffline,
  onNext,
  onPendingConfirmationChange,
}: StepAuthProps) {
  const { user } = useRemoteAuth();

  if (user) {
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
            <span className="ob-signed-in-email">{user.email}</span>
          </span>
        </motion.div>
        <motion.div className="ob-nav-row end-only" variants={fadeUp}>
          <button className="primary-btn ob-continue-btn" onClick={onNext} type="button">
            Continue
            <ArrowRight size={16} />
          </button>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div variants={stagger} initial="initial" animate="animate">
      <motion.h1 className="ob-step-heading" variants={fadeUp}>
        Sign in
      </motion.h1>
      <motion.p className="ob-step-subtext" variants={fadeUp}>
        Sync your progress across devices, or continue offline.
      </motion.p>
      <motion.div variants={fadeUp}>
        <AuthForm
          onOffline={onOffline}
          onSuccess={onNext}
          onPendingConfirmationChange={onPendingConfirmationChange}
          showOfflineOption={true}
        />
      </motion.div>
    </motion.div>
  );
}
