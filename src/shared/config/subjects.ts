import type { Subject } from '../types';

export type ExamMode = 'jee' | 'neet';

export interface SubjectMeta {
  key: Subject;
  label: string;
  iconKey: string;
  colorVar: string;
}

export const SUBJECT_META: Record<Subject, SubjectMeta> = {
  physics:   { key: 'physics',   label: 'Physics',   iconKey: 'atom', colorVar: 'var(--physics)' },
  chemistry: { key: 'chemistry', label: 'Chemistry', iconKey: 'flask-conical', colorVar: 'var(--chemistry)' },
  maths:     { key: 'maths',     label: 'Maths',     iconKey: 'pi',   colorVar: 'var(--maths)' },
  biology:   { key: 'biology',   label: 'Biology',   iconKey: 'dna',  colorVar: 'var(--biology)' },
};

export const JEE_SUBJECTS: Subject[]  = ['physics', 'chemistry', 'maths'];
export const NEET_SUBJECTS: Subject[] = ['physics', 'chemistry', 'biology'];

export const getActiveSubjects = (mode: ExamMode): Subject[] =>
  mode === 'neet' ? NEET_SUBJECTS : JEE_SUBJECTS;
