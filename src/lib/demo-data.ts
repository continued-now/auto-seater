import { createId } from './id';
import type { Guest, Household, SocialCircle } from '@/types/guest';
import type { VenueConfig } from '@/types/venue';
import type { Constraint } from '@/types/constraint';

const PX = 15; // 15px per ft

interface DemoData {
  guests: Guest[];
  households: Household[];
  socialCircles: SocialCircle[];
  venue: VenueConfig;
  constraints: Constraint[];
}

export function createDemoGuests(): Guest[] {
  const now = Date.now();
  const base = {
    householdId: null,
    socialCircleIds: [] as string[],
    tableId: null,
    seatIndex: null,
    checkedInAt: null,
    checkedInBy: null,
    createdAt: now,
    updatedAt: now,
  };

  const guests: Omit<Guest, 'id' | 'createdAt' | 'updatedAt' | 'householdId' | 'socialCircleIds' | 'tableId' | 'seatIndex' | 'checkedInAt' | 'checkedInBy'>[] = [
    // Executive Team (6)
    { name: 'Sarah Chen', email: 'sarah.chen@acme.com', phone: '', rsvpStatus: 'confirmed', dietaryTags: ['vegetarian'], accessibilityTags: [], notes: 'CEO' },
    { name: 'David Rodriguez', email: 'david.r@acme.com', phone: '', rsvpStatus: 'confirmed', dietaryTags: [], accessibilityTags: [], notes: 'COO' },
    { name: 'Michelle Park', email: 'michelle.p@acme.com', phone: '', rsvpStatus: 'confirmed', dietaryTags: ['gluten-free'], accessibilityTags: [], notes: 'CFO' },
    { name: 'James Liu', email: 'james.l@acme.com', phone: '', rsvpStatus: 'confirmed', dietaryTags: [], accessibilityTags: [], notes: 'CTO' },
    { name: 'Rachel Adams', email: 'rachel.a@acme.com', phone: '', rsvpStatus: 'confirmed', dietaryTags: [], accessibilityTags: [], notes: 'VP Engineering' },
    { name: 'Michael Torres', email: 'michael.t@acme.com', phone: '', rsvpStatus: 'confirmed', dietaryTags: ['halal'], accessibilityTags: [], notes: 'VP Sales' },

    // Johnson household (3)
    { name: 'Robert Johnson', email: 'r.johnson@email.com', phone: '', rsvpStatus: 'confirmed', dietaryTags: [], accessibilityTags: [], notes: '' },
    { name: 'Linda Johnson', email: 'l.johnson@email.com', phone: '', rsvpStatus: 'confirmed', dietaryTags: ['dairy-free'], accessibilityTags: [], notes: '' },
    { name: 'Emma Johnson', email: 'e.johnson@email.com', phone: '', rsvpStatus: 'confirmed', dietaryTags: [], accessibilityTags: [], notes: '' },

    // Patel household (2)
    { name: 'Raj Patel', email: 'raj.p@email.com', phone: '', rsvpStatus: 'confirmed', dietaryTags: ['vegetarian'], accessibilityTags: [], notes: '' },
    { name: 'Priya Patel', email: 'priya.p@email.com', phone: '', rsvpStatus: 'confirmed', dietaryTags: ['vegetarian'], accessibilityTags: [], notes: '' },

    // Chen household (3)
    { name: 'Wei Chen', email: 'wei.c@email.com', phone: '', rsvpStatus: 'tentative', dietaryTags: [], accessibilityTags: [], notes: '' },
    { name: 'Mei Chen', email: 'mei.c@email.com', phone: '', rsvpStatus: 'tentative', dietaryTags: ['shellfish-allergy'], accessibilityTags: [], notes: '' },
    { name: 'Kevin Chen', email: 'kevin.c@email.com', phone: '', rsvpStatus: 'tentative', dietaryTags: [], accessibilityTags: [], notes: '' },

    // Other guests
    { name: 'Jessica Williams', email: 'j.williams@email.com', phone: '', rsvpStatus: 'confirmed', dietaryTags: [], accessibilityTags: ['wheelchair'], notes: 'Needs accessible seating' },
    { name: 'Tom Baker', email: 't.baker@email.com', phone: '', rsvpStatus: 'confirmed', dietaryTags: ['nut-allergy'], accessibilityTags: [], notes: '' },
    { name: 'Olivia Martin', email: 'o.martin@email.com', phone: '', rsvpStatus: 'confirmed', dietaryTags: [], accessibilityTags: [], notes: '' },
    { name: 'Ethan Brown', email: 'e.brown@email.com', phone: '', rsvpStatus: 'pending', dietaryTags: [], accessibilityTags: [], notes: '' },
    { name: 'Sophia Lee', email: 's.lee@email.com', phone: '', rsvpStatus: 'confirmed', dietaryTags: ['vegan'], accessibilityTags: [], notes: '' },
    { name: 'Nathan Kim', email: 'n.kim@email.com', phone: '', rsvpStatus: 'confirmed', dietaryTags: [], accessibilityTags: [], notes: '' },
    { name: 'Amanda Foster', email: 'a.foster@email.com', phone: '', rsvpStatus: 'tentative', dietaryTags: [], accessibilityTags: [], notes: '' },
    { name: 'Daniel Nguyen', email: 'd.nguyen@email.com', phone: '', rsvpStatus: 'confirmed', dietaryTags: [], accessibilityTags: ['mobility-limited'], notes: '' },
    { name: 'Lauren White', email: 'l.white@email.com', phone: '', rsvpStatus: 'confirmed', dietaryTags: [], accessibilityTags: [], notes: '' },
    { name: 'Chris Taylor', email: 'c.taylor@email.com', phone: '', rsvpStatus: 'confirmed', dietaryTags: ['kosher'], accessibilityTags: [], notes: '' },
    { name: 'Katie Moore', email: 'k.moore@email.com', phone: '', rsvpStatus: 'declined', dietaryTags: [], accessibilityTags: [], notes: '' },
    { name: 'Brian Hall', email: 'b.hall@email.com', phone: '', rsvpStatus: 'confirmed', dietaryTags: [], accessibilityTags: [], notes: '' },
    { name: 'Emily Davis', email: 'e.davis@email.com', phone: '', rsvpStatus: 'pending', dietaryTags: [], accessibilityTags: [], notes: '' },
    { name: 'Ryan Mitchell', email: 'r.mitchell@email.com', phone: '', rsvpStatus: 'confirmed', dietaryTags: [], accessibilityTags: [], notes: '' },
    { name: 'Ashley Garcia', email: 'a.garcia@email.com', phone: '', rsvpStatus: 'confirmed', dietaryTags: [], accessibilityTags: [], notes: '' },
    { name: 'Marcus Young', email: 'm.young@email.com', phone: '', rsvpStatus: 'confirmed', dietaryTags: [], accessibilityTags: [], notes: '' },
    { name: 'Jennifer Clark', email: 'j.clark@email.com', phone: '', rsvpStatus: 'declined', dietaryTags: [], accessibilityTags: [], notes: '' },
    { name: 'Alex Rivera', email: 'a.rivera@email.com', phone: '', rsvpStatus: 'confirmed', dietaryTags: [], accessibilityTags: [], notes: '' },
  ];

  return guests.map((g) => ({
    ...g,
    ...base,
    id: createId(),
    socialCircleIds: [],
  }));
}

