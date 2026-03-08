export interface ChangelogEntry {
    version: string;
    date: string;
    title: string;
    changes: string[];
}

// Update this list before each rollout. Keep newest entry first.
export const CHANGELOG_ENTRIES: ChangelogEntry[] = [
    {
        version: '1.0.1',
        date: 'March 8, 2026',
        title: 'Bridge release for smoother updates',
        changes: [
            'Added a dedicated changelog page to announce release updates.',
            'Improved PWA update reliability with cache cleanup and faster service worker takeover.',
            'Added an in-app Repair & Reload option in Settings for stuck update cache cases.',
        ],
    },
];
