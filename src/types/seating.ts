export type AppStep = 'guests' | 'venue' | 'seating';

export interface SeatPosition {
  x: number;
  y: number;
  angle: number;
}

export interface UIState {
  currentStep: AppStep;
  selectedGuestIds: string[];
  selectedTableId: string | null;
  searchQuery: string;
  zoom: number;
  panOffset: { x: number; y: number };
  isDragging: boolean;
}
