/**
 * src/features/chat/utils/telemetryCompiler.ts
 * Phase 2: Compress user's app state into a compact system prompt injection.
 */
import { AppProgress, PlannerTask, MockScore, StudySession, ExamEntry, Subject } from '../../../shared/types';
import { CoPilotRecommendation } from '../../../shared/hooks/useStudyCoPilot';

interface TelemetryInput {
    progress: AppProgress;
    plannerTasks: PlannerTask[];
    mockScores: MockScore[];
    studySessions: StudySession[];
    examDates: ExamEntry[];
    physicsProgress: number;
    chemistryProgress: number;
    mathsProgress: number;
    overallProgress: number;
    recommendations: CoPilotRecommendation[];
    studyShares: Record<Subject, number>;
    totalWeeklyHours: number;
}

function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
}

export function buildTelemetryPayload(input: TelemetryInput): string {
    const now = new Date();
    const todayStr = now.toLocaleDateString('en-CA'); // YYYY-MM-DD

    // ── 1. Timestamp & Exam Countdown ──────────────────────────────────────────
    const primaryExam = input.examDates.find(e => e.isPrimary) ?? input.examDates[0];
    const daysToExam = primaryExam
        ? Math.max(0, Math.ceil((new Date(primaryExam.date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
        : null;

    // ── 2. Overall Progress ────────────────────────────────────────────────────
    const progressSection = `SYLLABUS PROGRESS:
- Physics: ${input.physicsProgress.toFixed(1)}%
- Chemistry: ${input.chemistryProgress.toFixed(1)}%
- Maths: ${input.mathsProgress.toFixed(1)}%
- Overall: ${input.overallProgress.toFixed(1)}%`;

    // ── 3. Active Planner Tasks (today + next 3 days) ──────────────────────────
    const upcomingTasks = input.plannerTasks
        .filter(t => !t.completed && t.date >= todayStr)
        .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
        .slice(0, 10)
        .map(t => `  • [${t.date} ${t.time}] ${t.title}${t.subtitle ? ` (${t.subtitle})` : ''}${t.wasShifted ? ' [OVERDUE]' : ''}`);

    const tasksSection = `UPCOMING TASKS (next 10):
${upcomingTasks.length > 0 ? upcomingTasks.join('\n') : '  (none)'}`;

    // ── 4. Recent Mock Scores (last 5) ─────────────────────────────────────────
    const recentMocks = [...input.mockScores]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5)
        .map(m => `  • ${m.date} | ${m.name} | P:${m.physicsMarks} C:${m.chemistryMarks} M:${m.mathsMarks} = ${m.totalMarks}/${m.maxMarks ?? 300}`);

    const mocksSection = `RECENT MOCK SCORES (last 5):
${recentMocks.length > 0 ? recentMocks.join('\n') : '  (none)'}`;

    // ── 5. Weekly Study Distribution ───────────────────────────────────────────
    const sharesSection = `WEEKLY STUDY DISTRIBUTION (last 7 days, total: ${input.totalWeeklyHours.toFixed(1)}h):
- Physics: ${(input.studyShares.physics * 100).toFixed(0)}%
- Chemistry: ${(input.studyShares.chemistry * 100).toFixed(0)}%
- Maths: ${(input.studyShares.maths * 100).toFixed(0)}%`;

    // ── 6. Today's Study Sessions ──────────────────────────────────────────────
    const todaysSessions = input.studySessions
        .filter(s => (s.localDate ?? s.startTime.split('T')[0]) === todayStr)
        .map(s => `  • ${s.title} (${formatDuration(s.duration)})${s.subject ? ` [${s.subject}]` : ''}`);

    const sessionsSection = `TODAY'S STUDY SESSIONS:
${todaysSessions.length > 0 ? todaysSessions.join('\n') : '  (none logged yet)'}`;

    // ── 7. CoPilot Top Recommendations (top 3) ─────────────────────────────────
    const topRecs = input.recommendations.slice(0, 3).map(r =>
        `  • [${r.type.toUpperCase()}] ${r.subject.toUpperCase()} Ch.${r.chapterSerial} "${r.chapterName}" — urgency ${r.urgencyIndex}/100. ${r.message}`
    );

    const recsSection = `AI COPILOT TOP RECOMMENDATIONS:
${topRecs.length > 0 ? topRecs.join('\n') : '  (no recommendations — keep up the work!)'}`;

    // ── Assemble ───────────────────────────────────────────────────────────────
    return [
        `NOW: ${now.toISOString()} (Local date: ${todayStr})`,
        primaryExam ? `EXAM: "${primaryExam.name}" on ${primaryExam.date} (${daysToExam} days away)` : 'EXAM: none set',
        '',
        progressSection,
        '',
        sharesSection,
        '',
        sessionsSection,
        '',
        tasksSection,
        '',
        mocksSection,
        '',
        recsSection,
    ].join('\n');
}
