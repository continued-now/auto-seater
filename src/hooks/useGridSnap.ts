'use client';

import { useCallback } from 'react';
import { useSeatingStore } from '@/stores/useSeatingStore';

export function useGridSnap() {
  const snapToGrid = useSeatingStore((s) => s.venue.snapToGrid);
  const gridSize = useSeatingStore((s) => s.venue.gridSize);
  const unit = useSeatingStore((s) => s.venue.unit);

  const pixelsPerUnit = unit === 'ft' ? 15 : 30;
  const gridPixels = gridSize * pixelsPerUnit;

  const snap = useCallback(
    (value: number): number => {
      if (!snapToGrid) return value;
      return Math.round(value / gridPixels) * gridPixels;
    },
    [snapToGrid, gridPixels]
  );

  const snapPosition = useCallback(
    (x: number, y: number): { x: number; y: number } => {
      return { x: snap(x), y: snap(y) };
    },
    [snap]
  );

  return { snap, snapPosition, gridPixels, pixelsPerUnit };
}
