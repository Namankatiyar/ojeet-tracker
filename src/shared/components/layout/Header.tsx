import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Subject } from '../../types';
import { LayoutDashboard, Atom, FlaskConical, Calculator, Sun, Moon, Palette, Settings, Calendar, Clock, Menu } from 'lucide-react';
import { SettingsModal } from '../ui/SettingsModal';
import { ColorPickerModal } from '../ui/ColorPickerModal';

interface HeaderProps {
    currentView: 'dashboard' | 'planner' | 'studyclock' | Subject;
    onNavigate: (view: 'dashboard' | 'planner' | 'studyclock' | Subject) => void;
    theme: 'light' | 'dark';
    onThemeToggle: () => void;
    accentColor: string;
    onAccentChange: (color: string) => void;
    // New Settings Props
    disableAutoShift: boolean;
    onDisableAutoShiftChange: (value: boolean) => void;
    backgroundUrl: string;
    onBackgroundUrlChange: (url: string) => void;
    dimLevel: number;
    onDimLevelChange: (level: number) => void;
    glassIntensity: number;
    onGlassIntensityChange: (intensity: number) => void;
    glassRefraction: number;
    onGlassRefractionChange: (refraction: number) => void;
}

const ACCENT_COLORS = [
    { name: 'Amber', value: '#f59e0b' },
    { name: 'Cyan', value: '#00F0FF' },
    { name: 'Emerald', value: '#10b981' },
    { name: 'Rose', value: '#e11d48' },
    { name: 'Violet', value: '#8b5cf6' },
    { name: 'Cyan (Deep)', value: '#06b6d4' },
    { name: 'Orange', value: '#f97316' },
    { name: 'Teal', value: '#14b8a6' },
    { name: 'Pink', value: '#ec4899' },
    { name: 'Lime', value: '#84cc16' },
    { name: 'Fuchsia', value: '#d946ef' },
];

