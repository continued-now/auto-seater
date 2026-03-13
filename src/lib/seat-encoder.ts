import type { VenueConfig } from '@/types/venue';

/**
 * Compact personalized seat data for "Find My Seat" links.
 * Encoded as JSON → encodeURIComponent → btoa for URL query param.
 */

export interface SeatTableData {
  l: string;    // label
  s: string;    // shape
  x: number;    // position x
  y: number;    // position y
  w: number;    // width
  h: number;    // height
  r: number;    // rotation
  hl: boolean;  // highlighted (true for guest's table)
}

export interface SeatData {
  v: number;                // version
  name: string;             // guest name
  table: string;            // table label
  tables: SeatTableData[];  // all tables for floor plan
  rw: number;               // room width
  rl: number;               // room length
  u: string;                // unit (ft/m)
}

export function encodeSeatData(data: SeatData): string {
  const json = JSON.stringify(data);
  return btoa(encodeURIComponent(json));
}

export function decodeSeatData(encoded: string): SeatData | null {
  try {
    const json = decodeURIComponent(atob(encoded));
    return JSON.parse(json) as SeatData;
  } catch {
    return null;
  }
}

/**
 * Builds a full "Find My Seat" URL for a specific guest.
 */
export function buildSeatUrl(
  guestName: string,
  tableLabel: string,
  venue: VenueConfig
): string {
  const tables: SeatTableData[] = venue.tables.map((t) => ({
    l: t.label,
    s: t.shape,
    x: Math.round(t.position.x),
    y: Math.round(t.position.y),
    w: Math.round(t.width),
    h: Math.round(t.height),
    r: Math.round(t.rotation),
    hl: t.label === tableLabel,
  }));

  const data: SeatData = {
    v: 1,
    name: guestName,
    table: tableLabel,
    tables,
    rw: venue.roomWidth,
    rl: venue.roomLength,
    u: venue.unit,
  };

  const encoded = encodeSeatData(data);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/seat?data=${encoded}`;
}
