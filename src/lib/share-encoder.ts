import type { VenueConfig, Table } from '@/types/venue';
import type { Guest } from '@/types/guest';

/**
 * Compact shareable floor plan data.
 * Encoded as JSON → base64 for URL hash.
 */
interface ShareableTable {
  l: string;       // label
  s: string;       // shape
  x: number;       // position x
  y: number;       // position y
  w: number;       // width
  h: number;       // height
  r: number;       // rotation
  c: number;       // capacity
  o: number;       // occupied count
  g?: string[];    // guest names (only when showNames is true)
}

interface ShareableData {
  v: number;       // version
  rw: number;      // room width
  rl: number;      // room length
  u: string;       // unit
  t: ShareableTable[];  // tables
  n?: boolean;     // names included
}

export function encodeFloorPlanData(
  venue: VenueConfig,
  guests: Guest[],
  showNames: boolean
): string {
  const guestMap = new Map<string, Guest>();
  for (const g of guests) guestMap.set(g.id, g);

  const tables: ShareableTable[] = venue.tables.map((table) => {
    const occupied = table.assignedGuestIds.length;
    const entry: ShareableTable = {
      l: table.label,
      s: table.shape,
      x: Math.round(table.position.x),
      y: Math.round(table.position.y),
      w: Math.round(table.width),
      h: Math.round(table.height),
      r: Math.round(table.rotation),
      c: table.capacity,
      o: occupied,
    };

    if (showNames) {
      entry.g = table.assignedGuestIds
        .map((id) => guestMap.get(id)?.name ?? '')
        .filter(Boolean);
    }

    return entry;
  });

  const data: ShareableData = {
    v: 1,
    rw: venue.roomWidth,
    rl: venue.roomLength,
    u: venue.unit,
    t: tables,
  };

  if (showNames) data.n = true;

  const json = JSON.stringify(data);
  return btoa(encodeURIComponent(json));
}

export function decodeFloorPlanData(encoded: string): ShareableData | null {
  try {
    const json = decodeURIComponent(atob(encoded));
    return JSON.parse(json) as ShareableData;
  } catch {
    return null;
  }
}

export function buildShareUrl(encoded: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/view#${encoded}`;
}
