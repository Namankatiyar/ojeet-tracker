/**
 * src/features/chat/hooks/useAgentTools.ts
 * Phase 3: Tool wrappers + Gemini function declaration schemas
 */
import { useCallback, useMemo } from 'react';
import { type Tool, type FunctionDeclaration, Type } from '@google/genai';
import { useUserProgress } from '../../../core/context/UserProgressContext';
import { useSubjectData } from '../../../core/context/SubjectDataContext';
import { useStudyCoPilot } from '../../../shared/hooks/useStudyCoPilot';
import {
  Subject,
  Priority,
  PlannerTask,
  StudySession,
  ConfidenceLevel,
  Chapter,
  MockScore,
  MockExamPreset,
  MockSubjectMarks,
} from '../../../shared/types';

// ── Fuzzy Matching ─────────────────────────────────────────────────────────────
function fuzzyFindSubtopic(subtopics: string[], query: string): string | null {
  const q = query.toLowerCase().trim();
  // Exact match first
  const exact = subtopics.find((s) => s.toLowerCase() === q);
  if (exact) return exact;
  // Includes match
  const includes = subtopics.find(
    (s) => s.toLowerCase().includes(q) || q.includes(s.toLowerCase())
  );
  if (includes) return includes;
  // Levenshtein-lite: find closest by character overlap
  let best: string | null = null;
  let bestScore = 0;
  for (const s of subtopics) {
    const sl = s.toLowerCase();
    let score = 0;
    for (let i = 0; i < Math.min(q.length, sl.length); i++) {
      if (q[i] === sl[i]) score++;
    }
    if (score > bestScore && score > Math.floor(Math.min(q.length, sl.length) / 2)) {
      bestScore = score;
      best = s;
    }
  }
  return best;
}

function fuzzyFindChapter(chapters: Chapter[], query: string): Chapter | null {
  const q = query.toLowerCase().trim();
  const exact = chapters.find((c) => c.name.toLowerCase() === q);
  if (exact) return exact;
  const includes = chapters.find(
    (c) => c.name.toLowerCase().includes(q) || q.includes(c.name.toLowerCase())
  );
  if (includes) return includes;
  return null;
}

// ── Tool Result Helper ─────────────────────────────────────────────────────────
function ok(message: string, data?: unknown): string {
  return JSON.stringify({ success: true, message, data });
}
function err(message: string): string {
  return JSON.stringify({ success: false, error: message });
}