export function createDemoHouseholds(guests: Guest[]): Household[] {
  const johnson = guests.filter((g) => g.name.includes('Johnson'));
  const patel = guests.filter((g) => g.name.includes('Patel'));
  const chen = guests.filter((g) => g.name.includes('Chen') && !g.notes.includes('CEO'));

  const households: Household[] = [
    { id: createId(), name: 'The Johnsons', guestIds: johnson.map((g) => g.id) },
    { id: createId(), name: 'The Patels', guestIds: patel.map((g) => g.id) },
    { id: createId(), name: 'The Chens', guestIds: chen.map((g) => g.id) },
  ];

  // Wire up guest.householdId
  for (const hh of households) {
    for (const gid of hh.guestIds) {
      const guest = guests.find((g) => g.id === gid);
      if (guest) guest.householdId = hh.id;
    }
  }

  return households;
}

export function createDemoSocialCircles(guests: Guest[]): SocialCircle[] {
  const execNames = ['Sarah Chen', 'David Rodriguez', 'Michelle Park', 'James Liu', 'Rachel Adams', 'Michael Torres'];
  const execGuests = guests.filter((g) => execNames.includes(g.name));
  const circleId = createId();

  const circle: SocialCircle = {
    id: circleId,
    name: 'Executive Team',
    color: '#2563eb',
    guestIds: execGuests.map((g) => g.id),
  };

  // Wire up guest.socialCircleIds
  for (const guest of execGuests) {
    guest.socialCircleIds = [circleId];
  }

  return [circle];
}

