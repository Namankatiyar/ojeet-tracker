import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ColorPickerModalProps {
    isOpen: boolean;
    currentColor: string;
    onConfirm: (color: string) => void;
    onClose: () => void;
}

// Convert hex to HSL
function hexToHsl(hex: string): { h: number; s: number; l: number } {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
    }
    return { h: h * 360, s: s * 100, l: l * 100 };
}

// Convert HSL to hex
function hslToHex(h: number, s: number, l: number): string {
    s /= 100;
    l /= 100;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
}

export function ColorPickerModal({ isOpen, currentColor, onConfirm, onClose }: ColorPickerModalProps) {
    const [hue, setHue] = useState(0);
    const [saturation, setSaturation] = useState(70);
    const [lightness, setLightness] = useState(50);
    const [previewColor, setPreviewColor] = useState(currentColor);
    const [hexInput, setHexInput] = useState(currentColor);

    const hueSliderRef = useRef<HTMLDivElement>(null);
    const satLightRef = useRef<HTMLDivElement>(null);

    // Initialize from current color
    useEffect(() => {
        if (isOpen) {
            const hsl = hexToHsl(currentColor);
            setHue(hsl.h);
            setSaturation(hsl.s);
            setLightness(hsl.l);
            setPreviewColor(currentColor);
        }
    }, [isOpen, currentColor]);

    // Update preview when HSL changes
    useEffect(() => {
        const newColor = hslToHex(hue, saturation, lightness);
        setPreviewColor(newColor);
    }, [hue, saturation, lightness]);

    // Sync input with preview color
    useEffect(() => {
        setHexInput(previewColor.toUpperCase());
    }, [previewColor]);

    const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setHexInput(val);

        // Validate hex code
        if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
            const hsl = hexToHsl(val);
            setHue(hsl.h);
            setSaturation(hsl.s);
            setLightness(hsl.l);
        }
    };

    const handleHueChange = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
        if (!hueSliderRef.current) return;
        const rect = hueSliderRef.current.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
        setHue((x / rect.width) * 360);
    };

    const handleSatLightChange = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
        if (!satLightRef.current) return;
        const rect = satLightRef.current.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
        const y = Math.max(0, Math.min(clientY - rect.top, rect.height));
        setSaturation((x / rect.width) * 100);
        setLightness(100 - (y / rect.height) * 100);
    };

    if (!isOpen) return null;

    return createPortal(
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 300,
                backdropFilter: 'blur(4px)',
                WebkitBackdropFilter: 'blur(4px)'
            }}
            onClick={onClose}
        >
            <div
                className="color-picker-modal"
                style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--border-radius)',
                    padding: '1.5rem',
                    width: '90%',
                    maxWidth: '340px',
                    boxShadow: 'var(--shadow-lg)'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '1rem'
                }}>
                    <h3 style={{
                        margin: 0,
                        fontSize: '1.1rem',
                        fontWeight: 600,
                        color: 'var(--text-primary)'
                    }}>Choose Custom Color</h3>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'var(--bg-tertiary)',
                            border: '1px solid var(--border)',
                            borderRadius: '6px',
                            padding: '0.4rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--text-secondary)',
                            transition: 'all 0.2s'
                        }}
                        title="Close"
                    >
                        <X size={16} />
                    </button>
                </div>

                <div className="color-picker-content">
                    {/* Saturation/Lightness Picker */}
                    <div
                        className="sat-light-picker"
                        ref={satLightRef}
                        style={{ background: `linear-gradient(to bottom, white, transparent, black), linear-gradient(to right, #808080, hsl(${hue}, 100%, 50%))` }}
                        onMouseDown={handleSatLightChange}
                        onMouseMove={(e) => e.buttons === 1 && handleSatLightChange(e)}
                        onTouchStart={handleSatLightChange}
                        onTouchMove={handleSatLightChange}
                    >
                        <div
                            className="color-picker-handle"
                            style={{
                                left: `${saturation}%`,
                                top: `${100 - lightness}%`,
                                background: previewColor
                            }}
                        />
                    </div>

                    {/* Hue Slider */}
                    <div
                        className="hue-slider"
                        ref={hueSliderRef}
                        onMouseDown={handleHueChange}
                        onMouseMove={(e) => e.buttons === 1 && handleHueChange(e)}
                        onTouchStart={handleHueChange}
                        onTouchMove={handleHueChange}
                    >
                        <div
                            className="hue-slider-handle"
                            style={{ left: `${(hue / 360) * 100}%` }}
                        />
                    </div>

                    {/* Preview Section */}
                    <div className="color-preview-section">
                        <div className="color-preview-box" style={{ background: previewColor }}>
                            <input
                                type="text"
                                value={hexInput}
                                onChange={handleHexInputChange}
                                style={{
                                    background: 'none',
                                    borderRadius: '6px',
                                    padding: '4px 8px',
                                    border: 'none',
                                    color: lightness > 60 ? '#000' : '#fff',
                                    fontWeight: 700,
                                    fontSize: '1.2rem',
                                    textAlign: 'center',
                                    width: '140px',
                                    outline: 'none',
                                    textTransform: 'uppercase'
                                }}
                            />
                        </div>
                    </div>
                </div>

                <div className="modal-actions">
                    <button className="modal-btn cancel-btn" onClick={onClose}>
                        Cancel
                    </button>
                    <button
                        className="modal-btn confirm-btn"
                        style={{ background: previewColor, color: lightness > 60 ? '#000' : '#fff' }}
                        onClick={() => onConfirm(previewColor)}
                    >
                        Apply Color
                    </button>
                </div>
            </div>

            <style>{`
                .color-picker-content {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                    padding: 1rem 0;
                }
                .sat-light-picker {
                    width: 100%;
                    height: 180px;
                    border-radius: 8px;
                    cursor: crosshair;
                    position: relative;
                    border: 1px solid var(--border);
                }
                .color-picker-handle {
                    position: absolute;
                    width: 18px;
                    height: 18px;
                    border-radius: 50%;
                    border: 3px solid white;
                    box-shadow: 0 0 0 1px rgba(0,0,0,0.3), inset 0 0 2px rgba(0,0,0,0.3);
                    transform: translate(-50%, -50%);
                    pointer-events: none;
                }
                .hue-slider {
                    width: 100%;
                    height: 20px;
                    border-radius: 10px;
                    background: linear-gradient(to right, 
                        hsl(0, 100%, 50%), 
                        hsl(60, 100%, 50%), 
                        hsl(120, 100%, 50%), 
                        hsl(180, 100%, 50%), 
                        hsl(240, 100%, 50%), 
                        hsl(300, 100%, 50%), 
                        hsl(360, 100%, 50%)
                    );
                    cursor: pointer;
                    position: relative;
                    border: 1px solid var(--border);
                }
                .hue-slider-handle {
                    position: absolute;
                    top: 50%;
                    width: 8px;
                    height: 24px;
                    background: white;
                    border: 2px solid var(--border);
                    border-radius: 4px;
                    transform: translate(-50%, -50%);
                    pointer-events: none;
                    box-shadow: 0 1px 4px rgba(0,0,0,0.2);
                }
                .color-preview-section {
                    display: flex;
                    gap: 0.75rem;
                    align-items: center;
                }
                .color-preview-box {
                    flex: 1;
                    height: 48px;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: 1px solid var(--border);
                    font-size: 0.9rem;
                }
                .modal-actions {
                    display: flex;
                    gap: 0.75rem;
                    margin-top: 0.5rem;
                }
                .modal-btn {
                    flex: 1;
                    padding: 0.75rem 1rem;
                    border-radius: 8px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                    border: 1px solid var(--border);
                }
                .cancel-btn {
                    background: var(--bg-tertiary);
                    color: var(--text-secondary);
                }
                .cancel-btn:hover {
                    background: var(--bg-primary);
                }
                .confirm-btn:hover {
                    opacity: 0.9;
                    transform: scale(1.02);
                }
            `}</style>
        </div>,
        document.body
    );
}
