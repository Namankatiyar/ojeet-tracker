import { useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Download, Upload, X, AlertTriangle, Check, Image, Trash2, Cloud, LogOut } from 'lucide-react';
import { Vibrant } from 'node-vibrant/browser';
import { useRemoteAuth } from '../../../core/context/RemoteAuthContext';
import { useRemoteSync } from '../../../core/context/RemoteSyncContext';
import { supabase } from '../../../shared/lib/supabase';
import { runPwaRecoveryAndReload } from '../../utils/pwaBridge';
import { GoogleSignInButton } from './GoogleSignInButton';
import { ConfirmationModal } from './ConfirmationModal';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    // Auto-shift
    disableAutoShift: boolean;
    onDisableAutoShiftChange: (value: boolean) => void;
    // Background
    backgroundUrl: string;
    onBackgroundUrlChange: (url: string) => void;
    dimLevel: number;
    onDimLevelChange: (level: number) => void;
    // Glassmorphism
    glassIntensity: number;
    onGlassIntensityChange: (intensity: number) => void;
    glassRefraction: number;
    onGlassRefractionChange: (refraction: number) => void;
    // Accent
    onAccentChange: (color: string) => void;
}

const STORAGE_KEYS = {
    // Theme & Styling
    theme: 'jee-tracker-theme',
    accent: 'jee-tracker-accent',
    backgroundUrl: 'jee-tracker-background-url',
    dimLevel: 'jee-tracker-dim-level',
    glassIntensity: 'jee-tracker-glass-intensity',
    glassRefraction: 'jee-tracker-glass-refraction',

    // Core Progress
    progress: 'jee-tracker-progress',
    subjectData: 'jee-tracker-subject-data',
    customColumns: 'jee-tracker-custom-columns',
    excludedColumns: 'jee-tracker-excluded-columns',
    materialOrder: 'jee-tracker-material-order',

    // Planner & Schedule
    plannerTasks: 'jee-tracker-planner-tasks',
    plannerView: 'ojeet-planner-view',
    disableAutoShift: 'jee-tracker-disable-auto-shift',
    examDates: 'jee-exam-dates',
    secondaryExamIndex: 'jee-secondary-exam-index',

    // Analytics & Logs
    studySessions: 'jee-tracker-study-sessions',
    mockScores: 'jee-tracker-mock-scores',
    mockPresets: 'jee-tracker-mock-presets',
    progressCard: 'jee-tracker-progress-card',

    // UI Workspace Preferences
    copilotDismissedIds: 'jee-copilot-dismissed-ids',
    dashboardNotificationMeta: 'ojeet-dashboard-notification-meta-v1',
    studyClockTaskType: 'studyClock_taskType',
    studyClockSelectedSubject: 'studyClock_selectedSubject',
    studyClockSelectedChapter: 'studyClock_selectedChapter',
    studyClockSelectedMaterial: 'studyClock_selectedMaterial',
    studyClockCustomTitle: 'studyClock_customTitle',
    studyClockSelectedTaskId: 'studyClock_selectedTaskId',
    filterPhysics: 'jee-tracker-filter-physics',
    filterChemistry: 'jee-tracker-filter-chemistry',
    filterMaths: 'jee-tracker-filter-maths',
};

