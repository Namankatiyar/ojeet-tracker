import { useState } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    ArcElement
} from 'chart.js';
import { StudySession, MockScore } from '../../../shared/types';
import { StudyTimePanel } from './StudyTimePanel';
import { MockScoresPanel } from './MockScoresPanel';
import { AddMockModal } from './AddMockModal';
import { useRemoteSync } from '../../../core/context/RemoteSyncContext';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    ArcElement
);

interface AnalyticsPanelsProps {
    studySessions: StudySession[];
    mockScores: MockScore[];
    onAddMockScore: (score: Omit<MockScore, 'id'>) => void;
    onDeleteMockScore: (id: string) => void;
}

export function AnalyticsPanels({
    studySessions,
    mockScores,
    onAddMockScore,
    onDeleteMockScore
}: AnalyticsPanelsProps) {
    const [isAddingMock, setIsAddingMock] = useState(false);
    const { remoteStudyAggregate } = useRemoteSync();

    return (
        <div className="analytics-panels-row">
            {/* Study Time Panel */}
            <StudyTimePanel
                studySessions={studySessions}
                remoteDailyBuckets={remoteStudyAggregate?.buckets_daily_json}
            />

            {/* Mock Scores Panel */}
            <MockScoresPanel 
                mockScores={mockScores}
                onAddClick={() => setIsAddingMock(true)}
                onDeleteScore={onDeleteMockScore}
            />

            {/* Add Mock Modal */}
            {isAddingMock && (
                <AddMockModal 
                    onAdd={onAddMockScore} 
                    onClose={() => setIsAddingMock(false)} 
                />
            )}
        </div>
    );
}
