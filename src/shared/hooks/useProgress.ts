import { useMemo } from 'react';
import { AppProgress, Subject, SubjectData } from '../types';

export function useProgress(progress: AppProgress, subjectData: Record<Subject, SubjectData | null>) {
    const calculateSubjectProgress = useMemo(() => {
        return (subject: Subject): number => {
            const data = subjectData[subject];
            if (!data || data.chapters.length === 0) return 0;

            const subjectProgress = progress[subject];
            let totalItems = 0;
            let completedItems = 0;

            data.chapters.forEach((chapter) => {
                const chapterProgress = subjectProgress[chapter.serial];
                data.materialNames.forEach((material) => {
                    totalItems++;
                    if (chapterProgress?.completed[material]) {
                        completedItems++;
                    }
                });
            });

            return totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
        };
    }, [progress, subjectData]);

    const physicsProgress = calculateSubjectProgress('physics');
    const chemistryProgress = calculateSubjectProgress('chemistry');
    const mathsProgress = calculateSubjectProgress('maths');

    const overallProgress = useMemo(() => {
        const subjects: Subject[] = ['physics', 'chemistry', 'maths'];
        let totalItems = 0;
        let completedItems = 0;

        subjects.forEach((subject) => {
            const data = subjectData[subject];
            if (!data) return;

            const subjectProg = progress[subject];
            data.chapters.forEach((chapter) => {
                const chapterProgress = subjectProg[chapter.serial];
                data.materialNames.forEach((material) => {
                    totalItems++;
                    if (chapterProgress?.completed[material]) {
                        completedItems++;
                    }
                });
            });
        });

        return totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
    }, [progress, subjectData]);

    return {
        physicsProgress,
        chemistryProgress,
        mathsProgress,
        overallProgress,
        calculateSubjectProgress,
    };
}
