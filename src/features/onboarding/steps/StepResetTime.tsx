import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Clock, ChevronUp, ChevronDown } from 'lucide-react';

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

const PRESET_TIMES = [
  { label: '12:00 AM', value: '00:00', desc: 'Midnight' },
  { label: '3:00 AM', value: '03:00', desc: 'Late night' },
  { label: '4:00 AM', value: '04:00', desc: 'Early morning' },
  { label: '6:00 AM', value: '06:00', desc: 'Morning' },
];

/** Convert "HH:MM" to { h12, minutes, period } */
function parseTime(val: string) {
  const [hStr, mStr] = val.split(':');
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const period: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return { h, m, period };
}

/** Convert { h12, minutes, period } back to "HH:MM" */
function formatTime(h: number, m: number, period: 'AM' | 'PM'): string {
  let h24 = h % 12;
  if (period === 'PM') h24 += 12;
  return `${String(h24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Display string e.g. "4:00 AM" */
function displayTime(val: string): string {
  const { h, m, period } = parseTime(val);
  return `${h}:${String(m).padStart(2, '0')} ${period}`;
}

interface StepResetTimeProps {
  value: string;
  onChange: (value: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepResetTime({ value, onChange, onNext, onBack }: StepResetTimeProps) {
  const firstBtnRef = useRef<HTMLButtonElement>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Picker state initialised from `value`
  const parsed = parseTime(value);
  const [pickerH, setPickerH] = useState(parsed.h);
  const [pickerM, setPickerM] = useState(parsed.m);
  const [pickerPeriod, setPickerPeriod] = useState<'AM' | 'PM'>(parsed.period);

  // Sync picker when external value changes (e.g. preset selected)
  useEffect(() => {
    const p = parseTime(value);
    setPickerH(p.h);
    setPickerM(p.m);
    setPickerPeriod(p.period);
  }, [value]);

  useEffect(() => {
    firstBtnRef.current?.focus();
  }, []);

  // Close picker on outside click
  useEffect(() => {
    if (!pickerOpen) return;
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [pickerOpen]);

  const applyPicker = () => {
    onChange(formatTime(pickerH, pickerM, pickerPeriod));
    setPickerOpen(false);
  };

  const isCustomActive = !PRESET_TIMES.some((p) => p.value === value);

  return (
    <motion.div variants={stagger} initial="initial" animate="animate">
      <motion.h1 className="ob-step-heading" variants={fadeUp}>
        When does your day reset?
      </motion.h1>
      <motion.p className="ob-step-subtext" variants={fadeUp}>
        Your daily streak and study stats reset at this time. Most students use
        midnight or early morning.
      </motion.p>

      {/* Preset tiles */}
      <motion.div className="ob-time-grid" variants={fadeUp}>
        {PRESET_TIMES.map((preset, i) => (
          <button
            key={preset.value}
            ref={i === 0 ? firstBtnRef : undefined}
            className={`ob-time-tile ${value === preset.value ? 'active' : ''}`}
            onClick={() => {
              onChange(preset.value);
              setPickerOpen(false);
            }}
            type="button"
          >
            <span className="ob-time-tile-value">{preset.label}</span>
            <span className="ob-time-tile-desc">{preset.desc}</span>
          </button>
        ))}
      </motion.div>

      {/* Custom time row */}
      <motion.div className="ob-custom-row" variants={fadeUp} ref={pickerRef}>
        <button
          type="button"
          className={`ob-custom-trigger ${isCustomActive ? 'active' : ''}`}
          onClick={() => setPickerOpen((o) => !o)}
          aria-expanded={pickerOpen}
          aria-label="Set custom reset time"
        >
          <Clock size={16} className="ob-custom-trigger-icon" />
          <span className="ob-custom-trigger-label">Custom time</span>
          <span className={`ob-custom-trigger-value ${isCustomActive ? 'is-custom' : ''}`}>
            {isCustomActive ? displayTime(value) : 'Set time'}
          </span>
          <ChevronDown
            size={14}
            className={`ob-custom-chevron ${pickerOpen ? 'open' : ''}`}
          />
        </button>

        {/* Inline time picker */}
        <AnimatePresence>
          {pickerOpen && (
            <motion.div
              className="ob-time-picker"
              initial={{ opacity: 0, y: -8, scaleY: 0.95 }}
              animate={{ opacity: 1, y: 0, scaleY: 1 }}
              exit={{ opacity: 0, y: -8, scaleY: 0.95 }}
              transition={{ type: 'spring', duration: 0.3, bounce: 0 }}
              style={{ transformOrigin: 'top center' }}
            >
              <div className="ob-tp-label">Select time</div>
              <div className="ob-tp-columns">
                {/* Hour column */}
                <div className="ob-tp-col">
                  <button
                    type="button"
                    className="ob-tp-arrow"
                    onClick={() => setPickerH((h) => (h === 1 ? 12 : h - 1))}
                    aria-label="Increase hour"
                  >
                    <ChevronUp size={16} />
                  </button>
                  <div className="ob-tp-value">{String(pickerH).padStart(2, '0')}</div>
                  <button
                    type="button"
                    className="ob-tp-arrow"
                    onClick={() => setPickerH((h) => (h === 12 ? 1 : h + 1))}
                    aria-label="Decrease hour"
                  >
                    <ChevronDown size={16} />
                  </button>
                </div>

                <div className="ob-tp-colon">:</div>

                {/* Minute column */}
                <div className="ob-tp-col">
                  <button
                    type="button"
                    className="ob-tp-arrow"
                    onClick={() => setPickerM((m) => (m === 0 ? 55 : m - 5))}
                    aria-label="Increase minutes"
                  >
                    <ChevronUp size={16} />
                  </button>
                  <div className="ob-tp-value">{String(pickerM).padStart(2, '0')}</div>
                  <button
                    type="button"
                    className="ob-tp-arrow"
                    onClick={() => setPickerM((m) => (m >= 55 ? 0 : m + 5))}
                    aria-label="Decrease minutes"
                  >
                    <ChevronDown size={16} />
                  </button>
                </div>

                {/* AM / PM column */}
                <div className="ob-tp-period-col">
                  <button
                    type="button"
                    className={`ob-tp-period-btn ${pickerPeriod === 'AM' ? 'active' : ''}`}
                    onClick={() => setPickerPeriod('AM')}
                  >
                    AM
                  </button>
                  <button
                    type="button"
                    className={`ob-tp-period-btn ${pickerPeriod === 'PM' ? 'active' : ''}`}
                    onClick={() => setPickerPeriod('PM')}
                  >
                    PM
                  </button>
                </div>
              </div>

              <button type="button" className="ob-tp-confirm" onClick={applyPicker}>
                Set time
              </button>
            </motion.div>
          )}
        </AnimatePresence>
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
