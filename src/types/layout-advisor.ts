import type { VenueConfig } from '@/types/venue';

export type AdvisorMode = 'fresh-arrange' | 'bottleneck-analysis' | 'hybrid-optimize';
export type IssueSeverity = 'critical' | 'warning' | 'info';
export type EventType = 'wedding' | 'corporate' | 'cocktail' | 'classroom' | 'banquet';

export interface LayoutIssue {
  id: string;
  severity: IssueSeverity;
  title: string;
  description: string;
  affectedObjectIds: string[];
  zone: { x: number; y: number; width: number; height: number };
}

export interface LayoutChange {
  objectId: string;
  objectType: 'table' | 'fixture';
  reason: string;
  newPosition: { x: number; y: number };
  newRotation?: number;
}

export interface SuggestedLayout {
  changes: LayoutChange[];
  summary: string;
}

export interface LayoutAdvisorRequest {
  mode: AdvisorMode;
  venueConfig: VenueConfig;
  guestCount: number | null;
  eventType: EventType | null;
  lockedFixtureIds: string[];
}

export interface LayoutAdvisorResponse {
  issues?: LayoutIssue[];
  suggestedLayout?: SuggestedLayout;
}

export type LayoutAdvisorStep = 'idle' | 'mode-select' | 'processing' | 'results' | 'error' | 'done';
