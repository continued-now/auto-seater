import type { VenueConfig, VenueTemplate } from '@/types/venue';
import { createId } from './id';

export const defaultVenueConfig: VenueConfig = {
  roomWidth: 60,
  roomHeight: 40,
  unit: 'ft',
  gridSize: 5,
  showGrid: true,
  snapToGrid: true,
  backgroundImage: null,
  tables: [],
  fixtures: [],
  walls: [],
  blueprintMode: false,
};

export function createTemplate(
  name: string,
  description: string,
  config: VenueConfig
): VenueTemplate {
  return {
    id: createId(),
    name,
    description,
    config: structuredClone(config),
    createdAt: Date.now(),
  };
}

// Pixel constants: 15px per ft
const PX = 15;

export interface PrebuiltTemplate {
  name: string;
  description: string;
  guestCapacity: string;
  config: VenueConfig;
}

export const PREBUILT_TEMPLATES: PrebuiltTemplate[] = [
  // 1. Wedding Banquet Hall — 80×60 ft
  {
    name: 'Wedding Banquet Hall',
    description: 'Classic wedding layout with head table, sweetheart table, round guest tables, dance floor, and stage.',
    guestCapacity: '130–160',
    config: {
      roomWidth: 80,
      roomHeight: 60,
      unit: 'ft',
      gridSize: 5,
      showGrid: true,
      snapToGrid: true,
      backgroundImage: null,
      blueprintMode: false,
      walls: [],
      tables: [
        // Head table at top center
        { id: 't1', label: 'Head Table', shape: 'head', position: { x: 40 * PX, y: 5 * PX }, rotation: 0, capacity: 10, width: 240, height: 40, assignedGuestIds: [] },
        // Sweetheart table
        { id: 't2', label: 'Sweetheart', shape: 'sweetheart', position: { x: 40 * PX, y: 12 * PX }, rotation: 0, capacity: 2, width: 80, height: 40, assignedGuestIds: [] },
        // 16 round tables in 4×4 grid
        ...Array.from({ length: 16 }, (_, i) => ({
          id: `t${i + 3}`,
          label: `Table ${i + 1}`,
          shape: 'round' as const,
          position: { x: (12 + (i % 4) * 18) * PX, y: (22 + Math.floor(i / 4) * 10) * PX },
          rotation: 0,
          capacity: i < 8 ? 10 : 8,
          width: 80,
          height: 80,
          assignedGuestIds: [],
        })),
      ],
      fixtures: [
        { id: 'f1', type: 'dance-floor', label: 'Dance Floor', position: { x: 40 * PX, y: 35 * PX }, rotation: 0, width: 180, height: 180 },
        { id: 'f2', type: 'stage', label: 'Stage', position: { x: 40 * PX, y: 2 * PX }, rotation: 0, width: 200, height: 60 },
        { id: 'f3', type: 'dj-booth', label: 'DJ Booth', position: { x: 72 * PX, y: 35 * PX }, rotation: 0, width: 60, height: 60 },
        { id: 'f4', type: 'bar', label: 'Bar', position: { x: 72 * PX, y: 55 * PX }, rotation: 0, width: 120, height: 40 },
        { id: 'f5', type: 'entrance', label: 'Entrance', position: { x: 5 * PX, y: 58 * PX }, rotation: 0, width: 60, height: 20 },
        { id: 'f6', type: 'exit', label: 'Exit', position: { x: 75 * PX, y: 58 * PX }, rotation: 0, width: 60, height: 20 },
      ],
    },
  },

  // 2. Corporate Gathering — 70×50 ft
  {
    name: 'Corporate Gathering',
    description: 'Corporate event with round tables, VIP rectangular tables, stage, podium, and bar.',
    guestCapacity: '100–120',
    config: {
      roomWidth: 70,
      roomHeight: 50,
      unit: 'ft',
      gridSize: 5,
      showGrid: true,
      snapToGrid: true,
      backgroundImage: null,
      blueprintMode: false,
      walls: [],
      tables: [
        // 10 round tables
        ...Array.from({ length: 10 }, (_, i) => ({
          id: `t${i + 1}`,
          label: `Table ${i + 1}`,
          shape: 'round' as const,
          position: { x: (12 + (i % 5) * 11) * PX, y: (20 + Math.floor(i / 5) * 14) * PX },
          rotation: 0,
          capacity: 8,
          width: 80,
          height: 80,
          assignedGuestIds: [],
        })),
        // 4 rectangular VIP tables
        ...Array.from({ length: 4 }, (_, i) => ({
          id: `t${i + 11}`,
          label: `VIP ${i + 1}`,
          shape: 'rectangular' as const,
          position: { x: (12 + i * 15) * PX, y: 10 * PX },
          rotation: 0,
          capacity: 8,
          width: 140,
          height: 60,
          assignedGuestIds: [],
        })),
      ],
      fixtures: [
        { id: 'f1', type: 'stage', label: 'Stage', position: { x: 35 * PX, y: 3 * PX }, rotation: 0, width: 200, height: 60 },
        { id: 'f2', type: 'bar', label: 'Bar', position: { x: 60 * PX, y: 45 * PX }, rotation: 0, width: 120, height: 40 },
        { id: 'f3', type: 'buffet', label: 'Buffet', position: { x: 10 * PX, y: 45 * PX }, rotation: 0, width: 160, height: 40 },
        { id: 'f4', type: 'coat-check', label: 'Coat Check', position: { x: 5 * PX, y: 3 * PX }, rotation: 0, width: 80, height: 40 },
        { id: 'f5', type: 'entrance', label: 'Entrance', position: { x: 5 * PX, y: 48 * PX }, rotation: 0, width: 60, height: 20 },
      ],
    },
  },

  // 3. Cocktail Reception — 60×40 ft
  {
    name: 'Cocktail Reception',
    description: 'Standing-style cocktail event with cocktail tables, multiple bars, dance floor, and buffet stations.',
    guestCapacity: '80–120',
    config: {
      roomWidth: 60,
      roomHeight: 40,
      unit: 'ft',
      gridSize: 5,
      showGrid: true,
      snapToGrid: true,
      backgroundImage: null,
      blueprintMode: false,
      walls: [],
      tables: [
        // 12 cocktail tables scattered
        ...Array.from({ length: 12 }, (_, i) => ({
          id: `t${i + 1}`,
          label: `Cocktail ${i + 1}`,
          shape: 'cocktail' as const,
          position: {
            x: (8 + (i % 4) * 14) * PX,
            y: (8 + Math.floor(i / 4) * 12) * PX,
          },
          rotation: 0,
          capacity: 0,
          width: 40,
          height: 40,
          assignedGuestIds: [],
        })),
      ],
      fixtures: [
        { id: 'f1', type: 'bar', label: 'Bar 1', position: { x: 5 * PX, y: 20 * PX }, rotation: 90, width: 120, height: 40 },
        { id: 'f2', type: 'bar', label: 'Bar 2', position: { x: 55 * PX, y: 20 * PX }, rotation: 90, width: 120, height: 40 },
        { id: 'f3', type: 'dance-floor', label: 'Dance Floor', position: { x: 30 * PX, y: 30 * PX }, rotation: 0, width: 150, height: 150 },
        { id: 'f4', type: 'dj-booth', label: 'DJ Booth', position: { x: 30 * PX, y: 38 * PX }, rotation: 0, width: 60, height: 60 },
        { id: 'f5', type: 'buffet', label: 'Buffet 1', position: { x: 15 * PX, y: 3 * PX }, rotation: 0, width: 160, height: 40 },
        { id: 'f6', type: 'buffet', label: 'Buffet 2', position: { x: 45 * PX, y: 3 * PX }, rotation: 0, width: 160, height: 40 },
      ],
    },
  },

  // 4. Classroom / Conference — 50×40 ft
  {
    name: 'Classroom / Conference',
    description: 'Classroom-style rows of rectangular tables facing a front stage.',
    guestCapacity: '48–64',
    config: {
      roomWidth: 50,
      roomHeight: 40,
      unit: 'ft',
      gridSize: 5,
      showGrid: true,
      snapToGrid: true,
      backgroundImage: null,
      blueprintMode: false,
      walls: [],
      tables: [
        // 8 rectangular tables in 4 rows of 2
        ...Array.from({ length: 8 }, (_, i) => ({
          id: `t${i + 1}`,
          label: `Row ${Math.floor(i / 2) + 1}-${(i % 2) + 1}`,
          shape: 'rectangular' as const,
          position: { x: (15 + (i % 2) * 20) * PX, y: (14 + Math.floor(i / 2) * 7) * PX },
          rotation: 0,
          capacity: 8,
          width: 140,
          height: 60,
          assignedGuestIds: [],
        })),
      ],
      fixtures: [
        { id: 'f1', type: 'stage', label: 'Stage', position: { x: 25 * PX, y: 4 * PX }, rotation: 0, width: 300, height: 80 },
        { id: 'f2', type: 'entrance', label: 'Entrance', position: { x: 5 * PX, y: 38 * PX }, rotation: 0, width: 60, height: 20 },
        { id: 'f3', type: 'exit', label: 'Exit', position: { x: 45 * PX, y: 38 * PX }, rotation: 0, width: 60, height: 20 },
      ],
    },
  },

  // 5. U-Shape Banquet — 50×40 ft
  {
    name: 'U-Shape Banquet',
    description: 'U-shaped table arrangement with head table, two long side tables, and central dance floor.',
    guestCapacity: '40–60',
    config: {
      roomWidth: 50,
      roomHeight: 40,
      unit: 'ft',
      gridSize: 5,
      showGrid: true,
      snapToGrid: true,
      backgroundImage: null,
      blueprintMode: false,
      walls: [],
      tables: [
        // Head table at top
        { id: 't1', label: 'Head Table', shape: 'head', position: { x: 25 * PX, y: 5 * PX }, rotation: 0, capacity: 12, width: 300, height: 40, assignedGuestIds: [] },
        // Left side table
        { id: 't2', label: 'Left Side', shape: 'rectangular', position: { x: 8 * PX, y: 20 * PX }, rotation: 90, capacity: 12, width: 300, height: 60, assignedGuestIds: [] },
        // Right side table
        { id: 't3', label: 'Right Side', shape: 'rectangular', position: { x: 42 * PX, y: 20 * PX }, rotation: 90, capacity: 12, width: 300, height: 60, assignedGuestIds: [] },
      ],
      fixtures: [
        { id: 'f1', type: 'dance-floor', label: 'Dance Floor', position: { x: 25 * PX, y: 22 * PX }, rotation: 0, width: 180, height: 180 },
        { id: 'f2', type: 'bar', label: 'Bar', position: { x: 25 * PX, y: 37 * PX }, rotation: 0, width: 120, height: 40 },
      ],
    },
  },

  // 6. Outdoor Garden — 80×60 ft
  {
    name: 'Outdoor Garden Party',
    description: 'Outdoor garden event with organically scattered round tables, multiple bars, and buffet stations.',
    guestCapacity: '100–140',
    config: {
      roomWidth: 80,
      roomHeight: 60,
      unit: 'ft',
      gridSize: 5,
      showGrid: true,
      snapToGrid: true,
      backgroundImage: null,
      blueprintMode: false,
      walls: [],
      tables: [
        // 12 round tables scattered organically
        { id: 't1', label: 'Table 1', shape: 'round', position: { x: 12 * PX, y: 10 * PX }, rotation: 0, capacity: 10, width: 80, height: 80, assignedGuestIds: [] },
        { id: 't2', label: 'Table 2', shape: 'round', position: { x: 28 * PX, y: 8 * PX }, rotation: 0, capacity: 10, width: 80, height: 80, assignedGuestIds: [] },
        { id: 't3', label: 'Table 3', shape: 'round', position: { x: 45 * PX, y: 11 * PX }, rotation: 0, capacity: 10, width: 80, height: 80, assignedGuestIds: [] },
        { id: 't4', label: 'Table 4', shape: 'round', position: { x: 65 * PX, y: 9 * PX }, rotation: 0, capacity: 10, width: 80, height: 80, assignedGuestIds: [] },
        { id: 't5', label: 'Table 5', shape: 'round', position: { x: 10 * PX, y: 25 * PX }, rotation: 0, capacity: 8, width: 80, height: 80, assignedGuestIds: [] },
        { id: 't6', label: 'Table 6', shape: 'round', position: { x: 30 * PX, y: 22 * PX }, rotation: 0, capacity: 8, width: 80, height: 80, assignedGuestIds: [] },
        { id: 't7', label: 'Table 7', shape: 'round', position: { x: 50 * PX, y: 26 * PX }, rotation: 0, capacity: 8, width: 80, height: 80, assignedGuestIds: [] },
        { id: 't8', label: 'Table 8', shape: 'round', position: { x: 68 * PX, y: 23 * PX }, rotation: 0, capacity: 8, width: 80, height: 80, assignedGuestIds: [] },
        { id: 't9', label: 'Table 9', shape: 'round', position: { x: 15 * PX, y: 42 * PX }, rotation: 0, capacity: 10, width: 80, height: 80, assignedGuestIds: [] },
        { id: 't10', label: 'Table 10', shape: 'round', position: { x: 35 * PX, y: 45 * PX }, rotation: 0, capacity: 10, width: 80, height: 80, assignedGuestIds: [] },
        { id: 't11', label: 'Table 11', shape: 'round', position: { x: 55 * PX, y: 43 * PX }, rotation: 0, capacity: 10, width: 80, height: 80, assignedGuestIds: [] },
        { id: 't12', label: 'Table 12', shape: 'round', position: { x: 70 * PX, y: 46 * PX }, rotation: 0, capacity: 10, width: 80, height: 80, assignedGuestIds: [] },
      ],
      fixtures: [
        { id: 'f1', type: 'buffet', label: 'Buffet 1', position: { x: 20 * PX, y: 55 * PX }, rotation: 0, width: 160, height: 40 },
        { id: 'f2', type: 'buffet', label: 'Buffet 2', position: { x: 60 * PX, y: 55 * PX }, rotation: 0, width: 160, height: 40 },
        { id: 'f3', type: 'dance-floor', label: 'Dance Floor', position: { x: 40 * PX, y: 35 * PX }, rotation: 0, width: 180, height: 180 },
        { id: 'f4', type: 'bar', label: 'Bar 1', position: { x: 5 * PX, y: 35 * PX }, rotation: 90, width: 120, height: 40 },
        { id: 'f5', type: 'bar', label: 'Bar 2', position: { x: 75 * PX, y: 35 * PX }, rotation: 90, width: 120, height: 40 },
        { id: 'f6', type: 'photo-booth', label: 'Photo Booth', position: { x: 72 * PX, y: 55 * PX }, rotation: 0, width: 80, height: 80 },
      ],
    },
  },
];
