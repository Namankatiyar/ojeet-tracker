import { useMemo, useState, useEffect } from 'react';
import { TrendingUp, Plus, Trash2 } from 'lucide-react';
import { Line } from 'react-chartjs-2';
import { MockExamType, MockScore } from '../../../shared/types';
import { useTheme } from '../../../core/context/ThemeContext';
import { useUserProgress } from '../../../core/context/UserProgressContext';
import { useMockScoresAnalytics } from '../hooks/useMockScoresAnalytics';
import { getChartOptions } from '../utils/analyticsUtils';
import { getMockDefaultMaxMarks, getMockExamType, getMockMaxMarks, getMockPaperTotal, getMockPercentage, getMockSubjectTotals, getMockTotalMarks } from '../../../shared/utils/mockScores';

interface MockScoresPanelProps {
    mockScores: MockScore[];
    onAddClick: (examType: MockExamType) => void;
    onDeleteScore: (id: string) => void;
}

export function MockScoresPanel({ mockScores, onAddClick, onDeleteScore }: MockScoresPanelProps) {
    const { theme } = useTheme();
    const { mockExamPresets } = useUserProgress();
    const [examType, setExamType] = useState<MockExamType>('jm');

    useEffect(() => {
        if (!mockExamPresets.find(p => p.id === examType) && mockExamPresets.length > 0) {
            setExamType(mockExamPresets[0].id);
        }
    }, [mockExamPresets, examType]);

    const activePreset = useMemo(() => mockExamPresets.find(p => p.id === examType) || mockExamPresets[0], [mockExamPresets, examType]);

    const { sortedScores, chartData } = useMockScoresAnalytics(mockScores, examType, mockExamPresets);
    const maxMarks = useMemo(() => {
        if (sortedScores.length === 0) return getMockDefaultMaxMarks(examType, mockExamPresets);
        return Math.max(...sortedScores.map((score) => getMockMaxMarks(score, mockExamPresets)));
    }, [examType, sortedScores, mockExamPresets]);

    const chartOptions = useMemo(() => 
        getChartOptions(theme, 'mock', maxMarks), 
    [maxMarks, theme]);

    const emptyLabel = `No ${activePreset?.name || 'mock'} scores recorded yet`;
    const emptyCta = `Add Your First ${activePreset?.shortName || 'Mock'} Score`;

    return (
        <div className="analytics-panel mock-scores-panel">
            <div className="panel-header">
                <div className="mock-panel-head">
                    <div className="panel-title">
                        <TrendingUp size={20} />
                        <h3>Mock Scores</h3>
                    </div>
                    <button className="add-mock-btn add-mock-btn-compact" onClick={() => onAddClick(examType)}>
                        <Plus size={14} />
                        <span>Add</span>
                    </button>
                </div>
                <div className="mock-panel-actions">
                    <div className="view-toggle-small">
                        {mockExamPresets.map(preset => (
                            <button
                                key={preset.id}
                                className={examType === preset.id ? 'active' : ''}
                                onClick={() => setExamType(preset.id)}
                            >
                                {preset.shortName}
                            </button>
                        ))}
                    </div>
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
                        const serialNumber = sortedScores.findIndex(s => s.id === score.id) + 1;
                        const subjectTotals = getMockSubjectTotals(score, activePreset);
                        const totalMarks = getMockTotalMarks(score, activePreset);
                        const scoreMaxMarks = getMockMaxMarks(score, mockExamPresets);
                        
                        const isDoublePaper = activePreset ? activePreset.paperCount === 2 : getMockExamType(score) === 'ja';
                        
                        const totalDisplay = isDoublePaper
                            ? `${getMockPercentage(score, mockExamPresets).toFixed(1)}%`
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
                                        <span className="mock-exam-badge">
                                            {activePreset?.shortName || getMockExamType(score)}
                                        </span>
                                    </span>
                                    {isDoublePaper && (
                                        <span className="mock-paper-summary">
                                            P1 {getMockPaperTotal(score, 'paper1')} • P2 {getMockPaperTotal(score, 'paper2')}
                                        </span>
                                    )}
                                </div>
                                <div className="mock-scores-mini">
                                    <span className="text-physics" style={{ color: 'var(--color-physics)' }}>{subjectTotals.physics}</span>
                                    <span className="text-chemistry" style={{ color: 'var(--color-chemistry)' }}>{subjectTotals.chemistry}</span>
                                    <span className="text-maths" style={{ color: 'var(--color-maths)' }}>{subjectTotals.maths}</span>
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
