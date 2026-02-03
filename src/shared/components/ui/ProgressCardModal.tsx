import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, Upload, RotateCcw, Eye, EyeOff, Clock, Trophy, Flame, TrendingUp, Atom, FlaskConical, Calculator } from 'lucide-react';
import html2canvas from 'html2canvas';
import { UserAvatar } from './Avatar';
import { StudySession, MockScore, ProgressCardSettings } from '../../types';

interface ProgressCardModalProps {
    isOpen: boolean;
    onClose: () => void;
    accentColor: string;
    settings: ProgressCardSettings;
    onSettingsChange: (settings: ProgressCardSettings) => void;
    studySessions: StudySession[];
    mockScores: MockScore[];
    physicsProgress: number;
    chemistryProgress: number;
    mathsProgress: number;
    examDate: string;
}

const DEFAULT_VISIBLE_STATS: ProgressCardSettings['visibleStats'] = {
    totalStudyTime: true,
    highestMockScore: true,
    highestDailyHours: true,
    highestWeekAverage: true,
    physicsTime: true,
    chemistryTime: true,
    mathsTime: true,
    physicsProgress: true,
    chemistryProgress: true,
    mathsProgress: true,
    examCountdown: false, // Hidden by default
};

export function ProgressCardModal({
    isOpen,
    onClose,
    accentColor,
    settings,
    onSettingsChange,
    studySessions,
    mockScores,
    physicsProgress,
    chemistryProgress,
    mathsProgress,
}: ProgressCardModalProps) {
    const cardRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

    if (!isOpen) return null;

    // Calculate stats
    const totalStudyTime = studySessions.reduce((acc, s) => acc + s.duration, 0);
    const highestMockScore = mockScores.length > 0
        ? Math.max(...mockScores.map(m => m.totalMarks))
        : 0;

    // Calculate study time by subject
    const physicsTime = studySessions.filter(s => s.subject === 'physics').reduce((acc, s) => acc + s.duration, 0);
    const chemistryTime = studySessions.filter(s => s.subject === 'chemistry').reduce((acc, s) => acc + s.duration, 0);
    const mathsTime = studySessions.filter(s => s.subject === 'maths').reduce((acc, s) => acc + s.duration, 0);

    // Calculate highest daily hours
    const sessionsByDay: Record<string, number> = {};
    studySessions.forEach(s => {
        const date = s.startTime.split('T')[0];
        sessionsByDay[date] = (sessionsByDay[date] || 0) + s.duration;
    });
    const highestDailySeconds = Math.max(...Object.values(sessionsByDay), 0);
    const highestDailyHours = highestDailySeconds / 3600;

    // Calculate highest week average
    const getWeekKey = (dateStr: string) => {
        const date = new Date(dateStr);
        const startOfYear = new Date(date.getFullYear(), 0, 1);
        const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
        return `${date.getFullYear()}-W${Math.ceil((days + 1) / 7)}`;
    };
    const sessionsByWeek: Record<string, { total: number; days: Set<string> }> = {};
    studySessions.forEach(s => {
        const date = s.startTime.split('T')[0];
        const weekKey = getWeekKey(date);
        if (!sessionsByWeek[weekKey]) {
            sessionsByWeek[weekKey] = { total: 0, days: new Set() };
        }
        sessionsByWeek[weekKey].total += s.duration;
        sessionsByWeek[weekKey].days.add(date);
    });
    const weekAverages = Object.values(sessionsByWeek).map(w => w.total / Math.max(w.days.size, 1));
    const highestWeekAverage = weekAverages.length > 0 ? Math.max(...weekAverages) / 3600 : 0;

    const formatTime = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
    };

    const handleDownload = async () => {
        if (!cardRef.current) return;
        setIsDownloading(true);

        try {
            // Wait for fonts to be fully loaded
            await document.fonts.ready;

            // Small delay to ensure all styles are computed
            await new Promise(resolve => setTimeout(resolve, 100));

            // Clone the card element to avoid modifying the original
            const cardElement = cardRef.current;

            // Use a solid background for the export with higher resolution
            const canvas = await html2canvas(cardElement, {
                backgroundColor: '#1a1a1f',
                scale: 4, // Higher scale for better quality
                useCORS: true,
                allowTaint: true, // Allow local images
                logging: false,
                imageTimeout: 0, // No timeout for images
                onclone: (clonedDoc) => {
                    // Ensure avatar container maintains aspect ratio
                    const avatarContainers = clonedDoc.querySelectorAll('.card-header .user-avatar');
                    avatarContainers.forEach((container) => {
                        const containerEl = container as HTMLElement;
                        containerEl.style.width = '80px';
                        containerEl.style.height = '80px';
                        containerEl.style.minWidth = '80px';
                        containerEl.style.minHeight = '80px';
                        containerEl.style.flexShrink = '0';
                        containerEl.style.borderRadius = '50%';
                        containerEl.style.overflow = 'hidden';
                    });

                    // Ensure avatar images are properly sized
                    const avatarImages = clonedDoc.querySelectorAll('.user-avatar img');
                    avatarImages.forEach((img) => {
                        const imgEl = img as HTMLImageElement;
                        imgEl.style.width = '80px';
                        imgEl.style.height = '80px';
                        imgEl.style.minWidth = '80px';
                        imgEl.style.minHeight = '80px';
                        imgEl.style.objectFit = 'cover';
                        imgEl.style.borderRadius = '50%';
                    });

                    // Ensure stat values have proper overflow
                    const statValues = clonedDoc.querySelectorAll('.stat-value');
                    statValues.forEach((value) => {
                        const valueEl = value as HTMLElement;
                        valueEl.style.overflow = 'visible';
                        valueEl.style.lineHeight = '1.5';
                    });

                    // Ensure stat labels have proper overflow
                    const statLabels = clonedDoc.querySelectorAll('.stat-label');
                    statLabels.forEach((label) => {
                        const labelEl = label as HTMLElement;
                        labelEl.style.overflow = 'visible';
                        labelEl.style.lineHeight = '1.5';
                    });
                }
            });

            const link = document.createElement('a');
            link.download = `${settings.userName || 'my'}-progress-card.png`;
            link.href = canvas.toDataURL('image/png', 1.0); // Max quality
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            console.error('Failed to download progress card:', err);
        } finally {
            setIsDownloading(false);
        }
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target?.result as string;
            onSettingsChange({
                ...settings,
                customAvatarUrl: dataUrl,
            });
        };
        reader.readAsDataURL(file);
    };

    const handleResetAvatar = () => {
        onSettingsChange({
            ...settings,
            customAvatarUrl: '',
        });
    };

    const toggleStat = (statKey: keyof ProgressCardSettings['visibleStats']) => {
        onSettingsChange({
            ...settings,
            visibleStats: {
                ...DEFAULT_VISIBLE_STATS,
                ...settings.visibleStats,
                [statKey]: !settings.visibleStats[statKey],
            },
        });
    };

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onSettingsChange({
            ...settings,
            userName: e.target.value,
        });
    };

    const visibleStats = { ...DEFAULT_VISIBLE_STATS, ...settings.visibleStats };

    const stats = [
        { key: 'totalStudyTime', label: 'Total Study Time', value: formatTime(totalStudyTime), icon: <Clock size={16} />, visible: visibleStats.totalStudyTime },
        { key: 'highestMockScore', label: 'Highest Mock Score', value: `${highestMockScore}/300`, icon: <Trophy size={16} />, visible: visibleStats.highestMockScore },
        { key: 'highestDailyHours', label: 'Highest Daily Hours', value: `${highestDailyHours.toFixed(1)}h`, icon: <Flame size={16} />, visible: visibleStats.highestDailyHours },
        { key: 'highestWeekAverage', label: 'Best Week Average', value: `${highestWeekAverage.toFixed(1)}h/day`, icon: <TrendingUp size={16} />, visible: visibleStats.highestWeekAverage },
        { key: 'physicsTime', label: 'Physics Study Time', value: formatTime(physicsTime), icon: <Atom size={16} />, visible: visibleStats.physicsTime },
        { key: 'chemistryTime', label: 'Chemistry Study Time', value: formatTime(chemistryTime), icon: <FlaskConical size={16} />, visible: visibleStats.chemistryTime },
        { key: 'mathsTime', label: 'Maths Study Time', value: formatTime(mathsTime), icon: <Calculator size={16} />, visible: visibleStats.mathsTime },
        { key: 'physicsProgress', label: 'Physics Progress', value: `${physicsProgress}%`, icon: <Atom size={16} />, visible: visibleStats.physicsProgress },
        { key: 'chemistryProgress', label: 'Chemistry Progress', value: `${chemistryProgress}%`, icon: <FlaskConical size={16} />, visible: visibleStats.chemistryProgress },
        { key: 'mathsProgress', label: 'Maths Progress', value: `${mathsProgress}%`, icon: <Calculator size={16} />, visible: visibleStats.mathsProgress },
    ];

    const visibleStatsList = stats.filter(s => s.visible);



    // Helper to convert hex to rgb for CSS variables
    const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '245, 158, 11';
    };

    return createPortal(
        <div className="modal-overlay progress-card-overlay" onClick={onClose}>
            <div className="progress-card-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>My Progress Card</h3>
                    <div className="header-actions-group">
                        <button
                            className="icon-btn"
                            onClick={() => setShowSettings(!showSettings)}
                            title="Toggle customization"
                        >
                            {showSettings ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                        <button className="modal-close-btn" onClick={onClose}>
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {showSettings && (
                    <div className="progress-card-settings">
                        <div className="setting-row">
                            <label>Display Name</label>
                            <input
                                type="text"
                                value={settings.userName}
                                onChange={handleNameChange}
                                placeholder="Your name"
                                className="modal-input name-input"
                            />
                        </div>
                        <div className="setting-row">
                            <label>Avatar</label>
                            <div className="avatar-actions">
                                <button className="action-btn small outline" onClick={() => fileInputRef.current?.click()}>
                                    <Upload size={14} /> Upload
                                </button>
                                {settings.customAvatarUrl && (
                                    <button className="action-btn small outline" onClick={handleResetAvatar}>
                                        <RotateCcw size={14} /> Reset
                                    </button>
                                )}
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleFileUpload}
                                style={{ display: 'none' }}
                            />
                        </div>
                        <div className="setting-row vertical">
                            <label>Visible Stats</label>
                            <div className="stat-toggles">
                                {stats.map(stat => (
                                    <label key={stat.key} className="stat-toggle-item">
                                        <input
                                            type="checkbox"
                                            checked={stat.visible}
                                            onChange={() => toggleStat(stat.key as keyof ProgressCardSettings['visibleStats'])}
                                        />
                                        <span>{stat.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                <div className="progress-card-wrapper">
                    <div
                        ref={cardRef}
                        className="progress-card"
                        style={{
                            '--card-accent': accentColor,
                            '--card-accent-rgb': hexToRgb(accentColor),
                            '--card-accent-light': `${accentColor}33`,
                        } as React.CSSProperties}
                    >
                        <div className="card-header">
                            <UserAvatar
                                name={settings.userName || 'Student'}
                                size={80}
                                customImageUrl={settings.customAvatarUrl}
                                accentColor={accentColor}
                            />
                            <div className="card-title">
                                <h2>{settings.userName || 'My Progress'}</h2>
                                <span className="card-subtitle">OJEE Tracker</span>
                            </div>
                        </div>

                        <div className="card-stats">
                            {visibleStatsList.map(stat => (
                                <div key={stat.key} className="card-stat-item">
                                    <span
                                        className="stat-icon"
                                        style={{
                                            background: `${accentColor}33`,
                                            color: accentColor
                                        }}
                                    >
                                        {stat.icon}
                                    </span>
                                    <div className="stat-content">
                                        <span className="stat-value">{stat.value}</span>
                                        <span className="stat-label">{stat.label}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="card-footer">
                            <span className="card-watermark">Generated with OJEE Tracker</span>
                        </div>
                    </div>
                </div>

                <div className="modal-footer">
                    <button
                        className="action-btn primary download-btn"
                        onClick={handleDownload}
                        disabled={isDownloading}
                    >
                        <Download size={16} />
                        {isDownloading ? 'Downloading...' : 'Download as PNG'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
