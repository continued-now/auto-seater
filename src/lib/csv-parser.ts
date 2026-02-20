import Papa from 'papaparse';
import type { Guest, RSVPStatus, DietaryTag } from '@/types/guest';
import { createId } from './id';

export interface CSVFieldMapping {
  name: string | null;
  email: string | null;
  phone: string | null;
  rsvpStatus: string | null;
  dietary: string | null;
  notes: string | null;
}

export interface CSVParseResult {
  headers: string[];
  rows: Record<string, string>[];
  rowCount: number;
}

export function parseCSV(file: File): Promise<CSVParseResult> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        resolve({
          headers: results.meta.fields ?? [],
          rows: results.data as Record<string, string>[],
          rowCount: results.data.length,
        });
      },
      error: (error) => {
        reject(new Error(`CSV parse error: ${error.message}`));
      },
    });
  });
}

export function parseCSVString(text: string): CSVParseResult {
  const results = Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
  });
  return {
    headers: results.meta.fields ?? [],
    rows: results.data as Record<string, string>[],
    rowCount: results.data.length,
  };
}

const RSVP_MAP: Record<string, RSVPStatus> = {
  confirmed: 'confirmed',
  yes: 'confirmed',
  accepted: 'confirmed',
  declined: 'declined',
  no: 'declined',
  pending: 'pending',
  unknown: 'pending',
  tentative: 'tentative',
  maybe: 'tentative',
};

const DIETARY_MAP: Record<string, DietaryTag> = {
  vegetarian: 'vegetarian',
  veg: 'vegetarian',
  vegan: 'vegan',
  'gluten-free': 'gluten-free',
  'gluten free': 'gluten-free',
  gf: 'gluten-free',
  'nut-allergy': 'nut-allergy',
  'nut allergy': 'nut-allergy',
  'dairy-free': 'dairy-free',
  'dairy free': 'dairy-free',
  halal: 'halal',
  kosher: 'kosher',
  'shellfish-allergy': 'shellfish-allergy',
  'shellfish allergy': 'shellfish-allergy',
};

export function mapRowToGuest(
  row: Record<string, string>,
  mapping: CSVFieldMapping
): Guest {
  const now = Date.now();
  const rawRsvp = mapping.rsvpStatus
    ? (row[mapping.rsvpStatus] ?? '').toLowerCase().trim()
    : '';
  const rawDietary = mapping.dietary
    ? (row[mapping.dietary] ?? '').toLowerCase().trim()
    : '';

  const dietaryTags: DietaryTag[] = rawDietary
    .split(/[,;|]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => DIETARY_MAP[s])
    .filter((t): t is DietaryTag => t !== undefined);

  return {
    id: createId(),
    name: mapping.name ? (row[mapping.name] ?? '').trim() : '',
    email: mapping.email ? (row[mapping.email] ?? '').trim() : '',
    phone: mapping.phone ? (row[mapping.phone] ?? '').trim() : '',
    rsvpStatus: RSVP_MAP[rawRsvp] ?? 'pending',
    dietaryTags,
    accessibilityTags: [],
    householdId: null,
    socialCircleIds: [],
    tableId: null,
    seatIndex: null,
    notes: mapping.notes ? (row[mapping.notes] ?? '').trim() : '',
    createdAt: now,
    updatedAt: now,
  };
}
