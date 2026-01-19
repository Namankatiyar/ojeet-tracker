import { PlannerTask } from '../../../shared/types';
import { History, CheckCircle2 } from 'lucide-react';

interface TaskLogProps {
    tasks: PlannerTask[];
}

export function TaskLog({ tasks }: TaskLogProps) {
    const completedTasks = tasks
        .filter(t => t.completed)
        .sort((a, b) => {
            if (a.completedAt && b.completedAt) {
                return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime();
            }
            // Fallback to scheduled date if completedAt missing (legacy data)
            return new Date(b.date).getTime() - new Date(a.date).getTime();
        });

    const formatCompletedDate = (isoDate?: string) => {
        if (!isoDate) return '';
        const date = new Date(isoDate);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="task-log-card">
            <div className="agenda-header agenda-header-task-log">
                <div className="agenda-header-content">
                    <History size={20} className="task-log-icon" />
                    <h2>Task Progress Log</h2>
                </div>
                <p>History of completed tasks</p>
            </div>

            <div className="task-log-list">
                {completedTasks.length > 0 ? (
                    completedTasks.map(task => (
                        <div key={task.id} className="agenda-item task-log-item">
                            <div className="agenda-check checked task-log-check">
                                <CheckCircle2 size={14} />
                            </div>
                            <div className="agenda-info">
                                <span className="agenda-title task-log-title">{task.title}</span>
                                <div className="agenda-subtitle">
                                    {task.subject && (
                                        <span className={`task-log-subject text-${task.subject}`}>
                                            {task.subject.charAt(0).toUpperCase() + task.subject.slice(1)} {task.subtitle ? '•' : ''}
                                        </span>
                                    )}
                                    {task.subtitle && <span className="agenda-subtitle-text">{task.subtitle}</span>}
                                </div>
                            </div>
                            <div className="agenda-time task-log-date">
                                {task.completedAt ? formatCompletedDate(task.completedAt) : task.date}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="empty-agenda">
                        <p>No tasks completed yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
