import { useMemo } from 'react';
import { TrendingUp, Plus, Trash2 } from 'lucide-react';
import { Line } from 'react-chartjs-2';
import { MockScore } from '../../../shared/types';
import { useTheme } from '../../../core/context/ThemeContext';
import { useMockScoresAnalytics } from '../hooks/useMockScoresAnalytics';
import { getChartOptions, subjectColors } from '../utils/analyticsUtils';

interface MockScoresPanelProps {
    mockScores: MockScore[];
    onAddClick: () => void;
    onDeleteScore: (id: string) => void;
}

export function MockScoresPanel({ mockScores, onAddClick, onDeleteScore }: MockScoresPanelProps) {
    const { theme } = useTheme();
    const { sortedScores, chartData } = useMockScoresAnalytics(mockScores);

    const chartOptions = useMemo(() => 
        getChartOptions(theme, 'mock'), 
    [theme]);

    return (
        <div className="analytics-panel mock-scores-panel">
            <div className="panel-header">
                <div className="panel-title">
                    <TrendingUp size={20} />
                    <h3>Mock Scores</h3>
                </div>
                <button className="add-mock-btn" onClick={onAddClick}>
                    <Plus size={16} />
                    <span>Add</span>
                </button>
            </div>

            {mockScores.length > 0 ? (
                <div className={`chart-container ${mockScores.length > 3 ? 'scrollable' : ''}`}>
                    <div style={{ minWidth: mockScores.length > 3 ? `${mockScores.length * 60}px` : '100%', height: '100%' }}>
                        <Line data={chartData as any} options={chartOptions as any} />
                    </div>
                </div>
            ) : (
                <div className="empty-mock-state">
                    <TrendingUp size={48} strokeWidth={1} />
                    <p>No mock tests recorded yet</p>
                    <button onClick={onAddClick}>Add Your First Mock</button>
                </div>
            )}

            {mockScores.length > 0 && (
                <div className={`mock-list ${mockScores.length > 3 ? 'scrollable-list' : ''}`}>
                    {[...sortedScores].reverse().map((score) => {
                        // Find the original index/serial number from the sorted array
                        // Since sortedScores is already sorted by date ascending, the index + 1 is the serial
                        const serialNumber = sortedScores.findIndex(s => s.id === score.id) + 1;

                        return (
                            <div key={score.id} className="mock-item">
                                <div className="mock-info">
                                    <span className="mock-name">
                                        <span className="serial-badge">#{serialNumber}</span> {score.name}
                                    </span>
                                    <span className="mock-date">
                                        {new Date(score.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    </span>
                                </div>
                                <div className="mock-scores-mini">
                                    <span className="text-physics" style={{ color: subjectColors.physics }}>{score.physicsMarks}</span>
                                    <span className="text-chemistry" style={{ color: subjectColors.chemistry }}>{score.chemistryMarks}</span>
                                    <span className="text-maths" style={{ color: subjectColors.maths }}>{score.mathsMarks}</span>
                                    <span className="total-score">{score.totalMarks}/{score.maxMarks || 300}</span>
                                </div>
                                <button className="delete-mock-btn" onClick={() => onDeleteScore(score.id)}>
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
