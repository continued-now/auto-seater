export type RSVPStatus = 'confirmed' | 'declined' | 'pending' | 'tentative';

export type DietaryTag =
  | 'vegetarian'
  | 'vegan'
  | 'gluten-free'
  | 'nut-allergy'
  | 'dairy-free'
  | 'halal'
  | 'kosher'
  | 'shellfish-allergy'
  | 'other';

export type AccessibilityTag =
  | 'wheelchair'
  | 'hearing-aid'
  | 'visual-aid'
  | 'mobility-limited'
  | 'other';

export interface Guest {
  id: string;
  name: string;
  email: string;
  phone: string;
  rsvpStatus: RSVPStatus;
  dietaryTags: DietaryTag[];
  accessibilityTags: AccessibilityTag[];
  householdId: string | null;
  socialCircleIds: string[];
  tableId: string | null;
  seatIndex: number | null;
  notes: string;
  checkedInAt: number | null;
  checkedInBy: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface Household {
  id: string;
  name: string;
  guestIds: string[];
}

export interface SocialCircle {
  id: string;
  name: string;
  color: string;
  guestIds: string[];
}

export type GuestSortField = 'name' | 'rsvpStatus' | 'createdAt' | 'updatedAt';
export type SortDirection = 'asc' | 'desc';
