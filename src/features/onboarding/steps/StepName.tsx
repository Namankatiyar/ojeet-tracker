import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

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

interface StepNameProps {
  value: string;
  onChange: (value: string) => void;
  onNext: () => void;
}

export function StepName({ value, onChange, onNext }: StepNameProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && value.trim()) {
      onNext();
    }
  };

  return (
    <motion.div variants={stagger} initial="initial" animate="animate">
      <motion.h1 className="ob-step-heading" variants={fadeUp}>
        What should we call you?
      </motion.h1>
      <motion.p className="ob-step-subtext" variants={fadeUp}>
        This name appears on your progress card and profile.
      </motion.p>
      <motion.div className="ob-input-group" variants={fadeUp}>
        <label htmlFor="ob-name-input" className="ob-label">
          Your name
        </label>
        <input
          ref={inputRef}
          id="ob-name-input"
          type="text"
          className="ob-input"
          placeholder="Enter your name"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          autoComplete="given-name"
        />
      </motion.div>
      <motion.div className="ob-nav-row end-only" variants={fadeUp}>
        <button
          className="primary-btn ob-continue-btn"
          disabled={!value.trim()}
          onClick={onNext}
          type="button"
        >
          Continue
          <ArrowRight size={16} />
        </button>
      </motion.div>
    </motion.div>
  );
}
