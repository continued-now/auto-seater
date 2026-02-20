export type TableShape = 'round' | 'rectangular' | 'square' | 'head' | 'sweetheart' | 'cocktail';

export type FixtureType =
  | 'stage'
  | 'dance-floor'
  | 'bar'
  | 'buffet'
  | 'dj-booth'
  | 'photo-booth'
  | 'entrance'
  | 'exit'
  | 'restroom'
  | 'pillar'
  | 'door'
  | 'window'
  | 'av-sound-room'
  | 'kitchen'
  | 'coat-check';

export type WallStyle = 'solid' | 'partition';

export type LengthUnit = 'ft' | 'm';

export interface Position {
  x: number;
  y: number;
}

export interface Table {
  id: string;
  label: string;
  shape: TableShape;
  position: Position;
  rotation: number;
  capacity: number;
  width: number;
  height: number;
  assignedGuestIds: string[];
}

export interface Fixture {
  id: string;
  type: FixtureType;
  label: string;
  position: Position;
  rotation: number;
  width: number;
  height: number;
}

export interface Wall {
  id: string;
  label: string;
  start: Position;
  end: Position;
  thickness: number;
  style: WallStyle;
  rotation: number;
}

export interface VenueConfig {
  roomWidth: number;
  roomHeight: number;
  unit: LengthUnit;
  gridSize: number;
  showGrid: boolean;
  snapToGrid: boolean;
  backgroundImage: string | null;
  tables: Table[];
  fixtures: Fixture[];
  walls: Wall[];
  blueprintMode: boolean;
}

export interface VenueTemplate {
  id: string;
  name: string;
  description: string;
  config: VenueConfig;
  createdAt: number;
}
