import Avatar from 'boring-avatars';

interface UserAvatarProps {
    name: string;
    size?: number;
    customImageUrl?: string;
    accentColor: string;
    onClick?: () => void;
    className?: string;
}

/**
 * Generate avatar colors from accent color using hue variations
 */
function generateColorsFromAccent(accentColor: string): string[] {
    // Parse hex to HSL for better color manipulation
    const hex = accentColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
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

    // Generate 5 colors with varying hues and lightness
    const hslToHex = (h: number, s: number, l: number): string => {
        const hue2rgb = (p: number, q: number, t: number) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };

        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        const r = Math.round(hue2rgb(p, q, h + 1 / 3) * 255);
        const g = Math.round(hue2rgb(p, q, h) * 255);
        const b = Math.round(hue2rgb(p, q, h - 1 / 3) * 255);

        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    };

    return [
        hslToHex(h, s, Math.min(l + 0.2, 0.9)),           // Lighter
        hslToHex((h + 0.05) % 1, s, l),                   // Slight hue shift
        hslToHex(h, Math.min(s + 0.1, 1), l),             // More saturated
        hslToHex((h + 0.95) % 1, s, Math.max(l - 0.15, 0.2)), // Darker, opposite hue shift
        hslToHex((h + 0.1) % 1, s, Math.max(l - 0.1, 0.25)),  // Darker still
    ];
}

export function UserAvatar({ name, size = 40, customImageUrl, accentColor, onClick, className = '' }: UserAvatarProps) {
    const colors = generateColorsFromAccent(accentColor);

    if (customImageUrl) {
        return (
            <div
                className={`user-avatar ${className}`}
                onClick={onClick}
                style={{
                    width: size,
                    height: size,
                    cursor: onClick ? 'pointer' : 'default',
                    borderRadius: '50%',
                    overflow: 'hidden'
                }}
            >
                <img
                    src={customImageUrl}
                    alt={`${name}'s avatar`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
            </div>
        );
    }

    return (
        <div
            className={`user-avatar ${className}`}
            onClick={onClick}
            style={{
                cursor: onClick ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}
        >
            <Avatar
                size={size}
                name={name}
                variant="beam"
                colors={colors}
            />
        </div>
    );
}
