import { useCallback, useMemo } from 'react';
import { AppProgress, Subject, SubjectData } from '../types';

export function useProgress(
  progress: AppProgress,
  subjectData: Record<Subject, SubjectData | null>
) {
  const subjectMeta = useMemo(() => {
    const meta: Record<
      Subject,
      { totalItems: number; materialSet: Set<string>; chapterSet: Set<number> } | null
    > = {
      physics: null,
      chemistry: null,
      maths: null,
    };

    (['physics', 'chemistry', 'maths'] as Subject[]).forEach((subject) => {
      const data = subjectData[subject];
      if (!data || data.chapters.length === 0 || data.materialNames.length === 0) {
        meta[subject] = null;
        return;
      }

      const materialSet = new Set(data.materialNames);
      const chapterSet = new Set(data.chapters.map((chapter) => chapter.serial));

      let totalItems = 0;
      data.chapters.forEach((chapter) => {
        const subtopicCount = chapter.subtopics?.length || 0;
        if (subtopicCount > 0) {
          totalItems += subtopicCount * data.materialNames.length;
        } else {
          totalItems += data.materialNames.length;
        }
      });

      meta[subject] = {
        totalItems,
        materialSet,
        chapterSet,
      };
    });

    return meta;
  }, [subjectData]);

  const completedBySubject = useMemo(() => {
    const counts: Record<Subject, number> = {
      physics: 0,
      chemistry: 0,
      maths: 0,
    };

    (['physics', 'chemistry', 'maths'] as Subject[]).forEach((subject) => {
      const meta = subjectMeta[subject];
      const data = subjectData[subject];
      if (!meta || !data) return;
      const subjectProgress = progress[subject];

      data.chapters.forEach((chapter) => {
        const chapterProgress = subjectProgress[chapter.serial];
        if (!chapterProgress) return;

        const subtopics = chapter.subtopics || [];
        if (subtopics.length > 0) {
          subtopics.forEach((sub) => {
            const subState = chapterProgress.subtopics?.[sub];
            if (subState?.completed) {
              for (const [material, isCompleted] of Object.entries(subState.completed)) {
                if (isCompleted && meta.materialSet.has(material)) {
                  counts[subject] += 1;
                }
              }
            }
          });
        } else {
          const completed = chapterProgress.completed ?? {};
          for (const [material, isCompleted] of Object.entries(completed)) {
            if (isCompleted && meta.materialSet.has(material)) {
              counts[subject] += 1;
            }
          }
        }
      });
    });

    return counts;
  }, [progress, subjectMeta, subjectData]);

  const calculateSubjectProgress = useCallback(
    (subject: Subject): number => {
      const meta = subjectMeta[subject];
      if (!meta || meta.totalItems === 0) return 0;
      const completedItems = completedBySubject[subject] ?? 0;
      return Math.round((completedItems / meta.totalItems) * 100);
    },
    [completedBySubject, subjectMeta]
  );

  const physicsProgress = calculateSubjectProgress('physics');
  const chemistryProgress = calculateSubjectProgress('chemistry');
  const mathsProgress = calculateSubjectProgress('maths');

  const overallProgress = useMemo(() => {
    const subjects: Subject[] = ['physics', 'chemistry', 'maths'];
    let totalItems = 0;
    let completedItems = 0;

    subjects.forEach((subject) => {
      const meta = subjectMeta[subject];
      if (!meta) return;
      totalItems += meta.totalItems;
      completedItems += completedBySubject[subject] ?? 0;
    });

    return totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  }, [completedBySubject, subjectMeta]);

  return {
    physicsProgress,
    chemistryProgress,
    mathsProgress,
    overallProgress,
    calculateSubjectProgress,
  };
}
