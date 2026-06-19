import React, { useState } from 'react';
import { CoPilotRecommendation } from '../../../shared/hooks/useStudyCoPilot';
import { Subject, ConfidenceLevel } from '../../../shared/types';
import { Brain, AlertTriangle, TrendingDown, Clock, Sparkles, X } from 'lucide-react';

interface CoPilotNudgeCardProps {
    recommendation: CoPilotRecommendation;
    onAddToPlanner: (rec: CoPilotRecommendation) => void;
    onMarkRevised: (subject: Subject, chapterSerial: number, confidence: ConfidenceLevel) => void;
    onDismiss: (id: string) => void;
}

export const CoPilotNudgeCard: React.FC<CoPilotNudgeCardProps> = ({
    recommendation,
    onAddToPlanner,
    onMarkRevised,
    onDismiss
}) => {
    const { id, type, subject, chapterSerial, chapterName, message, urgencyIndex, metadata } = recommendation;
    const [showConfidenceSelector, setShowConfidenceSelector] = useState(false);
    const [isAdded, setIsAdded] = useState(false);

    const handleDismiss = () => {
        onDismiss(id);
    };

    const handleAddToPlanner = () => {
        onAddToPlanner(recommendation);
        setIsAdded(true);
        setTimeout(() => {
            handleDismiss();
        }, 1000);
    };

    const handleMarkRevisedSelect = (conf: ConfidenceLevel) => {
        onMarkRevised(subject, chapterSerial, conf);
        setShowConfidenceSelector(false);
        handleDismiss();
    };

    // Determine icon based on recommendation type
    const getIcon = () => {
        switch (type) {
            case 'stuck':
                return <AlertTriangle className="nudge-icon icon-stuck" size={20} />;
            case 'mock_boost':
                return <TrendingDown className="nudge-icon icon-mock" size={20} />;
            case 'neglect_balance':
                return <Clock className="nudge-icon icon-neglect" size={20} />;
            case 'close_to_complete':
                return <Sparkles className="nudge-icon icon-complete" size={20} />;
            case 'revision':
            default:
                return <Brain className="nudge-icon icon-revision" size={20} />;
        }
    };

    // Determine badge class for subject
    const getSubjectBadgeClass = (sub: Subject) => {
        return `nudge-subject-badge badge-${sub}`;
    };

    return (
        <div className="copilot-nudge-card glass-panel">
            <div className="nudge-card-header">
                <div className="nudge-header-left">
                    {getIcon()}
                    <span className={getSubjectBadgeClass(subject)}>
                        {subject.toUpperCase()}
                    </span>
                </div>
                <div className="nudge-header-right">
                    <button className="nudge-dismiss-btn" onClick={handleDismiss} title="Dismiss recommendation">
                        <X size={16} />
                    </button>
                </div>
            </div>

            <h4 className="nudge-chapter-name">{chapterName}</h4>

            <div className="nudge-card-body">
                <p className="nudge-message">{message}</p>
                <div className="nudge-meta-row">
                    <span className={`nudge-meta-tag ${urgencyIndex > 75 ? 'priority-high' : ''}`}>
                        Urgency: {urgencyIndex}%
                    </span>
                    {metadata.retention !== undefined && (
                        <span className="nudge-meta-tag">Retention: {metadata.retention}%</span>
                    )}
                    {metadata.daysSinceActive !== undefined && (
                        <span className="nudge-meta-tag">{metadata.daysSinceActive}d idle</span>
                    )}
                    {metadata.totalHoursStudied !== undefined && metadata.totalHoursStudied > 0 && (
                        <span className="nudge-meta-tag">{metadata.totalHoursStudied.toFixed(1)}h logged</span>
                    )}
                </div>
            </div>

            <div className="nudge-card-actions">
                {showConfidenceSelector ? (
                    <div className="confidence-selector-container">
                        <span className="confidence-label">Rate your current confidence:</span>
                        <div className="confidence-buttons">
                            {([1, 2, 3, 4, 5] as ConfidenceLevel[]).map((level) => (
                                <button
                                    key={level}
                                    className={`confidence-btn level-${level}`}
                                    onClick={() => handleMarkRevisedSelect(level)}
                                    title={`Confidence Level ${level}`}
                                >
                                    {level}
                                </button>
                            ))}
                            <button 
                                className="confidence-cancel-btn" 
                                onClick={() => setShowConfidenceSelector(false)}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <button 
                            className={`nudge-action-btn btn-primary ${isAdded ? 'btn-success' : ''}`} 
                            onClick={handleAddToPlanner}
                            disabled={isAdded}
                        >
                            {isAdded ? "Added!" : "Add to Planner"}
                        </button>
                        <button 
                            className="nudge-action-btn btn-secondary" 
                            onClick={() => setShowConfidenceSelector(true)}
                        >
                            Mark Revised
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};
