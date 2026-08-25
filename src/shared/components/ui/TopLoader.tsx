import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTopLoader, topLoader } from '../../hooks/useTopLoader';

export function TopLoader() {
  const { progress, visible } = useTopLoader();
  const location = useLocation();
  const currentPath = location.pathname + location.search;

  // Track initial mount and initial redirect stabilization
  const isInitializedRef = useRef(false);
  const prevPathRef = useRef(currentPath);

  useEffect(() => {
    // On the first mount, don't trigger anything - record the current stabilized path
    if (!isInitializedRef.current) {
      const timer = setTimeout(() => {
        isInitializedRef.current = true;
        prevPathRef.current = location.pathname + location.search;
      }, 150);
      return () => clearTimeout(timer);
    }

    // Only if the user actually navigated to a new path after initial load
    if (prevPathRef.current !== currentPath) {
      prevPathRef.current = currentPath;
      if (!visible) {
        topLoader.start();
      }
      topLoader.complete();
    }
  }, [currentPath, location.pathname, location.search, visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="top-loader-container"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
          aria-label="Route loading progress"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
        >
          <motion.div
            className="top-loader-bar"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: progress / 100 }}
            transition={{
              scaleX: {
                duration: progress === 100 ? 0.22 : 0.35,
                ease: progress === 100 ? [0.16, 1, 0.3, 1] : [0.25, 0.1, 0.25, 1],
              },
            }}
          >
            <div className="top-loader-glow" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
