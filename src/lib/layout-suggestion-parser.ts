import type { AdvisorMode, LayoutAdvisorResponse, LayoutIssue, LayoutChange, IssueSeverity } from '@/types/layout-advisor';
import { createId } from '@/lib/id';

const VALID_SEVERITIES: IssueSeverity[] = ['critical', 'warning', 'info'];
const PX_PER_FT = 15;
const PX_PER_M = 30;

function unitToPx(value: number, unit: 'ft' | 'm'): number {
  return value * (unit === 'ft' ? PX_PER_FT : PX_PER_M);
}

function parseIssue(raw: Record<string, unknown>, unit: 'ft' | 'm'): LayoutIssue {
  const severity = VALID_SEVERITIES.includes(raw.severity as IssueSeverity)
    ? (raw.severity as IssueSeverity)
    : 'info';

  const zone = raw.zone as { x?: number; y?: number; width?: number; height?: number } | undefined;

  return {
    id: (raw.id as string) || createId(),
    severity,
    title: (raw.title as string) || 'Layout issue',
    description: (raw.description as string) || '',
    affectedObjectIds: Array.isArray(raw.affectedObjectIds) ? raw.affectedObjectIds as string[] : [],
    zone: {
      x: unitToPx(Number(zone?.x) || 0, unit),
      y: unitToPx(Number(zone?.y) || 0, unit),
      width: unitToPx(Number(zone?.width) || 5, unit),
      height: unitToPx(Number(zone?.height) || 5, unit),
    },
  };
}

function parseChange(raw: Record<string, unknown>, unit: 'ft' | 'm'): LayoutChange {
  const pos = raw.newPosition as { x?: number; y?: number } | undefined;

  return {
    objectId: (raw.objectId as string) || '',
    objectType: raw.objectType === 'fixture' ? 'fixture' : 'table',
    reason: (raw.reason as string) || '',
    newPosition: {
      x: unitToPx(Number(pos?.x) || 0, unit),
      y: unitToPx(Number(pos?.y) || 0, unit),
    },
    newRotation: raw.newRotation != null ? Number(raw.newRotation) : undefined,
  };
}

export function parseLayoutAdvisorResponse(raw: string, mode: AdvisorMode, unit: 'ft' | 'm' = 'ft'): LayoutAdvisorResponse {
  let parsed: Record<string, unknown>;
  try {
    const cleaned = raw.replace(/^```(?:json)?\s*\n?/m, '').replace(/\n?```\s*$/m, '').trim();
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('AI returned invalid JSON. Please try again.');
  }

  const result: LayoutAdvisorResponse = {};

  // Parse issues (Mode 2 and Mode 3)
  if (mode === 'bottleneck-analysis' || mode === 'hybrid-optimize') {
    const rawIssues = Array.isArray(parsed.issues) ? parsed.issues : [];
    if (rawIssues.length === 0 && mode === 'bottleneck-analysis') {
      result.issues = [];
    } else {
      result.issues = rawIssues.map((i: unknown) => parseIssue(i as Record<string, unknown>, unit));
    }
  }

  // Parse suggested layout (Mode 1 and Mode 3)
  if (mode === 'fresh-arrange' || mode === 'hybrid-optimize') {
    const rawLayout = parsed.suggestedLayout as Record<string, unknown> | undefined;
    if (rawLayout) {
      const rawChanges = Array.isArray(rawLayout.changes) ? rawLayout.changes : [];
      result.suggestedLayout = {
        changes: rawChanges.map((c: unknown) => parseChange(c as Record<string, unknown>, unit)),
        summary: (rawLayout.summary as string) || 'Layout optimized.',
      };
    } else if (mode === 'fresh-arrange') {
      // Some AIs return changes at the top level
      const rawChanges = Array.isArray(parsed.changes) ? parsed.changes : [];
      result.suggestedLayout = {
        changes: rawChanges.map((c: unknown) => parseChange(c as Record<string, unknown>, unit)),
        summary: (parsed.summary as string) || 'Layout optimized.',
      };
    }
  }

  return result;
}
