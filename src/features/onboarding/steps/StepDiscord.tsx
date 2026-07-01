import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';

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

const DISCORD_INVITE_URL = 'https://discord.gg/6dKrbVQU8W';

interface StepDiscordProps {
  onJoin: () => void;
  onSkip: () => void;
  onBack: () => void;
}

export function StepDiscord({ onJoin, onSkip, onBack }: StepDiscordProps) {
  const handleJoin = () => {
    window.open(DISCORD_INVITE_URL, '_blank', 'noopener,noreferrer');
    onJoin();
  };

  return (
    <motion.div variants={stagger} initial="initial" animate="animate">
      <motion.h1 className="ob-step-heading" variants={fadeUp}>
        Join the community
      </motion.h1>
      <motion.p className="ob-step-subtext" variants={fadeUp}>
        Connect with other JEE aspirants, share strategies, and stay motivated
        together.
      </motion.p>
      <motion.div className="ob-discord-card" variants={fadeUp}>
        <h3 className="ob-discord-title">OJEE Tracker Discord</h3>
        <p className="ob-discord-desc">
          Get study tips, discuss problems, share your progress, and meet fellow
          aspirants preparing for JEE.
        </p>
        <button
          className="ob-discord-btn"
          onClick={handleJoin}
          type="button"
        >
          Join Discord server
        </button>
      </motion.div>
      <motion.div className="ob-nav-row" variants={fadeUp}>
        <button className="ob-back-btn" onClick={onBack} type="button">
          <ArrowLeft size={16} />
          Back
        </button>
        <button className="primary-btn ob-continue-btn" onClick={onSkip} type="button">
          Skip for now
          <ArrowRight size={16} />
        </button>
      </motion.div>
    </motion.div>
  );
}
