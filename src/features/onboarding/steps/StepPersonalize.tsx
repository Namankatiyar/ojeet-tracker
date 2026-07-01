import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import blueBotImg from '/blueBot.png';
import musicBotImg from '/musicBot.png';
import { OnboardingToggle } from '../OnboardingToggle';

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

interface StepPersonalizeProps {
  aiEnabled: boolean;
  musicEnabled: boolean;
  onAIChange: (enabled: boolean) => void;
  onMusicChange: (enabled: boolean) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepPersonalize({
  aiEnabled,
  musicEnabled,
  onAIChange,
  onMusicChange,
  onNext,
  onBack,
}: StepPersonalizeProps) {
  return (
    <motion.div variants={stagger} initial="initial" animate="animate">
      <motion.h1 className="ob-step-heading" variants={fadeUp}>
        Personalize your workspace
      </motion.h1>
      <motion.p className="ob-step-subtext" variants={fadeUp}>
        Enable or disable these features based on your study style. You can
        change this anytime in settings.
      </motion.p>
      <motion.div className="ob-toggles-list" variants={fadeUp}>
        <div className="ob-toggle-row">
          <img src={blueBotImg} alt="Blue AI bot" className="ob-toggle-icon" width={28} height={28} />
          <div className="ob-toggle-info">
            <p className="ob-toggle-label">Blue AI assistant</p>
            <p className="ob-toggle-desc">
              An AI study companion that helps with doubts, motivation, and study
              planning.
            </p>
          </div>
          <OnboardingToggle
            id="ob-ai-toggle"
            checked={aiEnabled}
            onChange={onAIChange}
          />
        </div>
        <div className="ob-toggle-row">
          <img src={musicBotImg} alt="Music player" className="ob-toggle-icon" width={28} height={28} />
          <div className="ob-toggle-info">
            <p className="ob-toggle-label">Music player</p>
            <p className="ob-toggle-desc">
              Built-in ambient music and lo-fi player to help you focus during
              study sessions.
            </p>
          </div>
          <OnboardingToggle
            id="ob-music-toggle"
            checked={musicEnabled}
            onChange={onMusicChange}
          />
        </div>
      </motion.div>
      <motion.div className="ob-nav-row" variants={fadeUp}>
        <button className="ob-back-btn" onClick={onBack} type="button">
          <ArrowLeft size={16} />
          Back
        </button>
        <button className="primary-btn ob-continue-btn" onClick={onNext} type="button">
          Continue
          <ArrowRight size={16} />
        </button>
      </motion.div>
    </motion.div>
  );
}
