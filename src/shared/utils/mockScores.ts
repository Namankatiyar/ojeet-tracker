import { MockExamType, MockScore, MockSubjectMarks, MockExamPreset } from '../types';

const EMPTY_SUBJECT_MARKS: MockSubjectMarks = {
    physics: 0,
    chemistry: 0,
    maths: 0,
};

export const getMockExamType = (score: MockScore): MockExamType => score.examType ?? 'jm';

export const getMockDefaultMaxMarks = (examType: MockExamType, presets: MockExamPreset[] = []): number => {
    const preset = presets.find(p => p.id === examType);
    if (preset) {
        const s = preset.subjectMaxMarks;
        const e = preset.enabledSubjects || { physics: true, chemistry: true, maths: true };
        let singlePaperMax = 0;
        if (e.physics) singlePaperMax += s.physics;
        if (e.chemistry) singlePaperMax += s.chemistry;
        if (e.maths) singlePaperMax += s.maths;
        return singlePaperMax * preset.paperCount;
    }
    if (examType === 'ja') return 360;
    if (examType === 'bt') return 390;
    return 300;
};

export const getMockMaxMarks = (score: Pick<MockScore, 'examType' | 'maxMarks'>, presets: MockExamPreset[] = []): number => {
    if (typeof score.maxMarks === 'number') return score.maxMarks;
    return getMockDefaultMaxMarks(score.examType ?? 'jm', presets);
};

export const getMockPaperMarks = (score: MockScore, paper: 'paper1' | 'paper2'): MockSubjectMarks => {
    const key = paper === 'paper1' ? 'paper1Marks' : 'paper2Marks';
    return score[key] ?? EMPTY_SUBJECT_MARKS;
};

export const getMockSubjectTotals = (score: MockScore, preset?: MockExamPreset): MockSubjectMarks => {
    const isDoublePaper = preset ? preset.paperCount === 2 : getMockExamType(score) === 'ja';
    
    if (!isDoublePaper) {
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

export const getMockTotalMarks = (score: MockScore, preset?: MockExamPreset): number => {
    const isDoublePaper = preset ? preset.paperCount === 2 : getMockExamType(score) === 'ja';
    if (!isDoublePaper) {
        return score.totalMarks;
    }

    return getMockPaperTotal(score, 'paper1') + getMockPaperTotal(score, 'paper2');
};

export const getMockPercentage = (score: MockScore, presets: MockExamPreset[] = []): number => {
    const preset = presets.find(p => p.id === score.examType);
    const maxMarks = getMockMaxMarks(score, presets);
    if (maxMarks <= 0) return 0;
    return (getMockTotalMarks(score, preset) / maxMarks) * 100;
};
