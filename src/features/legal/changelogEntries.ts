export interface ChangelogEntry {
    version: string;
    date: string;
    title: string;
    changes: string[];
}

// Update this list before each rollout. Keep newest entry first.
export const CHANGELOG_ENTRIES: ChangelogEntry[] = [
    {
        version: '1.1.0',
        date: 'June 20, 2026',
        title: 'New Reports page and Study Copilot',
        changes: [
            '-Entire daily report visible in one glance.',
            '-Share the screenshot of report wherever you like.',
            '-The study copilot reminds you of revising chapters.',
            '-Sign in bug fixed, lost data also recovered.',
            '-Please report any found bug in my Reddit DMs u/Big_Distribution_730 or in my discord server https://discord.gg/6dKrbVQU8W.',
        ],
    },
     {
        version: '1.0.6',
        date: 'June 18, 2026',
        title: 'Modern UI & UX Overhaul for Chapter Tracking',
        changes: [
            '-More granular syllabus tracking is now possible, no. of questions can be tracked now.',
            '-Introduced a revision counter directly in the chapter drawer.',
            '-Added a dynamic, color-coded chapter insights hover panel on the subject page mirroring the planner styling.',
            '-Optimized chapter row hitboxes to allow seamless drawer opening by clicking anywhere on the row background.',
            '-Fixed a bug causing the priority filter dropdown to clip off the screen.',
            '-Please report any found bug in my Reddit DMs u/Big_Distribution_730.'
        ],
    },
     {
        version: '1.0.5',
        date: 'June 12, 2026',
        title: 'Fully Flexible Custom Exam Presets',
        changes: [
            '-Replaced hardcoded exam formats (JEE Main, Advanced, BITSAT) with fully flexible, user-defined presets.',
            '-Added an Exam Preset Manager modal allowing users to create, edit, and delete custom exam configurations.',
            '-Supports custom exam name, short name, paper count, and per-subject max marks boundaries.',
            '-Updated mock score analytics and score entry forms to dynamically recalculate scores and percentages from user presets.',
            '-Integrated presets with the local and remote synchronization layers for seamless cross-device compatibility.',
            '-Please report any found bug in my Reddit DMs u/Big_Distribution_730.'
        ],
    },
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
