import { memo, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, ChevronRight, Minus, Plus, X, Check } from 'lucide-react';
import {
  Chapter,
  ChapterDetailProgress,
  ChapterProgress,
  ConfidenceLevel,
  Priority,
} from '../../../shared/types';
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
  onToggleSubtopicMaterial: (subtopicName: string, material: string) => void;
  onUpdateSubtopicAttempted: (subtopicName: string, material: string, count: number) => void;
  onSetSubtopicLastRevised: (subtopicName: string, date: string | undefined) => void;
}

const confidenceColorsList = [
  'var(--text-muted)',
  'var(--confidence-red)',
  'var(--confidence-amber)',
  'var(--confidence-yellow)',
  'var(--confidence-purple)',
  'var(--confidence-green)',
];

function getConfidenceLabel(level: number | undefined) {
  switch (level) {
    case 1:
      return '1 - Need Help';
    case 2:
      return '2 - Low';
    case 3:
      return '3 - Medium';
    case 4:
      return '4 - High';
    case 5:
      return '5 - Mastered';
    default:
      return 'Not Rated';
  }
}

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

// ── Memoized subtopic row to avoid full-list re-renders on each interaction ──
interface SubtopicRowProps {
  subtopic: string;
  materialNames: string[];
  subState: { completed: Record<string, boolean>; attemptedByMaterial?: Record<string, number>; lastRevised?: string };
  isExpanded: boolean;
  onToggleExpand: (subtopic: string) => void;
  onToggleMaterial: (subtopic: string, material: string) => void;
  onUpdateAttempted: (subtopic: string, material: string, count: number) => void;
  onSetRevised: (subtopic: string, date: string | undefined) => void;
}

