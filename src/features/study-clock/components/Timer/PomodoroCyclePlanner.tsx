import { useMemo } from 'react';
import { Copy, Plus, Trash2 } from 'lucide-react';
import {
  Subject,
  SubjectData,
  PlannerTask,
  PomodoroCycleTask,
  AppProgress,
} from '../../../../shared/types';
import { CustomSelect } from '../../../../shared/components/ui/CustomSelect';
import { useActiveSubjects } from '../../../../shared/hooks/useActiveSubjects';

interface SubjectMeta {
  key: Subject;
  label: string;
  colorVar: string;
}

/** Default (empty) cycle task. */
export const EMPTY_CYCLE_TASK: PomodoroCycleTask = {
  taskType: 'chapter',
  selectedSubject: '',
  selectedChapter: '',
  selectedMaterial: '',
  customTitle: '',
  selectedTaskId: '',
};

// ── Compact inline task selector for a single cycle ──

interface CycleTaskSelectorProps {
  task: PomodoroCycleTask;
  onChange: (task: PomodoroCycleTask) => void;
  subjectData: Record<Subject, SubjectData | null>;
  plannerTasks: PlannerTask[];
  progress: AppProgress;
  subjectMeta: SubjectMeta[];
  disabled?: boolean;
}

function CycleTaskSelector({
  task,
  onChange,
  subjectData,
  plannerTasks,
  progress,
  subjectMeta,
  disabled = false,
}: CycleTaskSelectorProps) {
  const availableChapters = task.selectedSubject
    ? subjectData[task.selectedSubject]?.chapters || []
    : [];
  const availableMaterials = task.selectedSubject
    ? subjectData[task.selectedSubject]?.materialNames || []
    : [];

  return (
    <div className="cycle-task-selector">
      {/* Task type quick toggle */}
      <div className="cycle-task-type-row">
        {(['chapter', 'task', 'custom'] as const).map((type) => (
          <button
            key={type}
            className={`cycle-type-chip ${task.taskType === type ? 'active' : ''}`}
            onClick={() => onChange({ ...task, taskType: type })}
            disabled={disabled}
          >
            {type === 'chapter' ? 'Syllabus' : type === 'task' ? 'Task' : 'Custom'}
          </button>
        ))}
      </div>

      {task.taskType === 'chapter' ? (
        <div className="cycle-task-fields">
          <CustomSelect
            value={task.selectedSubject}
            onChange={(val: string) =>
              onChange({
                ...task,
                selectedSubject: val as Subject | '',
                selectedChapter: '',
                selectedMaterial: '',
              })
            }
            options={subjectMeta.map((meta) => ({
              value: meta.key,
              label: meta.label,
              color: meta.colorVar,
            }))}
            placeholder="Subject"
            disabled={disabled}
            size="small"
          />
          <CustomSelect
            value={task.selectedChapter}
            onChange={(val: string | number) =>
              onChange({ ...task, selectedChapter: val ? Number(val) : '' })
            }
            options={availableChapters.map((ch) => {
              const chapterPriority = task.selectedSubject
                ? progress[task.selectedSubject]?.[ch.serial]?.priority
                : undefined;
              return {
                value: ch.serial,
                label: ch.name,
                priority: chapterPriority !== 'none' ? chapterPriority : undefined,
              };
            })}
            placeholder="Chapter"
            disabled={disabled || !task.selectedSubject}
            size="small"
          />
          <CustomSelect
            value={task.selectedMaterial}
            onChange={(val: string) => onChange({ ...task, selectedMaterial: val })}
            options={availableMaterials.map((mat) => ({ value: mat, label: mat }))}
            placeholder="Material"
            disabled={disabled || !task.selectedSubject}
            size="small"
          />
        </div>
      ) : task.taskType === 'task' ? (
        <div className="cycle-task-fields">
          <CustomSelect
            value={task.selectedTaskId}
            onChange={(taskId: string) => {
              const found = plannerTasks.find((t) => t.id === taskId);
              if (found) {
                onChange({
                  ...task,
                  selectedTaskId: taskId,
                  selectedSubject: found.subject || '',
                  selectedChapter: found.chapterSerial ?? '',
                  selectedMaterial: found.material || '',
                  customTitle: found.subject ? '' : found.title,
                });
              } else {
                onChange({ ...task, selectedTaskId: taskId });
              }
            }}
            options={plannerTasks
              .filter((t) => !t.completed)
              .map((t) => ({
                value: t.id,
                label: `${t.title}${t.subtitle ? ` - ${t.subtitle}` : ''}`,
              }))}
            placeholder="Select task…"
            disabled={disabled}
            size="small"
          />
        </div>
      ) : (
        <div className="cycle-task-fields">
          <input
            type="text"
            className="cycle-custom-input"
            placeholder="Session title…"
            value={task.customTitle}
            onChange={(e) => onChange({ ...task, customTitle: e.target.value })}
            disabled={disabled}
          />
        </div>
      )}
    </div>
  );
}

