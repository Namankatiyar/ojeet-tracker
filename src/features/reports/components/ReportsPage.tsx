import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useStudyCoPilot } from '../../../shared/hooks/useStudyCoPilot';
import { useLocalStorage } from '../../../shared/hooks/useLocalStorage';
import { CoPilotNudgeRow } from './CoPilotNudgeRow';
import { DailyAnalytics } from './DailyAnalytics';
import { Sparkles, BarChart2 } from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const { recommendations, addRevisionToPlanner, markChapterRevised } = useStudyCoPilot();
  const [dismissedIds, setDismissedIds] = useLocalStorage<string[]>(
    'jee-copilot-dismissed-ids',
    []
  );

  const activeRecommendations = useMemo(() => {
    return recommendations.filter((rec) => !dismissedIds.includes(rec.id));
  }, [recommendations, dismissedIds]);

  const handleDismiss = (id: string) => {
    setDismissedIds((prev) => [...prev, id]);
  };

  const isSyllabusEmpty = recommendations.length === 0;

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20, filter: 'blur(10px)' },
    show: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: {
        type: 'spring' as const,
        duration: 0.6,
        bounce: 0,
      },
    },
  };

  return (
    <motion.div
      className="reports-page"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <h1 className="sr-only">Reports & Analysis</h1>

      {/* Daily Study History & Analytics Dashboard */}
      <motion.div variants={itemVariants}>
        <DailyAnalytics />
      </motion.div>

      <motion.div className="reports-header" variants={itemVariants}>
        <div className="reports-title-container">
          <BarChart2 className="reports-icon" size={20} />
          <div>
            <h2 className="reports-title">Smart Study Co-Pilot</h2>
            <p className="reports-subtitle">AI-driven insights to optimize your preparation</p>
          </div>
        </div>
        {!isSyllabusEmpty && activeRecommendations.length > 0 && (
          <span className="recommendation-count-badge">
            {activeRecommendations.length} Suggested
          </span>
        )}
      </motion.div>

      <motion.div className="reports-content" variants={itemVariants}>
        {isSyllabusEmpty ? (
          <div className="reports-empty-state glass-panel">
            <Sparkles className="empty-sparkle-icon" size={48} />
            <h3>Not Enough Data Yet</h3>
            <p className="empty-message-text">
              Start logging study sessions using the Study Clock or check off subtopics in your
              subjects to receive personalized revision suggestions.
            </p>
          </div>
        ) : activeRecommendations.length === 0 ? (
          <div className="reports-empty-state glass-panel">
            <Sparkles className="empty-sparkle-icon" size={48} />
            <h3>You're All Caught Up!</h3>
            <p className="empty-message-text">
              Great job! You have addressed all critical revisions and focus areas. Keep studying
              and maintaining your momentum!
            </p>
          </div>
        ) : (
          <div className="nudge-table-container glass-panel">
            <div className="nudge-table-header">
              <div className="th-subject">Subject</div>
              <div className="th-details">Chapter & Reason</div>
              <div className="th-metrics">Metrics</div>
              <div className="th-actions">Actions</div>
            </div>
            <div className="nudge-table-body">
              {activeRecommendations.map((rec) => (
                <CoPilotNudgeRow
                  key={rec.id}
                  recommendation={rec}
                  onAddToPlanner={addRevisionToPlanner}
                  onMarkRevised={markChapterRevised}
                  onDismiss={handleDismiss}
                />
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};
