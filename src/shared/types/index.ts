export type Priority = 'high' | 'medium' | 'low' | 'none';

export type Subject = 'physics' | 'chemistry' | 'maths' | 'biology';
export type MockExamType = 'jm' | 'ja' | 'bt' | string;

export interface Chapter {
  serial: number;
  name: string;
  materials: string[];
  subtopics?: string[];
}

export interface SubtopicState {
  completed: Record<string, boolean>;
  attemptedByMaterial?: Record<string, number>;
  lastRevised?: string;
}

export interface ChapterProgress {
  completed: Record<string, boolean>;
  priority: Priority;
  detail?: ChapterDetailProgress;
  subtopics?: Record<string, SubtopicState>;
  updatedAt?: string;
}

export type ConfidenceLevel = 1 | 2 | 3 | 4 | 5;

export interface ChapterDetailProgress {
  attemptedByMaterial: Record<string, number>;
  confidence?: ConfidenceLevel;
  lastRevised?: string;
  revisionCount?: number;
  targetRevisionCount?: number;
  lectureCount?: number;
  targetLectureCount?: number;
  notes?: string;
  revisionHistory?: Array<{
    date: string;
    confidence: ConfidenceLevel;
  }>;
  lastActiveDate?: string;
}

export interface SubjectProgress {
  [chapterSerial: number]: ChapterProgress;
}

export interface SubjectStreak {
  currentStreak: number;
  lastStudiedDate?: string;
}

export interface AppProgress {
  physics: SubjectProgress;
  chemistry: SubjectProgress;
  maths: SubjectProgress;
  biology: SubjectProgress;
  streaks?: Record<Subject, SubjectStreak>;
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
  questions?: number; // Questions to attempt
  isLecture?: boolean;
  isRevision?: boolean;
  updatedAt?: string;
}

export interface StudySession {
  id: string;
  title: string;
  subject?: Subject;
  chapterSerial?: number;
  chapterName?: string;
  material?: string;
  type: 'chapter' | 'custom' | 'task';
  startTime: string; // ISO timestamp
  endTime: string; // ISO timestamp
  localDate?: string; // YYYY-MM-DD in local time
  duration: number; // in seconds
  timerMode?: 'stopwatch' | 'countdown' | 'pomodoro' | 'custom' | 'video';
  profileId?: string;
  sourceVideoId?: string;
}

export interface MockSubjectMarks {
  physics: number;
  chemistry: number;
  maths: number;
  biology?: number;
}

export interface MockExamPreset {
  id: string;
  name: string;
  shortName: string;
  paperCount: 1 | 2;
  subjectMaxMarks: MockSubjectMarks;
  enabledSubjects?: {
    physics: boolean;
    chemistry: boolean;
    maths: boolean;
    biology?: boolean;
  };
  targetScore?: number;
  updatedAt?: string;
}

export interface MockScore {
  id: string;
  name: string; // e.g., "Mock Test 1", "NTA Mock 3"
  date: string; // YYYY-MM-DD
  examType?: MockExamType;
  physicsMarks: number;
  chemistryMarks: number;
  mathsMarks: number;
  biologyMarks?: number;
  examMode?: 'jee' | 'neet';
  totalMarks: number; // Sum of all three
  maxMarks?: number; // Optional, defaults to 300
  paper1Marks?: MockSubjectMarks;
  paper2Marks?: MockSubjectMarks;
  attemptedQuestions?: MockSubjectMarks;
  wrongQuestions?: MockSubjectMarks;
  totalTimeAllotted?: number; // in minutes
  timeSpent?: MockSubjectMarks; // in minutes
  weakChapters?: Array<{
    subject: Subject;
    chapterSerial: number;
    chapterName: string;
  }>;
  weakSubtopics?: Array<{
    subject: Subject;
    chapterSerial: number;
    chapterName: string;
    subtopicName: string;
  }>;
  footnotes?: string;
  updatedAt?: string;
}

export interface ExamEntry {
  id: string;
  name: string; // e.g. "JEE Mains", "JEE Advanced"
  date: string; // YYYY-MM-DD
  isPrimary: boolean; // The one shown in the main countdown display
  isFavourite?: boolean; // NEW — drives dashboard progress scoping
  syllabus?: ExamSyllabus; // NEW — absent means full syllabus
  updatedAt?: string;
}

// Chapter serials selected per subject. A subject key that is absent OR maps to an
// empty array means "all chapters for that subject".
export type ExamSyllabus = Partial<Record<Subject, number[]>>;

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
    biologyTime?: boolean;
    physicsProgress: boolean;
    chemistryProgress: boolean;
    mathsProgress: boolean;
    biologyProgress?: boolean;
    examCountdown: boolean;
  };
  bannerUrl?: string;
  customStatus?: string;
  gradeStatus?: string;
  targetExam?: string;
  discordSpecialTag?: string;
  inviteCode?: string;
  showTasks?: boolean;
}

export interface RemoteProfile {
  id: string;
  display_name?: string;
  username?: string;
  avatar_url?: string;
  banner_url?: string;
  custom_status?: string;
  invite_code?: string;
  streak_count: number;
  discord_tag?: string;
  grade_status?: string;
  target_exam?: string;
  today_study_seconds: number;
  today_questions: number;
  momentum_heatmap: any[];
  todays_tasks: any[];
  weekly_hours?: number;
  leaderboard_invalidated?: boolean;
  updated_at?: string;
}

export interface LiveActivity {
  user_id: string;
  is_active: boolean;
  subject?: string | null;
  chapter_name?: string | null;
  chapter_serial?: number | null;
  material?: string | null;
  started_at?: string | null;
  updated_at: string;
}

// ponytail: minimal shape matching leaderboard_snapshot table columns
export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  display_name?: string;
  username?: string;
  avatar_url?: string;
  hours: number;
  /** @deprecated use `hours` instead — kept for snapshot backward-compat */
  weekly_hours?: number;
}

export type LeaderboardMode = 'daily' | 'weekly' | 'monthly';
