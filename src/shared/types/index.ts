export type Priority = 'high' | 'medium' | 'low' | 'none';

export type Subject = 'physics' | 'chemistry' | 'maths';

export interface Chapter {
    serial: number;
    name: string;
    materials: string[];
}

export interface ChapterProgress {
    completed: Record<string, boolean>;
    priority: Priority;
}

export interface SubjectProgress {
    [chapterSerial: number]: ChapterProgress;
}

export interface AppProgress {
    physics: SubjectProgress;
    chemistry: SubjectProgress;
    maths: SubjectProgress;
}

export interface SubjectData {
    chapters: Chapter[];
    materialNames: string[];
}

export interface PlannerTask {
    id: string;
    title: string;
    subtitle?: string; // Material name for chapter tasks
    date: string; // YYYY-MM-DD
    time: string; // HH:mm
    completed: boolean;
    type: 'chapter' | 'custom';
    subject?: Subject;
    chapterSerial?: number;
    material?: string;
    completedAt?: string;
    wasShifted?: boolean; // True if this task was auto-moved from a past day
}

export interface StudySession {
    id: string;
    title: string;
    subject?: Subject;
    chapterSerial?: number;
    chapterName?: string;
    material?: string;
    type: 'chapter' | 'custom' | 'task';
    startTime: string;      // ISO timestamp
    endTime: string;        // ISO timestamp
    duration: number;       // in seconds
    timerMode?: 'stopwatch' | 'countdown' | 'pomodoro' | 'custom';
    profileId?: string;
}

export interface MockScore {
    id: string;
    name: string;           // e.g., "Mock Test 1", "NTA Mock 3"
    date: string;           // YYYY-MM-DD
    physicsMarks: number;
    chemistryMarks: number;
    mathsMarks: number;
    totalMarks: number;     // Sum of all three
    maxMarks?: number;      // Optional, defaults to 300
}

export interface ExamEntry {
    id: string;
    name: string;       // e.g. "JEE Mains", "JEE Advanced"
    date: string;       // YYYY-MM-DD
    isPrimary: boolean;  // The one shown in the main countdown display
}

export interface ProgressCardSettings {
    userName: string;
    customAvatarUrl: string;
    visibleStats: {
        totalStudyTime: boolean;
        highestMockScore: boolean;
        highestDailyHours: boolean;
        highestWeekAverage: boolean;
        physicsTime: boolean;
        chemistryTime: boolean;
        mathsTime: boolean;
        physicsProgress: boolean;
        chemistryProgress: boolean;
        mathsProgress: boolean;
        examCountdown: boolean;
    };
}
