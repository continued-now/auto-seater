import Fuse from 'fuse.js';
import type { Guest } from '@/types/guest';

export interface DuplicateMatch {
  existing: Guest;
  incoming: Guest;
  score: number;
}

export function detectDuplicates(
  existingGuests: Guest[],
  newGuests: Guest[],
  threshold = 0.3
): DuplicateMatch[] {
  if (existingGuests.length === 0) return [];

  const fuse = new Fuse(existingGuests, {
    keys: ['name', 'email'],
    threshold,
    includeScore: true,
  });

  const duplicates: DuplicateMatch[] = [];

  for (const incoming of newGuests) {
    const results = fuse.search(incoming.name || incoming.email);
    if (results.length > 0 && results[0].score !== undefined) {
      duplicates.push({
        existing: results[0].item,
        incoming,
        score: 1 - results[0].score,
      });
    }
  }

  return duplicates;
}
