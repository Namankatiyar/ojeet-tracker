import { ChapterProgress } from '../../../shared/types';

export function getTotalAttemptedQuestions(progress: ChapterProgress | undefined): number {
    const attemptedByMaterial = progress?.detail?.attemptedByMaterial;
    if (!attemptedByMaterial) return 0;

    return Object.values(attemptedByMaterial).reduce((total, value) => {
        return total + (Number.isFinite(value) && value > 0 ? value : 0);
    }, 0);
}

export function hasChapterDetailData(progress: ChapterProgress | undefined): boolean {
    const detail = progress?.detail;
    if (!detail) return false;

    return (
        getTotalAttemptedQuestions(progress) > 0 ||
        detail.confidence !== undefined ||
        !!detail.lastRevised ||
        !!detail.notes?.trim()
    );
}