export function SettingsModal({
    isOpen,
    onClose,
    disableAutoShift,
    onDisableAutoShiftChange,
    backgroundUrl,
    onBackgroundUrlChange,
    dimLevel,
    onDimLevelChange,
    glassIntensity,
    onGlassIntensityChange,
    glassRefraction,
    onGlassRefractionChange,
    onAccentChange
}: SettingsModalProps) {
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const bgFileInputRef = useRef<HTMLInputElement>(null);
    const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [statusMessage, setStatusMessage] = useState('');
    const [isRepairingUpdates, setIsRepairingUpdates] = useState(false);
    const [authStatus, setAuthStatus] = useState<string>('');
    const [isAuthBusy, setIsAuthBusy] = useState(false);
    const { user, isConfigured, signInWithGoogle, signOut, resetPrompt } = useRemoteAuth();
    const { status: syncStatus, lastSyncedAt, lastError: syncError, remoteStudyAggregate, syncNow } = useRemoteSync();
    const releaseChannel = import.meta.env.VITE_RELEASE_CHANNEL ?? 'stable';
    const [isResetting, setIsResetting] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);

    const handleResetData = () => {
        setIsConfirmOpen(true);
    };

    const confirmResetData = async () => {
        setIsConfirmOpen(false);
        setIsResetting(true);
        setStatusMessage('Resetting data...');
        setImportStatus('idle');

        try {
            // 1. Wipe remote database backups and delete the user account if logged in
            if (user && isConfigured && supabase) {
                const { error: deleteUserError } = await supabase.functions.invoke('delete-user-account');
                if (deleteUserError) {
                    console.error('Error invoking delete-user-account function:', deleteUserError);
                    throw new Error('Failed to delete user account securely from the server.');
                }
                
                // Clear local auth session state as well
                await signOut();
            }

            // 2. Wipe all local storage keys starting with app prefixes
            const keysToRemove: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (
                    key.startsWith('jee-') ||
                    key.startsWith('ojeet-') ||
                    key.startsWith('studyClock_')
                )) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(key => localStorage.removeItem(key));

            setImportStatus('success');
            setStatusMessage('Data reset successfully! Reloading...');

            // 3. Reload page to reinitialize all state with default local storage
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } catch (error: any) {
            console.error('Reset failed:', error);
            setImportStatus('error');
            setStatusMessage(error?.message || 'Failed to complete data reset.');
            setIsResetting(false);
        }
    };

    const modalRoot = document.getElementById('modal-root');

    if (!isOpen || !modalRoot) return null;

    const handleExport = () => {
        try {
            const dataToExport: Record<string, any> = {};
            for (const key of Object.values(STORAGE_KEYS)) {
                const item = localStorage.getItem(key);
                if (item) {
                    try {
                        dataToExport[key] = JSON.parse(item);
                    } catch {
                        dataToExport[key] = item; // Store as raw string if not JSON
                    }
                }
            }

            const backupData = {
                version: 1,
                timestamp: new Date().toISOString(),
                export: dataToExport
            };

            const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `pcm-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Export failed:', error);
            setImportStatus('error');
            setStatusMessage('Failed to export data.');
        }
    };

    const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const json = JSON.parse(e.target?.result as string);

                if (!json.export || !json.version) {
                    throw new Error('Invalid backup file format');
                }

                for (const key in json.export) {
                    if (Object.values(STORAGE_KEYS).includes(key)) {
                        const value = json.export[key];
                        localStorage.setItem(key, JSON.stringify(value));
                    }
                }

                setImportStatus('success');
                setStatusMessage('Data imported successfully! Reloading...');

                setTimeout(() => {
                    window.location.reload();
                }, 1500);

            } catch (error) {
                console.error('Import failed:', error);
                setImportStatus('error');
                setStatusMessage('Failed to import data. Invalid file.');
            }
        };
        reader.readAsText(file);
    };

    const handleBackgroundUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file is an image
        if (!file.type.startsWith('image/')) {
            setImportStatus('error');
            setStatusMessage('Please select an image file.');
            return;
        }

        // Compress large images to prevent localStorage issues
        const img = new window.Image();
        const reader = new FileReader();

        reader.onload = (e) => {
            img.onload = () => {
                // Resize if image is too large (max 1920px)
                const maxDim = 1920;
                let width = img.width;
                let height = img.height;

                if (width > maxDim || height > maxDim) {
                    if (width > height) {
                        height = (height / width) * maxDim;
                        width = maxDim;
                    } else {
                        width = (width / height) * maxDim;
                        height = maxDim;
                    }
                }

                // Compress using canvas
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0, width, height);
                    const compressedUrl = canvas.toDataURL('image/jpeg', 0.7);
                    onBackgroundUrlChange(compressedUrl);

                    // Extract accent color using Vibrant
                    Vibrant.from(img).getPalette()
                        .then((palette: any) => {
                            // Try to get the most vibrant color
                            const vibrantColor = palette.Vibrant?.hex ||
                                palette.LightVibrant?.hex ||
                                palette.DarkVibrant?.hex ||
                                palette.Muted?.hex;

                            if (vibrantColor) {
                                onAccentChange(vibrantColor);
                            }
                        })
                        .catch((err: any) => {
                            console.error('Failed to extract colors from image', err);
                        });
                }
            };

            img.onerror = () => {
                setImportStatus('error');
                setStatusMessage('Failed to load image.');
            };

            img.src = e.target?.result as string;
        };

        reader.onerror = () => {
            setImportStatus('error');
            setStatusMessage('Failed to read file.');
        };

        reader.readAsDataURL(file);
    };

    const handleClearBackground = () => {
        onBackgroundUrlChange('');
    };

    const handleGoogleSignIn = async () => {
        setIsAuthBusy(true);
        setAuthStatus('');
        const { error } = await signInWithGoogle();
        if (error) {
            setAuthStatus(error);
            setIsAuthBusy(false);
        }
    };

    const handleSignOut = async () => {
        setIsAuthBusy(true);
        setAuthStatus('');
        const { error } = await signOut();
        if (error) {
            setAuthStatus(error);
            setIsAuthBusy(false);
            return;
        }
        resetPrompt();
        setAuthStatus('Signed out. Cloud sync metadata was cleared on this device.');
        setIsAuthBusy(false);
    };

    const handleOpenPrivacyPolicy = () => {
        onClose();
        navigate('/privacy-policy');
    };

    const handleOpenTermsOfService = () => {
        onClose();
        navigate('/terms-of-service');
    };

    const handleOpenChangelog = () => {
        onClose();
        navigate('/changelog');
    };

    const handleRepairUpdates = async () => {
        setIsRepairingUpdates(true);
        setImportStatus('idle');
        setStatusMessage('');
        try {
            await runPwaRecoveryAndReload();
        } catch (error) {
            setImportStatus('error');
            setStatusMessage(error instanceof Error ? error.message : 'Update repair failed.');
            setIsRepairingUpdates(false);
        }
    };

    const modalContent = (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content settings-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Settings</h2>
                    <button className="close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="modal-body">
                    {/* Behavior Settings */}
                    <div className="settings-section">
                        <h3 className="section-title">Behavior</h3>
                        <div className="settings-row">
                            <div className="setting-info">
                                <span className="setting-label">Disable Auto-Shift</span>
                                <span className="setting-description">Prevent incomplete tasks from automatically moving to today</span>
                            </div>
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={disableAutoShift}
                                    onChange={(e) => onDisableAutoShiftChange(e.target.checked)}
                                />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>
                    </div>

                    {/* Appearance Settings */}
                    <div className="settings-section">
                        <h3 className="section-title">Appearance</h3>

                        {/* Background Image */}
                        <div className="settings-row vertical">
                            <div className="setting-info">
                                <span className="setting-label">Background Wallpaper</span>
                                <span className="setting-description">Set a custom background image</span>
                            </div>
                            <div className="background-actions">
                                <input
                                    type="file"
                                    ref={bgFileInputRef}
                                    onChange={handleBackgroundUpload}
                                    accept="image/*"
                                    style={{ display: 'none' }}
                                />
                                <button
                                    className="action-btn outline small"
                                    onClick={() => bgFileInputRef.current?.click()}
                                >
                                    <Image size={16} />
                                    {backgroundUrl ? 'Change' : 'Upload'}
                                </button>
                                {backgroundUrl && (
                                    <button
                                        className="action-btn outline small danger"
                                        onClick={handleClearBackground}
                                    >
                                        <Trash2 size={16} />
                                        Clear
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Dimming Slider */}
                        <div className="settings-row vertical">
                            <div className="setting-info">
                                <span className="setting-label">Background Dimming</span>
                                <span className="setting-description">Adjust overlay opacity for readability ({dimLevel}%)</span>
                            </div>
                            <div className="slider-container">
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={dimLevel}
                                    onChange={(e) => onDimLevelChange(parseInt(e.target.value, 10))}
                                    className="dim-slider"
                                />
                            </div>
                        </div>

                        {/* Glassmorphism Intensity */}
                        <div className="settings-row vertical">
                            <div className="setting-info">
                                <span className="setting-label">Glassmorphism Intensity</span>
                                <span className="setting-description">Adjust blur and transparency of UI panels ({glassIntensity}%)</span>
                            </div>
                            <div className="slider-container">
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={glassIntensity}
                                    onChange={(e) => onGlassIntensityChange(parseInt(e.target.value, 10))}
                                    className="glass-slider"
                                />
                            </div>
                        </div>

                        {/* Glassmorphism Refraction */}
                        <div className="settings-row vertical">
                            <div className="setting-info">
                                <span className="setting-label">Refractive Index</span>
                                <span className="setting-description">Adjust light bending and color saturation effects ({glassRefraction}%)</span>
                            </div>
                            <div className="slider-container">
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={glassRefraction}
                                    onChange={(e) => onGlassRefractionChange(parseInt(e.target.value, 10))}
                                    className="glass-slider refraction-slider"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Data Management */}
                    <div className="settings-section">
                        <h3 className="section-title">Data Management</h3>
                        <div className="settings-row">
                            <div className="setting-info">
                                <span className="setting-label">Export Data</span>
                                <span className="setting-description">Download a backup of your progress and settings</span>
                            </div>
                            <button className="action-btn primary small" onClick={handleExport}>
                                <Download size={16} />
                                Export
                            </button>
                        </div>

                        <div className="settings-row">
                            <div className="setting-info">
                                <span className="setting-label">Import Data</span>
                                <span className="setting-description">Restore from a backup (overwrites current data)</span>
                            </div>
                            <div className="import-actions">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleImport}
                                    accept=".json"
                                    style={{ display: 'none' }}
                                />
                                <button className="action-btn outline small" onClick={() => fileInputRef.current?.click()}>
                                    <Upload size={16} />
                                    Import
                                </button>
                            </div>
                        </div>

                        <div className="settings-row">
                            <div className="setting-info">
                                <span className="setting-label">Reset All Data</span>
                                <span className="setting-description">Permanently wipe all local progress and remote sync backups</span>
                            </div>
                            <button
                                className="action-btn danger small"
                                onClick={handleResetData}
                                disabled={isResetting}
                            >
                                <Trash2 size={16} />
                                {isResetting ? 'Resetting...' : 'Reset Data'}
                            </button>
                        </div>
                    </div>

                    <div className="settings-section">
                        <h3 className="section-title">App Updates</h3>
                        <div className="settings-row">
                            <div className="setting-info">
                                <span className="setting-label">Release Channel</span>
                                <span className="setting-description">{releaseChannel}</span>
                            </div>
                        </div>
                        <div className="settings-row">
                            <div className="setting-info">
                                <span className="setting-label">Repair Update Cache</span>
                                <span className="setting-description">Use this if the app does not update after tapping "Update now".</span>
                            </div>
                            <button
                                className="action-btn outline small"
                                onClick={handleRepairUpdates}
                                disabled={isRepairingUpdates}
                            >
                                {isRepairingUpdates ? 'Repairing...' : 'Repair & Reload'}
                            </button>
                        </div>
                    </div>

                    <div className="settings-section">
                        <h3 className="section-title">Cloud Sync (Optional)</h3>
                        {!isConfigured ? (
                            <div className="settings-row vertical">
                                <div className="setting-info">
                                    <span className="setting-label">Cloud sync is unavailable</span>
                                    <span className="setting-description">Missing Supabase environment configuration for this build.</span>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="settings-row">
                                    <div className="setting-info">
                                        <span className="setting-label">Account</span>
                                        <span className="setting-description">
                                            {user ? `Signed in as ${user.email ?? 'Unknown email'}` : 'Not signed in. Local mode continues to work.'}
                                        </span>
                                    </div>
                                    {user ? (
                                        <button className="action-btn outline small" onClick={handleSignOut} disabled={isAuthBusy}>
                                            <LogOut size={16} />
                                            {isAuthBusy ? 'Signing out...' : 'Sign Out'}
                                        </button>
                                    ) : (
                                        <GoogleSignInButton onClick={handleGoogleSignIn} disabled={isAuthBusy} />
                                    )}
                                </div>
                                {user && (
                                    <div className="settings-row">
                                        <div className="setting-info">
                                            <span className="setting-label">Sync Status</span>
                                            <span className="setting-description">
                                                {syncStatus === 'syncing' && 'Syncing...'}
                                                {syncStatus === 'synced' && `Last synced: ${lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : 'just now'}`}
                                                {syncStatus === 'error' && (syncError || 'Sync failed')}
                                            {syncStatus === 'idle' && 'Idle'}
                                            </span>
                                            <span className="setting-description">
                                                Video logs synced from cloud app: {remoteStudyAggregate?.video_watch_45d_json?.length ?? 0}
                                            </span>
                                        </div>
                                        <button
                                            className="action-btn outline small"
                                            onClick={() => syncNow()}
                                            disabled={isAuthBusy || syncStatus === 'syncing'}
                                        >
                                            <Cloud size={16} />
                                            {syncStatus === 'syncing' ? 'Syncing...' : 'Sync Now'}
                                        </button>
                                    </div>
                                )}
                                {authStatus && (
                                    <div className="settings-row vertical">
                                        <div className="setting-info">
                                            <span className="setting-description">{authStatus}</span>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    <div className="settings-section">
                        <h3 className="section-title">Legal</h3>
                        <div className="settings-row">
                            <div className="setting-info">
                                <span className="setting-label">Changelog</span>
                                <span className="setting-description">Review latest updates before and after each release</span>
                            </div>
                            <button className="action-btn outline small" onClick={handleOpenChangelog}>
                                Open
                            </button>
                        </div>

                        <div className="settings-row">
                            <div className="setting-info">
                                <span className="setting-label">Privacy Policy</span>
                                <span className="setting-description">Read how app data is stored and handled</span>
                            </div>
                            <button className="action-btn outline small" onClick={handleOpenPrivacyPolicy}>
                                Open
                            </button>
                        </div>

                        <div className="settings-row">
                            <div className="setting-info">
                                <span className="setting-label">Terms of Service</span>
                                <span className="setting-description">Read usage terms and responsibilities</span>
                            </div>
                            <button className="action-btn outline small" onClick={handleOpenTermsOfService}>
                                Open
                            </button>
                        </div>
                    </div>

                    {importStatus !== 'idle' && (
                        <div className={`status-message ${importStatus}`}>
                            {importStatus === 'success' ? <Check size={18} /> : <AlertTriangle size={18} />}
                            <span>{statusMessage}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    return ReactDOM.createPortal(
        <>
            {modalContent}
            <ConfirmationModal
                isOpen={isConfirmOpen}
                title="Reset All Data"
                message="Are you sure you want to reset all data? This will permanently delete your progress, planner tasks, study sessions, and mock scores locally and from the cloud. This action cannot be undone."
                onConfirm={confirmResetData}
                onCancel={() => setIsConfirmOpen(false)}
            />
        </>
    , modalRoot);
}
