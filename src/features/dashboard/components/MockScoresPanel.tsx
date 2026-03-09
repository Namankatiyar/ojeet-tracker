import { useMemo, useState } from 'react';
import { TrendingUp, Plus, Trash2 } from 'lucide-react';
import { Line } from 'react-chartjs-2';
import { MockExamType, MockScore } from '../../../shared/types';
import { useTheme } from '../../../core/context/ThemeContext';
import { useMockScoresAnalytics } from '../hooks/useMockScoresAnalytics';
import { getChartOptions, subjectColors } from '../utils/analyticsUtils';
import { getMockExamType, getMockMaxMarks, getMockPaperTotal, getMockPercentage, getMockSubjectTotals, getMockTotalMarks } from '../../../shared/utils/mockScores';

interface MockScoresPanelProps {
    mockScores: MockScore[];
    onAddClick: (examType: MockExamType) => void;
    onDeleteScore: (id: string) => void;
}

export function MockScoresPanel({ mockScores, onAddClick, onDeleteScore }: MockScoresPanelProps) {
    const { theme } = useTheme();
    const [examType, setExamType] = useState<MockExamType>('jm');
    const { sortedScores, chartData } = useMockScoresAnalytics(mockScores, examType);
    const maxMarks = examType === 'ja' ? 360 : 300;

    const chartOptions = useMemo(() => 
        getChartOptions(theme, 'mock', maxMarks), 
    [maxMarks, theme]);

    const emptyLabel = examType === 'ja' ? 'No JEE Advanced mocks recorded yet' : 'No JEE Mains mocks recorded yet';
    const emptyCta = examType === 'ja' ? 'Add Your First JA Mock' : 'Add Your First JM Mock';

    return (
        <div className="analytics-panel mock-scores-panel">
            <div className="panel-header">
                <div className="panel-title">
                    <TrendingUp size={20} />
                    <h3>Mock Scores</h3>
                </div>
                <div className="mock-panel-actions">
                    <div className="view-toggle-small">
                        <button
                            className={examType === 'jm' ? 'active' : ''}
                            onClick={() => setExamType('jm')}
                        >
                            JM
                        </button>
                        <button
                            className={examType === 'ja' ? 'active' : ''}
                            onClick={() => setExamType('ja')}
                        >
                            JA
                        </button>
                    </div>
                    <button className="add-mock-btn" onClick={() => onAddClick(examType)}>
                        <Plus size={16} />
                        <span>Add</span>
                    </button>
                </div>
            </div>

            {sortedScores.length > 0 ? (
                <div className={`chart-container ${sortedScores.length > 3 ? 'scrollable' : ''}`}>
                    <div style={{ minWidth: sortedScores.length > 3 ? `${sortedScores.length * 60}px` : '100%', height: '100%' }}>
                        <Line data={chartData as any} options={chartOptions as any} />
                    </div>
                </div>
            ) : (
                <div className="empty-mock-state">
                    <TrendingUp size={48} strokeWidth={1} />
                    <p>{emptyLabel}</p>
                    <button onClick={() => onAddClick(examType)}>{emptyCta}</button>
                </div>
            )}

            {sortedScores.length > 0 && (
                <div className={`mock-list ${sortedScores.length > 3 ? 'scrollable-list' : ''}`}>
                    {[...sortedScores].reverse().map((score) => {
                        // Find the original index/serial number from the sorted array
                        // Since sortedScores is already sorted by date ascending, the index + 1 is the serial
                        const serialNumber = sortedScores.findIndex(s => s.id === score.id) + 1;
                        const subjectTotals = getMockSubjectTotals(score);
                        const totalMarks = getMockTotalMarks(score);
                        const scoreMaxMarks = getMockMaxMarks(score);
                        const isJa = getMockExamType(score) === 'ja';
                        const totalDisplay = isJa
                            ? `${getMockPercentage(score).toFixed(1)}%`
                            : `${totalMarks}/${scoreMaxMarks}`;

                        return (
                            <div key={score.id} className="mock-item">
                                <div className="mock-info">
                                    <span className="mock-name">
                                        <span className="serial-badge">#{serialNumber}</span> {score.name}
                                    </span>
                                    <span className="mock-date-row">
                                        <span className="mock-date">
                                            {new Date(score.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        </span>
                                        <span className={`mock-exam-badge ${isJa ? 'ja' : 'jm'}`}>
                                            {isJa ? 'JA' : 'JM'}
                                        </span>
                                    </span>
                                    {isJa && (
                                        <span className="mock-paper-summary">
                                            P1 {getMockPaperTotal(score, 'paper1')} • P2 {getMockPaperTotal(score, 'paper2')}
                                        </span>
                                    )}
                                </div>
                                <div className="mock-scores-mini">
                                    <span className="text-physics" style={{ color: subjectColors.physics }}>{subjectTotals.physics}</span>
                                    <span className="text-chemistry" style={{ color: subjectColors.chemistry }}>{subjectTotals.chemistry}</span>
                                    <span className="text-maths" style={{ color: subjectColors.maths }}>{subjectTotals.maths}</span>
                                    <span className="total-score">{totalDisplay}</span>
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
