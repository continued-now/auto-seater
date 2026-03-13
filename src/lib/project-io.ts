import type { Guest, Household, SocialCircle } from '@/types/guest';
import type { VenueConfig, VenueTemplate } from '@/types/venue';
import type { Constraint } from '@/types/constraint';

export interface ProjectSnapshot {
  guests: Guest[];
  households: Household[];
  socialCircles: SocialCircle[];
  venue: VenueConfig;
  constraints: Constraint[];
  templates: VenueTemplate[];
  exportedAt: string;
  version: number;
}

export function exportProject(snapshot: Omit<ProjectSnapshot, 'exportedAt' | 'version'>): void {
  const data: ProjectSnapshot = {
    ...snapshot,
    exportedAt: new Date().toISOString(),
    version: 1,
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const date = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `seating-plan-${date}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function importProject(file: File): Promise<ProjectSnapshot> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const data = JSON.parse(text) as Record<string, unknown>;

        // Basic validation
        const required = ['guests', 'households', 'socialCircles', 'venue', 'constraints'];
        for (const key of required) {
          if (!(key in data)) {
            reject(new Error(`Invalid project file: missing field "${key}"`));
            return;
          }
        }

        resolve(data as unknown as ProjectSnapshot);
      } catch {
        reject(new Error('Failed to parse project file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
