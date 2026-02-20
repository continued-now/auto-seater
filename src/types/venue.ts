export type TableShape = 'round' | 'rectangular' | 'square' | 'head' | 'sweetheart' | 'cocktail';

export type SeatingSide = 'both' | 'top-only' | 'bottom-only';

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

export type DoorStyle = 'swing-in' | 'swing-out' | 'sliding' | 'double';

export type LengthUnit = 'ft' | 'm';

export interface UserGuide {
  id: string;
  axis: 'horizontal' | 'vertical';
  position: number; // pixel offset from origin
}

export const PRIMARY_ROOM_ID = '__primary__';

export interface Position {
  x: number;
  y: number;
}

export interface Room {
  id: string;
  label: string;
  position: Position;    // top-left corner in pixels
  width: number;         // in venue units (ft/m)
  height: number;        // in venue units
  color?: string;        // subtle tint to distinguish rooms
  parentRoomId?: string; // which room this extends from
  attachEdge?: 'top' | 'right' | 'bottom' | 'left';
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
  roomId?: string;
  seatingSide?: SeatingSide;  // default: 'both' — rectangular/square only
  endSeats?: boolean;          // default: true — whether short ends have seats
}

export interface Fixture {
  id: string;
  type: FixtureType;
  label: string;
  position: Position;
  rotation: number;
  width: number;
  height: number;
  doorStyle?: DoorStyle;
  roomId?: string;
  isCheckIn?: boolean;
}

export interface Wall {
  id: string;
  label: string;
  start: Position;
  end: Position;
  thickness: number;
  style: WallStyle;
  rotation: number;
  roomId?: string;
}

export interface VenueConfig {
  roomWidth: number;
  roomLength: number;
  unit: LengthUnit;
  gridSize: number;
  showGrid: boolean;
  snapToGrid: boolean;
  snapToGuides: boolean;
  showRoomCenter: boolean;
  backgroundImage: string | null;
  tables: Table[];
  fixtures: Fixture[];
  walls: Wall[];
  guides: UserGuide[];
  blueprintMode: boolean;
  rooms: Room[];
}

export interface VenueTemplate {
  id: string;
  name: string;
  description: string;
  config: VenueConfig;
  createdAt: number;
}
