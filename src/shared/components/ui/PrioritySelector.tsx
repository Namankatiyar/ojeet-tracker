import { Priority } from '../../types';
import { CustomSelect } from './CustomSelect';

interface PrioritySelectorProps {
    priority: Priority;
    onChange: (priority: Priority) => void;
}

export function PrioritySelector({ priority, onChange }: PrioritySelectorProps) {
    const options = [
        { value: 'none', label: 'None', color: 'var(--text-muted)' },
        { value: 'high', label: 'High', color: 'var(--priority-high)' },
        { value: 'medium', label: 'Medium', color: 'var(--priority-medium)' },
        { value: 'low', label: 'Low', color: 'var(--priority-low)' },
    ];

    return (
        <div className="priority-selector">
            <CustomSelect
                value={priority}
                options={options}
                onChange={(val) => onChange(val as Priority)}
                placeholder="Priority"
                size="small"
            />
        </div>
    );
}