// ── Hook ───────────────────────────────────────────────────────────────────────
export function useAgentTools() {
  const {
    plannerTasks,
    mockScores,
    studySessions,
    examDates,
    progress,
    handleToggleMaterial,
    handleSetPriority,
    handleToggleSubtopicMaterial,
    handleUpdateSubtopicAttempted,
    handleSetSubtopicLastRevised,
    handleAddPlannerTask,
    handleTogglePlannerTask,
    handleDeletePlannerTask,
    handleAddStudySession,
    handleDeleteStudySession,
    handleAddMockScore,
    handleDeleteMockScore,
    handleEditMockScore,
    mockExamPresets,
    handleAddMockExamPreset,
    handleDeleteMockExamPreset,
    handleUpdateMockExamPreset,
    handleAddExam,
    handleDeleteExam,
    handleSetPrimaryExam,
  } = useUserProgress();

  const { mergedSubjectData } = useSubjectData();
  const { addRevisionToPlanner, markChapterRevised } = useStudyCoPilot();

  // ── PROGRESS TOOLS ────────────────────────────────────────────────────────
  const toggleChapterMaterial = useCallback(
    (subject: Subject, chapterName: string, material: string): string => {
      const chapters = mergedSubjectData[subject]?.chapters ?? [];
      const chapter = fuzzyFindChapter(chapters, chapterName);
      if (!chapter) return err(`Chapter "${chapterName}" not found in ${subject}.`);
      handleToggleMaterial(subject, chapter.serial, material);
      return ok(`Toggled "${material}" for ${subject} Ch.${chapter.serial} "${chapter.name}".`);
    },
    [mergedSubjectData, handleToggleMaterial]
  );

  const toggleSubtopicMaterial = useCallback(
    (subject: Subject, chapterName: string, subtopicName: string, material: string): string => {
      const chapters = mergedSubjectData[subject]?.chapters ?? [];
      const chapter = fuzzyFindChapter(chapters, chapterName);
      if (!chapter) return err(`Chapter "${chapterName}" not found in ${subject}.`);
      const subtopics = chapter.subtopics ?? [];
      const subtopic = fuzzyFindSubtopic(subtopics, subtopicName);
      if (!subtopic)
        return err(`Subtopic "${subtopicName}" not found in chapter "${chapter.name}".`);
      handleToggleSubtopicMaterial(subject, chapter.serial, subtopic, material);
      return ok(
        `Toggled "${material}" for subtopic "${subtopic}" in ${subject} "${chapter.name}".`
      );
    },
    [mergedSubjectData, handleToggleSubtopicMaterial]
  );

  const updateSubtopicAttempted = useCallback(
    (
      subject: Subject,
      chapterName: string,
      subtopicName: string,
      material: string,
      count: number
    ): string => {
      const chapters = mergedSubjectData[subject]?.chapters ?? [];
      const chapter = fuzzyFindChapter(chapters, chapterName);
      if (!chapter) return err(`Chapter "${chapterName}" not found.`);
      const subtopics = chapter.subtopics ?? [];
      const subtopic = fuzzyFindSubtopic(subtopics, subtopicName);
      if (!subtopic) return err(`Subtopic "${subtopicName}" not found.`);
      handleUpdateSubtopicAttempted(subject, chapter.serial, subtopic, material, count);
      return ok(`Set ${count} questions attempted for "${subtopic}" / "${material}".`);
    },
    [mergedSubjectData, handleUpdateSubtopicAttempted]
  );

  const setSubtopicLastRevised = useCallback(
    (
      subject: Subject,
      chapterName: string,
      subtopicName: string,
      date: string | undefined
    ): string => {
      const chapters = mergedSubjectData[subject]?.chapters ?? [];
      const chapter = fuzzyFindChapter(chapters, chapterName);
      if (!chapter) return err(`Chapter "${chapterName}" not found.`);
      const subtopics = chapter.subtopics ?? [];
      const subtopic = fuzzyFindSubtopic(subtopics, subtopicName);
      if (!subtopic) return err(`Subtopic "${subtopicName}" not found.`);
      handleSetSubtopicLastRevised(subject, chapter.serial, subtopic, date);
      return ok(`Set last revised date for "${subtopic}" to ${date ?? 'cleared'}.`);
    },
    [mergedSubjectData, handleSetSubtopicLastRevised]
  );

  const setChapterPriority = useCallback(
    (subject: Subject, chapterName: string, priority: Priority): string => {
      const chapters = mergedSubjectData[subject]?.chapters ?? [];
      const chapter = fuzzyFindChapter(chapters, chapterName);
      if (!chapter) return err(`Chapter "${chapterName}" not found.`);
      handleSetPriority(subject, chapter.serial, priority);
      return ok(`Set priority "${priority}" for ${subject} "${chapter.name}".`);
    },
    [mergedSubjectData, handleSetPriority]
  );

  const markChapterRevisedTool = useCallback(
    (subject: Subject, chapterName: string, confidence?: ConfidenceLevel): string => {
      const chapters = mergedSubjectData[subject]?.chapters ?? [];
      const chapter = fuzzyFindChapter(chapters, chapterName);
      if (!chapter) return err(`Chapter "${chapterName}" not found.`);
      markChapterRevised(subject, chapter.serial, confidence);
      return ok(`Marked "${chapter.name}" as revised with confidence ${confidence ?? 3}.`);
    },
    [mergedSubjectData, markChapterRevised]
  );

  // ── PLANNER TOOLS ─────────────────────────────────────────────────────────
  const addPlannerTask = useCallback(
    (
      title: string,
      date: string,
      time: string = '08:00',
      subject?: Subject,
      chapterName?: string,
      material?: string,
      questions?: number,
      isLecture?: boolean
    ): string => {
      let chapterSerial: number | undefined;
      let resolvedTitle = title;
      if (subject && chapterName) {
        const chapters = mergedSubjectData[subject]?.chapters ?? [];
        const ch = fuzzyFindChapter(chapters, chapterName);
        if (ch) {
          chapterSerial = ch.serial;
          resolvedTitle = ch.name;
        }
      }

      const cleanTitle = resolvedTitle.replace(/\s*\(\d+\s*Qs\)$/, '');
      const finalTitle =
        questions && questions > 0 ? `${cleanTitle} (${questions} Qs)` : cleanTitle;

      const task: PlannerTask = {
        id: `agent-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title: finalTitle,
        date,
        time,
        completed: false,
        type: subject ? 'chapter' : 'custom',
        subject,
        chapterSerial,
        material,
        questions: questions && questions > 0 ? questions : undefined,
        isLecture,
      };
      handleAddPlannerTask(task);
      return ok(`Added task "${finalTitle}" on ${date} at ${time}.`, { taskId: task.id });
    },
    [mergedSubjectData, handleAddPlannerTask]
  );

  const togglePlannerTask = useCallback(
    (taskId: string): string => {
      const task = plannerTasks.find((t) => t.id === taskId);
      if (!task) return err(`Task "${taskId}" not found.`);
      handleTogglePlannerTask(taskId);
      return ok(`Task "${task.title}" toggled to ${!task.completed ? 'complete' : 'incomplete'}.`);
    },
    [plannerTasks, handleTogglePlannerTask]
  );

  const deletePlannerTask = useCallback(
    (taskId: string): string => {
      const task = plannerTasks.find((t) => t.id === taskId);
      if (!task) return err(`Task "${taskId}" not found.`);
      handleDeletePlannerTask(taskId);
      return ok(`Deleted task "${task.title}".`);
    },
    [plannerTasks, handleDeletePlannerTask]
  );

  const scheduleRevision = useCallback(
    (subject: Subject, chapterName: string): string => {
      const chapters = mergedSubjectData[subject]?.chapters ?? [];
      const chapter = fuzzyFindChapter(chapters, chapterName);
      if (!chapter) return err(`Chapter "${chapterName}" not found.`);
      // Build a minimal recommendation to reuse addRevisionToPlanner
      addRevisionToPlanner({
        id: `manual-${Date.now()}`,
        type: 'revision',
        subject,
        chapterSerial: chapter.serial,
        chapterName: chapter.name,
        urgencyIndex: 50,
        message: '',
        metadata: {},
      });
      return ok(`Scheduled revision task for "${chapter.name}" in today's planner.`);
    },
    [mergedSubjectData, addRevisionToPlanner]
  );

  const listPlannerTasks = useCallback(
    (dateFilter?: string): string => {
      const tasks = dateFilter
        ? plannerTasks.filter((t) => t.date === dateFilter)
        : plannerTasks.filter((t) => !t.completed).slice(0, 20);
      return ok(
        `Found ${tasks.length} tasks.`,
        tasks.map((t) => ({
          id: t.id,
          title: t.title,
          date: t.date,
          time: t.time,
          completed: t.completed,
          subject: t.subject,
          isLecture: t.isLecture,
        }))
      );
    },
    [plannerTasks]
  );

  // ── STUDY SESSION TOOLS ───────────────────────────────────────────────────
  const logStudySession = useCallback(
    (
      title: string,
      durationMinutes: number,
      subject?: Subject,
      chapterName?: string,
      material?: string,
      date?: string
    ): string => {
      const localDate = date ?? new Date().toLocaleDateString('en-CA');
      const endTime = new Date().toISOString();
      const startTime = new Date(Date.now() - durationMinutes * 60 * 1000).toISOString();
      let chapterSerial: number | undefined;
      let chapterNameResolved: string | undefined;
      if (subject && chapterName) {
        const chapters = mergedSubjectData[subject]?.chapters ?? [];
        const ch = fuzzyFindChapter(chapters, chapterName);
        if (ch) {
          chapterSerial = ch.serial;
          chapterNameResolved = ch.name;
        }
      }
      const session: StudySession = {
        id: `agent-session-${Date.now()}`,
        title,
        subject,
        chapterSerial,
        chapterName: chapterNameResolved,
        material,
        type: subject ? 'chapter' : 'custom',
        startTime,
        endTime,
        localDate,
        duration: durationMinutes * 60,
        timerMode: 'custom',
      };
      handleAddStudySession(session);
      return ok(`Logged ${durationMinutes}m study session: "${title}".`, { sessionId: session.id });
    },
    [mergedSubjectData, handleAddStudySession]
  );

  const deleteStudySession = useCallback(
    (sessionId: string): string => {
      const session = studySessions.find((s) => s.id === sessionId);
      if (!session) return err(`Session "${sessionId}" not found.`);
      handleDeleteStudySession(sessionId);
      return ok(`Deleted session "${session.title}".`);
    },
    [studySessions, handleDeleteStudySession]
  );

  const listStudySessions = useCallback(
    (dateFilter?: string): string => {
      const sessions = dateFilter
        ? studySessions.filter((s) => (s.localDate ?? s.startTime.split('T')[0]) === dateFilter)
        : [...studySessions]
            .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
            .slice(0, 10);
      return ok(
        `Found ${sessions.length} sessions.`,
        sessions.map((s) => ({
          id: s.id,
          title: s.title,
          subject: s.subject,
          duration: s.duration,
          localDate: s.localDate,
        }))
      );
    },
    [studySessions]
  );

  // ── MOCK SCORE TOOLS ──────────────────────────────────────────────────────
  const addMockScore = useCallback(
    (
      name: string,
      date: string,
      physicsMarks: number,
      chemistryMarks: number,
      mathsMarks: number,
      maxMarks?: number,
      examType?: string,
      paper1Marks?: MockSubjectMarks,
      paper2Marks?: MockSubjectMarks,
      attemptedQuestions?: MockSubjectMarks,
      wrongQuestions?: MockSubjectMarks,
      totalTimeAllotted?: number,
      timeSpent?: MockSubjectMarks,
      weakChapters?: Array<{ subject: Subject; chapter_name: string }>,
      weakSubtopics?: Array<{ subject: Subject; chapter_name: string; subtopic_name: string }>,
      footnotes?: string
    ): string => {
      const totalMarks = physicsMarks + chemistryMarks + mathsMarks;

      const resolvedWeakChapters = (weakChapters || [])
        .map((wc) => {
          const chapters = mergedSubjectData[wc.subject]?.chapters ?? [];
          const ch = fuzzyFindChapter(chapters, wc.chapter_name);
          if (ch) {
            return {
              subject: wc.subject,
              chapterSerial: ch.serial,
              chapterName: ch.name,
            };
          }
          return null;
        })
        .filter(Boolean) as Array<{ subject: Subject; chapterSerial: number; chapterName: string }>;

      const resolvedWeakSubtopics = (weakSubtopics || [])
        .map((ws) => {
          const chapters = mergedSubjectData[ws.subject]?.chapters ?? [];
          const ch = fuzzyFindChapter(chapters, ws.chapter_name);
          if (ch) {
            const subtopics = ch.subtopics ?? [];
            const sub = fuzzyFindSubtopic(subtopics, ws.subtopic_name);
            if (sub) {
              return {
                subject: ws.subject,
                chapterSerial: ch.serial,
                chapterName: ch.name,
                subtopicName: sub,
              };
            }
          }
          return null;
        })
        .filter(Boolean) as Array<{
        subject: Subject;
        chapterSerial: number;
        chapterName: string;
        subtopicName: string;
      }>;

      handleAddMockScore({
        name,
        date,
        examType,
        physicsMarks,
        chemistryMarks,
        mathsMarks,
        totalMarks,
        maxMarks: maxMarks ?? 300,
        paper1Marks,
        paper2Marks,
        attemptedQuestions,
        wrongQuestions,
        totalTimeAllotted,
        timeSpent,
        weakChapters: resolvedWeakChapters.length > 0 ? resolvedWeakChapters : undefined,
        weakSubtopics: resolvedWeakSubtopics.length > 0 ? resolvedWeakSubtopics : undefined,
        footnotes: footnotes?.trim() || undefined,
      });

      return ok(
        `Logged mock "${name}" on ${date}: P${physicsMarks} C${chemistryMarks} M${mathsMarks} = ${totalMarks}.`
      );
    },
    [handleAddMockScore, mergedSubjectData]
  );

  const updateMockScore = useCallback(
    (
      scoreId: string,
      name?: string,
      date?: string,
      physicsMarks?: number,
      chemistryMarks?: number,
      mathsMarks?: number,
      maxMarks?: number,
      examType?: string,
      paper1Marks?: MockSubjectMarks,
      paper2Marks?: MockSubjectMarks,
      attemptedQuestions?: MockSubjectMarks,
      wrongQuestions?: MockSubjectMarks,
      totalTimeAllotted?: number,
      timeSpent?: MockSubjectMarks,
      weakChapters?: Array<{ subject: Subject; chapter_name: string }>,
      weakSubtopics?: Array<{ subject: Subject; chapter_name: string; subtopic_name: string }>,
      footnotes?: string
    ): string => {
      const existing = mockScores.find((s) => s.id === scoreId);
      if (!existing) return err(`Mock score "${scoreId}" not found.`);

      const resolvedPhysics = physicsMarks !== undefined ? physicsMarks : existing.physicsMarks;
      const resolvedChemistry = chemistryMarks !== undefined ? chemistryMarks : existing.chemistryMarks;
      const resolvedMaths = mathsMarks !== undefined ? mathsMarks : existing.mathsMarks;
      const resolvedTotal = resolvedPhysics + resolvedChemistry + resolvedMaths;

      const resolvedWeakChapters =
        weakChapters !== undefined
          ? (weakChapters || [])
              .map((wc) => {
                const chapters = mergedSubjectData[wc.subject]?.chapters ?? [];
                const ch = fuzzyFindChapter(chapters, wc.chapter_name);
                if (ch) {
                  return {
                    subject: wc.subject,
                    chapterSerial: ch.serial,
                    chapterName: ch.name,
                  };
                }
                return null;
              })
              .filter(Boolean) as Array<{ subject: Subject; chapterSerial: number; chapterName: string }>
          : existing.weakChapters;

      const resolvedWeakSubtopics =
        weakSubtopics !== undefined
          ? (weakSubtopics || [])
              .map((ws) => {
                const chapters = mergedSubjectData[ws.subject]?.chapters ?? [];
                const ch = fuzzyFindChapter(chapters, ws.chapter_name);
                if (ch) {
                  const subtopics = ch.subtopics ?? [];
                  const sub = fuzzyFindSubtopic(subtopics, ws.subtopic_name);
                  if (sub) {
                    return {
                      subject: ws.subject,
                      chapterSerial: ch.serial,
                      chapterName: ch.name,
                      subtopicName: sub,
                    };
                  }
                }
                return null;
              })
              .filter(Boolean) as Array<{
              subject: Subject;
              chapterSerial: number;
              chapterName: string;
              subtopicName: string;
            }>
          : existing.weakSubtopics;

      const updatedScore: MockScore = {
        ...existing,
        name: name !== undefined ? name : existing.name,
        date: date !== undefined ? date : existing.date,
        examType: examType !== undefined ? examType : existing.examType,
        physicsMarks: resolvedPhysics,
        chemistryMarks: resolvedChemistry,
        mathsMarks: resolvedMaths,
        totalMarks: resolvedTotal,
        maxMarks: maxMarks !== undefined ? maxMarks : existing.maxMarks,
        paper1Marks: paper1Marks !== undefined ? paper1Marks : existing.paper1Marks,
        paper2Marks: paper2Marks !== undefined ? paper2Marks : existing.paper2Marks,
        attemptedQuestions: attemptedQuestions !== undefined ? attemptedQuestions : existing.attemptedQuestions,
        wrongQuestions: wrongQuestions !== undefined ? wrongQuestions : existing.wrongQuestions,
        totalTimeAllotted: totalTimeAllotted !== undefined ? totalTimeAllotted : existing.totalTimeAllotted,
        timeSpent: timeSpent !== undefined ? timeSpent : existing.timeSpent,
        weakChapters: resolvedWeakChapters && resolvedWeakChapters.length > 0 ? resolvedWeakChapters : undefined,
        weakSubtopics: resolvedWeakSubtopics && resolvedWeakSubtopics.length > 0 ? resolvedWeakSubtopics : undefined,
        footnotes: footnotes !== undefined ? footnotes.trim() || undefined : existing.footnotes,
      };

      handleEditMockScore(updatedScore);
      return ok(`Updated mock score "${updatedScore.name}".`);
    },
    [mockScores, handleEditMockScore, mergedSubjectData]
  );

  const deleteMockScore = useCallback(
    (scoreId: string): string => {
      const score = mockScores.find((s) => s.id === scoreId);
      if (!score) return err(`Mock score "${scoreId}" not found.`);
      handleDeleteMockScore(scoreId);
      return ok(`Deleted mock score "${score.name}".`);
    },
    [mockScores, handleDeleteMockScore]
  );

  const listMockScores = useCallback((): string => {
    return ok(`Found ${mockScores.length} mock scores.`, mockScores);
  }, [mockScores]);

  const listMockPresets = useCallback((): string => {
    return ok(`Found ${mockExamPresets.length} mock presets.`, mockExamPresets);
  }, [mockExamPresets]);

  const addMockPreset = useCallback(
    (
      id: string,
      name: string,
      shortName: string,
      paperCount: number,
      physicsMax: number,
      chemistryMax: number,
      mathsMax: number,
      enabledSubjects?: { physics?: boolean; chemistry?: boolean; maths?: boolean }
    ): string => {
      if (mockExamPresets.some((p) => p.id === id)) {
        return err(`Preset with ID "${id}" already exists.`);
      }
      const preset: MockExamPreset = {
        id,
        name,
        shortName,
        paperCount: paperCount as 1 | 2,
        subjectMaxMarks: {
          physics: physicsMax,
          chemistry: chemistryMax,
          maths: mathsMax,
        },
        enabledSubjects: {
          physics: enabledSubjects?.physics ?? true,
          chemistry: enabledSubjects?.chemistry ?? true,
          maths: enabledSubjects?.maths ?? true,
        },
      };
      handleAddMockExamPreset(preset);
      return ok(`Added mock exam preset "${name}" (${shortName}).`);
    },
    [mockExamPresets, handleAddMockExamPreset]
  );

  const updateMockPreset = useCallback(
    (
      presetId: string,
      name?: string,
      shortName?: string,
      paperCount?: number,
      physicsMax?: number,
      chemistryMax?: number,
      mathsMax?: number,
      enabledSubjects?: { physics?: boolean; chemistry?: boolean; maths?: boolean }
    ): string => {
      const existing = mockExamPresets.find((p) => p.id === presetId);
      if (!existing) return err(`Preset with ID "${presetId}" not found.`);

      const updated: MockExamPreset = {
        ...existing,
        name: name !== undefined ? name : existing.name,
        shortName: shortName !== undefined ? shortName : existing.shortName,
        paperCount: paperCount !== undefined ? (paperCount as 1 | 2) : existing.paperCount,
        subjectMaxMarks: {
          physics: physicsMax !== undefined ? physicsMax : existing.subjectMaxMarks.physics,
          chemistry: chemistryMax !== undefined ? chemistryMax : existing.subjectMaxMarks.chemistry,
          maths: mathsMax !== undefined ? mathsMax : existing.subjectMaxMarks.maths,
        },
        enabledSubjects:
          enabledSubjects !== undefined
            ? {
                physics: enabledSubjects.physics ?? existing.enabledSubjects?.physics ?? true,
                chemistry: enabledSubjects.chemistry ?? existing.enabledSubjects?.chemistry ?? true,
                maths: enabledSubjects.maths ?? existing.enabledSubjects?.maths ?? true,
              }
            : existing.enabledSubjects,
      };

      handleUpdateMockExamPreset(updated);
      return ok(`Updated mock exam preset "${updated.name}".`);
    },
    [mockExamPresets, handleUpdateMockExamPreset]
  );

  const deleteMockPreset = useCallback(
    (presetId: string): string => {
      const existing = mockExamPresets.find((p) => p.id === presetId);
      if (!existing) return err(`Preset with ID "${presetId}" not found.`);

      if (mockExamPresets.length <= 1) {
        return err(`Cannot delete the only remaining preset.`);
      }

      handleDeleteMockExamPreset(presetId);
      return ok(`Deleted mock exam preset "${existing.name}".`);
    },
    [mockExamPresets, handleDeleteMockExamPreset]
  );

  // ── EXAM DATE TOOLS ───────────────────────────────────────────────────────
  const addExamDate = useCallback(
    (name: string, date: string, isPrimary: boolean = false): string => {
      handleAddExam({ name, date, isPrimary });
      return ok(`Added exam "${name}" on ${date}.`);
    },
    [handleAddExam]
  );

  const deleteExamDate = useCallback(
    (examId: string): string => {
      const exam = examDates.find((e) => e.id === examId);
      if (!exam) return err(`Exam "${examId}" not found.`);
      handleDeleteExam(examId);
      return ok(`Deleted exam "${exam.name}".`);
    },
    [examDates, handleDeleteExam]
  );

  const listExamDates = useCallback((): string => {
    return ok(`Found ${examDates.length} exam dates.`, examDates);
  }, [examDates]);

  const setPrimaryExam = useCallback(
    (examId: string): string => {
      const exam = examDates.find((e) => e.id === examId);
      if (!exam) return err(`Exam "${examId}" not found.`);
      handleSetPrimaryExam(examId);
      return ok(`Set "${exam.name}" as the primary exam.`);
    },
    [examDates, handleSetPrimaryExam]
  );

  // ── READ/QUERY TOOLS ───────────────────────────────────────────────────────
  const getChapterProgress = useCallback(
    (subject: Subject, chapterName: string): string => {
      const chapters = mergedSubjectData[subject]?.chapters ?? [];
      const chapter = fuzzyFindChapter(chapters, chapterName);
      if (!chapter) return err(`Chapter "${chapterName}" not found.`);
      const chapProgress = progress[subject]?.[chapter.serial];
      return ok(`Progress for ${subject} "${chapter.name}".`, {
        chapter: {
          serial: chapter.serial,
          name: chapter.name,
          materials: chapter.materials,
          subtopics: chapter.subtopics,
        },
        progress: chapProgress,
      });
    },
    [mergedSubjectData, progress]
  );

  const getSubjectChapters = useCallback(
    (subject: Subject): string => {
      const data = mergedSubjectData[subject];
      if (!data) return err(`Subject "${subject}" data not loaded.`);
      return ok(
        `Chapters for ${subject}.`,
        data.chapters.map((c) => ({
          serial: c.serial,
          name: c.name,
          materials: c.materials,
          subtopicCount: c.subtopics?.length ?? 0,
        }))
      );
    },
    [mergedSubjectData]
  );

  // ── EXECUTOR MAP ──────────────────────────────────────────────────────────
  const executors: Record<string, (args: Record<string, any>) => string> = useMemo(
    () => ({
      // Progress
      toggle_chapter_material: (args: Record<string, unknown>) =>
        toggleChapterMaterial(
          args.subject as Subject,
          args.chapter_name as string,
          args.material as string
        ),
      toggle_subtopic_material: (args: Record<string, unknown>) =>
        toggleSubtopicMaterial(
          args.subject as Subject,
          args.chapter_name as string,
          args.subtopic_name as string,
          args.material as string
        ),
      update_subtopic_attempted: (args: Record<string, unknown>) =>
        updateSubtopicAttempted(
          args.subject as Subject,
          args.chapter_name as string,
          args.subtopic_name as string,
          args.material as string,
          args.count as number
        ),
      set_subtopic_last_revised: (args: Record<string, unknown>) =>
        setSubtopicLastRevised(
          args.subject as Subject,
          args.chapter_name as string,
          args.subtopic_name as string,
          args.date as string | undefined
        ),
      set_chapter_priority: (args: Record<string, unknown>) =>
        setChapterPriority(
          args.subject as Subject,
          args.chapter_name as string,
          args.priority as Priority
        ),
      mark_chapter_revised: (args: Record<string, unknown>) =>
        markChapterRevisedTool(
          args.subject as Subject,
          args.chapter_name as string,
          args.confidence as ConfidenceLevel | undefined
        ),
      // Planner
      add_planner_task: (args: Record<string, unknown>) =>
        addPlannerTask(
          args.title as string,
          args.date as string,
          args.time as string | undefined,
          args.subject as Subject | undefined,
          args.chapter_name as string | undefined,
          args.material as string | undefined,
          args.questions as number | undefined,
          args.is_lecture as boolean | undefined
        ),
      toggle_planner_task: (args: Record<string, unknown>) =>
        togglePlannerTask(args.task_id as string),
      delete_planner_task: (args: Record<string, unknown>) =>
        deletePlannerTask(args.task_id as string),
      list_planner_tasks: (args: Record<string, unknown>) =>
        listPlannerTasks(args.date as string | undefined),
      schedule_revision: (args: Record<string, unknown>) =>
        scheduleRevision(args.subject as Subject, args.chapter_name as string),
      // Sessions
      log_study_session: (args: Record<string, unknown>) =>
        logStudySession(
          args.title as string,
          args.duration_minutes as number,
          args.subject as Subject | undefined,
          args.chapter_name as string | undefined,
          args.material as string | undefined,
          args.date as string | undefined
        ),
      delete_study_session: (args: Record<string, unknown>) =>
        deleteStudySession(args.session_id as string),
      list_study_sessions: (args: Record<string, unknown>) =>
        listStudySessions(args.date as string | undefined),
      // Mocks
      add_mock_score: (args: Record<string, unknown>) =>
        addMockScore(
          args.name as string,
          args.date as string,
          args.physics_marks as number,
          args.chemistry_marks as number,
          args.maths_marks as number,
          args.max_marks as number | undefined,
          args.exam_type as string | undefined,
          args.paper1_marks as MockSubjectMarks | undefined,
          args.paper2_marks as MockSubjectMarks | undefined,
          args.attempted_questions as MockSubjectMarks | undefined,
          args.wrong_questions as MockSubjectMarks | undefined,
          args.total_time_allotted as number | undefined,
          args.time_spent as MockSubjectMarks | undefined,
          args.weak_chapters as any,
          args.weak_subtopics as any,
          args.footnotes as string | undefined
        ),
      update_mock_score: (args: Record<string, unknown>) =>
        updateMockScore(
          args.score_id as string,
          args.name as string | undefined,
          args.date as string | undefined,
          args.physics_marks as number | undefined,
          args.chemistry_marks as number | undefined,
          args.maths_marks as number | undefined,
          args.max_marks as number | undefined,
          args.exam_type as string | undefined,
          args.paper1_marks as MockSubjectMarks | undefined,
          args.paper2_marks as MockSubjectMarks | undefined,
          args.attempted_questions as MockSubjectMarks | undefined,
          args.wrong_questions as MockSubjectMarks | undefined,
          args.total_time_allotted as number | undefined,
          args.time_spent as MockSubjectMarks | undefined,
          args.weak_chapters as any,
          args.weak_subtopics as any,
          args.footnotes as string | undefined
        ),
      delete_mock_score: (args: Record<string, unknown>) =>
        deleteMockScore(args.score_id as string),
      list_mock_scores: (_args: Record<string, unknown>) => listMockScores(),
      list_mock_presets: (_args: Record<string, unknown>) => listMockPresets(),
      add_mock_preset: (args: Record<string, unknown>) =>
        addMockPreset(
          args.id as string,
          args.name as string,
          args.short_name as string,
          args.paper_count as number,
          args.physics_max as number,
          args.chemistry_max as number,
          args.maths_max as number,
          args.enabled_subjects as any
        ),
      update_mock_preset: (args: Record<string, unknown>) =>
        updateMockPreset(
          args.preset_id as string,
          args.name as string | undefined,
          args.short_name as string | undefined,
          args.paper_count as number | undefined,
          args.physics_max as number | undefined,
          args.chemistry_max as number | undefined,
          args.maths_max as number | undefined,
          args.enabled_subjects as any
        ),
      delete_mock_preset: (args: Record<string, unknown>) =>
        deleteMockPreset(args.preset_id as string),
      // Exams
      add_exam_date: (args: Record<string, unknown>) =>
        addExamDate(
          args.name as string,
          args.date as string,
          args.is_primary as boolean | undefined
        ),
      delete_exam_date: (args: Record<string, unknown>) => deleteExamDate(args.exam_id as string),
      list_exam_dates: (_args: Record<string, unknown>) => listExamDates(),
      set_primary_exam: (args: Record<string, unknown>) => setPrimaryExam(args.exam_id as string),
      // Read
      get_chapter_progress: (args: Record<string, unknown>) =>
        getChapterProgress(args.subject as Subject, args.chapter_name as string),
      get_subject_chapters: (args: Record<string, unknown>) =>
        getSubjectChapters(args.subject as Subject),
    }),
    [
      toggleChapterMaterial,
      toggleSubtopicMaterial,
      updateSubtopicAttempted,
      setSubtopicLastRevised,
      setChapterPriority,
      markChapterRevisedTool,
      addPlannerTask,
      togglePlannerTask,
      deletePlannerTask,
      listPlannerTasks,
      scheduleRevision,
      logStudySession,
      deleteStudySession,
      listStudySessions,
      addMockScore,
      updateMockScore,
      deleteMockScore,
      listMockScores,
      listMockPresets,
      addMockPreset,
      updateMockPreset,
      deleteMockPreset,
      addExamDate,
      deleteExamDate,
      listExamDates,
      setPrimaryExam,
      getChapterProgress,
      getSubjectChapters,
    ]
  );

  const executeToolCall = useCallback(
    (name: string, args: Record<string, unknown>): string => {
      const fn = executors[name];
      if (!fn) return err(`Unknown tool "${name}".`);
      try {
        return fn(args);
      } catch (e) {
        return err(`Tool "${name}" threw an error: ${(e as Error).message}`);
      }
    },
    [executors]
  );

  // ── DESTRUCTIVE TOOL SET ──────────────────────────────────────────────────
  const DESTRUCTIVE_TOOLS = new Set([
    'delete_planner_task',
    'delete_study_session',
    'delete_mock_score',
    'delete_exam_date',
    'delete_mock_preset',
  ]);

  const isDestructive = useCallback((toolName: string): boolean => {
    return DESTRUCTIVE_TOOLS.has(toolName);
  }, []);

  // ── GEMINI TOOL DECLARATIONS ──────────────────────────────────────────────
  const toolDeclarations: Tool = useMemo((): Tool => {
    const declarations: FunctionDeclaration[] = [
      // ── READ TOOLS ──
      {
        name: 'get_subject_chapters',
        description:
          'List all chapters for a subject with their serial numbers, materials, and subtopic counts.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            subject: {
              type: Type.STRING,
              description: 'One of: physics, chemistry, maths',
              enum: ['physics', 'chemistry', 'maths'],
            },
          },
          required: ['subject'],
        },
      },
      {
        name: 'get_chapter_progress',
        description:
          'Get detailed progress for a specific chapter, including completed materials and subtopic states.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            subject: { type: Type.STRING, enum: ['physics', 'chemistry', 'maths'] },
            chapter_name: { type: Type.STRING, description: 'Chapter name (fuzzy matched)' },
          },
          required: ['subject', 'chapter_name'],
        },
      },
      {
        name: 'list_planner_tasks',
        description: 'List planner tasks. Optionally filter by date (YYYY-MM-DD).',
        parameters: {
          type: Type.OBJECT,
          properties: {
            date: { type: Type.STRING, description: 'Optional YYYY-MM-DD date filter' },
          },
        },
      },
      {
        name: 'list_study_sessions',
        description: 'List recent study sessions. Optionally filter by date (YYYY-MM-DD).',
        parameters: {
          type: Type.OBJECT,
          properties: {
            date: { type: Type.STRING, description: 'Optional YYYY-MM-DD date filter' },
          },
        },
      },
      {
        name: 'list_mock_scores',
        description: 'List the 10 most recent mock exam scores.',
        parameters: { type: Type.OBJECT, properties: {} },
      },
      {
        name: 'list_exam_dates',
        description: 'List all saved exam dates.',
        parameters: { type: Type.OBJECT, properties: {} },
      },
      // ── PROGRESS TOOLS ──
      {
        name: 'toggle_chapter_material',
        description:
          'Toggle a chapter-level material (e.g. NCERT, PYQs, Modules) as completed/incomplete. This marks ALL subtopics at once.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            subject: { type: Type.STRING, enum: ['physics', 'chemistry', 'maths'] },
            chapter_name: { type: Type.STRING, description: 'Chapter name (fuzzy matched)' },
            material: { type: Type.STRING, description: 'Material name e.g. NCERT, PYQs, Modules' },
          },
          required: ['subject', 'chapter_name', 'material'],
        },
      },
      {
        name: 'toggle_subtopic_material',
        description: "Toggle a specific subtopic's material completion state.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            subject: { type: Type.STRING, enum: ['physics', 'chemistry', 'maths'] },
            chapter_name: { type: Type.STRING },
            subtopic_name: { type: Type.STRING, description: 'Subtopic name (fuzzy matched)' },
            material: { type: Type.STRING },
          },
          required: ['subject', 'chapter_name', 'subtopic_name', 'material'],
        },
      },
      {
        name: 'update_subtopic_attempted',
        description: 'Set the number of questions attempted for a subtopic material.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            subject: { type: Type.STRING, enum: ['physics', 'chemistry', 'maths'] },
            chapter_name: { type: Type.STRING },
            subtopic_name: { type: Type.STRING },
            material: { type: Type.STRING },
            count: { type: Type.NUMBER, description: 'Number of questions attempted (>= 0)' },
          },
          required: ['subject', 'chapter_name', 'subtopic_name', 'material', 'count'],
        },
      },
      {
        name: 'set_chapter_priority',
        description: "Set a chapter's priority level.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            subject: { type: Type.STRING, enum: ['physics', 'chemistry', 'maths'] },
            chapter_name: { type: Type.STRING },
            priority: { type: Type.STRING, enum: ['high', 'medium', 'low', 'none'] },
          },
          required: ['subject', 'chapter_name', 'priority'],
        },
      },
      {
        name: 'mark_chapter_revised',
        description: 'Mark a chapter as revised today, optionally with a confidence score (1-5).',
        parameters: {
          type: Type.OBJECT,
          properties: {
            subject: { type: Type.STRING, enum: ['physics', 'chemistry', 'maths'] },
            chapter_name: { type: Type.STRING },
            confidence: { type: Type.NUMBER, description: 'Confidence level 1-5 (optional)' },
          },
          required: ['subject', 'chapter_name'],
        },
      },
      {
        name: 'set_subtopic_last_revised',
        description: 'Set or clear the last-revised date for a specific subtopic.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            subject: { type: Type.STRING, enum: ['physics', 'chemistry', 'maths'] },
            chapter_name: { type: Type.STRING },
            subtopic_name: { type: Type.STRING },
            date: { type: Type.STRING, description: 'YYYY-MM-DD date or omit to clear' },
          },
          required: ['subject', 'chapter_name', 'subtopic_name'],
        },
      },
      // ── PLANNER TOOLS ──
      {
        name: 'add_planner_task',
        description: 'Add a new task to the study planner on a specific date.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: 'Task title' },
            date: { type: Type.STRING, description: 'YYYY-MM-DD date for the task' },
            time: { type: Type.STRING, description: 'HH:mm time (default: 08:00)' },
            subject: { type: Type.STRING, enum: ['physics', 'chemistry', 'maths'] },
            chapter_name: {
              type: Type.STRING,
              description: 'Optional chapter name (fuzzy matched)',
            },
            material: { type: Type.STRING, description: 'Optional material type' },
            questions: {
              type: Type.NUMBER,
              description: 'Optional number of questions to attempt for this task',
            },
            is_lecture: {
              type: Type.BOOLEAN,
              description: 'Optional boolean indicating if this task is a lecture',
            },
          },
          required: ['title', 'date'],
        },
      },
      {
        name: 'toggle_planner_task',
        description: 'Toggle a planner task as completed/incomplete by its ID.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            task_id: { type: Type.STRING, description: 'Task ID from list_planner_tasks' },
          },
          required: ['task_id'],
        },
      },
      {
        name: 'delete_planner_task',
        description: 'DESTRUCTIVE: Permanently delete a planner task. Requires user confirmation.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            task_id: { type: Type.STRING },
          },
          required: ['task_id'],
        },
      },
      {
        name: 'schedule_revision',
        description: "Add a revision task to today's planner for a specific chapter.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            subject: { type: Type.STRING, enum: ['physics', 'chemistry', 'maths'] },
            chapter_name: { type: Type.STRING },
          },
          required: ['subject', 'chapter_name'],
        },
      },
      // ── SESSION TOOLS ──
      {
        name: 'log_study_session',
        description: 'Log a completed study session with a duration.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            duration_minutes: { type: Type.NUMBER, description: 'Duration in minutes' },
            subject: { type: Type.STRING, enum: ['physics', 'chemistry', 'maths'] },
            chapter_name: { type: Type.STRING },
            material: { type: Type.STRING },
            date: { type: Type.STRING, description: 'YYYY-MM-DD (defaults to today)' },
          },
          required: ['title', 'duration_minutes'],
        },
      },
      {
        name: 'delete_study_session',
        description: 'DESTRUCTIVE: Delete a study session by ID. Requires user confirmation.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            session_id: { type: Type.STRING },
          },
          required: ['session_id'],
        },
      },
      // ── MOCK TOOLS ──
      {
        name: 'add_mock_score',
        description: 'Log a mock exam score.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: 'Test name e.g. "Mock Test 4"' },
            date: { type: Type.STRING, description: 'YYYY-MM-DD' },
            physics_marks: { type: Type.NUMBER },
            chemistry_marks: { type: Type.NUMBER },
            maths_marks: { type: Type.NUMBER },
            max_marks: { type: Type.NUMBER, description: 'Max total marks (default 300)' },
            exam_type: { type: Type.STRING, description: 'e.g. jm, ja, bt' },
            paper1_marks: {
              type: Type.OBJECT,
              description: 'Optional subject breakdown for Paper 1',
              properties: {
                physics: { type: Type.NUMBER },
                chemistry: { type: Type.NUMBER },
                maths: { type: Type.NUMBER },
              },
            },
            paper2_marks: {
              type: Type.OBJECT,
              description: 'Optional subject breakdown for Paper 2',
              properties: {
                physics: { type: Type.NUMBER },
                chemistry: { type: Type.NUMBER },
                maths: { type: Type.NUMBER },
              },
            },
            attempted_questions: {
              type: Type.OBJECT,
              description: 'Optional questions attempted per subject',
              properties: {
                physics: { type: Type.NUMBER },
                chemistry: { type: Type.NUMBER },
                maths: { type: Type.NUMBER },
              },
            },
            wrong_questions: {
              type: Type.OBJECT,
              description: 'Optional wrong questions per subject',
              properties: {
                physics: { type: Type.NUMBER },
                chemistry: { type: Type.NUMBER },
                maths: { type: Type.NUMBER },
              },
            },
            total_time_allotted: {
              type: Type.NUMBER,
              description: 'Optional total time allotted in minutes',
            },
            time_spent: {
              type: Type.OBJECT,
              description: 'Optional time spent per subject in minutes',
              properties: {
                physics: { type: Type.NUMBER },
                chemistry: { type: Type.NUMBER },
                maths: { type: Type.NUMBER },
              },
            },
            weak_chapters: {
              type: Type.ARRAY,
              description: 'Optional list of weak chapters identified',
              items: {
                type: Type.OBJECT,
                properties: {
                  subject: { type: Type.STRING, enum: ['physics', 'chemistry', 'maths'] },
                  chapter_name: { type: Type.STRING, description: 'Chapter name' },
                },
                required: ['subject', 'chapter_name'],
              },
            },
            weak_subtopics: {
              type: Type.ARRAY,
              description: 'Optional list of weak subtopics identified',
              items: {
                type: Type.OBJECT,
                properties: {
                  subject: { type: Type.STRING, enum: ['physics', 'chemistry', 'maths'] },
                  chapter_name: { type: Type.STRING, description: 'Chapter name' },
                  subtopic_name: { type: Type.STRING, description: 'Subtopic name' },
                },
                required: ['subject', 'chapter_name', 'subtopic_name'],
              },
            },
            footnotes: {
              type: Type.STRING,
              description: 'Optional notes, reflections, or key takeaways from the mock exam',
            },
          },
          required: ['name', 'date', 'physics_marks', 'chemistry_marks', 'maths_marks'],
        },
      },
      {
        name: 'update_mock_score',
        description: 'Update/edit an existing mock exam score by ID. Only provided fields are updated; others are preserved.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            score_id: { type: Type.STRING, description: 'ID of the mock score to edit' },
            name: { type: Type.STRING, description: 'Updated test name' },
            date: { type: Type.STRING, description: 'Updated YYYY-MM-DD date' },
            physics_marks: { type: Type.NUMBER },
            chemistry_marks: { type: Type.NUMBER },
            maths_marks: { type: Type.NUMBER },
            max_marks: { type: Type.NUMBER },
            exam_type: { type: Type.STRING },
            paper1_marks: {
              type: Type.OBJECT,
              properties: {
                physics: { type: Type.NUMBER },
                chemistry: { type: Type.NUMBER },
                maths: { type: Type.NUMBER },
              },
            },
            paper2_marks: {
              type: Type.OBJECT,
              properties: {
                physics: { type: Type.NUMBER },
                chemistry: { type: Type.NUMBER },
                maths: { type: Type.NUMBER },
              },
            },
            attempted_questions: {
              type: Type.OBJECT,
              properties: {
                physics: { type: Type.NUMBER },
                chemistry: { type: Type.NUMBER },
                maths: { type: Type.NUMBER },
              },
            },
            wrong_questions: {
              type: Type.OBJECT,
              properties: {
                physics: { type: Type.NUMBER },
                chemistry: { type: Type.NUMBER },
                maths: { type: Type.NUMBER },
              },
            },
            total_time_allotted: { type: Type.NUMBER },
            time_spent: {
              type: Type.OBJECT,
              properties: {
                physics: { type: Type.NUMBER },
                chemistry: { type: Type.NUMBER },
                maths: { type: Type.NUMBER },
              },
            },
            weak_chapters: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  subject: { type: Type.STRING, enum: ['physics', 'chemistry', 'maths'] },
                  chapter_name: { type: Type.STRING },
                },
                required: ['subject', 'chapter_name'],
              },
            },
            weak_subtopics: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  subject: { type: Type.STRING, enum: ['physics', 'chemistry', 'maths'] },
                  chapter_name: { type: Type.STRING },
                  subtopic_name: { type: Type.STRING },
                },
                required: ['subject', 'chapter_name', 'subtopic_name'],
              },
            },
            footnotes: { type: Type.STRING },
          },
          required: ['score_id'],
        },
      },
      {
        name: 'delete_mock_score',
        description: 'DESTRUCTIVE: Delete a mock score by ID. Requires user confirmation.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            score_id: { type: Type.STRING },
          },
          required: ['score_id'],
        },
      },
      {
        name: 'list_mock_presets',
        description: 'List all mock exam presets (e.g. JEE Main, JEE Advanced, custom presets).',
        parameters: { type: Type.OBJECT, properties: {} },
      },
      {
        name: 'add_mock_preset',
        description: 'Add a new mock exam preset.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING, description: 'Unique identifier, e.g. "my-custom-preset"' },
            name: { type: Type.STRING, description: 'Full name, e.g. "JEE Advanced Pattern A"' },
            short_name: { type: Type.STRING, description: 'Short name, e.g. "JA-A"' },
            paper_count: { type: Type.NUMBER, description: 'Number of papers (1 or 2)' },
            physics_max: { type: Type.NUMBER, description: 'Max physics marks per paper' },
            chemistry_max: { type: Type.NUMBER, description: 'Max chemistry marks per paper' },
            maths_max: { type: Type.NUMBER, description: 'Max maths marks per paper' },
            enabled_subjects: {
              type: Type.OBJECT,
              properties: {
                physics: { type: Type.BOOLEAN },
                chemistry: { type: Type.BOOLEAN },
                maths: { type: Type.BOOLEAN },
              },
            },
          },
          required: ['id', 'name', 'short_name', 'paper_count', 'physics_max', 'chemistry_max', 'maths_max'],
        },
      },
      {
        name: 'update_mock_preset',
        description: 'Update an existing mock exam preset.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            preset_id: { type: Type.STRING, description: 'ID of the preset to update' },
            name: { type: Type.STRING },
            short_name: { type: Type.STRING },
            paper_count: { type: Type.NUMBER, description: 'Number of papers (1 or 2)' },
            physics_max: { type: Type.NUMBER },
            chemistry_max: { type: Type.NUMBER },
            maths_max: { type: Type.NUMBER },
            enabled_subjects: {
              type: Type.OBJECT,
              properties: {
                physics: { type: Type.BOOLEAN },
                chemistry: { type: Type.BOOLEAN },
                maths: { type: Type.BOOLEAN },
              },
            },
          },
          required: ['preset_id'],
        },
      },
      {
        name: 'delete_mock_preset',
        description: 'DESTRUCTIVE: Delete a mock exam preset by ID. Requires user confirmation.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            preset_id: { type: Type.STRING, description: 'ID of the preset to delete' },
          },
          required: ['preset_id'],
        },
      },
      // ── EXAM DATE TOOLS ──
      {
        name: 'add_exam_date',
        description: 'Add an exam date entry.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            date: { type: Type.STRING, description: 'YYYY-MM-DD' },
            is_primary: { type: Type.BOOLEAN, description: 'Set as primary countdown exam' },
          },
          required: ['name', 'date'],
        },
      },
      {
        name: 'delete_exam_date',
        description: 'DESTRUCTIVE: Delete an exam date by ID. Requires user confirmation.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            exam_id: { type: Type.STRING },
          },
          required: ['exam_id'],
        },
      },
      {
        name: 'set_primary_exam',
        description: 'Set an exam as the primary countdown exam.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            exam_id: { type: Type.STRING },
          },
          required: ['exam_id'],
        },
      },
    ];

    return { functionDeclarations: declarations };
  }, []);

  return { toolDeclarations, executeToolCall, isDestructive };
}
