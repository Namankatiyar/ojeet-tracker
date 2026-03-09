export interface ChangelogEntry {
    version: string;
    date: string;
    title: string;
    changes: string[];
}

// Update this list before each rollout. Keep newest entry first.
export const CHANGELOG_ENTRIES: ChangelogEntry[] = [
     {
        version: '1.0.2',
        date: 'March 9, 2026',
        title: 'Notification shade for announcements and updates',
        changes: [
            '-Added a dedicated notification panel.',
            '-The bell icon only dissappears once you dismiss all the notifications.',
        ],
    },
    {
        version: '1.0.1',
        date: 'March 8, 2026',
        title: 'Bridge release for smoother updates',
        changes: [
            '-Added a dedicated changelog page to announce release updates.',
            '-Improved PWA update reliability with cache cleanup and faster service worker takeover.',
            '-Added an in-app Repair & Reload option in Settings for stuck update cache cases.',
        ],
    },
];
