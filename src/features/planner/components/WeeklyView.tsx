import { DayColumn } from './DayColumn';
import { PlannerTask } from '../../../shared/types';
import { formatDateLocal } from '../../../shared/utils/date';

interface WeeklyViewProps {
    reorderedWeekDays: Date[];
    groupedTasks: Map<string, PlannerTask[]>;
    examDate: string;
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
    onAddTask,
    onEditTask,
    onToggleTask,
    onDeleteTask,
    onMoveTask,
    onDuplicateTask
}: WeeklyViewProps) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return (
        <div className="weekly-grid">
            {reorderedWeekDays.map(day => {
                const dateStr = formatDateLocal(day);
                const dayTasks = groupedTasks.get(dateStr) || [];
                const dayDate = new Date(day);
                dayDate.setHours(0, 0, 0, 0);

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
                        isExamDay={dateStr === examDate}
                        isPastDay={dayDate.getTime() < today.getTime()}
                    />
                )
            })}
        </div>
    );
}
