import { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useRemoteAuth } from '../../../core/context/RemoteAuthContext';
import { useActiveSubjects } from '../../../shared/hooks/useActiveSubjects';
import { ProgressCardSettings } from '../../../shared/types';
import { UserProfileCard } from './UserProfileCard';
import { CustomSelect } from '../../../shared/components/ui/CustomSelect';

const GRADE_OPTIONS = [
  { value: 'Class 11', label: 'Class 11' },
  { value: 'Class 12', label: 'Class 12' },
  { value: 'Dropper', label: 'Dropper' },
];

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ProgressCardSettings;
  onSave: (settings: ProgressCardSettings) => void;
}

export function ProfileEditModal({ isOpen, onClose, settings, onSave }: ProfileEditModalProps) {
  const { user } = useRemoteAuth();
  const { examMode } = useActiveSubjects();
  const googleName = user?.user_metadata?.full_name || user?.user_metadata?.name || '';
  const googleAvatar = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || '';

  const [draft, setDraft] = useState({
    ...settings,
    userName: settings.userName || googleName,
    customAvatarUrl: settings.customAvatarUrl || googleAvatar,
  });

  // Sync draft when modal opens
  useEffect(() => {
    if (isOpen) {
      setDraft({
        ...settings,
        userName: settings.userName || googleName,
        customAvatarUrl: settings.customAvatarUrl || googleAvatar,
      });
    }
  }, [isOpen, settings, googleName, googleAvatar]);

  const handleChange = useCallback((field: keyof ProgressCardSettings, value: string | boolean) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSubmit = useCallback(() => {
    onSave({ ...draft });
    onClose();
  }, [draft, onSave, onClose]);

  if (!isOpen) return null;

  const currentGrade = draft.gradeStatus || '';
  const currentExam = draft.targetExam || '';

  const gradeOptions = GRADE_OPTIONS.some((o) => o.value === currentGrade)
    ? GRADE_OPTIONS
    : currentGrade
      ? [{ value: currentGrade, label: currentGrade }, ...GRADE_OPTIONS]
      : GRADE_OPTIONS;

  const prefix = examMode === 'neet' ? 'NEET' : 'JEE';
  const baseExamOptions = [
    { value: `${prefix} 2027`, label: `${prefix} 2027` },
    { value: `${prefix} 2028`, label: `${prefix} 2028` },
  ];

  const examOptions = baseExamOptions.some((o) => o.value === currentExam)
    ? baseExamOptions
    : currentExam
      ? [{ value: currentExam, label: currentExam }, ...baseExamOptions]
      : baseExamOptions;

  return createPortal(
    <div className="profile-edit-overlay" onClick={onClose}>
      <div className="profile-edit-modal glass-panel" onClick={(e) => e.stopPropagation()}>
        <div className="profile-edit-header">
          <h2>Edit profile</h2>
          <button className="profile-edit-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="profile-edit-content-grid">
          <div className="profile-edit-form-container">
            <div className="profile-edit-form-scroll">
              <div className="profile-edit-field">
                <label htmlFor="pe-name">Display name</label>
                <input
                  id="pe-name"
                  type="text"
                  value={draft.userName}
                  onChange={(e) => handleChange('userName', e.target.value)}
                  placeholder="Your name"
                />
              </div>

              <div className="profile-edit-field">
                <label htmlFor="pe-avatar">Avatar URL</label>
                <input
                  id="pe-avatar"
                  type="url"
                  value={draft.customAvatarUrl}
                  onChange={(e) => handleChange('customAvatarUrl', e.target.value)}
                  placeholder="https://..."
                />
              </div>

              <div className="profile-edit-field">
                <label htmlFor="pe-banner">Banner URL</label>
                <input
                  id="pe-banner"
                  type="url"
                  value={draft.bannerUrl || ''}
                  onChange={(e) => handleChange('bannerUrl', e.target.value)}
                  placeholder="https://..."
                />
              </div>

              <div className="profile-edit-field">
                <label htmlFor="pe-status">Custom status</label>
                <input
                  id="pe-status"
                  type="text"
                  value={draft.customStatus || ''}
                  onChange={(e) => handleChange('customStatus', e.target.value)}
                  placeholder="e.g. Focusing on Organic Chemistry"
                  maxLength={88}
                />
                <span className="field-hint">
                  Max 88 characters ({draft.customStatus?.length || 0}/88)
                </span>
              </div>

              <div className="profile-edit-row">
                <div className="profile-edit-field">
                  <label>Grade status</label>
                  <CustomSelect
                    value={draft.gradeStatus || ''}
                    options={gradeOptions}
                    onChange={(val) => handleChange('gradeStatus', val)}
                    placeholder="Select Grade"
                    size="small"
                  />
                </div>

                <div className="profile-edit-field">
                  <label>Target exam</label>
                  <CustomSelect
                    value={draft.targetExam || ''}
                    options={examOptions}
                    onChange={(val) => handleChange('targetExam', val)}
                    placeholder="Select Exam"
                    size="small"
                  />
                </div>
              </div>

              <div
                className="profile-edit-row"
                style={{
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gridTemplateColumns: '1fr auto',
                  marginTop: 'var(--space-2)',
                }}
              >
                <div className="profile-edit-field" style={{ gap: '2px' }}>
                  <label style={{ margin: 0 }}>Show tasks on profile</label>
                  <span className="field-hint">
                    Display today's study agenda on your public profile card
                  </span>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={draft.showTasks !== false}
                    onChange={(e) => handleChange('showTasks', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>

            <div className="profile-edit-actions">
              <button className="primary-btn" onClick={handleSubmit}>
                Save changes
              </button>
              <button className="secondary-btn" onClick={onClose}>
                Cancel
              </button>
            </div>
          </div>

          <div className="profile-edit-preview">
            <h3 className="profile-edit-section-title">Live Preview</h3>
            <div className="profile-edit-preview-card">
              <UserProfileCard previewSettings={draft} previewMode={true} />
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
