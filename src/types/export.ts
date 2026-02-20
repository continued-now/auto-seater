export type PaperSize = 'letter' | 'a4';
export type Orientation = 'portrait' | 'landscape';

export interface FloorPlanExportOptions {
  paperSize: PaperSize;
  orientation: Orientation;
  title: string;
  showStats: boolean;
}

export interface PlaceCardExportOptions {
  paperSize: PaperSize;
  showDietaryTags: boolean;
  showTableNumber: boolean;
}

export interface EscortCardExportOptions {
  paperSize: PaperSize;
  columns: 2 | 3;
}

export type ExportType = 'floor-plan' | 'place-cards' | 'escort-cards' | 'qr-display';