export function Header({ currentView, onNavigate, theme, onThemeToggle, accentColor, onAccentChange, disableAutoShift, onDisableAutoShiftChange, backgroundUrl, onBackgroundUrlChange, dimLevel, onDimLevelChange, glassIntensity, onGlassIntensityChange, glassRefraction, onGlassRefractionChange }: HeaderProps) {
    const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isCustomColorModalOpen, setIsCustomColorModalOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const colorPickerRef = useRef<HTMLDivElement>(null);
    const mobileMenuRef = useRef<HTMLDivElement>(null);

    // Close on outside click for Color Picker
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (colorPickerRef.current && !colorPickerRef.current.contains(event.target as Node)) {
                setIsColorPickerOpen(false);
            }
        };

        if (isColorPickerOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isColorPickerOpen]);

    // Close on outside click for Mobile Menu
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            // Check if click is outside the mobile menu (and not on the toggle button itself)
            const target = event.target as Node;
            // We assume the toggle button is outside the ref or we check explicitly
            // Actually, best to wrap both in a container or check both refs if we separate them
            if (mobileMenuRef.current && !mobileMenuRef.current.contains(target)) {
                // If it's the toggle button, let the onClick handler handle it (or check for it)
                if (!(target instanceof Element && target.closest('.mobile-menu-toggle'))) {
                    setIsMobileMenuOpen(false);
                }
            }
        };

        if (isMobileMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isMobileMenuOpen]);

    const navItems: { key: 'dashboard' | 'planner' | 'studyclock' | Subject; label: string; icon: React.ReactNode }[] = [
        { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
        { key: 'physics', label: 'Physics', icon: <Atom size={20} /> },
        { key: 'chemistry', label: 'Chemistry', icon: <FlaskConical size={20} /> },
        { key: 'maths', label: 'Maths', icon: <Calculator size={20} /> },
        { key: 'planner', label: 'Planner', icon: <Calendar size={20} /> },
        { key: 'studyclock', label: 'Study Clock', icon: <Clock size={20} /> },
    ];

    const isCustomColor = !ACCENT_COLORS.some(c => c.value === accentColor);

    const handleCustomColorConfirm = (color: string) => {
        onAccentChange(color);
        setIsCustomColorModalOpen(false);
        setIsColorPickerOpen(false);
    };

    return (
        <header className="header">
            <div className="header-content">
                <div className="logo">
                    <span className="logo-text">OJEE Tracker</span>
                </div>

                <nav className="nav">
                    {navItems.map(({ key, label, icon }) => (
                        <button
                            key={key}
                            className={`nav-item ${currentView === key ? 'active' : ''}`}
                            onClick={() => onNavigate(key)}
                        >
                            <span className="nav-icon">{icon}</span>
                            <span className="nav-label">{label}</span>
                        </button>
                    ))}
                </nav>

                <div className="header-actions">
                    {/* Desktop Actions */}
                    <div className="desktop-actions">
                        <div className="color-picker-container" ref={colorPickerRef}>
                            <button
                                className="color-picker-toggle"
                                onClick={() => setIsColorPickerOpen(!isColorPickerOpen)}
                                aria-label="Change accent color"
                                title="Change accent color"
                            >
                                <div className="current-color-indicator" style={{ backgroundColor: 'var(--accent)' }}>
                                    <Palette size={20} color="var(--accent-text)" style={{ opacity: 0.8 }} />
                                </div>
                            </button>

                            {isColorPickerOpen && (
                                <div className="color-picker-popup">
                                    <div className="color-grid">
                                        {ACCENT_COLORS.map((color) => (
                                            <button
                                                key={color.value}
                                                className={`color-option ${accentColor === color.value ? 'selected' : ''}`}
                                                style={{ backgroundColor: color.value }}
                                                onClick={() => {
                                                    onAccentChange(color.value);
                                                    setIsColorPickerOpen(false);
                                                }}
                                                title={color.name}
                                                aria-label={`Select ${color.name}`}
                                            />
                                        ))}
                                        <button
                                            className={`color-option custom-color-option ${isCustomColor ? 'selected' : ''}`}
                                            style={isCustomColor ? { background: accentColor, border: '2px solid var(--text-primary)' } : {}}
                                            onClick={() => {
                                                setIsCustomColorModalOpen(true);
                                                setIsColorPickerOpen(false);
                                            }}
                                            title="Custom Color"
                                            aria-label="Pick a custom color"
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={isCustomColor ? 'var(--accent-text)' : 'var(--text-muted)'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <button
                            className="theme-toggle"
                            onClick={onThemeToggle}
                            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                        >
                            <span className="theme-toggle-icon">
                                {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                            </span>
                        </button>

                        <button
                            className="theme-toggle"
                            onClick={() => setIsSettingsOpen(true)}
                            aria-label="Open settings"
                            title="Settings & Data Backup"
                        >
                            <span className="theme-toggle-icon">
                                <Settings size={20} />
                            </span>
                        </button>
                    </div>

                    {/* Mobile Menu Toggle */}
                    <button
                        className="mobile-menu-toggle"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        aria-label="Open menu"
                    >
                        <Menu size={24} color="var(--text-primary)" />
                    </button>

                    {/* Mobile Menu Dropdown */}
                    {/* Mobile Menu Dropdown */}
                    {isMobileMenuOpen && createPortal(
                        <>
                            <div
                                className="mobile-menu-overlay"
                                onClick={() => setIsMobileMenuOpen(false)}
                            />
                            <div className="mobile-menu-dropdown" ref={mobileMenuRef}>
                                <div className="mobile-menu-item" onClick={() => { onThemeToggle(); setIsMobileMenuOpen(false); }}>
                                    <span>{theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}</span>
                                    {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                                </div>

                                <div className="mobile-menu-item" onClick={() => { setIsSettingsOpen(true); setIsMobileMenuOpen(false); }}>
                                    <span>Settings</span>
                                    <Settings size={18} />
                                </div>

                                <div className="mobile-menu-divider"></div>

                                <div className="mobile-menu-section">
                                    <span className="mobile-menu-label">Accent Color</span>
                                    <div className="mobile-color-grid">
                                        {ACCENT_COLORS.map((color) => (
                                            <button
                                                key={color.value}
                                                className={`color-option ${accentColor === color.value ? 'selected' : ''}`}
                                                style={{ backgroundColor: color.value }}
                                                onClick={() => {
                                                    onAccentChange(color.value);
                                                    setIsMobileMenuOpen(false);
                                                }}
                                            />
                                        ))}
                                        <button
                                            className={`color-option custom-color-option ${isCustomColor ? 'selected' : ''}`}
                                            style={isCustomColor ? { background: accentColor, border: '2px solid var(--text-primary)' } : {}}
                                            onClick={() => {
                                                setIsCustomColorModalOpen(true);
                                                setIsMobileMenuOpen(false);
                                            }}
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </>,
                        document.body
                    )}
                </div>
            </div>

            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                disableAutoShift={disableAutoShift}
                onDisableAutoShiftChange={onDisableAutoShiftChange}
                backgroundUrl={backgroundUrl}
                onBackgroundUrlChange={onBackgroundUrlChange}
                dimLevel={dimLevel}
                onDimLevelChange={onDimLevelChange}
                glassIntensity={glassIntensity}
                onGlassIntensityChange={onGlassIntensityChange}
                glassRefraction={glassRefraction}
                onGlassRefractionChange={onGlassRefractionChange}
                onAccentChange={onAccentChange}
            />
            <ColorPickerModal
                isOpen={isCustomColorModalOpen}
                currentColor={accentColor}
                onConfirm={handleCustomColorConfirm}
                onClose={() => setIsCustomColorModalOpen(false)}
            />
        </header>
    );
}

