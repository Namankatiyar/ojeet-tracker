import confetti from 'canvas-confetti';

export function triggerConfetti(accentColor: string = '#6366f1') {
    const duration = 1200; // Reduced from 2000
    const end = Date.now() + duration;

    // Use the accent color along with some festive defaults
    const colors = [accentColor, '#ffffff'];

    (function frame() {
        // Reduced particle count from 3 to 2 per side
        confetti({
            particleCount: 2,
            angle: 60,
            spread: 55,
            origin: { x: 0, y: 0.7 },
            colors: colors,
        });
        confetti({
            particleCount: 2,
            angle: 120,
            spread: 55,
            origin: { x: 1, y: 0.7 },
            colors: colors,
        });

        if (Date.now() < end) {
            requestAnimationFrame(frame);
        }
    })();
}

// Smaller confetti for task completion, optional targeted origin
export function triggerSmallConfetti(accentColor: string = '#6366f1', x?: number, y?: number) {
    const colors = [accentColor, '#ffffff',];
    const origin = (x !== undefined && y !== undefined) ? { x, y } : { y: 0.6 };

    confetti({
        particleCount: 30,
        spread: 60,
        origin,
        colors: colors,
    });
}

// Massive explosion confetti for big celebrations (like payment success)
export function triggerMassiveConfetti() {
    const count = 250;
    const defaults = {
        origin: { y: 0.7 },
        zIndex: 10000,
    };

    function fire(particleRatio: number, opts: any) {
        confetti(Object.assign({}, defaults, opts, {
            particleCount: Math.floor(count * particleRatio)
        }));
    }

    fire(0.25, { spread: 26, startVelocity: 55 });
    fire(0.2, { spread: 60 });
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
    fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
    fire(0.1, { spread: 120, startVelocity: 45 });
}
