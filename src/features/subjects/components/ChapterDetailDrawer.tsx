import { useEffect, useState } from 'react';
import { Calendar, Minus, Plus, X, Check } from 'lucide-react';
import { Chapter, ChapterDetailProgress, ChapterProgress, ConfidenceLevel, Priority } from '../../../shared/types';
import { PrioritySelector } from '../../../shared/components/ui/PrioritySelector';
import { DatePickerModal } from '../../../shared/components/ui/DatePickerModal';
import { formatDateLocal, parseDateLocal } from '../../../shared/utils/date';

interface ChapterDetailDrawerProps {
    chapter: Chapter;
    materialNames: string[];
    progress: ChapterProgress | undefined;
    onClose: () => void;
    onToggleMaterial: (chapterSerial: number, material: string) => void;
    onSetPriority: (chapterSerial: number, priority: Priority) => void;
    onUpdateDetail: (chapterSerial: number, patch: Partial<ChapterDetailProgress>) => void;
}

const confidenceLevels: ConfidenceLevel[] = [1, 2, 3, 4, 5];

function todayString() {
    return formatDateLocal(new Date());
}

function formatDateDisplay(dateString: string | undefined) {
    if (!dateString) return 'Set date';
    const date = parseDateLocal(dateString);
    if (!date) return dateString;

    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

export function ChapterDetailDrawer({
    chapter,
    materialNames,
    progress,
    onClose,
    onToggleMaterial,
    onSetPriority,
    onUpdateDetail,
}: ChapterDetailDrawerProps) {
    const completed = progress?.completed || {};
    const priority = progress?.priority || 'none';
    const detail = progress?.detail;
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const setAttempted = (material: string, nextValue: number) => {
        const normalizedValue = Number.isFinite(nextValue) ? Math.max(0, Math.floor(nextValue)) : 0;
        onUpdateDetail(chapter.serial, {
            attemptedByMaterial: {
                [material]: normalizedValue,
            },
        });
    };

    const openDatePicker = () => {
        if (!detail?.lastRevised) {
            onUpdateDetail(chapter.serial, { lastRevised: todayString() });
        }
        setIsDatePickerOpen(true);
    };

    return (
        <>
            <div className="chapter-drawer-overlay" onClick={onClose}>
                <aside
                    className="chapter-drawer modern-drawer"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="chapter-drawer-title"
                    onClick={(event) => event.stopPropagation()}
                >
                    <div className="chapter-drawer-header">
                        <div>
                            <p className="chapter-drawer-kicker">Chapter {chapter.serial}</p>
                            <h2 id="chapter-drawer-title">{chapter.name}</h2>
                        </div>
                        <button className="chapter-drawer-close" onClick={onClose} aria-label="Close chapter details">
                            <X size={18} />
                        </button>
                    </div>

                    <div className="chapter-drawer-content">
                        <div className="drawer-section">
                            <h3 className="drawer-section-title">Status & Progress</h3>
                            <div className="drawer-card status-card">
                                <div className="drawer-field row-field">
                                    <label>Priority</label>
                                    <PrioritySelector
                                        priority={priority}
                                        onChange={(nextPriority) => onSetPriority(chapter.serial, nextPriority)}
                                    />
                                </div>

                                <div className="drawer-field column-field">
                                    <label>Confidence Level</label>
                                    <div className="segmented-confidence-control" role="radiogroup" aria-label="Confidence level">
                                        {confidenceLevels.map((level) => {
                                            const isActive = detail?.confidence === level;
                                            return (
                                                <button
                                                    key={level}
                                                    type="button"
                                                    className={`segment-btn confidence-${level} ${isActive ? 'active' : ''}`}
                                                    onClick={() => onUpdateDetail(chapter.serial, { confidence: isActive ? undefined : level })}
                                                    role="radio"
                                                    aria-checked={isActive}
                                                    aria-label={`Confidence ${level}`}
                                                >
                                                    {level}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="drawer-field row-field">
                                    <label>Last Revised</label>
                                    <button
                                        className="modern-date-btn"
                                        onClick={openDatePicker}
                                        type="button"
                                    >
                                        <Calendar size={16} />
                                        <span>{formatDateDisplay(detail?.lastRevised)}</span>
                                    </button>
                                </div>

                                <div className="drawer-field row-field">
                                    <label>Revision Count</label>
                                    <div className="modern-stepper">
                                        <button
                                            onClick={() => onUpdateDetail(chapter.serial, { revisionCount: Math.max(0, (detail?.revisionCount || 0) - 1) })}
                                            disabled={(detail?.revisionCount || 0) <= 0}
                                            aria-label="Decrease revisions"
                                            type="button"
                                        >
                                            <Minus size={14} />
                                        </button>
                                        <input
                                            type="number"
                                            value={detail?.revisionCount || 0}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value) || 0;
                                                onUpdateDetail(chapter.serial, { revisionCount: Math.max(0, val) });
                                            }}
                                            min="0"
                                            aria-label="Revision count"
                                        />
                                        <button
                                            onClick={() => onUpdateDetail(chapter.serial, { revisionCount: (detail?.revisionCount || 0) + 1 })}
                                            aria-label="Increase revisions"
                                            type="button"
                                        >
                                            <Plus size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="drawer-section">
                            <h3 className="drawer-section-title">Study Materials</h3>
                            <div className="materials-list">
                                {materialNames.map((material) => {
                                    const isChecked = !!completed[material];
                                    const attemptedValue = detail?.attemptedByMaterial?.[material] ?? 0;

                                    return (
                                        <div key={material} className={`material-card ${isChecked ? 'active' : ''}`}>
                                            <div className="material-card-header" onClick={() => onToggleMaterial(chapter.serial, material)}>
                                                <div className="material-info">
                                                    <div className={`modern-toggle ${isChecked ? 'checked' : ''}`}>
                                                        {isChecked && <Check size={14} strokeWidth={3} />}
                                                    </div>
                                                    <span className="material-name">{material}</span>
                                                </div>
                                            </div>
                                            
                                            {isChecked && (
                                                <div className="material-card-actions">
                                                    <span className="action-label">Questions Attempted</span>
                                                    <div className="modern-stepper">
                                                        <button
                                                            type="button"
                                                            onClick={(e) => { e.stopPropagation(); setAttempted(material, attemptedValue - 1); }}
                                                            aria-label={`Decrease ${material} attempted questions`}
                                                        >
                                                            <Minus size={14} />
                                                        </button>
                                                        <input
                                                            type="number"
                                                            min={0}
                                                            value={attemptedValue}
                                                            onChange={(event) => setAttempted(material, event.target.valueAsNumber)}
                                                            onClick={(e) => e.stopPropagation()}
                                                            aria-label={`${material} attempted questions`}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={(e) => { e.stopPropagation(); setAttempted(material, attemptedValue + 1); }}
                                                            aria-label={`Increase ${material} attempted questions`}
                                                        >
                                                            <Plus size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="drawer-section">
                            <h3 className="drawer-section-title">Notes & Weak Areas</h3>
                            <textarea
                                id={`chapter-notes-${chapter.serial}`}
                                className="modern-textarea"
                                value={detail?.notes || ''}
                                onChange={(event) => onUpdateDetail(chapter.serial, { notes: event.target.value })}
                                placeholder="Jot down formulas to review, weak topics, or quick reminders..."
                                rows={4}
                            />
                        </div>
                    </div>
                </aside>
            </div>

            <DatePickerModal
                isOpen={isDatePickerOpen}
                selectedDate={detail?.lastRevised || todayString()}
                onSelect={(selectedDate) => {
                    onUpdateDetail(chapter.serial, { lastRevised: selectedDate });
                    setIsDatePickerOpen(false);
                }}
                onClose={() => setIsDatePickerOpen(false)}
            />
        </>
    );
}
