import { useState, useMemo } from 'react';
import { Trash2, Clock, X, Pencil, Plus, Calendar } from 'lucide-react';
import { Subject, SubjectData, StudySession, PlannerTask } from '../../../shared/types';
import { CustomSelect } from '../../../shared/components/ui/CustomSelect';
import { DatePickerModal } from '../../../shared/components/ui/DatePickerModal';
import { useActiveSubjects } from '../../../shared/hooks/useActiveSubjects';
import { formatDateLocal } from '../../../shared/utils/date';
import { TimePicker } from '../../../shared/components/ui/TimePicker';

interface SessionHistoryProps {
  sessions: StudySession[];
  subjectData: Record<Subject, SubjectData | null>;
  onDeleteSession: (sessionId: string) => void;
  onEditSession: (session: StudySession) => void;
  onAddSession: (session: StudySession) => void;
  plannerTasks?: PlannerTask[];
}

function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
}

export function SessionHistory({
  sessions,
  onDeleteSession,
  onEditSession,
  onAddSession,
  plannerTasks,
}: SessionHistoryProps) {
  const { subjectMeta } = useActiveSubjects();
  // Edit modal state
  const [editingSession, setEditingSession] = useState<StudySession | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editHours, setEditHours] = useState(0);
  const [editMinutes, setEditMinutes] = useState(0);
  const [editSubject, setEditSubject] = useState<Subject | ''>('');
  const [editMaterial, setEditMaterial] = useState('');

  // Manual entry modal state
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualTitle, setManualTitle] = useState('');
  const [manualHours, setManualHours] = useState(0);
  const [manualMinutes, setManualMinutes] = useState(0);
  const [manualDate, setManualDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [manualSubject, setManualSubject] = useState<Subject | ''>('');
  const [manualMaterial, setManualMaterial] = useState('');
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [manualTaskId, setManualTaskId] = useState('');

  const [logMode, setLogMode] = useState<'duration' | 'time'>('duration');
  const [manualStartTime, setManualStartTime] = useState('');
  const [manualEndTime, setManualEndTime] = useState('');

  const calculatedDurationText = useMemo(() => {
    if (!manualStartTime || !manualEndTime) return '';
    const [startH, startM] = manualStartTime.split(':').map(Number);
    const [endH, endM] = manualEndTime.split(':').map(Number);

    let diffMin = endH * 60 + endM - (startH * 60 + startM);
    if (diffMin < 0) {
      diffMin += 24 * 60; // overnight session
    }

    const hrs = Math.floor(diffMin / 60);
    const mins = diffMin % 60;

    const overnightSuffix = endH * 60 + endM < startH * 60 + startM ? ' (overnight)' : '';

    if (hrs > 0) {
      return `${hrs}h ${mins}m${overnightSuffix}`;
    }
    return `${mins}m${overnightSuffix}`;
  }, [manualStartTime, manualEndTime]);

  const openEditModal = (session: StudySession) => {
    setEditingSession(session);
    setEditTitle(session.title);
    const hours = Math.floor(session.duration / 3600);
    const mins = Math.floor((session.duration % 3600) / 60);
    setEditHours(hours);
    setEditMinutes(mins);
    setEditSubject(session.subject || '');
    setEditMaterial(session.material || '');
  };

  const closeEditModal = () => {
    setEditingSession(null);
    setEditTitle('');
    setEditHours(0);
    setEditMinutes(0);
    setEditSubject('');
    setEditMaterial('');
  };

  const saveEditedSession = () => {
    if (!editingSession) return;
    const newDuration = editHours * 3600 + editMinutes * 60;
    const updatedSession: StudySession = {
      ...editingSession,
      title: editTitle || editingSession.title,
      duration: newDuration > 0 ? newDuration : editingSession.duration,
      subject: editSubject || undefined,
      material: editMaterial || undefined,
      type: editSubject ? 'chapter' : 'custom',
    };
    onEditSession(updatedSession);
    closeEditModal();
  };

  const openManualEntryModal = () => {
    setManualTitle('');
    setManualHours(0);
    setManualMinutes(30);
    setManualDate(new Date().toISOString().split('T')[0]);
    setManualTaskId('');
    setManualSubject('');
    setManualMaterial('');

    // Pre-fill start/end times with current time - 30 minutes to now
    const now = new Date();
    const start = new Date(now.getTime() - 30 * 60 * 1000);
    const formatTime = (d: Date) => {
      const h = d.getHours().toString().padStart(2, '0');
      const m = d.getMinutes().toString().padStart(2, '0');
      return `${h}:${m}`;
    };
    setManualStartTime(formatTime(start));
    setManualEndTime(formatTime(now));
    setLogMode('duration');
    setShowManualEntry(true);
  };

  const closeManualEntryModal = () => {
    setShowManualEntry(false);
  };

  const handleAddManualEntry = () => {
    let duration = 0;
    let entryStartTimeStr = '';
    let entryEndTimeStr = '';

    const entryDate = new Date(manualDate);

    if (logMode === 'time') {
      if (!manualStartTime || !manualEndTime) return;
      const [startH, startM] = manualStartTime.split(':').map(Number);
      const [endH, endM] = manualEndTime.split(':').map(Number);

      const startDateTime = new Date(entryDate);
      startDateTime.setHours(startH, startM, 0, 0);

      const endDateTime = new Date(entryDate);
      endDateTime.setHours(endH, endM, 0, 0);

      // Handle overnight study sessions
      if (endDateTime.getTime() < startDateTime.getTime()) {
        endDateTime.setDate(endDateTime.getDate() + 1);
      }

      duration = Math.floor((endDateTime.getTime() - startDateTime.getTime()) / 1000);
      entryStartTimeStr = startDateTime.toISOString();
      entryEndTimeStr = endDateTime.toISOString();
    } else {
      duration = manualHours * 3600 + manualMinutes * 60;
      // Default 12:00 PM local
      const startDateTime = new Date(entryDate);
      startDateTime.setHours(12, 0, 0, 0);
      entryStartTimeStr = startDateTime.toISOString();
      entryEndTimeStr = new Date(startDateTime.getTime() + duration * 1000).toISOString();
    }

    if (duration <= 0 || !manualTitle.trim()) return;

    let finalType: 'chapter' | 'custom' | 'task' = manualSubject ? 'chapter' : 'custom';
    let finalChapterSerial: number | undefined = undefined;
    let finalChapterName: string | undefined = undefined;
    let finalSubject: Subject | undefined = manualSubject || undefined;
    let finalMaterial: string | undefined = manualMaterial || undefined;

    if (manualTaskId && plannerTasks) {
      const task = plannerTasks.find((t) => t.id === manualTaskId);
      if (task) {
        if (task.subject) {
          finalSubject = task.subject;
          if (task.chapterSerial != null) {
            finalChapterSerial = task.chapterSerial;
            finalChapterName = subjectData[task.subject]?.chapters.find(
              (c) => c.serial === task.chapterSerial
            )?.name;
            finalMaterial = task.material || undefined;
            finalType = 'chapter';
          } else {
            finalType = 'custom';
          }
        } else {
          finalType = 'custom';
        }
      }
    }

    const session: StudySession = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      title: manualTitle.trim(),
      subject: finalSubject,
      chapterSerial: finalChapterSerial,
      chapterName: finalChapterName,
      material: finalMaterial,
      type: finalType,
      startTime: entryStartTimeStr,
      endTime: entryEndTimeStr,
      localDate: formatDateLocal(entryDate),
      duration,
    };

    onAddSession(session);
    closeManualEntryModal();
  };

  const isSaveDisabled =
    !manualTitle.trim() ||
    (logMode === 'duration'
      ? manualHours === 0 && manualMinutes === 0
      : !manualStartTime || !manualEndTime || manualStartTime === manualEndTime);

  return (
    <>
      <div className="session-log-card">
        <div className="session-log-header">
          <h3>Session Log</h3>
          <button className="add-entry-btn" onClick={openManualEntryModal} title="Add Manual Entry">
            <Plus size={16} />
          </button>
        </div>
        <div className="session-log-list">
          {sessions.length === 0 ? (
            <div className="empty-log">
              <Clock size={32} />
              <p>No sessions recorded yet</p>
              <span>Start a timer to track your study time</span>
            </div>
          ) : (
            sessions
              .slice()
              .reverse()
              .map((session) => (
                <div key={session.id} className="session-log-item">
                  <div className="session-info">
                    <div className="session-title">{session.title}</div>
                    <div className="session-meta">
                      {new Date(session.endTime).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {session.timerMode && session.timerMode !== 'stopwatch' && (
                        <span className="session-mode-badge">
                          {session.timerMode === 'video' ? 'VIDEO' : session.timerMode}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="session-duration">{formatDuration(session.duration)}</div>
                  <div className="session-actions">
                    <button
                      className="session-edit-btn"
                      onClick={() => openEditModal(session)}
                      title="Edit session"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      className="session-delete-btn"
                      onClick={() => onDeleteSession(session.id)}
                      title="Delete session"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
          )}
        </div>
      </div>

      {/* Edit Session Modal */}
      {editingSession && (
        <div className="distribution-modal-overlay" onClick={closeEditModal}>
          <div className="distribution-modal" onClick={(e) => e.stopPropagation()}>
            <div className="distribution-modal-header">
              <h3>Edit Session</h3>
              <button className="distribution-modal-close" onClick={closeEditModal}>
                <X size={20} />
              </button>
            </div>
            <div className="edit-session-form">
              <div className="edit-form-group">
                <label>Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Session title..."
                  className="edit-input"
                />
              </div>
              <div className="edit-form-group">
                <label>Subject</label>
                <CustomSelect
                  value={editSubject}
                  onChange={(val) => setEditSubject(val as Subject | '')}
                  options={[
                    { value: '', label: 'None' },
                    ...subjectMeta.map((meta) => ({
                      value: meta.key,
                      label: meta.label,
                      color: meta.colorVar,
                    })),
                  ]}
                  placeholder="Select Subject"
                />
              </div>
              <div className="edit-form-group">
                <label>Material</label>
                <input
                  type="text"
                  value={editMaterial}
                  onChange={(e) => setEditMaterial(e.target.value)}
                  placeholder="Material name..."
                  className="edit-input"
                />
              </div>
              <div className="edit-form-actions">
                <button className="edit-cancel-btn" onClick={closeEditModal}>
                  Cancel
                </button>
                <button className="edit-save-btn" onClick={saveEditedSession}>
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Entry Modal */}
      {showManualEntry && (
        <div className="distribution-modal-overlay" onClick={closeManualEntryModal}>
          <div className="distribution-modal" onClick={(e) => e.stopPropagation()}>
            <div className="distribution-modal-header">
              <h3>Add Manual Entry</h3>
              <button className="distribution-modal-close" onClick={closeManualEntryModal}>
                <X size={20} />
              </button>
            </div>
            <div className="edit-session-form">
              <div className="edit-form-group">
                <label>Title *</label>
                <input
                  type="text"
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  placeholder="What did you study?"
                  className="edit-input"
                  autoFocus
                />
              </div>

              <div className="edit-form-group">
                <label>Log Entry By</label>
                <div className="manual-entry-mode-selector">
                  <button
                    type="button"
                    className={`mode-btn ${logMode === 'duration' ? 'active' : ''}`}
                    onClick={() => setLogMode('duration')}
                  >
                    Duration
                  </button>
                  <button
                    type="button"
                    className={`mode-btn ${logMode === 'time' ? 'active' : ''}`}
                    onClick={() => setLogMode('time')}
                  >
                    Start & End Time
                  </button>
                </div>
              </div>

              {logMode === 'duration' ? (
                <div className="edit-form-group">
                  <label>Duration *</label>
                  <div className="duration-input-group">
                    <input
                      type="number"
                      min="0"
                      max="23"
                      value={manualHours}
                      onChange={(e) => setManualHours(Math.max(0, parseInt(e.target.value) || 0))}
                      className="edit-input duration-input"
                    />
                    <span className="duration-label">hours</span>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={manualMinutes}
                      onChange={(e) =>
                        setManualMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))
                      }
                      className="edit-input duration-input"
                    />
                    <span className="duration-label">minutes</span>
                  </div>
                </div>
              ) : (
                <div className="time-entry-group">
                  <div className="time-entry-inputs">
                    <div className="edit-form-group">
                      <label>Start Time *</label>
                      <TimePicker value={manualStartTime} onChange={setManualStartTime} />
                    </div>
                    <div className="edit-form-group">
                      <label>End Time *</label>
                      <TimePicker value={manualEndTime} onChange={setManualEndTime} />
                    </div>
                  </div>
                  {calculatedDurationText && (
                    <div className="duration-preview-text">
                      Calculated Duration: {calculatedDurationText}
                    </div>
                  )}
                </div>
              )}

              <div className="edit-form-group">
                <label>Date</label>
                <button
                  type="button"
                  className="date-picker-btn"
                  onClick={() => setIsDatePickerOpen(true)}
                >
                  <span>
                    {new Date(manualDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                  <Calendar size={18} className="calendar-icon" />
                </button>
              </div>
              <div className="edit-form-group">
                <label>Task (optional)</label>
                <CustomSelect
                  value={manualTaskId}
                  onChange={(val) => {
                    const taskId = val as string;
                    setManualTaskId(taskId);
                    const task = plannerTasks?.find((t) => t.id === taskId);
                    if (task) {
                      setManualTitle(task.title);
                      if (task.subject) setManualSubject(task.subject);
                      if (task.material) setManualMaterial(task.material);
                    }
                  }}
                  options={[
                    { value: '', label: 'None' },
                    ...(plannerTasks?.filter((t) => t.date === manualDate).map((task) => ({
                      value: task.id,
                      label: `${task.title}${task.subtitle ? ` - ${task.subtitle}` : ''}`,
                    })) || []),
                  ]}
                  placeholder="Select Task"
                />
              </div>
              <div className="edit-form-group">
                <label>Subject (optional)</label>
                <CustomSelect
                  value={manualSubject}
                  onChange={(val) => setManualSubject(val as Subject | '')}
                  options={[
                    { value: '', label: 'None' },
                    ...subjectMeta.map((meta) => ({
                      value: meta.key,
                      label: meta.label,
                      color: meta.colorVar,
                    })),
                  ]}
                  placeholder="Select Subject"
                />
              </div>
              <div className="edit-form-group">
                <label>Material (optional)</label>
                <input
                  type="text"
                  value={manualMaterial}
                  onChange={(e) => setManualMaterial(e.target.value)}
                  placeholder="Material name..."
                  className="edit-input"
                />
              </div>
              <div className="edit-form-actions">
                <button className="edit-cancel-btn" onClick={closeManualEntryModal}>
                  Cancel
                </button>
                <button
                  className="edit-save-btn"
                  onClick={handleAddManualEntry}
                  disabled={isSaveDisabled}
                >
                  Add Session
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <DatePickerModal
        isOpen={isDatePickerOpen}
        selectedDate={manualDate}
        onSelect={(date) => {
          setManualDate(date);
          setIsDatePickerOpen(false);
        }}
        onClose={() => setIsDatePickerOpen(false)}
      />
    </>
  );
}
