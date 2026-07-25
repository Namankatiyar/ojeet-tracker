import { DayColumn } from './DayColumn';
import { PlannerTask, ExamEntry } from '../../../shared/types';
import { formatDateLocal, getLogicalDate } from '../../../shared/utils/date';
import { useUserProgress } from '../../../core/context/UserProgressContext';

interface WeeklyViewProps {
  reorderedWeekDays: Date[];
  groupedTasks: Map<string, PlannerTask[]>;
  examDate: string;
  examDates?: ExamEntry[];
  onAddTask: (date: string) => void;
  onEditTask: (task: PlannerTask) => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onMoveTask: (taskId: string, newDate: string) => void;
  onDuplicateTask: (taskId: string, newDate: string) => void;
}

export function WeeklyView({
  reorderedWeekDays,
  groupedTasks,
  examDate,
  examDates = [],
  onAddTask,
  onEditTask,
  onToggleTask,
  onDeleteTask,
  onMoveTask,
  onDuplicateTask,
}: WeeklyViewProps) {
  const { dailyResetHour } = useUserProgress();
  const today = getLogicalDate(dailyResetHour);
  today.setHours(0, 0, 0, 0);

  return (
    <div className="weekly-grid">
      {reorderedWeekDays.map((day) => {
        const dateStr = formatDateLocal(day);
        const dayTasks = groupedTasks.get(dateStr) || [];
        const dayDate = new Date(day);
        dayDate.setHours(0, 0, 0, 0);

        const matchingExam = examDates.find((exam) => exam.date === dateStr);
        const isExamDay = !!matchingExam || dateStr === examDate;
        const examName = matchingExam?.name || (dateStr === examDate ? 'JEE Main Exam' : undefined);

        return (
          <DayColumn
            key={day.toISOString()}
            date={day}
            tasks={dayTasks}
            onAddTask={() => onAddTask(dateStr)}
            onEditTask={onEditTask}
            onToggleTask={onToggleTask}
            onDeleteTask={onDeleteTask}
            onMoveTask={onMoveTask}
            onDuplicateTask={onDuplicateTask}
            isExamDay={isExamDay}
            examName={examName}
            isPastDay={dayDate.getTime() < today.getTime()}
          />
        );
      })}
    </div>
  );
}
