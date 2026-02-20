import type { TableShape, FixtureType, WallStyle, LengthUnit } from '@/types/venue';
import type { LensType } from '@/lib/lens-database';

export type { LensType } from '@/lib/lens-database';

export type PhotoSlotId = 'corner-1' | 'corner-2' | 'corner-3' | 'corner-4' | 'detail-1' | 'detail-2';

export type CaptureSource = 'camera' | 'upload';

export interface CapturedPhoto {
  blob: Blob;
  preview: string;           // object URL
  source: CaptureSource;
  lensType: LensType | null; // null if uploaded without EXIF lens data
  focalLength35mm: number | null;
  resolution: { width: number; height: number };
}

export interface PhotoSlot {
  id: PhotoSlotId;
  file: File | null;
  preview: string | null;
  exif: ExifData | null;
  capturedPhoto: CapturedPhoto | null;
}

export interface ExifData {
  focalLength: number | null;
  focalLength35mm: number | null;
  cameraModel: string | null;
  imageWidth: number | null;
  imageHeight: number | null;
  lensType: LensType | null;
}

export type ReferenceObjectType = 'standard-door' | 'folding-chair' | 'round-table-8' | 'window-36in' | 'single-bed';

export interface ReferenceObject {
  type: ReferenceObjectType;
  label: string;
  knownSize: number; // feet
}

export const REFERENCE_OBJECTS: ReferenceObject[] = [
  { type: 'standard-door', label: 'Standard door (3ft)', knownSize: 3 },
  { type: 'folding-chair', label: 'Folding chair (1.5ft)', knownSize: 1.5 },
  { type: 'round-table-8', label: '8-person round table (5ft)', knownSize: 5 },
  { type: 'window-36in', label: 'Standard window (3ft)', knownSize: 3 },
  { type: 'single-bed', label: 'Single bed (6.5ft)', knownSize: 6.5 },
];

export interface MeasurementInput {
  roomWidth: number | null;
  roomLength: number | null;
  unit: LengthUnit;
  referenceObject: ReferenceObjectType | null;
}

export type CaptureMode = 'reference' | 'no-reference';

export interface ReferenceDimension {
  type: ReferenceObjectType | 'custom';
  value: number;
  unit: LengthUnit;
}

export interface DetectedObject {
  type: 'table' | 'fixture';
  subType: TableShape | FixtureType;
  label: string;
  position: { x: number; y: number }; // 0-1 fraction of room
  width: number;  // real units (ft or m)
  height: number;
  rotation: number;
  confidence: number; // 0-1
}

export interface DetectedWall {
  start: { x: number; y: number }; // 0-1 fraction
  end: { x: number; y: number };
  style: WallStyle;
  confidence: number;
}

export interface DetectedRoom {
  width: number;  // real units
  height: number;
  unit: LengthUnit;
  objects: DetectedObject[];
  walls: DetectedWall[];
  accuracyEstimate?: string;
}

export type PhotoToRoomStep =
  | 'idle'
  | 'mode-select'
  | 'reference-capture'
  | 'reference-measure'
  | 'room-capture'
  | 'upload'
  | 'measurements'
  | 'processing'
  | 'preview'
  | 'error'
  | 'done';
