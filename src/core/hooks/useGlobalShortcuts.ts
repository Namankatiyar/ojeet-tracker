import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLogicalTodayStr } from '../../shared/utils/date';
import { useUserProgress } from '../context/UserProgressContext';

export const useGlobalShortcuts = (onQuickAddTask: (date: string) => void) => {
  const navigate = useNavigate();
  const { dailyResetHour } = useUserProgress();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.altKey && event.key === 'n') {
        event.preventDefault();
        const today = getLogicalTodayStr(dailyResetHour);
        onQuickAddTask(today);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [navigate, onQuickAddTask, dailyResetHour]);
};
