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
  { title: 'Documentation & Editing', slug: 'documentation-editing', icon: 'document-text-outline' },
  { title: 'Application Management', slug: 'application-management', icon: 'briefcase-outline' },
  { title: 'Finance', slug: 'finance', icon: 'wallet-outline' },
  { title: 'Visa Application', slug: 'visa-application', icon: 'folder-open-outline' },
  { title: 'Travel Plans', slug: 'travel-plans', icon: 'airplane-outline' },
  { title: 'Completed', slug: 'completed', icon: 'ribbon-outline' },
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
    tintDark: '#0f1d3a',
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
  // Terminal negative outcome (only the Visa Application → Decision
  // sub-step can be set to it). Rendered like Pending in the
  // timeline nodes/connectors; the rose badge + label carry the meaning.
  rejected: {
    label: 'Rejected',
    color: '#e11d48',
    bg: '#ffe4e6',
    tint: '#fff1f2',
    tintDark: '#2a1015',
    badgeBg: '#ffe4e6',
    badgeText: '#be123c',
    icon: 'close-circle',
    pulse: false,
  },
};
