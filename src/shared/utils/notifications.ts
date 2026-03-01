/**
 * Request permission for browser notifications.
 */
export async function requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
        console.warn('This browser does not support desktop notification');
        return false;
    }

    if (Notification.permission === 'granted') {
        return true;
    }

    if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    }

    return false;
}

/**
 * Dispatch a browser notification if permission is granted.
 */
export function dispatchNotification(title: string, options?: NotificationOptions): void {
    if (!('Notification' in window)) return;

    if (Notification.permission === 'granted') {
        try {
            new Notification(title, {
                icon: '/icons/icon-192x192.png', // Assuming a standard PWA icon path
                badge: '/icons/icon-192x192.png',
                ...options,
            });
        } catch (e) {
            console.warn('Failed to dispatch notification:', e);
        }
    }
}
