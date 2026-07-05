import { StudySession } from '../../../shared/types';
import { formatDateLocal } from '../../../shared/utils/date';

/**
 * Get week days for the selected week offset
 */
export const getWeekDays = (offset: number) => {
  const today = new Date();
  const monday = new Date(today);
  // Adjust to Monday of the target week
  monday.setDate(today.getDate() - today.getDay() + 1 + offset * 7);

  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    days.push(day);
  }
  return days;
};

/**
 * Get month days for the selected month offset
 */
export const getMonthDays = (offset: number) => {
  const today = new Date();
  const targetMonth = new Date(today.getFullYear(), today.getMonth() + offset, 1);
  let daysInMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0).getDate();

  if (offset === 0) {
    daysInMonth = today.getDate();
  }

  const days: Date[] = [];
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(targetMonth.getFullYear(), targetMonth.getMonth(), i));
  }
  return days;
};

/**
 * Calculate study time per subject for a given date
 */
function getSessionLocalDate(session: StudySession): string | null {
  if (session.localDate) return session.localDate;
  const parsed = new Date(session.startTime);
  if (Number.isNaN(parsed.getTime())) return null;
  return formatDateLocal(parsed);
}

export const getStudyTimeBySubject = (studySessions: StudySession[], dateStr: string) => {
  const daySessions = studySessions.filter((s) => getSessionLocalDate(s) === dateStr);

  return {
    physics:
      daySessions.filter((s) => s.subject === 'physics').reduce((acc, s) => acc + s.duration, 0) /
      3600,
    chemistry:
      daySessions.filter((s) => s.subject === 'chemistry').reduce((acc, s) => acc + s.duration, 0) /
      3600,
    maths:
      daySessions.filter((s) => s.subject === 'maths').reduce((acc, s) => acc + s.duration, 0) /
      3600,
    other: daySessions.filter((s) => !s.subject).reduce((acc, s) => acc + s.duration, 0) / 3600,
  };
};

/**
 * Subject colors matching site-wide theme
 */
export const subjectColors = {
  physics: '#6366f1',
  chemistry: '#10b981',
  maths: '#f59e0b',
  custom: '#ff57c7',
  overall: '#22c55e',
};

const subjectColorVars = {
  physics: '--color-physics',
  chemistry: '--color-chemistry',
  maths: '--color-maths',
  custom: '--color-custom',
};

export const getSubjectColors = () => {
  if (typeof window === 'undefined') {
    return subjectColors;
  }

  const styles = getComputedStyle(document.documentElement);
  const read = (name: string, fallback: string) => {
    const value = styles.getPropertyValue(name).trim();
    return value || fallback;
  };

  return {
    ...subjectColors,
    physics: read(subjectColorVars.physics, subjectColors.physics),
    chemistry: read(subjectColorVars.chemistry, subjectColors.chemistry),
    maths: read(subjectColorVars.maths, subjectColors.maths),
    custom: read(subjectColorVars.custom, subjectColors.custom),
  };
};

/**
 * Get standardized chart options based on theme and type
 */
export const getChartOptions = (
  theme: 'light' | 'dark-glass' | 'dark-solid',
  type: 'bar' | 'line' | 'mock',
  mockMaxMarks = 300
) => {
  const isDark = theme.startsWith('dark');
  const axisColor = isDark ? '#ffffff' : '#000000';
  const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

  const baseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: axisColor,
          usePointStyle: true,
          padding: 15,
          font: { size: 11, family: 'Inter' },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0,0,0,0.8)',
        titleFont: { family: 'Inter' },
        bodyFont: { family: 'Inter' },
        padding: 10,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: axisColor, font: { size: type === 'line' ? 10 : 11, family: 'Inter' } },
      },
      y: {
        grid: { color: gridColor },
        ticks: {
          color: axisColor,
          font: { size: 11, family: 'Inter' },
        },
      },
    },
  };

  if (type === 'bar') {
    return {
      ...baseOptions,
      scales: {
        ...baseOptions.scales,
        x: { ...baseOptions.scales.x, stacked: true },
        y: {
          ...baseOptions.scales.y,
          stacked: true,
          ticks: {
            ...baseOptions.scales.y.ticks,
            callback: (value: number) => `${value}h`,
          },
          title: {
            display: true,
            text: 'Hours',
            color: axisColor,
            font: { size: 12, family: 'Inter' },
          },
        },
      },
    };
  }

  if (type === 'line') {
    return {
      ...baseOptions,
      scales: {
        ...baseOptions.scales,
        y: {
          ...baseOptions.scales.y,
          beginAtZero: true,
          min: 0,
          ticks: {
            ...baseOptions.scales.y.ticks,
            callback: (value: number) => `${value}h`,
          },
        },
      },
    };
  }

  if (type === 'mock') {
    return {
      ...baseOptions,
      interaction: { mode: 'index' as const, intersect: false },
      scales: {
        ...baseOptions.scales,
        y: {
          ...baseOptions.scales.y,
          title: {
            display: true,
            text: 'Marks',
            color: axisColor,
            font: { size: 12, family: 'Inter' },
          },
          min: 0,
          max: mockMaxMarks,
        },
      },
    };
  }

  return baseOptions;
};

/**
 * Create a linear gradient for Chart.js dataset background with falloff
 */
export const createGradient = (color: string, data: number[]) => {
  return (context: any) => {
    const chart = context.chart;
    const { ctx, chartArea, scales } = chart;
    if (!chartArea || !scales.y) return null;

    let r = 0,
      g = 0,
      b = 0;
    if (color.startsWith('#')) {
      const hex = color.replace('#', '');
      if (hex.length === 3) {
        r = parseInt(hex[0] + hex[0], 16);
        g = parseInt(hex[1] + hex[1], 16);
        b = parseInt(hex[2] + hex[2], 16);
      } else if (hex.length >= 6) {
        r = parseInt(hex.substring(0, 2), 16);
        g = parseInt(hex.substring(2, 4), 16);
        b = parseInt(hex.substring(4, 6), 16);
      }
    }

    // Find the peak of this specific dataset
    const maxVal = data.length > 0 ? Math.max(...data, 0.1) : 0.1;
    const topY = scales.y.getPixelForValue(maxVal);

    // Gradient starts at the peak of the dataset's line
    const gradient = ctx.createLinearGradient(0, topY, 0, chartArea.bottom);
    gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.5)`);
    gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0.0)`);
    return gradient;
  };
};
