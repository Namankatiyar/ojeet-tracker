import { useState, useMemo } from 'react';
import { Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { Bar, Line } from 'react-chartjs-2';
import { StudySession } from '../../../shared/types';
import { useTheme } from '../../../core/context/ThemeContext';
import { useStudyTimeAnalytics } from '../hooks/useStudyTimeAnalytics';
import { getChartOptions, getWeekDays} from '../utils/analyticsUtils';

interface StudyTimePanelProps {
    studySessions: StudySession[];
}

type StudyViewMode = 'weekly' | 'monthly';

export function StudyTimePanel({ studySessions }: StudyTimePanelProps) {
    const { theme } = useTheme();
    const [studyViewMode, setStudyViewMode] = useState<StudyViewMode>('weekly');
    const [weekOffset, setWeekOffset] = useState(0);
    const [monthOffset, setMonthOffset] = useState(0);

    const chartData = useStudyTimeAnalytics(
        studySessions,
        studyViewMode === 'weekly' ? weekOffset : monthOffset,
        studyViewMode
    );

    const chartOptions = useMemo(() => 
        getChartOptions(theme, studyViewMode === 'weekly' ? 'bar' : 'line'),
    [theme, studyViewMode]);

    // Get week/month display label
    const getWeekLabel = () => {
        const weekDays = getWeekDays(weekOffset);
        const start = weekDays[0];
        const end = weekDays[6];
        return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    };

    const getMonthLabel = () => {
        const today = new Date();
        const targetMonth = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
        return targetMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    };

    const handlePrev = () => {
        if (studyViewMode === 'weekly') setWeekOffset(w => w - 1);
        else setMonthOffset(m => m - 1);
    };

    const handleNext = () => {
        if (studyViewMode === 'weekly') setWeekOffset(w => w + 1);
        else setMonthOffset(m => m + 1);
    };

    const isNextDisabled = studyViewMode === 'weekly' ? weekOffset >= 0 : monthOffset >= 0;

    return (
        <div className="analytics-panel study-time-panel">
            <div className="panel-header">
                <div className="panel-title">
                    <Clock size={20} />
                    <h3>Study Time</h3>
                </div>
                <div className="view-toggle-small">
                    <button
                        className={studyViewMode === 'weekly' ? 'active' : ''}
                        onClick={() => setStudyViewMode('weekly')}
                    >
                        Weekly
                    </button>
                    <button
                        className={studyViewMode === 'monthly' ? 'active' : ''}
                        onClick={() => setStudyViewMode('monthly')}
                    >
                        Monthly
                    </button>
                </div>
            </div>

            <div className="date-navigator">
                <button onClick={handlePrev}>
                    <ChevronLeft size={18} />
                </button>
                <span>{studyViewMode === 'weekly' ? getWeekLabel() : getMonthLabel()}</span>
                <button onClick={handleNext} disabled={isNextDisabled}>
                    <ChevronRight size={18} />
                </button>
            </div>

            <div className="chart-container">
                {studyViewMode === 'weekly' ? (
                    <Bar data={chartData as any} options={chartOptions as any} />
                ) : (
                    <Line data={chartData as any} options={chartOptions as any} />
                )}
            </div>
        </div>
    );
}
