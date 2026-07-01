export const formatDateLocal = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const parseDateLocal = (dateString: string): Date | null => {
  if (!dateString) return null;
  const parts = dateString.split('-').map(Number);
  if (parts.length !== 3) return null;
  const [year, month, day] = parts;
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

export const formatTime12Hour = (time24: string): string => {
  if (!time24) return '';
  const { hour12, minutes, period } = parse24hTo12h(time24);
  return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
};

export const parse24hTo12h = (time24: string) => {
  const [h, m] = time24.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return {
    hour12: hour12.toString().padStart(2, '0'),
    minutes: m.toString().padStart(2, '0'),
    period,
  };
};

export const format12hTo24h = (
  hour12: string | number,
  minutes: string | number,
  period: 'AM' | 'PM'
): string => {
  let h = typeof hour12 === 'string' ? parseInt(hour12) : hour12;
  const m =
    typeof minutes === 'string' ? minutes.padStart(2, '0') : minutes.toString().padStart(2, '0');

  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;

  return `${h.toString().padStart(2, '0')}:${m}`;
};

export const calculateDaysRemaining = (dateString: string): number | null => {
  if (!dateString) return null;
  const target = parseDateLocal(dateString);
  if (!target) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  const diffTime = target.getTime() - today.getTime();
  return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
};

export const formatRelativeTime = (dateString: string): string => {
  if (!dateString) return '';
  const date = parseDateLocal(dateString);
  if (!date) return '';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);

  const diffTime = today.getTime() - date.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return 'in the future';
  }
  if (diffDays === 0) {
    return 'today';
  }
  if (diffDays === 1) {
    return '1 day ago';
  }
  if (diffDays < 7) {
    return `${diffDays} days ago`;
  }
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
  }
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    if (months >= 12) {
      return '1 year ago';
    }
    return `${months} ${months === 1 ? 'month' : 'months'} ago`;
  }
  const years = Math.floor(diffDays / 365);
  return `${years} ${years === 1 ? 'year' : 'years'} ago`;
};

export const getLogicalDate = (resetHour: number = 0, date: Date = new Date()): Date => {
  const logical = new Date(date);
  if (resetHour > 0 && logical.getHours() < resetHour) {
    logical.setDate(logical.getDate() - 1);
  }
  return logical;
};

export const getLogicalTodayStr = (resetHour: number = 0): string => {
  return formatDateLocal(getLogicalDate(resetHour, new Date()));
};

