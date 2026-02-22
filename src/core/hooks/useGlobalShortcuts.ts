import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDateLocal } from '../../shared/utils/date';

export const useGlobalShortcuts = (onQuickAddTask: (date: string) => void) => {
    const navigate = useNavigate();

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.altKey && event.key === 'n') {
                event.preventDefault();
                const today = formatDateLocal(new Date());
                onQuickAddTask(today);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [navigate, onQuickAddTask]);
};
