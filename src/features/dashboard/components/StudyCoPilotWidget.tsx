import React, { useMemo } from 'react';
import { useStudyCoPilot } from '../../../shared/hooks/useStudyCoPilot';
import { useLocalStorage } from '../../../shared/hooks/useLocalStorage';
import { CoPilotNudgeCard } from './CoPilotNudgeCard';
import { Sparkles, Compass } from 'lucide-react';

export const StudyCoPilotWidget: React.FC = () => {
    const { recommendations, addRevisionToPlanner, markChapterRevised } = useStudyCoPilot();
    const [dismissedIds, setDismissedIds] = useLocalStorage<string[]>('jee-copilot-dismissed-ids', []);

    const activeRecommendations = useMemo(() => {
        return recommendations.filter(rec => !dismissedIds.includes(rec.id));
    }, [recommendations, dismissedIds]);

    const handleDismiss = (id: string) => {
        setDismissedIds(prev => [...prev, id]);
    };

    // If there is active recommendation data but none left undismissed, show clean empty state.
    // If there are no recommendations calculated at all (cold start/empty canvas), show welcome co-pilot state.
    const isSyllabusEmpty = recommendations.length === 0;

    return (
        <div className="glass-panel study-copilot-widget">
            <div className="copilot-widget-header">
                <div className="copilot-header-title">
                    <Compass className="copilot-icon" size={20} />
                    <h2>Smart Study Co-Pilot</h2>
                </div>
                {!isSyllabusEmpty && activeRecommendations.length > 0 && (
                    <span className="recommendation-count-badge">
                        {activeRecommendations.length} Suggested
                    </span>
                )}
            </div>

            <div className="copilot-widget-content">
                {isSyllabusEmpty ? (
                    <div className="copilot-empty-state">
                        <Sparkles className="empty-sparkle-icon" size={32} />
                        <h3>Your Dashboard is Clear!</h3>
                        <p className="empty-message-text">
                            Start logging study sessions using the Study Clock or check off subtopics in your subjects to receive personalized revision suggestions.
                        </p>
                    </div>
                ) : activeRecommendations.length === 0 ? (
                    <div className="copilot-empty-state">
                        <Sparkles className="empty-sparkle-icon" size={32} />
                        <h3>All caught up!</h3>
                        <p className="empty-message-text">
                            Great job! You have addressed all critical revisions and focus areas. Keep studying and maintaining your momentum!
                        </p>
                    </div>
                ) : (
                    <div className="nudge-cards-grid">
                        {activeRecommendations.slice(0, 3).map((rec) => (
                            <CoPilotNudgeCard
                                key={rec.id}
                                recommendation={rec}
                                onAddToPlanner={addRevisionToPlanner}
                                onMarkRevised={markChapterRevised}
                                onDismiss={handleDismiss}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
