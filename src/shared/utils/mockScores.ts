import { MockExamType, MockScore, MockSubjectMarks } from '../types';

const EMPTY_SUBJECT_MARKS: MockSubjectMarks = {
    physics: 0,
    chemistry: 0,
    maths: 0,
};

export const getMockExamType = (score: MockScore): MockExamType => score.examType ?? 'jm';

export const getMockMaxMarks = (score: Pick<MockScore, 'examType' | 'maxMarks'>): number => {
    if (typeof score.maxMarks === 'number') return score.maxMarks;
    return score.examType === 'ja' ? 360 : 300;
};

export const getMockPaperMarks = (score: MockScore, paper: 'paper1' | 'paper2'): MockSubjectMarks => {
    const key = paper === 'paper1' ? 'paper1Marks' : 'paper2Marks';
    return score[key] ?? EMPTY_SUBJECT_MARKS;
};

export const getMockSubjectTotals = (score: MockScore): MockSubjectMarks => {
    if (getMockExamType(score) !== 'ja') {
        return {
            physics: score.physicsMarks,
            chemistry: score.chemistryMarks,
            maths: score.mathsMarks,
        };
    }

    const paper1 = getMockPaperMarks(score, 'paper1');
    const paper2 = getMockPaperMarks(score, 'paper2');

    return {
        physics: paper1.physics + paper2.physics,
        chemistry: paper1.chemistry + paper2.chemistry,
        maths: paper1.maths + paper2.maths,
    };
};

export const getMockPaperTotal = (score: MockScore, paper: 'paper1' | 'paper2'): number => {
    const marks = getMockPaperMarks(score, paper);
    return marks.physics + marks.chemistry + marks.maths;
};

export const getMockTotalMarks = (score: MockScore): number => {
    if (getMockExamType(score) !== 'ja') {
        return score.totalMarks;
    }

    return getMockPaperTotal(score, 'paper1') + getMockPaperTotal(score, 'paper2');
};

export const getMockPercentage = (score: MockScore): number => {
    const maxMarks = getMockMaxMarks(score);
    if (maxMarks <= 0) return 0;
    return (getMockTotalMarks(score) / maxMarks) * 100;
};
