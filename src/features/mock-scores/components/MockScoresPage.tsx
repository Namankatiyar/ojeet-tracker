import { useState, useMemo } from 'react';
import {
  Target,
  Plus,
  Settings,
  TrendingUp,
  PieChart,
  Clock,
  CheckCircle2,
  Edit2,
  Trash2,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
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
  ArcElement,
} from 'chart.js';
import { MockExamType, MockScore } from '../../../shared/types';
import { useTheme } from '../../../core/context/ThemeContext';
import { useUserProgress } from '../../../core/context/UserProgressContext';
import { useDetailedMockAnalytics } from '../hooks/useDetailedMockAnalytics';
import { AddMockModal } from '../../dashboard/components/AddMockModal';
import { ManageMockPresetsModal } from '../../dashboard/components/ManageMockPresetsModal';
import {
  getMockTotalMarks,
  getMockMaxMarks,
  getMockPercentage,
  getMockExamType,
  getMockSubjectTotals,
} from '../../../shared/utils/mockScores';
import { getChartOptions } from '../../dashboard/utils/analyticsUtils';

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

export function MockScoresPage() {
  const { theme } = useTheme();
  const {
    mockScores,
    mockExamPresets,
    handleAddMockScore,
    handleEditMockScore,
    handleDeleteMockScore,
  } = useUserProgress();

  const [selectedExamType, setSelectedExamType] = useState<MockExamType | 'all'>('all');
  const [activeTab, setActiveTab] = useState<'trend' | 'share' | 'time' | 'accuracy'>('trend');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingScore, setEditingScore] = useState<MockScore | undefined>(undefined);
  const [isManagePresetsOpen, setIsManagePresetsOpen] = useState(false);

  const { sortedScores, summaryStats, chartData, weakAreasSummary, diagnosticNotes } =
    useDetailedMockAnalytics(mockScores, selectedExamType, mockExamPresets);

  const maxMarksForChart = useMemo(() => {
    if (sortedScores.length === 0) return 300;
    return Math.max(...sortedScores.map((s) => getMockMaxMarks(s, mockExamPresets)));
  }, [sortedScores, mockExamPresets]);

  const trendOptions = useMemo(
    () => getChartOptions(theme, 'mock', maxMarksForChart),
    [theme, maxMarksForChart]
  );

  const doughnutOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom' as const,
          labels: {
            color: theme.includes('dark') ? '#e2e8f0' : '#334155',
            font: { family: 'Inter', size: 12, weight: 600 },
            padding: 16,
          },
        },
        tooltip: {
          callbacks: {
            label: (context: any) => ` ${context.label}: ${context.raw} marks avg`,
          },
        },
      },
    }),
    [theme]
  );

  const barOptions = useMemo(() => {
    const isDark = theme.includes('dark');
    const textColor = isDark ? '#94a3b8' : '#64748b';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)';
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top' as const,
          labels: { color: isDark ? '#e2e8f0' : '#334155', font: { family: 'Inter', size: 12 } },
        },
      },
      scales: {
        x: { grid: { color: gridColor }, ticks: { color: textColor } },
        y: { beginAtZero: true, grid: { color: gridColor }, ticks: { color: textColor } },
      },
    };
  }, [theme]);

  const handleOpenAdd = () => {
    setEditingScore(undefined);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (score: MockScore) => {
    setEditingScore(score);
    setIsAddModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsAddModalOpen(false);
    setEditingScore(undefined);
  };

  const reversedScores = useMemo(() => [...sortedScores].reverse(), [sortedScores]);

  return (
    <div className="mock-scores-page">
      {/* Header */}
      <div className="mock-scores-header">
        <div className="mock-scores-title-container">
          <Target size={28} className="mock-scores-icon" />
          <div>
            <h1 className="mock-scores-title">Mock Scores Cockpit</h1>
            <p className="mock-scores-subtitle">
              Comprehensive analytics, diagnostics, time tracking, and weak area analysis.
            </p>
          </div>
        </div>

        <div className="mock-scores-actions">
          <button
            type="button"
            className="secondary-btn mock-preset-btn"
            onClick={() => setIsManagePresetsOpen(true)}
          >
            <Settings size={16} />
            <span>Presets</span>
          </button>
          <button
            type="button"
            className="primary-btn mock-add-btn"
            onClick={handleOpenAdd}
          >
            <Plus size={16} />
            <span>Log New Score</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="view-toggle-small" style={{ alignSelf: 'flex-start', flexWrap: 'wrap' }}>
        <button
          type="button"
          className={selectedExamType === 'all' ? 'active' : ''}
          onClick={() => setSelectedExamType('all')}
        >
          All Exams
        </button>
        {mockExamPresets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className={selectedExamType === preset.id ? 'active' : ''}
            onClick={() => setSelectedExamType(preset.id)}
          >
            {preset.shortName}
          </button>
        ))}
      </div>

      {/* Summary Stats Grid */}
      <div className="mock-scores-stats-grid">
        <div className="mock-stat-card">
          <span className="mock-stat-label">Tests Taken</span>
          <span className="mock-stat-value">{summaryStats.totalTestsTaken}</span>
          <span className="mock-stat-sub">
            {selectedExamType === 'all' ? 'All categories' : 'Selected exam type'}
          </span>
        </div>

        <div className="mock-stat-card">
          <span className="mock-stat-label">Average Score</span>
          <span className="mock-stat-value">
            {summaryStats.averageTotal}{' '}
            <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
              ({summaryStats.averagePercentage.toFixed(1)}%)
            </span>
          </span>
          <span className="mock-stat-sub">
            P:{summaryStats.subjectAverages.physics} C:{summaryStats.subjectAverages.chemistry} M:
            {summaryStats.subjectAverages.maths}
          </span>
        </div>

        <div className="mock-stat-card">
          <span className="mock-stat-label">Highest Score</span>
          <span className="mock-stat-value">
            {summaryStats.highestScore > 0 ? summaryStats.highestScore : '-'}
          </span>
          <span className="mock-stat-sub">{summaryStats.highestScoreName}</span>
        </div>

        <div className="mock-stat-card">
          <span className="mock-stat-label">Latest Score</span>
          <span className="mock-stat-value">{summaryStats.latestScore}</span>
          <span
            className="mock-stat-sub"
            style={{
              color:
                summaryStats.latestTrend > 0
                  ? '#10b981'
                  : summaryStats.latestTrend < 0
                  ? '#ef4444'
                  : 'var(--text-muted)',
            }}
          >
            {summaryStats.latestTrend > 0 ? '+' : ''}
            {summaryStats.latestTrend !== 0 ? `${summaryStats.latestTrend} vs prev test` : 'No trend yet'}
          </span>
        </div>
      </div>

      {/* Tabbed Charts Section */}
      <div>
        <div className="mock-scores-tabs">
          <button
            type="button"
            className={`mock-tab-btn ${activeTab === 'trend' ? 'active' : ''}`}
            onClick={() => setActiveTab('trend')}
          >
            <TrendingUp size={16} /> Score Trend
          </button>
          <button
            type="button"
            className={`mock-tab-btn ${activeTab === 'share' ? 'active' : ''}`}
            onClick={() => setActiveTab('share')}
          >
            <PieChart size={16} /> Subject Share
          </button>
          <button
            type="button"
            className={`mock-tab-btn ${activeTab === 'time' ? 'active' : ''}`}
            onClick={() => setActiveTab('time')}
          >
            <Clock size={16} /> Time Spent
          </button>
          <button
            type="button"
            className={`mock-tab-btn ${activeTab === 'accuracy' ? 'active' : ''}`}
            onClick={() => setActiveTab('accuracy')}
          >
            <CheckCircle2 size={16} /> Accuracy
          </button>
        </div>

        <div className="mock-chart-container">
          {sortedScores.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
              <Target size={48} style={{ opacity: 0.3, margin: '0 auto 1rem' }} />
              <h3>No Mock Scores Recorded Yet</h3>
              <p style={{ fontSize: '0.85rem', maxWidth: '400px', margin: '0.5rem auto' }}>
                Click "Log New Score" above to start recording your mock tests and track your JEE
                progress over time.
              </p>
            </div>
          ) : (
            <>
              {activeTab === 'trend' && (
                <div style={{ height: '360px', width: '100%' }}>
                  <Line data={chartData.trendChartData} options={trendOptions as any} />
                </div>
              )}

              {activeTab === 'share' && (
                <div style={{ height: '360px', width: '100%', display: 'flex', justifyContent: 'center' }}>
                  <Doughnut data={chartData.subjectShareChartData} options={doughnutOptions as any} />
                </div>
              )}

              {activeTab === 'time' && (
                <div style={{ height: '360px', width: '100%' }}>
                  {chartData.hasTimeData ? (
                    <Bar data={chartData.timeSpentChartData} options={barOptions as any} />
                  ) : (
                    <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                      <Clock size={40} style={{ opacity: 0.3, margin: '0 auto 1rem' }} />
                      <h4>No Time Spent Data Available</h4>
                      <p style={{ fontSize: '0.85rem', maxWidth: '420px', margin: '0.5rem auto' }}>
                        When logging or editing a mock score, expand "+ Advanced Analytics" to record
                        how much time you spent on Physics, Chemistry, and Maths.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'accuracy' && (
                <div style={{ height: '360px', width: '100%' }}>
                  {chartData.hasQuestionData ? (
                    <Bar data={chartData.accuracyChartData} options={barOptions as any} />
                  ) : (
                    <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                      <CheckCircle2 size={40} style={{ opacity: 0.3, margin: '0 auto 1rem' }} />
                      <h4>No Question Accuracy Data Available</h4>
                      <p style={{ fontSize: '0.85rem', maxWidth: '420px', margin: '0.5rem auto' }}>
                        When logging or editing a mock score, expand "+ Advanced Analytics" to record
                        attempted and wrong question counts per subject.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Diagnostics & Notes Grid */}
      <div className="mock-diagnostics-grid">
        <div className="mock-diagnostic-card">
          <div className="mock-diagnostic-header">
            <span className="mock-diagnostic-title">
              <AlertCircle size={18} style={{ color: '#ef4444' }} /> Weak Areas & Tagged Topics
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Frequency</span>
          </div>

          {weakAreasSummary.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No weak chapters or subtopics tagged yet. Tag weak areas when logging/editing mock
              scores to see frequency analysis here.
            </div>
          ) : (
            <div className="weak-area-list">
              {weakAreasSummary.map((item) => (
                <div key={item.id} className="weak-area-item">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className={`weak-area-tag ${item.subject}`}>{item.subject.slice(0, 4)}</span>
                    <span style={{ fontWeight: 500 }}>
                      {item.chapterName}
                      {item.subtopicName ? (
                        <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>
                          {' '}
                          › {item.subtopicName}
                        </span>
                      ) : (
                        ''
                      )}
                    </span>
                  </div>
                  <span
                    style={{
                      background: 'var(--bg-primary)',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-full)',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: 'var(--accent)',
                    }}
                  >
                    ×{item.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mock-diagnostic-card">
          <div className="mock-diagnostic-header">
            <span className="mock-diagnostic-title">
              <FileText size={18} style={{ color: 'var(--accent)' }} /> Footnotes & Reflections
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Recent</span>
          </div>

          {diagnosticNotes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No reflection notes added yet. Record footnotes when logging scores to track your
              mistakes, key takeaways, and exam strategies.
            </div>
          ) : (
            <div className="weak-area-list">
              {diagnosticNotes.map((note) => (
                <div key={note.id} className="diagnostic-note-item">
                  <div className="diagnostic-note-header">
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{note.name}</span>
                    <span>{note.date}</span>
                  </div>
                  <div className="diagnostic-note-body">{note.footnotes}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* History Table */}
      <div className="mock-scores-table-wrapper">
        <table className="mock-scores-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Test Name</th>
              <th>Type</th>
              <th>Physics</th>
              <th>Chemistry</th>
              <th>Maths</th>
              <th>Total</th>
              <th>%</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {reversedScores.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  No test history available.
                </td>
              </tr>
            ) : (
              reversedScores.map((score) => {
                const type = getMockExamType(score);
                const preset = mockExamPresets.find((p) => p.id === type);
                const total = getMockTotalMarks(score, preset);
                const max = getMockMaxMarks(score, mockExamPresets);
                const perc = getMockPercentage(score, mockExamPresets);
                const sub = getMockSubjectTotals(score, preset);

                return (
                  <tr key={score.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{score.date}</td>
                    <td style={{ fontWeight: 600 }}>{score.name}</td>
                    <td>
                      <span
                        style={{
                          background: 'var(--bg-tertiary)',
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                        }}
                      >
                        {preset?.shortName || type.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ color: '#3b82f6' }}>{sub.physics}</td>
                    <td style={{ color: '#f97316' }}>{sub.chemistry}</td>
                    <td style={{ color: '#10b981' }}>{sub.maths}</td>
                    <td style={{ fontWeight: 700 }}>
                      {total}{' '}
                      <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)' }}>
                        / {max}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{perc.toFixed(1)}%</td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button
                        type="button"
                        className="mock-action-btn"
                        title="Edit Score"
                        onClick={() => handleOpenEdit(score)}
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        type="button"
                        className="mock-action-btn delete"
                        title="Delete Score"
                        onClick={() => {
                          if (window.confirm(`Delete "${score.name}"?`)) {
                            handleDeleteMockScore(score.id);
                          }
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      {isAddModalOpen && (
        <AddMockModal
          defaultExamType={
            selectedExamType === 'all' ? mockExamPresets[0]?.id || 'jm' : selectedExamType
          }
          onAdd={(score) => handleAddMockScore(score)}
          onEdit={(score) => handleEditMockScore(score)}
          initialScore={editingScore}
          onClose={handleCloseModal}
        />
      )}

      {isManagePresetsOpen && (
        <ManageMockPresetsModal onClose={() => setIsManagePresetsOpen(false)} />
      )}
    </div>
  );
}
