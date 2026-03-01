let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioCtx;
}

/**
 * Play a pleasant bell/chime sound using Web Audio API.
 * No external audio files required.
 */
export function playCompletionBell(): void {
    try {
        const ctx = getAudioContext();
        const now = ctx.currentTime;

        // Create two oscillators for a richer bell sound
        const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5 chord

        frequencies.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now);

            // Bell-like envelope: quick attack, slow decay
            gain.gain.setValueAtTime(0, now + i * 0.08);
            gain.gain.linearRampToValueAtTime(0.15, now + i * 0.08 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 1.5);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now + i * 0.08);
            osc.stop(now + i * 0.08 + 1.5);
        });
    } catch (e) {
        console.warn('Could not play completion bell:', e);
    }
}

/**
 * Play a start chime/bell using Web Audio API.
 * Uses a slightly higher, shorter, rising chord to indicate start.
 */
export function playStartBell(): void {
    try {
        const ctx = getAudioContext();
        const now = ctx.currentTime;

        // Create oscillators for a bright, rising start sound
        const frequencies = [659.25, 880.00]; // E5, A5

        frequencies.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + i * 0.1);

            // Snappy envelope: instant attack, fast decay
            gain.gain.setValueAtTime(0, now + i * 0.1);
            gain.gain.linearRampToValueAtTime(0.1, now + i * 0.1 + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.5);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now + i * 0.1);
            osc.stop(now + i * 0.1 + 0.6);
        });
    } catch (e) {
        console.warn('Could not play start bell:', e);
    }
}

/**
 * Play a pause/tick sound using Web Audio API.
 * Uses a short, low-pitched tick.
 */
export function playPauseSound(): void {
    try {
        const ctx = getAudioContext();
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        // A low, muted click
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.1);

        // Very short, abrupt envelope
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.1, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.1);
    } catch (e) {
        console.warn('Could not play pause sound:', e);
    }
}

/**
 * Play a distinct, triumphant sound for saving and ending a session.
 */
export function playSaveAndEndSound(): void {
    try {
        const ctx = getAudioContext();
        const now = ctx.currentTime;

        const frequencies = [440.00, 554.37, 659.25, 880.00]; // A4, C#5, E5, A5 (A Major Chord)

        frequencies.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + i * 0.05); // slightly staggered start

            // Triumphant envelope: decent attack, long sustain and release
            gain.gain.setValueAtTime(0, now + i * 0.05);
            gain.gain.linearRampToValueAtTime(0.15, now + i * 0.05 + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 2.0);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now + i * 0.05);
            osc.stop(now + i * 0.05 + 2.0);
        });
    } catch (e) {
        console.warn('Could not play save and end sound:', e);
    }
}
