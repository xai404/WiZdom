import { Ionicons } from '@expo/vector-icons';

import type { JourneyStageStatus } from '@/lib/journey-api';

// Must stay in the exact same order as backend/constants/journeyStages.js —
// slugs here are the client-only routing key for /discussion/[stageId] and
// are never sent to the server.
export type StageMeta = {
  title: string;
  slug: string;
  icon: keyof typeof Ionicons.glyphMap;
};

export const STAGE_META: StageMeta[] = [
  { title: 'Career Counselling', slug: 'career-counselling', icon: 'people-outline' },
  { title: 'Country & Course Guidance', slug: 'country-course-guidance', icon: 'compass-outline' },
  { title: 'Student Registration', slug: 'student-registration', icon: 'person-add-outline' },
  { title: 'Test Prep', slug: 'test-prep', icon: 'school-outline' },
  { title: 'Documentation', slug: 'documentation', icon: 'document-text-outline' },
  { title: 'University Shortlisting', slug: 'university-shortlisting', icon: 'list-outline' },
  { title: 'Profiling & Editing', slug: 'profiling-editing', icon: 'create-outline' },
  { title: 'Application Management', slug: 'application-management', icon: 'briefcase-outline' },
  { title: 'Offer Letters', slug: 'offer-letters', icon: 'mail-open-outline' },
  { title: 'Loan Application', slug: 'loan-application', icon: 'cash-outline' },
  { title: 'Condition Fulfillment', slug: 'condition-fulfillment', icon: 'checkbox-outline' },
  { title: 'University Deposit Payment', slug: 'university-deposit-payment', icon: 'card-outline' },
  { title: 'Financial Documents', slug: 'financial-documents', icon: 'wallet-outline' },
  { title: 'Visa Documentation', slug: 'visa-documentation', icon: 'folder-open-outline' },
  { title: 'Visa Appointment', slug: 'visa-appointment', icon: 'calendar-outline' },
  { title: 'Visa Lodging', slug: 'visa-lodging', icon: 'file-tray-full-outline' },
  { title: 'Visa Status Update', slug: 'visa-status-update', icon: 'refresh-outline' },
  { title: 'University Fee Payment', slug: 'university-fee-payment', icon: 'school-outline' },
  { title: 'Accommodation Planning', slug: 'accommodation-planning', icon: 'home-outline' },
  { title: 'Travel Planning', slug: 'travel-planning', icon: 'airplane-outline' },
  { title: 'Process Complete', slug: 'process-complete', icon: 'ribbon-outline' },
];

const metaByTitle = new Map(STAGE_META.map((meta) => [meta.title, meta]));
const metaBySlug = new Map(STAGE_META.map((meta) => [meta.slug, meta]));

export function getStageMetaByTitle(title: string): StageMeta {
  return (
    metaByTitle.get(title) ?? {
      title,
      slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      icon: 'ellipse-outline',
    }
  );
}

export function getStageMetaBySlug(slug: string): StageMeta | undefined {
  return metaBySlug.get(slug);
}

export const STATUS_META: Record<
  JourneyStageStatus,
  {
    label: string;
    color: string;
    bg: string;
    tint: string;
    tintDark: string;
    badgeBg: string;
    badgeText: string;
    icon: keyof typeof Ionicons.glyphMap;
    pulse: boolean;
  }
> = {
  completed: {
    label: 'Completed',
    color: '#22c55e',
    bg: '#dcfce7',
    tint: '#f0fdf4',
    tintDark: '#0f2417',
    badgeBg: '#dcfce7',
    badgeText: '#16a34a',
    icon: 'checkmark-circle',
    pulse: false,
  },
  in_progress: {
    label: 'In Progress',
    color: '#eab308',
    bg: '#fef9c3',
    tint: '#fefce8',
    tintDark: '#241f06',
    badgeBg: '#fef9c3',
    badgeText: '#a16207',
    icon: 'time',
    pulse: true,
  },
  pending: {
    label: 'Pending',
    color: '#ef4444',
    bg: '#fee2e2',
    tint: '#fef2f2',
    tintDark: '#2a1010',
    badgeBg: '#fee2e2',
    badgeText: '#b91c1c',
    icon: 'ellipse-outline',
    pulse: false,
  },
};
