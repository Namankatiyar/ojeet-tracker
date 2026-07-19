import { MockExamType, MockScore, MockSubjectMarks, MockExamPreset } from '../types';

const EMPTY_SUBJECT_MARKS: MockSubjectMarks = {
  physics: 0,
  chemistry: 0,
  maths: 0,
};

export const getMockExamType = (score: MockScore): MockExamType => score.examType ?? 'jm';

export const getMockDefaultMaxMarks = (preset: MockExamPreset): number => {
  const s = preset.subjectMaxMarks;
  const enabled = preset.enabledSubjects;
  const physicsMax   = enabled && enabled.physics   === false ? 0 : (s.physics   ?? 0);
  const chemistryMax = enabled && enabled.chemistry === false ? 0 : (s.chemistry ?? 0);
  const mathsMax     = enabled && enabled.maths     === false ? 0 : (s.maths     ?? 0);
  const biologyMax   = enabled && enabled.biology   === false ? 0 : (s.biology   ?? 0);
  return (physicsMax + chemistryMax + mathsMax + biologyMax) * preset.paperCount;
};

// Fallback presets for legacy exam types without a stored preset
const LEGACY_PRESETS: MockExamPreset[] = [
  { id: 'jm', name: 'JEE Main',     shortName: 'JM', paperCount: 1, subjectMaxMarks: { physics: 100, chemistry: 100, maths: 100 } },
  { id: 'ja', name: 'JEE Advanced', shortName: 'JA', paperCount: 2, subjectMaxMarks: { physics: 60,  chemistry: 60,  maths: 60  } },
  { id: 'bt', name: 'BITSAT',       shortName: 'BT', paperCount: 1, subjectMaxMarks: { physics: 130, chemistry: 130, maths: 130 } },
];

export const getMockMaxMarks = (
  score: Pick<MockScore, 'examType' | 'maxMarks'>,
  presets: MockExamPreset[] = []
): number => {
  if (typeof score.maxMarks === 'number') return score.maxMarks;
  const examType = score.examType ?? 'jm';
  const preset = [...presets, ...LEGACY_PRESETS].find((p) => p.id === examType);
  if (preset) return getMockDefaultMaxMarks(preset);
  return 300;
};

export const getMockPaperMarks = (
  score: MockScore,
  paper: 'paper1' | 'paper2'
): MockSubjectMarks => {
  const key = paper === 'paper1' ? 'paper1Marks' : 'paper2Marks';
  return score[key] ?? EMPTY_SUBJECT_MARKS;
};

export const getMockSubjectTotals = (
  score: MockScore,
  preset?: MockExamPreset
): MockSubjectMarks => {
  const isDoublePaper = preset ? preset.paperCount === 2 : getMockExamType(score) === 'ja';

  if (!isDoublePaper) {
    return {
      physics: score.physicsMarks,
      chemistry: score.chemistryMarks,
      maths: score.mathsMarks,
      biology: score.biologyMarks,
    };
  }

  const paper1 = getMockPaperMarks(score, 'paper1');
  const paper2 = getMockPaperMarks(score, 'paper2');

  return {
    physics: paper1.physics + paper2.physics,
    chemistry: paper1.chemistry + paper2.chemistry,
    maths: paper1.maths + paper2.maths,
    biology: (paper1.biology ?? 0) + (paper2.biology ?? 0),
  };
};

export const getMockPaperTotal = (score: MockScore, paper: 'paper1' | 'paper2'): number => {
  const marks = getMockPaperMarks(score, paper);
  return marks.physics + marks.chemistry + marks.maths + (marks.biology ?? 0);
};

export const getMockTotalMarks = (score: MockScore, preset?: MockExamPreset): number => {
  const isDoublePaper = preset ? preset.paperCount === 2 : getMockExamType(score) === 'ja';
  if (!isDoublePaper) {
    return score.totalMarks;
  }

  return getMockPaperTotal(score, 'paper1') + getMockPaperTotal(score, 'paper2');
};

export const getMockPercentage = (score: MockScore, presets: MockExamPreset[] = []): number => {
  const preset = presets.find((p) => p.id === score.examType);
  const maxMarks = getMockMaxMarks(score, presets);
  if (maxMarks <= 0) return 0;
  return (getMockTotalMarks(score, preset) / maxMarks) * 100;
};

export function filterMockScoresByMode(
  scores: MockScore[],
  mode: 'jee' | 'neet'
): MockScore[] {
  return scores.filter((s) =>
    mode === 'neet'
      ? s.examMode === 'neet'
      : s.examMode !== 'neet' // includes undefined (legacy) and 'jee'
  );
}
