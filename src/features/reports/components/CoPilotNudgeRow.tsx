import React, { useState } from 'react';
import { CoPilotRecommendation } from '../../../shared/hooks/useStudyCoPilot';
import { Subject, ConfidenceLevel } from '../../../shared/types';
import { Brain, AlertTriangle, TrendingDown, Clock, Sparkles, X, Plus, Check } from 'lucide-react';

interface CoPilotNudgeRowProps {
  recommendation: CoPilotRecommendation;
  onAddToPlanner: (rec: CoPilotRecommendation) => void;
  onMarkRevised: (subject: Subject, chapterSerial: number, confidence: ConfidenceLevel) => void;
  onDismiss: (id: string) => void;
}

export const CoPilotNudgeRow: React.FC<CoPilotNudgeRowProps> = ({
  recommendation,
  onAddToPlanner,
  onMarkRevised,
  onDismiss,
}) => {
  const { id, type, subject, chapterSerial, chapterName, urgencyIndex, metadata } = recommendation;
  const [showConfidenceSelector, setShowConfidenceSelector] = useState(false);
  const [isAdded, setIsAdded] = useState(false);

  const handleDismiss = () => onDismiss(id);

  const handleAddToPlanner = () => {
    onAddToPlanner(recommendation);
    setIsAdded(true);
    setTimeout(() => handleDismiss(), 1000);
  };

  const handleMarkRevisedSelect = (conf: ConfidenceLevel) => {
    onMarkRevised(subject, chapterSerial, conf);
    setShowConfidenceSelector(false);
    handleDismiss();
  };

  const getVariantDetails = () => {
    switch (type) {
      case 'stuck':
        return {
          icon: <AlertTriangle className="nudge-row-icon icon-stuck" size={20} />,
          reason: 'Stuck Alert',
          colorClass: 'row-variant-stuck',
        };
      case 'mock_boost':
        return {
          icon: <TrendingDown className="nudge-row-icon icon-mock" size={20} />,
          reason: 'Mock Score Boost',
          colorClass: 'row-variant-mock',
        };
      case 'neglect_balance':
        return {
          icon: <Clock className="nudge-row-icon icon-neglect" size={20} />,
          reason: 'Balance Neglected Subject',
          colorClass: 'row-variant-neglect',
        };
      case 'close_to_complete':
        return {
          icon: <Sparkles className="nudge-row-icon icon-complete" size={20} />,
          reason: 'Almost Complete!',
          colorClass: 'row-variant-complete',
        };
      case 'revision':
      default:
        return {
          icon: <Brain className="nudge-row-icon icon-revision" size={20} />,
          reason: 'Critical Revision Needed',
          colorClass: 'row-variant-revision',
        };
    }
  };

  const variant = getVariantDetails();
  const subjectBadgeClass = `nudge-subject-badge badge-${subject}`;

  return (
    <div className={`nudge-row ${variant.colorClass}`}>
      {/* Column 1: Subject Badge */}
      <div className="nudge-col-subject">
        <span className={subjectBadgeClass}>{subject.toUpperCase()}</span>
      </div>

      {/* Column 2: Chapter Details */}
      <div className="nudge-col-details">
        <h3 className="nudge-chapter-title">{chapterName}</h3>
        <div className="nudge-reason-inline">
          <span className={`punchy-inline text-${variant.colorClass}`}>{variant.reason}</span>
        </div>
      </div>

      {/* Column 3: Metrics */}
      <div className="nudge-col-metrics">
        <div
          className={`compact-metric ${urgencyIndex > 75 ? 'metric-high' : ''}`}
          data-tooltip="Based on time decay, mock scores, & syllabus weight"
        >
          <span className="c-metric-lbl">Urgency</span>
          <span className="c-metric-val">{urgencyIndex}%</span>
        </div>
        {metadata.retention !== undefined && (
          <div
            className={`compact-metric ${metadata.retention < 20 ? 'metric-low-retention' : ''}`}
            data-tooltip="Estimated memory retention based on time elapsed"
          >
            <span className="c-metric-lbl">Retention</span>
            <span className="c-metric-val">{metadata.retention}%</span>
          </div>
        )}
        {metadata.daysSinceActive !== undefined && (
          <div
            className="compact-metric muted"
            data-tooltip="Days since chapter was last actively revised"
          >
            <span className="c-metric-lbl">Idle</span>
            <span className="c-metric-val">{metadata.daysSinceActive}d</span>
          </div>
        )}
      </div>

      {/* Column 4: Actions */}
      <div className="nudge-col-actions">
        {showConfidenceSelector ? (
          <div className="inline-confidence-selector">
            {([1, 2, 3, 4, 5] as ConfidenceLevel[]).map((level) => (
              <button
                key={level}
                className={`inline-conf-btn level-${level}`}
                onClick={() => handleMarkRevisedSelect(level)}
                title={`Confidence ${level}`}
              >
                {level}
              </button>
            ))}
            <button
              className="inline-cancel-btn"
              onClick={() => setShowConfidenceSelector(false)}
              title="Cancel"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <div className="inline-action-group">
            <button
              className={`btn-compact primary ${isAdded ? 'success' : ''}`}
              onClick={handleAddToPlanner}
              disabled={isAdded}
              title="Add to Planner"
            >
              {isAdded ? <Check size={14} /> : <Plus size={14} />}
              <span className="btn-label">{isAdded ? 'Added' : 'Plan'}</span>
            </button>
            <button
              className="btn-compact secondary"
              onClick={() => setShowConfidenceSelector(true)}
              title="Mark Revised"
            >
              <Check size={14} />
              <span className="btn-label">Revised</span>
            </button>
            <button className="btn-compact ghost icon-only" onClick={handleDismiss} title="Dismiss">
              <X size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
