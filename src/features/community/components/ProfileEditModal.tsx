import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { ProgressCardSettings } from '../../../shared/types';
import { UserProfileCard } from './UserProfileCard';
import { CustomSelect } from '../../../shared/components/ui/CustomSelect';

const GRADE_OPTIONS = [
    { value: 'Class 11', label: 'Class 11' },
    { value: 'Class 12', label: 'Class 12' },
    { value: 'Dropper', label: 'Dropper' },
    { value: 'Other', label: 'Other' },
];

const EXAM_OPTIONS = [
    { value: 'JEE 2025', label: 'JEE 2025' },
    { value: 'JEE 2026', label: 'JEE 2026' },
    { value: 'JEE 2027', label: 'JEE 2027' },
    { value: 'OJEE 2025', label: 'OJEE 2025' },
    { value: 'OJEE 2026', label: 'OJEE 2026' },
    { value: 'Other', label: 'Other' },
];

interface ProfileEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    settings: ProgressCardSettings;
    onSave: (settings: ProgressCardSettings) => void;
}

export function ProfileEditModal({ isOpen, onClose, settings, onSave }: ProfileEditModalProps) {
    const [draft, setDraft] = useState({ ...settings });

    // Sync draft when modal opens
    const prevOpen = useState(isOpen)[0];
    if (isOpen && !prevOpen) {
        // Re-sync handled by key below
    }

    const handleChange = useCallback((field: keyof ProgressCardSettings, value: string | boolean) => {
        setDraft(prev => ({ ...prev, [field]: value }));
    }, []);

    const handleInviteCodeChange = useCallback((raw: string) => {
        // Force uppercase alphanumeric, max 4 characters
        const cleaned = raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 4);
        setDraft(prev => ({ ...prev, inviteCode: cleaned }));
    }, []);

    const handleTagChange = useCallback((raw: string) => {
        // Max 5 characters, alphanumeric
        const cleaned = raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 5);
        setDraft(prev => ({ ...prev, discordSpecialTag: cleaned }));
    }, []);

    const handleSubmit = useCallback(() => {
        onSave({ ...draft });
        onClose();
    }, [draft, onSave, onClose]);

    if (!isOpen) return null;

    const currentGrade = draft.gradeStatus || '';
    const currentExam = draft.targetExam || '';

    const gradeOptions = GRADE_OPTIONS.some(o => o.value === currentGrade)
        ? GRADE_OPTIONS
        : currentGrade
            ? [{ value: currentGrade, label: currentGrade }, ...GRADE_OPTIONS]
            : GRADE_OPTIONS;

    const examOptions = EXAM_OPTIONS.some(o => o.value === currentExam)
        ? EXAM_OPTIONS
        : currentExam
            ? [{ value: currentExam, label: currentExam }, ...EXAM_OPTIONS]
            : EXAM_OPTIONS;

    return createPortal(
        <div className="profile-edit-overlay" onClick={onClose}>
            <div
                className="profile-edit-modal glass-panel"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="profile-edit-header">
                    <h2>Edit profile</h2>
                    <button className="profile-edit-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="profile-edit-content-grid">
                    <div className="profile-edit-form-container">
                        <div className="profile-edit-form-scroll">
                            <div className="profile-edit-section">
                                <h3 className="profile-edit-section-title">Identity</h3>
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

                                <div className="profile-edit-row">
                                    <div className="profile-edit-field">
                                        <label htmlFor="pe-tag">Special tag</label>
                                        <input
                                            id="pe-tag"
                                            type="text"
                                            value={draft.discordSpecialTag || ''}
                                            onChange={(e) => handleTagChange(e.target.value)}
                                            placeholder="e.g. PRO"
                                            maxLength={5}
                                        />
                                        <span className="field-hint">4-5 letters, granted by developer</span>
                                    </div>

                                    <div className="profile-edit-field">
                                        <label htmlFor="pe-invite">Invite code</label>
                                        <input
                                            id="pe-invite"
                                            type="text"
                                            value={draft.inviteCode || ''}
                                            onChange={(e) => handleInviteCodeChange(e.target.value)}
                                            placeholder="e.g. ABCD"
                                            maxLength={4}
                                        />
                                        <span className="field-hint">4 chars, alphanumeric</span>
                                    </div>
                                </div>
                            </div>

                            <div className="profile-edit-section">
                                <h3 className="profile-edit-section-title">Visuals</h3>
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
                            </div>

                            <div className="profile-edit-section">
                                <h3 className="profile-edit-section-title">Status</h3>
                                <div className="profile-edit-field">
                                    <label htmlFor="pe-status">Custom status</label>
                                    <input
                                        id="pe-status"
                                        type="text"
                                        value={draft.customStatus || ''}
                                        onChange={(e) => handleChange('customStatus', e.target.value)}
                                        placeholder="e.g. Focusing on Organic Chemistry"
                                    />
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
                            </div>

                            <div className="profile-edit-section">
                                <h3 className="profile-edit-section-title">Mock Status (For Testing)</h3>
                                <div className="profile-edit-row" style={{ alignItems: 'center' }}>
                                    <div className="profile-edit-field checkbox-field" style={{ flexDirection: 'row', gap: '8px' }}>
                                        <input
                                            type="checkbox"
                                            id="pe-isonline"
                                            checked={draft.mockIsOnline || false}
                                            onChange={(e) => handleChange('mockIsOnline', e.target.checked)}
                                        />
                                        <label htmlFor="pe-isonline" style={{ margin: 0 }}>Is Online</label>
                                    </div>
                                    <div className="profile-edit-field">
                                        <label htmlFor="pe-lastseen">Last Seen Text</label>
                                        <input
                                            id="pe-lastseen"
                                            type="text"
                                            value={draft.mockLastSeenText || ''}
                                            onChange={(e) => handleChange('mockLastSeenText', e.target.value)}
                                            placeholder="e.g. 2h ago"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="profile-edit-actions">
                            <button className="secondary-btn" onClick={onClose}>Cancel</button>
                            <button className="primary-btn" onClick={handleSubmit}>Save changes</button>
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
