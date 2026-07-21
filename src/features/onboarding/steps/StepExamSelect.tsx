import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Atom, Dna } from 'lucide-react';

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

const JEE_EMOJIS = ['⚙️', '🛠️', '📐', '💻', '🚀', '✏️', '🧪', '🧮'];
const NEET_EMOJIS = ['🧬', '🔬', '🩺', '🏥', '💊', '🌡️', '🌱', '🩹'];

interface ShowerEmoji {
  id: number;
  char: string;
  left: number; // percentage (0 - 100)
  size: number; // px (20 - 36)
  duration: number; // seconds
  delay: number; // seconds
}

interface StepExamSelectProps {
  value: 'jee' | 'neet';
  onChange: (value: 'jee' | 'neet') => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepExamSelect({ value, onChange, onNext, onBack }: StepExamSelectProps) {
  const [emojis, setEmojis] = useState<ShowerEmoji[]>([]);

  const handleSelect = (mode: 'jee' | 'neet') => {
    onChange(mode);

    // Trigger emoji shower inside the step wrapper
    const list = mode === 'jee' ? JEE_EMOJIS : NEET_EMOJIS;
    const newEmojis: ShowerEmoji[] = Array.from({ length: 24 }).map((_, i) => ({
      id: Date.now() + i,
      char: list[Math.floor(Math.random() * list.length)],
      left: Math.random() * 90 + 5, // 5% to 95%
      size: Math.random() * 16 + 20, // 20px to 36px
      duration: Math.random() * 1.0 + 1.2, // 1.2s to 2.2s
      delay: Math.random() * 0.3, // staggered start
    }));
    setEmojis(newEmojis);
  };

  return (
    <motion.div variants={stagger} initial="initial" animate="animate" style={{ position: 'relative' }}>
      {/* Emoji Shower overlay - absolute positioned & constrained within step container */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          overflow: 'hidden',
          zIndex: 50,
        }}
      >
        <AnimatePresence>
          {emojis.map((emoji) => (
            <motion.span
              key={emoji.id}
              initial={{ y: '350px', x: '0px', opacity: 0, scale: 0.5 }}
              animate={{
                y: '-80px',
                x: `${Math.sin(emoji.id) * 35}px`, // subtle wave motion
                opacity: [0, 1, 1, 0],
                scale: [0.5, 1.2, 1.2, 0.8],
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: emoji.duration,
                delay: emoji.delay,
                ease: 'easeOut',
              }}
              style={{
                position: 'absolute',
                left: `${emoji.left}%`,
                fontSize: `${emoji.size}px`,
                lineHeight: 1,
              }}
            >
              {emoji.char}
            </motion.span>
          ))}
        </AnimatePresence>
      </div>

      <motion.h1 className="ob-step-heading" variants={fadeUp}>
        Choose your path
      </motion.h1>
      <motion.p className="ob-step-subtext" variants={fadeUp}>
        Select the exam track you are preparing for. This updates your subjects, syllabus tracker, and prep metrics.
      </motion.p>

      {/* Grid of exam path choices */}
      <motion.div className="ob-time-grid" variants={fadeUp} style={{ marginBottom: 'var(--space-6)' }}>
        <button
          className={`ob-time-tile ${value === 'jee' ? 'active' : ''}`}
          onClick={() => handleSelect('jee')}
          type="button"
          style={{ minHeight: '130px', width: '100%', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <Atom size={20} className={value === 'jee' ? 'text-physics' : ''} />
            <span className="ob-time-tile-value">JEE</span>
          </div>
          <span className="ob-time-tile-desc">Engineering Path</span>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
            Physics • Chemistry • Maths
          </span>
        </button>

        <button
          className={`ob-time-tile ${value === 'neet' ? 'active' : ''}`}
          onClick={() => handleSelect('neet')}
          type="button"
          style={{ minHeight: '130px', width: '100%', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <Dna size={20} className={value === 'neet' ? 'text-chemistry' : ''} />
            <span className="ob-time-tile-value">NEET</span>
          </div>
          <span className="ob-time-tile-desc">Medical Path</span>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
            Physics • Chemistry • Biology
          </span>
        </button>
      </motion.div>

      {/* Navigation */}
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
