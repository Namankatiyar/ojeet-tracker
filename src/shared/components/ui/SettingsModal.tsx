import { useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { Download, Upload, X, AlertTriangle, Check, Image, Trash2 } from 'lucide-react';

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
}

const STORAGE_KEYS = {
    theme: 'jee-tracker-theme',
    view: 'jee-tracker-view',
    progress: 'jee-tracker-progress',
    accent: 'jee-tracker-accent',
    customColumns: 'jee-tracker-custom-columns',
    excludedColumns: 'jee-tracker-excluded-columns',
    examDate: 'jee-exam-date',
    plannerTasks: 'jee-tracker-planner-tasks',
    // New settings
    disableAutoShift: 'jee-tracker-disable-auto-shift',
    backgroundUrl: 'jee-tracker-background-url',
    dimLevel: 'jee-tracker-dim-level',
    glassIntensity: 'jee-tracker-glass-intensity',
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
    onGlassIntensityChange
}: SettingsModalProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const bgFileInputRef = useRef<HTMLInputElement>(null);
    const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [statusMessage, setStatusMessage] = useState('');

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
                        localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
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

    return ReactDOM.createPortal(modalContent, modalRoot);
}