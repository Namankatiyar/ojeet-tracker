import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

declare global {
    interface Window {
        gtag?: (...args: any[]) => void;
    }
}

const BASE_URL = 'https://tracker.ojeet.tech';
const SITE_NAME = 'OJEE Tracker';
const OG_IMAGE = `${BASE_URL}/og_image.jpg`;

interface PageMeta {
    title: string;
    description: string;
}

const routeMetadata: Record<string, PageMeta> = {
    '/jee-syllabus-tracker': {
        title: 'JEE Syllabus Tracker – OJEE Tracker | Study Dashboard & Planner',
        description:
            '100% Free, offline-first JEE tracker. Seamlessly manage your daily study planner, track PCM chapter completion, utilize a built-in study clock, and sync data.',
    },
    '/physics': {
        title: 'Physics Syllabus Tracker – OJEE Tracker',
        description:
            'Track your JEE Physics chapter-wise preparation progress. Mark study materials completed for Mechanics, Electromagnetism, Optics, and Modern Physics to master core concepts.',
    },
    '/chemistry': {
        title: 'Chemistry Syllabus Tracker – OJEE Tracker',
        description:
            'Track your JEE Chemistry chapter-wise preparation progress. Monitor coverage across Physical, Organic, and Inorganic Chemistry topics and study resources.',
    },
    '/maths': {
        title: 'Maths Syllabus Tracker – OJEE Tracker',
        description:
            'Track your JEE Maths chapter-wise preparation progress. Stay organized with your preparation in Calculus, Algebra, Coordinate Geometry, and Vectors & 3D Geometry.',
    },
    '/jee-study-planner': {
        title: 'JEE Study Planner & Timetable App for Droppers | OJEE',
        description:
            'Interactive daily timetable app with rescheduling. Free JEE study planner for droppers and Class 12, weekly task manager, and progress calendar.',
    },
    '/jee-study-timer': {
        title: 'JEE Study Timer & Pomodoro Clock | Log Hours | OJEE',
        description:
            'Free online digital study stopwatch for JEE aspirants. Log your study hours, track focus sessions with a pomodoro timer, and analyze your preparation time.',
    },
    '/changelog': {
        title: 'Changelog – OJEE Tracker',
        description: 'View the latest updates, features, and improvements to OJEE Tracker.',
    },
    '/privacy-policy': {
        title: 'Privacy Policy – OJEE Tracker',
        description: 'Read the OJEE Tracker privacy policy to understand how your data is handled.',
    },
    '/terms-of-service': {
        title: 'Terms of Service – OJEE Tracker',
        description: 'Read the OJEE Tracker terms of service.',
    },
    '/import': {
        title: 'Import & Sync – OJEE Tracker',
        description: 'Import and sync your study data with OJEE Tracker.',
    },
};

function setMetaTag(attribute: string, attrValue: string, content: string) {
    let element = document.querySelector(`meta[${attribute}="${attrValue}"]`);
    if (element) {
        element.setAttribute('content', content);
    } else {
        element = document.createElement('meta');
        element.setAttribute(attribute, attrValue);
        element.setAttribute('content', content);
        document.head.appendChild(element);
    }
}

function setCanonical(url: string) {
    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (link) {
        link.href = url;
    } else {
        link = document.createElement('link');
        link.rel = 'canonical';
        link.href = url;
        document.head.appendChild(link);
    }
}

export function useDocumentMetadata() {
    const { pathname } = useLocation();

    useEffect(() => {
        const meta = routeMetadata[pathname] ?? routeMetadata['/jee-syllabus-tracker']!;
        const canonicalUrl = `${BASE_URL}${pathname === '/' ? '/' : pathname}`;

        // Document title
        document.title = meta.title;

        // Standard meta
        setMetaTag('name', 'description', meta.description);

        // Canonical
        setCanonical(canonicalUrl);

        // Open Graph
        setMetaTag('property', 'og:title', meta.title);
        setMetaTag('property', 'og:description', meta.description);
        setMetaTag('property', 'og:url', canonicalUrl);
        setMetaTag('property', 'og:image', OG_IMAGE);
        setMetaTag('property', 'og:site_name', SITE_NAME);
        setMetaTag('property', 'og:type', 'website');
        setMetaTag('property', 'og:locale', 'en_IN');

        // Twitter Card
        setMetaTag('name', 'twitter:title', meta.title);
        setMetaTag('name', 'twitter:description', meta.description);
        setMetaTag('name', 'twitter:image', OG_IMAGE);
        setMetaTag('name', 'twitter:card', 'summary_large_image');

        // Google Analytics Pageview Tracking
        if (window.gtag) {
            window.gtag('config', 'G-LPYD20N2G5', {
                page_path: pathname,
                page_title: meta.title,
            });
        }
    }, [pathname]);
}