// ── Main planner component ──

interface PomodoroCyclePlannerProps {
  cycleTasks: PomodoroCycleTask[];
  onCycleTasksChange: (tasks: PomodoroCycleTask[]) => void;
  cyclesBeforeLongBreak: number;
  subjectData: Record<Subject, SubjectData | null>;
  plannerTasks: PlannerTask[];
  progress: AppProgress;
  disabled?: boolean;
}

export function PomodoroCyclePlanner({
  cycleTasks,
  onCycleTasksChange,
  cyclesBeforeLongBreak,
  subjectData,
  plannerTasks,
  progress,
  disabled = false,
}: PomodoroCyclePlannerProps) {
  const { subjectMeta } = useActiveSubjects();

  // Ensure we always show at least cyclesBeforeLongBreak rows
  const displayCount = Math.max(cyclesBeforeLongBreak, cycleTasks.length);

  const resolvedTasks: PomodoroCycleTask[] = useMemo(() => {
    const result: PomodoroCycleTask[] = [];
    for (let i = 0; i < displayCount; i++) {
      if (i < cycleTasks.length) {
        result.push(cycleTasks[i]);
      } else {
        // Fall back to last assigned task (or empty)
        result.push(cycleTasks.length > 0 ? { ...cycleTasks[cycleTasks.length - 1] } : { ...EMPTY_CYCLE_TASK });
      }
    }
    return result;
  }, [cycleTasks, displayCount]);

  const updateTask = (index: number, task: PomodoroCycleTask) => {
    const next = [...resolvedTasks];
    next[index] = task;
    onCycleTasksChange(next);
  };

  const duplicateTask = (index: number) => {
    const next = [...resolvedTasks];
    next.splice(index + 1, 0, { ...resolvedTasks[index] });
    onCycleTasksChange(next);
  };

  const removeTask = (index: number) => {
    if (resolvedTasks.length <= 1) return;
    const next = resolvedTasks.filter((_, i) => i !== index);
    onCycleTasksChange(next);
  };

  const addCycle = () => {
    const lastTask = resolvedTasks[resolvedTasks.length - 1] ?? EMPTY_CYCLE_TASK;
    onCycleTasksChange([...resolvedTasks, { ...lastTask }]);
  };

  return (
    <div className="cycle-planner">
      <div className="cycle-planner-header">
        <span className="cycle-planner-label">Plan each cycle</span>
        <span className="cycle-planner-count">{resolvedTasks.length} cycles</span>
      </div>

      <div className="cycle-planner-timeline">
        {resolvedTasks.map((task, idx) => {
          const isLongBreakAfter = (idx + 1) % cyclesBeforeLongBreak === 0;
          return (
            <div key={idx} className="cycle-planner-row">
              <div className="cycle-planner-indicator">
                <div className="cycle-dot" />
                {idx < resolvedTasks.length - 1 && <div className="cycle-connector" />}
              </div>

              <div className="cycle-planner-card">
                <div className="cycle-card-header">
                  <span className="cycle-number">Cycle {idx + 1}</span>
                  <div className="cycle-card-actions">
                    <button
                      className="cycle-action-btn"
                      onClick={() => duplicateTask(idx)}
                      disabled={disabled}
                      title="Duplicate to next cycle"
                    >
                      <Copy size={12} />
                    </button>
                    {resolvedTasks.length > 1 && (
                      <button
                        className="cycle-action-btn danger"
                        onClick={() => removeTask(idx)}
                        disabled={disabled}
                        title="Remove cycle"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>

                <CycleTaskSelector
                  task={task}
                  onChange={(updated) => updateTask(idx, updated)}
                  subjectData={subjectData}
                  plannerTasks={plannerTasks}
                  progress={progress}
                  subjectMeta={subjectMeta}
                  disabled={disabled}
                />

                {isLongBreakAfter && idx < resolvedTasks.length - 1 && (
                  <div className="cycle-long-break-marker">☕ Long Break</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <button className="cycle-add-btn" onClick={addCycle} disabled={disabled}>
        <Plus size={14} /> Add Cycle
      </button>
    </div>
  );
}
