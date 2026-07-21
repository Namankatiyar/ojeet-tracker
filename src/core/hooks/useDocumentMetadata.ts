import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

const BASE_URL = 'https://tracker.ojeet.tech';
const SITE_NAME = 'OJEET Tracker';
const OG_IMAGE = `${BASE_URL}/og_image.jpg`;

interface PageMeta {
  title: string;
  description: string;
}

const routeMetadata: Record<string, PageMeta> = {
  '/jee-syllabus-tracker': {
    title: 'JEE & NEET Syllabus Tracker – OJEET Tracker | Study Dashboard & Planner',
    description:
      '100% Free, offline-first JEE & NEET tracker. Seamlessly manage your daily study planner, track PCM & Biology chapter completion, utilize a built-in study clock, and sync data.',
  },
  '/neet-syllabus-tracker': {
    title: 'NEET Syllabus Tracker – OJEET Tracker | Biology, Physics & Chemistry',
    description:
      'Free offline-first NEET UG syllabus tracker. Track chapter completion across Biology, Physics, and Chemistry, manage daily targets, and log study sessions.',
  },
  '/physics': {
    title: 'Physics Syllabus Tracker – OJEET Tracker | JEE & NEET',
    description:
      'Track your Physics chapter-wise preparation progress for JEE & NEET. Mark study materials completed for Mechanics, Electromagnetism, Optics, and Modern Physics.',
  },
  '/chemistry': {
    title: 'Chemistry Syllabus Tracker – OJEET Tracker | JEE & NEET',
    description:
      'Track your Chemistry chapter-wise preparation progress for JEE & NEET. Monitor coverage across Physical, Organic, and Inorganic Chemistry topics and study resources.',
  },
  '/maths': {
    title: 'Maths Syllabus Tracker – OJEET Tracker | JEE Prep',
    description:
      'Track your JEE Maths chapter-wise preparation progress. Stay organized with your preparation in Calculus, Algebra, Coordinate Geometry, and Vectors & 3D Geometry.',
  },
  '/biology': {
    title: 'Biology Syllabus Tracker – OJEET Tracker | NEET Prep',
    description:
      'Track your NEET Biology chapter-wise preparation progress. Monitor coverage across Botany, Zoology, NCERT readings, PYQs, and study materials.',
  },
  '/jee-study-planner': {
    title: 'JEE & NEET Study Planner & Timetable App for Droppers | OJEET Tracker',
    description:
      'Interactive daily timetable app with rescheduling. Free study planner for JEE & NEET droppers and Class 12, weekly task manager, and progress calendar.',
  },
  '/neet-study-planner': {
    title: 'NEET Study Planner & Timetable App | OJEET Tracker',
    description:
      'Free NEET study planner and timetable app for droppers & Class 12. Organize daily study schedules, track NCERT revisions, and manage task deadlines.',
  },
  '/jee-study-timer': {
    title: 'JEE & NEET Study Timer & Pomodoro Clock | Log Hours | OJEET Tracker',
    description:
      'Free online digital study stopwatch for JEE & NEET aspirants. Log your study hours, track focus sessions with a pomodoro timer, and analyze your preparation time.',
  },
  '/neet-study-timer': {
    title: 'NEET Study Timer & Pomodoro Stopwatch | OJEET Tracker',
    description:
      'Dedicated study timer for NEET aspirants. Focus on NCERT reading sessions, track daily study hours, and run pomodoro intervals with full offline support.',
  },
  '/jee-mock-scores': {
    title: 'JEE & NEET Mock Test Score Tracker | OJEET Tracker',
    description: 'Track and analyze your mock test scores for JEE Main, JEE Advanced, and NEET UG.',
  },
  '/neet-mock-scores': {
    title: 'NEET Mock Test Score Tracker | OJEET Tracker',
    description: 'Track and analyze your NEET mock test scores, subject breakdowns, and preparation progress.',
  },
  '/changelog': {
    title: 'Changelog – OJEET Tracker',
    description: 'View the latest updates, features, and improvements to OJEET Tracker.',
  },
  '/privacy-policy': {
    title: 'Privacy Policy – OJEET Tracker',
    description: 'Read the OJEET Tracker privacy policy to understand how your data is handled.',
  },
  '/terms-of-service': {
    title: 'Terms of Service – OJEET Tracker',
    description: 'Read the OJEET Tracker terms of service.',
  },
  '/import': {
    title: 'Import & Sync – OJEET Tracker',
    description: 'Import and sync your study data with OJEET Tracker.',
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
