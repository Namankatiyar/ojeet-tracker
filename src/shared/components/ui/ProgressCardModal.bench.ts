import { describe, bench } from 'vitest';

interface StudySession {
    id: string;
    title: string;
    subject?: 'physics' | 'chemistry' | 'maths';
    startTime: string;
    duration: number;
    type: 'chapter' | 'custom' | 'task';
}

const generateMockSessions = (count: number): StudySession[] => {
    const sessions: StudySession[] = [];
    const subjects: ('physics' | 'chemistry' | 'maths')[] = ['physics', 'chemistry', 'maths'];
    const now = Date.now();
    for (let i = 0; i < count; i++) {
        const subject = subjects[i % 3];
        const date = new Date(now - Math.random() * 365 * 24 * 60 * 60 * 1000);
        sessions.push({
            id: `session-${i}`,
            title: `Study ${i}`,
            subject,
            duration: Math.floor(Math.random() * 7200), // up to 2 hours
            startTime: date.toISOString(),
            type: 'custom',
        });
    }
    return sessions;
};

const studySessions = generateMockSessions(10000);

describe('ProgressCardModal stats calculation', () => {
    bench('baseline logic', () => {
        // Calculate total time
        const totalStudyTime = studySessions.reduce((acc, s) => acc + s.duration, 0);

        // Calculate study time by subject
        const physicsTime = studySessions.filter(s => s.subject === 'physics').reduce((acc, s) => acc + s.duration, 0);
        const chemistryTime = studySessions.filter(s => s.subject === 'chemistry').reduce((acc, s) => acc + s.duration, 0);
        const mathsTime = studySessions.filter(s => s.subject === 'maths').reduce((acc, s) => acc + s.duration, 0);

        // Calculate highest daily hours
        const sessionsByDay: Record<string, number> = {};
        studySessions.forEach(s => {
            const date = s.startTime.split('T')[0];
            sessionsByDay[date] = (sessionsByDay[date] || 0) + s.duration;
        });

        // Calculate highest week average
        const getWeekKey = (dateStr: string) => {
            const date = new Date(dateStr);
            const startOfYear = new Date(date.getFullYear(), 0, 1);
            const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
            return `${date.getFullYear()}-W${Math.ceil((days + 1) / 7)}`;
        };
        const sessionsByWeek: Record<string, { total: number; days: Set<string> }> = {};
        studySessions.forEach(s => {
            const date = s.startTime.split('T')[0];
            const weekKey = getWeekKey(date);
            if (!sessionsByWeek[weekKey]) {
                sessionsByWeek[weekKey] = { total: 0, days: new Set() };
            }
            sessionsByWeek[weekKey].total += s.duration;
            sessionsByWeek[weekKey].days.add(date);
        });

        // Prevent TS unused variable warnings
        void totalStudyTime; void physicsTime; void chemistryTime; void mathsTime;
        void sessionsByDay; void sessionsByWeek;
    });

    bench('optimized logic', () => {
        let totalStudyTime = 0;
        let physicsTime = 0;
        let chemistryTime = 0;
        let mathsTime = 0;
        const sessionsByDay: Record<string, number> = {};
        const sessionsByWeek: Record<string, { total: number; days: Set<string> }> = {};

        const getWeekKey = (dateStr: string) => {
            const date = new Date(dateStr);
            const startOfYear = new Date(date.getFullYear(), 0, 1);
            const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
            return `${date.getFullYear()}-W${Math.ceil((days + 1) / 7)}`;
        };

        studySessions.forEach(s => {
            const duration = s.duration;
            totalStudyTime += duration;

            if (s.subject === 'physics') {
                physicsTime += duration;
            } else if (s.subject === 'chemistry') {
                chemistryTime += duration;
            } else if (s.subject === 'maths') {
                mathsTime += duration;
            }

            const date = s.startTime.split('T')[0];
            sessionsByDay[date] = (sessionsByDay[date] || 0) + duration;

            const weekKey = getWeekKey(date);
            if (!sessionsByWeek[weekKey]) {
                sessionsByWeek[weekKey] = { total: 0, days: new Set() };
            }
            sessionsByWeek[weekKey].total += duration;
            sessionsByWeek[weekKey].days.add(date);
        });

        // Prevent TS unused variable warnings
        void totalStudyTime; void physicsTime; void chemistryTime; void mathsTime;
        void sessionsByDay; void sessionsByWeek;
    });
});