export function createDemoVenue(): VenueConfig {
  return {
    roomWidth: 70,
    roomLength: 50,
    unit: 'ft',
    gridSize: 5,
    showGrid: true,
    snapToGrid: true,
    snapToGuides: true,
    showRoomCenter: false,
    backgroundImage: null,
    blueprintMode: false,
    walls: [],
    guides: [],
    rooms: [],
    tables: [
      // 8 round tables (capacity 8 each)
      ...Array.from({ length: 8 }, (_, i) => ({
        id: createId(),
        label: `Table ${i + 1}`,
        shape: 'round' as const,
        position: {
          x: (14 + (i % 4) * 14) * PX,
          y: (20 + Math.floor(i / 4) * 14) * PX,
        },
        rotation: 0,
        capacity: 8,
        width: 80,
        height: 80,
        assignedGuestIds: [],
      })),
      // 2 VIP rectangular tables (capacity 6 each)
      {
        id: createId(),
        label: 'VIP 1',
        shape: 'rectangular' as const,
        position: { x: 20 * PX, y: 8 * PX },
        rotation: 0,
        capacity: 6,
        width: 140,
        height: 60,
        assignedGuestIds: [],
      },
      {
        id: createId(),
        label: 'VIP 2',
        shape: 'rectangular' as const,
        position: { x: 50 * PX, y: 8 * PX },
        rotation: 0,
        capacity: 6,
        width: 140,
        height: 60,
        assignedGuestIds: [],
      },
    ],
    fixtures: [
      { id: createId(), type: 'stage', label: 'Stage', position: { x: 35 * PX, y: 2 * PX }, rotation: 0, width: 200, height: 50 },
      { id: createId(), type: 'bar', label: 'Bar', position: { x: 62 * PX, y: 44 * PX }, rotation: 0, width: 100, height: 40 },
      { id: createId(), type: 'buffet', label: 'Buffet', position: { x: 10 * PX, y: 44 * PX }, rotation: 0, width: 140, height: 40 },
      { id: createId(), type: 'entrance', label: 'Entrance', position: { x: 5 * PX, y: 48 * PX }, rotation: 0, width: 60, height: 20 },
      { id: createId(), type: 'coat-check', label: 'Coat Check', position: { x: 62 * PX, y: 2 * PX }, rotation: 0, width: 80, height: 40 },
    ],
  };
}

export function createDemoConstraints(guests: Guest[]): Constraint[] {
  const ceo = guests.find((g) => g.notes === 'CEO');
  const coo = guests.find((g) => g.notes === 'COO');
  const tom = guests.find((g) => g.name === 'Tom Baker');
  const brian = guests.find((g) => g.name === 'Brian Hall');

  const constraints: Constraint[] = [];

  if (ceo && coo) {
    constraints.push({
      id: createId(),
      type: 'must-sit-together',
      guestIds: [ceo.id, coo.id],
      reason: 'CEO and COO should be at the same table',
    });
  }

  if (tom && brian) {
    constraints.push({
      id: createId(),
      type: 'must-not-sit-together',
      guestIds: [tom.id, brian.id],
      reason: 'Prefer to keep separated',
    });
  }

  return constraints;
}

export function createDemoData(): DemoData {
  const guests = createDemoGuests();
  const households = createDemoHouseholds(guests);
  const socialCircles = createDemoSocialCircles(guests);
  const venue = createDemoVenue();
  const constraints = createDemoConstraints(guests);

  return { guests, households, socialCircles, venue, constraints };
}
