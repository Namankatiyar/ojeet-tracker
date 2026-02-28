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
