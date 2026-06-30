import { useState, useEffect, useMemo } from 'react';
import { Subject, SubjectData, PlannerTask, AppProgress } from '../../../shared/types';

interface UseTaskFormProps {
  isOpen: boolean;
  initialDate: string;
  taskToEdit?: PlannerTask | null;
  subjectData: Record<Subject, SubjectData | null>;
  progress: AppProgress;
}

export type TaskType = 'chapter' | 'custom';

export function useTaskForm({ isOpen, initialDate, taskToEdit, subjectData }: UseTaskFormProps) {
  const [taskType, setTaskType] = useState<TaskType>('chapter');
  const [date, setDate] = useState(initialDate);
  const [time, setTime] = useState('');

  // Custom Task States
  const [customTitle, setCustomTitle] = useState('');
  const [customSubject, setCustomSubject] = useState<Subject | 'none'>('none');

  // Chapter Task States
  const [selectedSubject, setSelectedSubject] = useState<Subject | ''>('');
  const [selectedChapterSerial, setSelectedChapterSerial] = useState<number | ''>('');
  const [selectedMaterial, setSelectedMaterial] = useState<string[]>([]);
  const [chapterSearch, setChapterSearch] = useState('');

  // Question Counter State
  const [questions, setQuestions] = useState<number>(0);

  useEffect(() => {
    if (isOpen) {
      setChapterSearch('');
      if (taskToEdit) {
        setTaskType(taskToEdit.type);
        setTime(taskToEdit.time);
        setDate(taskToEdit.date);
        setQuestions(taskToEdit.questions || 0);

        if (taskToEdit.type === 'custom') {
          const cleanTitle = taskToEdit.title.replace(/\s*\(\d+\s*Qs\)$/, '');
          setCustomTitle(cleanTitle);
          setCustomSubject(taskToEdit.subject || 'none');
          setSelectedSubject(taskToEdit.subject || '');
          setSelectedChapterSerial('');
          setSelectedMaterial([]);
        } else {
          setSelectedSubject(taskToEdit.subject || '');
          setCustomSubject(taskToEdit.subject || 'none');
          setSelectedChapterSerial(taskToEdit.chapterSerial || '');
          setSelectedMaterial(taskToEdit.material ? [taskToEdit.material] : []);
          setCustomTitle('');
        }
      } else {
        setTaskType('chapter');
        setCustomTitle('');
        setCustomSubject('none');
        setSelectedSubject('');
        setSelectedChapterSerial('');
        setSelectedMaterial([]);
        setQuestions(0);
        setDate(initialDate);

        // Default time: Current time rounded to nearest 5 mins
        const now = new Date();
        let h = now.getHours();
        let m = Math.ceil(now.getMinutes() / 5) * 5;
        if (m === 60) {
          m = 0;
          h += 1;
        }
        setTime(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
      }
    }
  }, [isOpen, initialDate, taskToEdit]);

  const filteredChapters = useMemo(() => {
    if (!selectedSubject) return [];
    const chapters = subjectData[selectedSubject as Subject]?.chapters || [];
    if (!chapterSearch) return chapters;
    return chapters.filter((c) => c.name.toLowerCase().includes(chapterSearch.toLowerCase()));
  }, [selectedSubject, subjectData, chapterSearch]);

  const availableMaterials = useMemo(() => {
    if (!selectedSubject || selectedChapterSerial === '') return [];
    return (
      subjectData[selectedSubject as Subject]?.chapters.find(
        (c) => c.serial === selectedChapterSerial
      )?.materials || []
    );
  }, [selectedSubject, selectedChapterSerial, subjectData]);

  const isSaveDisabled =
    (taskType === 'custom' && !customTitle.trim()) ||
    (taskType === 'chapter' && (!selectedSubject || selectedChapterSerial === '')) ||
    !time;

  const resetChapterSelection = () => {
    setSelectedChapterSerial('');
    setSelectedMaterial([]);
  };

  const selectChapterSubject = (subj: Subject) => {
    setSelectedSubject(subj);
    setCustomSubject(subj);
    resetChapterSelection();
    setChapterSearch('');
  };

  const selectCustomSubject = (subj: Subject | 'none') => {
    setCustomSubject(subj);
    setSelectedSubject(subj === 'none' ? '' : subj);
  };

  const changeTaskType = (newType: TaskType) => {
    if (newType === taskType) return;
    if (newType === 'custom' && selectedSubject && customSubject === 'none') {
      setCustomSubject(selectedSubject);
    } else if (newType === 'chapter' && customSubject !== 'none' && !selectedSubject) {
      setSelectedSubject(customSubject);
    }
    setTaskType(newType);
  };

  const resolveSubject = (): Subject | undefined => {
    if (customSubject !== 'none') return customSubject;
    if (selectedSubject) return selectedSubject as Subject;
    return undefined;
  };

  return {
    taskType,
    setTaskType,
    changeTaskType,
    date,
    setDate,
    time,
    setTime,
    customTitle,
    setCustomTitle,
    customSubject,
    setCustomSubject,
    selectCustomSubject,
    selectedSubject,
    setSelectedSubject,
    selectChapterSubject,
    selectedChapterSerial,
    setSelectedChapterSerial,
    selectedMaterial,
    setSelectedMaterial,
    chapterSearch,
    setChapterSearch,
    filteredChapters,
    availableMaterials,
    isSaveDisabled,
    resetChapterSelection,
    resolveSubject,
    questions,
    setQuestions,
  };
}
