import { getActiveSubjects, SUBJECT_META } from '../config/subjects';
import { useUserProgress } from '../../core/context/UserProgressContext';

export function useActiveSubjects() {
  const { examMode } = useUserProgress();
  const subjects = getActiveSubjects(examMode);
  const subjectMeta = subjects.map((s) => SUBJECT_META[s]);
  return { examMode, subjects, subjectMeta };
}
