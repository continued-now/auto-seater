import type { Guest } from '@/types/guest';

export type CheckInFilter = 'expected' | 'arrived' | 'all';

export interface CheckInStats {
  total: number;
  arrived: number;
  pending: number;
  percentage: number;
}

export function getExpectedGuests(guests: Guest[]): Guest[] {
  return guests.filter((g) => g.rsvpStatus === 'confirmed' || g.rsvpStatus === 'tentative');
}

export function computeCheckInStats(guests: Guest[]): CheckInStats {
  const expected = getExpectedGuests(guests);
  const arrived = expected.filter((g) => g.checkedInAt !== null).length;
  return {
    total: expected.length,
    arrived,
    pending: expected.length - arrived,
    percentage: expected.length > 0 ? Math.round((arrived / expected.length) * 100) : 0,
  };
}

export function filterCheckInGuests(guests: Guest[], filter: CheckInFilter): Guest[] {
  const expected = getExpectedGuests(guests);
  switch (filter) {
    case 'expected':
      return expected.filter((g) => g.checkedInAt === null);
    case 'arrived':
      return expected.filter((g) => g.checkedInAt !== null);
    case 'all':
      return expected;
  }
}

export function formatArrivalTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}
