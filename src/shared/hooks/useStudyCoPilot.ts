import { useMemo, useCallback } from 'react';
import { useUserProgress } from '../../core/context/UserProgressContext';
import { useSubjectData } from '../../core/context/SubjectDataContext';
import { Subject, Chapter, PlannerTask, StudySession, ConfidenceLevel } from '../types';

export interface CoPilotRecommendation {
  id: string;
  type: 'revision' | 'mock_boost' | 'close_to_complete' | 'stuck' | 'neglect_balance';
  subject: Subject;
  chapterSerial: number;
  chapterName: string;
  urgencyIndex: number;
  message: string;
  metadata: {
    retention?: number;
    daysSinceActive?: number;
    confidence?: number;
    totalHoursStudied?: number;
    studyShare?: number;
    [key: string]: any;
  };
}

export const useStudyCoPilot = () => {
  const { progress, mockScores, studySessions, handleAddPlannerTask, handleUpdateChapterDetail } =
    useUserProgress();
  const { mergedSubjectData } = useSubjectData();

  // 1. Calculate Mock Exam Subject Weaknesses
  const subjectWeaknessWeights = useMemo(() => {
    const weights: Record<Subject, number> = { physics: 1.0, chemistry: 1.0, maths: 1.0 };
    if (!mockScores || mockScores.length === 0) return weights;

    // Take last 3 mocks
    const recentMocks = [...mockScores]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 3);

    let totalPhy = 0,
      totalChem = 0,
      totalMath = 0;
    recentMocks.forEach((m) => {
      const subjectMax = (m.maxMarks || 300) / 3;
      totalPhy += m.physicsMarks / subjectMax;
      totalChem += m.chemistryMarks / subjectMax;
      totalMath += m.mathsMarks / subjectMax;
    });

    const count = recentMocks.length;
    const avgPhy = totalPhy / count;
    const avgChem = totalChem / count;
    const avgMath = totalMath / count;

    const totalAvg = (avgPhy + avgChem + avgMath) / 3;

    const subjects: Subject[] = ['physics', 'chemistry', 'maths'];
    const avgs = { physics: avgPhy, chemistry: avgChem, maths: avgMath };

    subjects.forEach((sub) => {
      const gap = totalAvg > 0 ? (totalAvg - avgs[sub]) / totalAvg : 0;
      if (gap > 0) {
        weights[sub] = 1.0 + 1.5 * gap; // Sensitivity factor beta = 1.5
      }
    });

    return weights;
  }, [mockScores]);

  // 2. Calculate weekly study duration share per subject
  const subjectStudyTimeShares = useMemo(() => {
    const totalDurations: Record<Subject, number> = { physics: 0, chemistry: 0, maths: 0 };
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    studySessions.forEach((session) => {
      const sessionDate = new Date(session.startTime);
      if (sessionDate >= oneWeekAgo && session.subject) {
        totalDurations[session.subject] += session.duration;
      }
    });

    const totalStudyTime = totalDurations.physics + totalDurations.chemistry + totalDurations.maths;
    const shares: Record<Subject, number> = { physics: 0, chemistry: 0, maths: 0 };
    const timeWeights: Record<Subject, number> = { physics: 1.0, chemistry: 1.0, maths: 1.0 };

    if (totalStudyTime > 0) {
      const subjects: Subject[] = ['physics', 'chemistry', 'maths'];
      subjects.forEach((sub) => {
        shares[sub] = totalDurations[sub] / totalStudyTime;
        // If subject share is below 20%, boost urgency of its active chapters
        if (shares[sub] < 0.2) {
          timeWeights[sub] = 1.0 + 1.0 * (0.33 - shares[sub]);
        }
      });
    }

    return { shares, timeWeights, totalStudyTime };
  }, [studySessions]);

  // 3. Map Study Sessions by Chapter for easy lookups
  const chapterSessionsMap = useMemo(() => {
    const map: Record<string, StudySession[]> = {};
    studySessions.forEach((session) => {
      if (session.subject && session.chapterSerial) {
        const key = `${session.subject}-${session.chapterSerial}`;
        if (!map[key]) map[key] = [];
        map[key].push(session);
      }
    });
    return map;
  }, [studySessions]);

  // 4. Compute Chapter Urgency & Recommendations
  const recommendations = useMemo(() => {
    const list: CoPilotRecommendation[] = [];
    const subjects: Subject[] = ['physics', 'chemistry', 'maths'];
    const today = new Date();

    subjects.forEach((sub) => {
      const subjectData = mergedSubjectData[sub];
      if (!subjectData) return;

      const subjectChapters = subjectData.chapters || [];
      const subjectProgress = progress[sub] || {};
      const wTime = subjectStudyTimeShares.timeWeights[sub];
      const wMock = subjectWeaknessWeights[sub];

      subjectChapters.forEach((chapter: Chapter) => {
        const chapProgress = subjectProgress[chapter.serial];
        const detail = chapProgress?.detail;
        const sessions = chapterSessionsMap[`${sub}-${chapter.serial}`] || [];

        // Calculate completed subtopics
        const totalMaterials = chapter.materials?.length || 0;

        // Subtopics progress calculations:
        let completedCount = 0;
        if (chapter.subtopics && chapter.subtopics.length > 0 && chapProgress?.subtopics) {
          // Calculate completed subtopics
          chapter.subtopics.forEach((subName) => {
            const subState = chapProgress.subtopics?.[subName];
            if (subState?.completed) {
              const isSubtopicComp = Object.values(subState.completed).some(Boolean);
              if (isSubtopicComp) completedCount++;
            }
          });
        } else if (chapProgress?.completed) {
          completedCount = Object.values(chapProgress.completed).filter(Boolean).length;
        }

        const totalItems =
          chapter.subtopics && chapter.subtopics.length > 0
            ? chapter.subtopics.length
            : totalMaterials;

        const completionRate = totalItems > 0 ? completedCount / totalItems : 0;

        // --- COLD START FILTER ---
        const hasCompletedMaterials = completionRate > 0;
        const hasSetPriorityOrConfidence =
          (chapProgress?.priority && chapProgress.priority !== 'none') ||
          detail?.confidence !== undefined;
        const hasLoggedSessions = sessions.length > 0;

        // Skip chapter entirely if there is no activity whatsoever
        if (!hasCompletedMaterials && !hasSetPriorityOrConfidence && !hasLoggedSessions) {
          return;
        }

        // --- STUCK DETECTOR ---
        const totalSessionDuration = sessions.reduce((acc, s) => acc + s.duration, 0);
        const totalHours = totalSessionDuration / 3600;
        if (totalHours > 3.0 && completionRate === 0) {
          list.push({
            id: `${sub}-${chapter.serial}-stuck`,
            type: 'stuck',
            subject: sub,
            chapterSerial: chapter.serial,
            chapterName: chapter.name,
            urgencyIndex: 75, // Flat high urgency for stuck student
            message: `You spent ${totalHours.toFixed(1)} hours studying "${chapter.name}" but haven't marked any progress. Have you completed a topic?`,
            metadata: { totalHoursStudied: totalHours },
          });
          return;
        }

        // --- SPACED REPETITION DECAY ---
        // Find latest date between manual revision and logged sessions
        let lastActiveTime: Date | null = null;
        if (detail?.lastRevised) lastActiveTime = new Date(detail.lastRevised);

        if (sessions.length > 0) {
          const latestSessionTime = new Date(
            Math.max(...sessions.map((s) => new Date(s.endTime).getTime()))
          );
          if (!lastActiveTime || latestSessionTime > lastActiveTime) {
            lastActiveTime = latestSessionTime;
          }
        }

        let retention = 100;
        let staleness = 0.0;
        let daysSinceActive = 0;

        const conf = detail?.confidence || 3;

        if (lastActiveTime) {
          daysSinceActive = Math.max(
            0,
            Math.floor((today.getTime() - lastActiveTime.getTime()) / (1000 * 60 * 60 * 24))
          );
          const baseStrength = 3.0;
          const confFactor = Math.exp(0.4 * (conf - 3));

          const manualRevisions = detail?.revisionCount || 0;
          const totalMicroRevisions = manualRevisions + sessions.length;
          const revFactor = 1.0 + 1.2 * Math.pow(totalMicroRevisions, 0.8);

          const memoryStrength = baseStrength * confFactor * revFactor;
          retention = Math.round(100 * Math.exp(-daysSinceActive / memoryStrength));
          staleness = 1.0 - retention / 100;
        } else {
          // Active but no dates logged yet
          daysSinceActive = 5;
          staleness = 0.5;
          retention = 50;
        }

        // Priority conversion
        const priorityWeightMap = { high: 1.0, medium: 0.7, low: 0.4, none: 0.1 };
        const wp = priorityWeightMap[chapProgress?.priority || 'none'];
        const uc = (6 - conf) / 5;

        // Completion Boost
        const completionBoost = completionRate >= 0.7 && completionRate < 1.0 ? 0.25 : 0.0;

        // Calculate Urgency Index
        const baseUrgency = wp * 35 + uc * 25 + staleness * 40;
        const urgencyIndex = Math.round(
          Math.min(100, baseUrgency * wTime * wMock * (1 + completionBoost))
        );

        if (urgencyIndex > 45) {
          let type: CoPilotRecommendation['type'] = 'revision';
          let message = `"${chapter.name}" needs revision. Retention is estimated at ${retention}% (${daysSinceActive} days since last activity).`;

          if (completionBoost > 0) {
            type = 'close_to_complete';
            message = `"${chapter.name}" is ${Math.round(completionRate * 100)}% complete. Finish the remaining sections today!`;
          } else if (wMock > 1.1) {
            type = 'mock_boost';
            message = `Recent mock exams indicate weakness in ${sub.toUpperCase()}. Prioritize revising "${chapter.name}".`;
          } else if (wTime > 1.1) {
            type = 'neglect_balance';
            message = `${sub.toUpperCase()} has been neglected this week (${Math.round(subjectStudyTimeShares.shares[sub] * 100)}% of study time). Revise "${chapter.name}".`;
          }

          list.push({
            id: `${sub}-${chapter.serial}-${type}`,
            type,
            subject: sub,
            chapterSerial: chapter.serial,
            chapterName: chapter.name,
            urgencyIndex,
            message,
            metadata: {
              retention,
              daysSinceActive,
              confidence: conf,
              totalHoursStudied: totalHours,
              studyShare: subjectStudyTimeShares.shares[sub],
            },
          });
        }
      });
    });

    return list.sort((a, b) => b.urgencyIndex - a.urgencyIndex);
  }, [
    progress,
    mergedSubjectData,
    subjectStudyTimeShares,
    subjectWeaknessWeights,
    chapterSessionsMap,
  ]);

  // 5. Inject task into planner
  const addRevisionToPlanner = useCallback(
    (rec: CoPilotRecommendation) => {
      const todayStr = new Date().toISOString().split('T')[0];
      const task: PlannerTask = {
        id: `copilot-revision-${Date.now()}`,
        title: `Revise: ${rec.chapterName}`,
        subtitle:
          rec.type === 'mock_boost'
            ? 'Weakness Mock Nudge'
            : rec.type === 'neglect_balance'
              ? 'Subject Neglect Nudge'
              : 'Spaced Repetition',
        date: todayStr,
        time: '08:00', // Default morning slot
        completed: false,
        type: 'chapter',
        subject: rec.subject,
        chapterSerial: rec.chapterSerial,
        material: 'Revision',
      };
      handleAddPlannerTask(task);
    },
    [handleAddPlannerTask]
  );

  // 6. Mark chapter revised
  const markChapterRevised = useCallback(
    (subject: Subject, chapterSerial: number, confidence?: ConfidenceLevel) => {
      const todayStr = new Date().toISOString().split('T')[0];
      const currentProgress = progress[subject]?.[chapterSerial];
      const currentDetail = currentProgress?.detail;
      const currentCount = currentDetail?.revisionCount || 0;
      const currentHistory = currentDetail?.revisionHistory || [];

      const newConfidence = confidence || currentDetail?.confidence || 3;

      const updatedHistory = [...currentHistory, { date: todayStr, confidence: newConfidence }];

      handleUpdateChapterDetail(subject, chapterSerial, {
        lastRevised: todayStr,
        revisionCount: currentCount + 1,
        revisionHistory: updatedHistory,
        confidence: newConfidence,
      });
    },
    [progress, handleUpdateChapterDetail]
  );

  return {
    recommendations,
    studyShares: subjectStudyTimeShares.shares,
    totalWeeklyHours: subjectStudyTimeShares.totalStudyTime / 3600,
    addRevisionToPlanner,
    markChapterRevised,
  };
};
