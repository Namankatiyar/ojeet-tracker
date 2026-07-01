import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTheme, Theme } from '../../../core/context/ThemeContext';
import { Sun, Moon, Layers, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function ThemeOnboardingModal() {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<Theme>(theme);

  useEffect(() => {
    // Check if user has already completed the theme onboarding
    const onboarded = localStorage.getItem('jee-tracker-theme-onboarded');
    if (onboarded !== 'true') {
      setIsOpen(true);
      setSelectedTheme(theme);
    }
  }, [theme]);

  // Render handled by AnimatePresence

  const handleSelect = (mode: Theme) => {
    setSelectedTheme(mode);
    setTheme(mode); // Preview the theme immediately in the background
  };

  const handleConfirm = () => {
    localStorage.setItem('jee-tracker-theme-onboarded', 'true');
    setIsOpen(false);
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="modal-overlay onboarding-overlay motion-animated"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <motion.div
            className="modal-content onboarding-modal glass-panel motion-animated"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
          >
        <div className="onboarding-header">
          <h2 className="onboarding-title">Configure your study workspace</h2>
          <p className="onboarding-subtitle">
            Choose a visual style to set your focus environment. You can adjust this or customize accents anytime in settings.
          </p>
        </div>

        <div className="theme-options-grid">
          {/* Light Theme Card */}
          <div
            className={`theme-option-card light-card ${selectedTheme === 'light' ? 'active' : ''}`}
            onClick={() => handleSelect('light')}
          >
            <div className="theme-card-preview-container light-preview">
              <div className="mock-window">
                <div className="mock-header">
                  <div className="mock-dot" />
                  <div className="mock-dot" />
                  <div className="mock-dot" />
                </div>
                <div className="mock-body">
                  <div className="mock-sidebar" />
                  <div className="mock-content-area">
                    <div className="mock-card">
                      <div className="mock-bar" />
                      <div className="mock-bar short" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="theme-card-info">
              <div className="theme-card-title-row">
                <Sun className="theme-icon" size={16} />
                <h3>Light Mode</h3>
                {selectedTheme === 'light' && <Check size={14} className="check-icon" />}
              </div>
              <p>Clean, opaque, and snappy layout utilizing flat card surfaces.</p>
            </div>
          </div>

          {/* Dark Solid Theme Card */}
          <div
            className={`theme-option-card dark-solid-card ${selectedTheme === 'dark-solid' ? 'active' : ''}`}
            onClick={() => handleSelect('dark-solid')}
          >
            <div className="theme-card-preview-container dark-solid-preview">
              <div className="mock-window">
                <div className="mock-header">
                  <div className="mock-dot" />
                  <div className="mock-dot" />
                  <div className="mock-dot" />
                </div>
                <div className="mock-body">
                  <div className="mock-sidebar" />
                  <div className="mock-content-area">
                    <div className="mock-card">
                      <div className="mock-bar" />
                      <div className="mock-bar short" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="theme-card-info">
              <div className="theme-card-title-row">
                <Moon className="theme-icon" size={16} />
                <h3>Dark Solid</h3>
                {selectedTheme === 'dark-solid' && <Check size={14} className="check-icon" />}
              </div>
              <p>High-performance, battery-saving dark mode using a pure black background.</p>
            </div>
          </div>

          {/* Dark Glass Theme Card */}
          <div
            className={`theme-option-card dark-glass-card ${selectedTheme === 'dark-glass' ? 'active' : ''}`}
            onClick={() => handleSelect('dark-glass')}
          >
            <div className="theme-card-preview-container dark-glass-preview">
              <div className="mock-window">
                <div className="mock-header">
                  <div className="mock-dot" />
                  <div className="mock-dot" />
                  <div className="mock-dot" />
                </div>
                <div className="mock-body">
                  <div className="mock-sidebar" />
                  <div className="mock-content-area">
                    <div className="mock-card">
                      <div className="mock-bar animate-glow" />
                      <div className="mock-bar short" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="theme-card-info">
              <div className="theme-card-title-row">
                <Layers className="theme-icon" size={16} />
                <h3>Dark Glass</h3>
                {selectedTheme === 'dark-glass' && <Check size={14} className="check-icon" />}
              </div>
              <p>Immersive workspace using premium translucent glassmorphism and blurs.</p>
            </div>
          </div>
        </div>

        <div className="onboarding-actions">
          <button className="primary-btn onboarding-btn" onClick={handleConfirm}>
            Confirm & Enter Workspace
          </button>
        </div>
      </motion.div>
    </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
