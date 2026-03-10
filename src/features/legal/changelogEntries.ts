export interface ChangelogEntry {
    version: string;
    date: string;
    title: string;
    changes: string[];
}

// Update this list before each rollout. Keep newest entry first.
export const CHANGELOG_ENTRIES: ChangelogEntry[] = [
     {
        version: '1.0.4',
        date: 'March 10, 2026',
        title: 'Fixed the unusable timer after last update',
        changes: [
            '-The timer is finally stable now.',
            '-Added BITSAT mock score tracking in the dashboard.',
            '-Optimised Egress spending by upto 90% .',
            '-Please report any found bug in my Reddit DMs u/Big_Distribution_730.',
        ],
    },
    {
        version: '1.0.3',
        date: 'March 9, 2026',
        title: 'New JEE Advanced Mock Score panel',
        changes: [
            '-Added a JEE Advanced Mock Score tracking panel.',
            '-Fixed bug in a study clock calculating wrong lapsed time when PWA became inactive.',
            '-Please report any found bug in my Reddit DMs u/Big_Distribution_730.',
        ],
    },
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