const SubtopicRow = memo(function SubtopicRow({
  subtopic,
  materialNames,
  subState,
  isExpanded,
  onToggleExpand,
  onToggleMaterial,
  onUpdateAttempted,
  onSetRevised,
}: SubtopicRowProps) {
  const subCompleted = subState.completed || {};
  const attempted = subState.attemptedByMaterial || {};
  const lastRevised = subState.lastRevised;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const isOverdueRevision = lastRevised && new Date(lastRevised) < thirtyDaysAgo;
  const completedMaterialCount = materialNames.filter((m) => !!subCompleted[m]).length;

  return (
    <div className={`subtopic-row ${isExpanded ? 'subtopic-row--expanded' : ''}`}>
      <div
        className="subtopic-row-header"
        onClick={() => onToggleExpand(subtopic)}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggleExpand(subtopic);
          }
        }}
      >
        <ChevronRight size={14} className="subtopic-expand-chevron" />
        <span className="subtopic-row-name">{subtopic}</span>
        <div className="subtopic-row-meta">
          {isOverdueRevision && (
            <span className="revision-warning-badge" title="Not revised in 30+ days">⚠️</span>
          )}
          <div className="subtopic-progress-dots">
            {materialNames.map((m) => (
              <span
                key={m}
                className={`subtopic-progress-dot ${subCompleted[m] ? 'filled' : ''}`}
                title={`${m}: ${subCompleted[m] ? 'Done' : 'Pending'}`}
              />
            ))}
          </div>
          <span className="subtopic-row-count">
            {completedMaterialCount}/{materialNames.length}
          </span>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            className="subtopic-expand-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            {materialNames.map((material) => {
              const isChecked = !!subCompleted[material];
              const attemptedValue = attempted[material] ?? 0;
              return (
                <div
                  key={material}
                  className={`subtopic-material-row ${isChecked ? 'active' : ''}`}
                >
                  <div
                    className="subtopic-material-toggle"
                    onClick={() => onToggleMaterial(subtopic, material)}
                  >
                    <div className={`modern-toggle ${isChecked ? 'checked' : ''}`}>
                      {isChecked && <Check size={10} strokeWidth={3} />}
                    </div>
                    <span className="subtopic-material-name">{material}</span>
                  </div>

                  <div className="subtopic-material-qs">
                    <span className="q-label">Qs:</span>
                    <div className="modern-stepper--compact">
                      <button
                        type="button"
                        onClick={() => onUpdateAttempted(subtopic, material, attemptedValue - 1)}
                        disabled={attemptedValue <= 0}
                        aria-label={`Decrease ${subtopic} ${material} questions`}
                      >
                        <Minus size={10} />
                      </button>
                      <input
                        type="number"
                        min={0}
                        value={attemptedValue}
                        onChange={(e) =>
                          onUpdateAttempted(subtopic, material, parseInt(e.target.value) || 0)
                        }
                        aria-label={`${subtopic} ${material} attempted questions`}
                      />
                      <button
                        type="button"
                        onClick={() => onUpdateAttempted(subtopic, material, attemptedValue + 1)}
                        aria-label={`Increase ${subtopic} ${material} questions`}
                      >
                        <Plus size={10} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="subtopic-revision-row">
              <span className="subtopic-revised-label">Revised:</span>
              <span className={`subtopic-revised-val ${isOverdueRevision ? 'overdue' : ''}`}>
                {lastRevised ? formatDateDisplay(lastRevised) : 'Never'}
              </span>
              <div className="subtopic-revision-actions">
                <button
                  type="button"
                  className="subtopic-mark-btn"
                  onClick={() => onSetRevised(subtopic, todayString())}
                >
                  Mark today
                </button>
                {lastRevised && (
                  <button
                    type="button"
                    className="icon-btn-reset"
                    onClick={() => onSetRevised(subtopic, undefined)}
                    title="Clear revision date"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});


export function ChapterDetailDrawer({
  chapter,
  materialNames,
  progress,
  onClose,
  onToggleMaterial,
  onSetPriority,
  onUpdateDetail,
  onToggleSubtopicMaterial,
  onUpdateSubtopicAttempted,
  onSetSubtopicLastRevised,
}: ChapterDetailDrawerProps) {
  const completed = progress?.completed || {};
  const priority = progress?.priority || 'none';
  const detail = progress?.detail;
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [expandedSubtopics, setExpandedSubtopics] = useState<Set<string>>(new Set());
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

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

  const toggleSubtopicExpand = (subtopic: string) => {
    setExpandedSubtopics((prev) => {
      const next = new Set(prev);
      if (next.has(subtopic)) {
        next.delete(subtopic);
      } else {
        next.add(subtopic);
      }
      return next;
    });
  };

  // Compute subtopic progress for the chip
  const subtopicProgress = useMemo(() => {
    const subtopics = chapter.subtopics || [];
    if (subtopics.length === 0) return null;

    const total = subtopics.length * materialNames.length;
    let done = 0;
    subtopics.forEach((sub) => {
      const subState = progress?.subtopics?.[sub];
      if (subState?.completed) {
        materialNames.forEach((mat) => {
          if (subState.completed[mat]) done++;
        });
      }
    });
    return { done, total };
  }, [chapter.subtopics, materialNames, progress?.subtopics]);

  return (
    <>
      <motion.div 
        className="chapter-drawer-overlay motion-animated" 
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.aside
          className="chapter-drawer modern-drawer motion-animated"
          role="dialog"
          aria-modal="true"
          aria-labelledby="chapter-drawer-title"
          onClick={(event) => event.stopPropagation()}
          initial={isMobile ? { y: '100%', x: 0 } : { x: '100%', y: 0 }}
          animate={{ x: 0, y: 0 }}
          exit={isMobile ? { y: '100%', x: 0 } : { x: '100%', y: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
        >
          <div className="chapter-drawer-header">
            <div>
              <p className="chapter-drawer-kicker">Chapter {chapter.serial}</p>
              <h2 id="chapter-drawer-title">{chapter.name}</h2>
            </div>
            <button
              className="chapter-drawer-close"
              onClick={onClose}
              aria-label="Close chapter details"
            >
              <X size={18} />
            </button>
          </div>

          <div className="chapter-drawer-content">
            {/* ── Status & Progress ── */}
            <div className="drawer-section">
              <h3 className="drawer-section-title">Status &amp; Progress</h3>
              <div className="drawer-card status-card">
                <div className="drawer-field row-field">
                  <label>Priority</label>
                  <PrioritySelector
                    priority={priority}
                    onChange={(nextPriority) => onSetPriority(chapter.serial, nextPriority)}
                  />
                </div>

                <div className="drawer-field column-field">
                  <div className="confidence-slider-header">
                    <label>Confidence Level</label>
                    <span className={`confidence-badge val-${detail?.confidence || 0}`}>
                      {getConfidenceLabel(detail?.confidence)}
                    </span>
                  </div>
                  <div className="confidence-slider-container">
                    <input
                      type="range"
                      min="0"
                      max="5"
                      step="1"
                      value={detail?.confidence || 0}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        onUpdateDetail(chapter.serial, {
                          confidence: val === 0 ? undefined : (val as ConfidenceLevel),
                        });
                      }}
                      className="confidence-slider"
                      style={
                        {
                          '--thumb-color': confidenceColorsList[detail?.confidence || 0],
                        } as React.CSSProperties
                      }
                    />
                    <div className="confidence-slider-ticks">
                      <span style={{ left: '0%' }}>None</span>
                      <span style={{ left: '20%' }}>1</span>
                      <span style={{ left: '40%' }}>2</span>
                      <span style={{ left: '60%' }}>3</span>
                      <span style={{ left: '80%' }}>4</span>
                      <span style={{ left: '100%' }}>5</span>
                    </div>
                  </div>
                </div>

                <div className="drawer-field row-field">
                  <label>Last Revised</label>
                  <div className="date-field-wrapper">
                    <button className="modern-date-btn" onClick={openDatePicker} type="button">
                      <Calendar size={16} />
                      <span>{formatDateDisplay(detail?.lastRevised)}</span>
                    </button>
                    {detail?.lastRevised && (
                      <button
                        className="icon-btn-reset"
                        onClick={() => onUpdateDetail(chapter.serial, { lastRevised: undefined })}
                        title="Clear revision date"
                        type="button"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="drawer-field row-field">
                  <label>Revision Count</label>
                  <div className="stepper-wrapper-with-reset">
                    <div className="modern-stepper">
                      <button
                        onClick={() =>
                          onUpdateDetail(chapter.serial, {
                            revisionCount: Math.max(0, (detail?.revisionCount || 0) - 1),
                          })
                        }
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
                        onClick={() =>
                          onUpdateDetail(chapter.serial, {
                            revisionCount: (detail?.revisionCount || 0) + 1,
                          })
                        }
                        aria-label="Increase revisions"
                        type="button"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    {(detail?.revisionCount || 0) > 0 && (
                      <button
                        className="icon-btn-reset"
                        onClick={() => onUpdateDetail(chapter.serial, { revisionCount: 0 })}
                        title="Reset revision count to 0"
                        type="button"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Study Materials ── */}
            <div className="drawer-section">
              <h3 className="drawer-section-title">Study Materials</h3>
              <div className="materials-list">
                {materialNames.map((material) => {
                  const isChecked = !!completed[material];
                  const attemptedValue = detail?.attemptedByMaterial?.[material] ?? 0;

                  return (
                    <div key={material} className={`material-card ${isChecked ? 'active' : ''}`}>
                      <div
                        className="material-card-header"
                        onClick={() => onToggleMaterial(chapter.serial, material)}
                      >
                        <div className="material-info">
                          <div className={`modern-toggle ${isChecked ? 'checked' : ''}`}>
                            {isChecked && <Check size={14} strokeWidth={3} />}
                          </div>
                          <span className="material-name">{material}</span>
                        </div>
                      </div>

                      <div className="material-card-actions" onClick={(e) => e.stopPropagation()}>
                        <span className="action-label">Questions Attempted</span>
                        <div className="modern-stepper">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setAttempted(material, attemptedValue - 1);
                            }}
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
                            onClick={(e) => {
                              e.stopPropagation();
                              setAttempted(material, attemptedValue + 1);
                            }}
                            aria-label={`Increase ${material} attempted questions`}
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Subtopic Breakdown ── */}
            {chapter.subtopics && chapter.subtopics.length > 0 && (
              <div className="drawer-section">
                <div className="subtopics-section-header">
                  <h3 className="drawer-section-title">Subtopics</h3>
                  {subtopicProgress && (
                    <span className="subtopics-progress-chip">
                      {subtopicProgress.done}/{subtopicProgress.total}
                    </span>
                  )}
                </div>
                <div className="subtopics-container">
                  {chapter.subtopics.map((subtopic) => (
                    <SubtopicRow
                      key={subtopic}
                      subtopic={subtopic}
                      materialNames={materialNames}
                      subState={
                        (progress?.subtopics?.[subtopic] as SubtopicRowProps['subState']) ||
                        { completed: {} }
                      }
                      isExpanded={expandedSubtopics.has(subtopic)}
                      onToggleExpand={toggleSubtopicExpand}
                      onToggleMaterial={onToggleSubtopicMaterial}
                      onUpdateAttempted={onUpdateSubtopicAttempted}
                      onSetRevised={onSetSubtopicLastRevised}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* ── Notes & Weak Areas ── */}
            <div className="drawer-section">
              <h3 className="drawer-section-title">Notes &amp; Weak Areas</h3>
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
        </motion.aside>
      </motion.div>

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
