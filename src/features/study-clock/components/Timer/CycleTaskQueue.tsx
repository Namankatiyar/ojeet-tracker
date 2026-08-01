import { useState } from 'react';
import { ChevronDown, ChevronUp, Edit2, Check } from 'lucide-react';
import {
  Subject,
  SubjectData,
  PlannerTask,
  PomodoroCycleTask,
} from '../../../../shared/types';

interface CycleTaskQueueProps {
  cycleTasks: PomodoroCycleTask[];
  currentCycleIndex: number;
  subjectData: Record<Subject, SubjectData | null>;
  plannerTasks: PlannerTask[];
  onEditCycleTask: (cycleIndex: number) => void;
  /** Whether a linked planner task can be marked complete for the current cycle. */
  canMarkCurrentComplete: boolean;
  onMarkCurrentComplete: () => void;
}

/** Derive a short display title from a PomodoroCycleTask. */
function getCycleTaskTitle(
  task: PomodoroCycleTask,
  subjectData: Record<Subject, SubjectData | null>,
  plannerTasks: PlannerTask[]
): string {
  if (task.taskType === 'custom') return task.customTitle || 'Untitled';
  if (task.taskType === 'task' && task.selectedTaskId) {
    const found = plannerTasks.find((t) => t.id === task.selectedTaskId);
    if (found) return `${found.title}${found.subtitle ? ` - ${found.subtitle}` : ''}`;
    return 'Unknown Task';
  }
  // chapter type
  const parts: string[] = [];
  if (task.selectedSubject) {
    parts.push(task.selectedSubject.charAt(0).toUpperCase() + task.selectedSubject.slice(1));
  }
  if (task.selectedChapter && task.selectedSubject) {
    const chapter = subjectData[task.selectedSubject]?.chapters.find(
      (c) => c.serial === task.selectedChapter
    );
    if (chapter) parts.push(chapter.name);
  }
  if (task.selectedMaterial) parts.push(task.selectedMaterial);
  return parts.length > 0 ? parts.join(' > ') : 'Untitled';
}

export function CycleTaskQueue({
  cycleTasks,
  currentCycleIndex,
  subjectData,
  plannerTasks,
  onEditCycleTask,
  canMarkCurrentComplete,
  onMarkCurrentComplete,
}: CycleTaskQueueProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  /** Get task for a given cycle index, falling back to the last defined task. */
  const getTaskForIndex = (idx: number): PomodoroCycleTask | null => {
    if (idx < cycleTasks.length) return cycleTasks[idx];
    if (cycleTasks.length > 0) return cycleTasks[cycleTasks.length - 1];
    return null;
  };

  const currentTask = getTaskForIndex(currentCycleIndex);
  if (!currentTask) return null;

  const currentTitle = getCycleTaskTitle(currentTask, subjectData, plannerTasks);

  // Upcoming cycles (next 3)
  const upcomingCount = 3;
  const upcoming: { index: number; task: PomodoroCycleTask }[] = [];
  for (let i = currentCycleIndex + 1; i <= currentCycleIndex + upcomingCount; i++) {
    const task = getTaskForIndex(i);
    if (task) upcoming.push({ index: i, task });
  }

  return (
    <div className="cycle-task-queue">
      {/* Current cycle */}
      <div className="cycle-queue-current">
        <div className="cycle-queue-badge">Cycle {currentCycleIndex + 1}</div>
        <div className="cycle-queue-title">{currentTitle}</div>
        <div className="cycle-queue-actions">
          {canMarkCurrentComplete && (
            <button
              className="cycle-queue-complete-btn"
              onClick={onMarkCurrentComplete}
              title="Mark task complete"
            >
              <Check size={12} />
            </button>
          )}
          <button
            className="cycle-queue-edit-btn"
            onClick={() => onEditCycleTask(currentCycleIndex)}
            title="Edit this cycle's task"
          >
            <Edit2 size={12} />
          </button>
        </div>
      </div>

      {/* Toggle for upcoming */}
      {upcoming.length > 0 && (
        <>
          <button
            className="cycle-queue-toggle"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            <span>Up next ({upcoming.length})</span>
          </button>

          {isExpanded && (
            <div className="cycle-queue-upcoming">
              {upcoming.map(({ index, task }) => {
                const title = getCycleTaskTitle(task, subjectData, plannerTasks);
                return (
                  <div key={index} className="cycle-queue-upcoming-item">
                    <span className="cycle-queue-upcoming-badge">C{index + 1}</span>
                    <span className="cycle-queue-upcoming-title">{title}</span>
                    <button
                      className="cycle-queue-edit-btn small"
                      onClick={() => onEditCycleTask(index)}
                      title={`Edit Cycle ${index + 1} task`}
                    >
                      <Edit2 size={10} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
