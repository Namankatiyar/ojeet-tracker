import { useRef, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Download,
  RotateCcw,
  Eye,
  EyeOff,
  Clock,
  Trophy,
  Flame,
  TrendingUp,
  Atom,
  FlaskConical,
  Pi,
} from 'lucide-react';
import { UserAvatar } from './Avatar';
import { StudySession, MockScore, ProgressCardSettings } from '../../types';
import { getMockMaxMarks, getMockTotalMarks } from '../../utils/mockScores';

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
  const [isDownloading, setIsDownloading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [avatarUrlError, setAvatarUrlError] = useState('');

  // Render handled by AnimatePresence

  // Calculate stats only when modal is open
  const {
    highestMockScore,
    totalStudyTime,
    physicsTime,
    chemistryTime,
    mathsTime,
    highestDailyHours,
    highestWeekAverage,
  } = useMemo(() => {
    if (!isOpen) {
      return {
        highestMockScore: { total: 0, max: 300 },
        totalStudyTime: 0,
        physicsTime: 0,
        chemistryTime: 0,
        mathsTime: 0,
        highestDailyHours: 0,
        highestWeekAverage: 0,
      };
    }

    const highestMockScore = mockScores.reduce<{ total: number; max: number }>(
      (best, score) => {
        const total = getMockTotalMarks(score);
        if (total > best.total) {
          return { total, max: getMockMaxMarks(score) };
        }
        return best;
      },
      { total: 0, max: 300 }
    );

    let totalStudyTime = 0;
    let physicsTime = 0;
    let chemistryTime = 0;
    let mathsTime = 0;
    const sessionsByDay: Record<string, number> = {};
    const sessionsByWeek: Record<string, { total: number; days: Set<string> }> = {};

    const getWeekKey = (dateStr: string) => {
      const date = new Date(dateStr);
      const startOfYear = new Date(date.getFullYear(), 0, 1);
      const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
      return `${date.getFullYear()}-W${Math.ceil((days + 1) / 7)}`;
    };

    studySessions.forEach((s) => {
      const duration = s.duration;
      totalStudyTime += duration;

      if (s.subject === 'physics') {
        physicsTime += duration;
      } else if (s.subject === 'chemistry') {
        chemistryTime += duration;
      } else if (s.subject === 'maths') {
        mathsTime += duration;
      }

      const date = s.startTime.split('T')[0];
      sessionsByDay[date] = (sessionsByDay[date] || 0) + duration;

      const weekKey = getWeekKey(date);
      if (!sessionsByWeek[weekKey]) {
        sessionsByWeek[weekKey] = { total: 0, days: new Set() };
      }
      sessionsByWeek[weekKey].total += duration;
      sessionsByWeek[weekKey].days.add(date);
    });

    const highestDailySeconds = Math.max(...Object.values(sessionsByDay), 0);
    const highestDailyHours = highestDailySeconds / 3600;

    const weekAverages = Object.values(sessionsByWeek).map((w) => w.total / Math.max(w.days.size, 1));
    const highestWeekAverage = weekAverages.length > 0 ? Math.max(...weekAverages) / 3600 : 0;

    return {
      highestMockScore,
      totalStudyTime,
      physicsTime,
      chemistryTime,
      mathsTime,
      highestDailyHours,
      highestWeekAverage,
    };
  }, [isOpen, mockScores, studySessions]);

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
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Clone the card element to avoid modifying the original
      const cardElement = cardRef.current;

      const html2canvas = (await import('html2canvas')).default;

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
        },
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

  // Avatars are internet image URLs only — no local file uploads. Storing
  // base64 data URIs here previously bloated profiles.avatar_url (avg ~257 KB
  // per row) and got copied into the leaderboard snapshot and friend fetches.
  const handleAvatarUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value.trim();

    if (!value) {
      setAvatarUrlError('');
    } else if (/^data:/i.test(value)) {
      setAvatarUrlError('Data URIs are not allowed. Paste an image link (https://…).');
    } else if (!/^https?:\/\//i.test(value)) {
      setAvatarUrlError('Enter a full image URL starting with http:// or https://');
    } else {
      setAvatarUrlError('');
    }

    onSettingsChange({
      ...settings,
      customAvatarUrl: value,
    });
  };

  const handleResetAvatar = () => {
    setAvatarUrlError('');
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
    {
      key: 'totalStudyTime',
      label: 'Total Study Time',
      value: formatTime(totalStudyTime),
      icon: <Clock size={16} />,
      visible: visibleStats.totalStudyTime,
    },
    {
      key: 'highestMockScore',
      label: 'Highest Mock Score',
      value: `${highestMockScore.total}/${highestMockScore.max}`,
      icon: <Trophy size={16} />,
      visible: visibleStats.highestMockScore,
    },
    {
      key: 'highestDailyHours',
      label: 'Highest Daily Hours',
      value: `${highestDailyHours.toFixed(1)}h`,
      icon: <Flame size={16} />,
      visible: visibleStats.highestDailyHours,
    },
    {
      key: 'highestWeekAverage',
      label: 'Best Week Average',
      value: `${highestWeekAverage.toFixed(1)}h/day`,
      icon: <TrendingUp size={16} />,
      visible: visibleStats.highestWeekAverage,
    },
    {
      key: 'physicsTime',
      label: 'Physics Study Time',
      value: formatTime(physicsTime),
      icon: <Atom size={16} />,
      visible: visibleStats.physicsTime,
    },
    {
      key: 'chemistryTime',
      label: 'Chemistry Study Time',
      value: formatTime(chemistryTime),
      icon: <FlaskConical size={16} />,
      visible: visibleStats.chemistryTime,
    },
    {
      key: 'mathsTime',
      label: 'Maths Study Time',
      value: formatTime(mathsTime),
      icon: <Pi size={16} />,
      visible: visibleStats.mathsTime,
    },
    {
      key: 'physicsProgress',
      label: 'Physics Progress',
      value: `${physicsProgress}%`,
      icon: <Atom size={16} />,
      visible: visibleStats.physicsProgress,
    },
    {
      key: 'chemistryProgress',
      label: 'Chemistry Progress',
      value: `${chemistryProgress}%`,
      icon: <FlaskConical size={16} />,
      visible: visibleStats.chemistryProgress,
    },
    {
      key: 'mathsProgress',
      label: 'Maths Progress',
      value: `${mathsProgress}%`,
      icon: <Pi size={16} />,
      visible: visibleStats.mathsProgress,
    },
  ];

  const visibleStatsList = stats.filter((s) => s.visible);

  // Helper to convert hex to rgb for CSS variables
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
      : '245, 158, 11';
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="modal-overlay progress-card-overlay motion-animated"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <motion.div
            className="progress-card-modal motion-animated"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
          >
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
              <label htmlFor="pc-avatar-url">Avatar URL</label>
              <input
                id="pc-avatar-url"
                type="url"
                inputMode="url"
                value={settings.customAvatarUrl}
                onChange={handleAvatarUrlChange}
                placeholder="https://example.com/photo.jpg"
                className="modal-input name-input"
              />
              {avatarUrlError && <span className="setting-error">{avatarUrlError}</span>}
              <div className="avatar-actions">
                {settings.customAvatarUrl && (
                  <button className="action-btn small outline" onClick={handleResetAvatar}>
                    <RotateCcw size={14} /> Reset
                  </button>
                )}
              </div>
            </div>
            <div className="setting-row vertical">
              <label>Visible Stats</label>
              <div className="stat-toggles">
                {stats.map((stat) => (
                  <label key={stat.key} className="stat-toggle-item">
                    <input
                      type="checkbox"
                      checked={stat.visible}
                      onChange={() =>
                        toggleStat(stat.key as keyof ProgressCardSettings['visibleStats'])
                      }
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
            style={
              {
                '--card-accent': accentColor,
                '--card-accent-rgb': hexToRgb(accentColor),
                '--card-accent-light': `${accentColor}33`,
              } as React.CSSProperties
            }
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
                <span className="card-subtitle">OJEET Tracker</span>
              </div>
            </div>

            <div className="card-stats">
              {visibleStatsList.map((stat) => (
                <div key={stat.key} className="card-stat-item">
                  <span
                    className="stat-icon"
                    style={{
                      background: `${accentColor}33`,
                      color: accentColor,
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
              <span className="card-watermark">Generated with OJEET Tracker</span>
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
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
