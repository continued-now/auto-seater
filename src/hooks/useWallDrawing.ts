'use client';

import { useState, useCallback } from 'react';
import { useSeatingStore } from '@/stores/useSeatingStore';
import { useGridSnap } from '@/hooks/useGridSnap';
import type { Position } from '@/types/venue';

interface DrawingWall {
  start: Position;
  currentEnd: Position;
}

const MIN_WALL_LENGTH = 10;

export function useWallDrawing() {
  const addWall = useSeatingStore((s) => s.addWall);
  const canvasToolMode = useSeatingStore((s) => s.canvasToolMode);
  const { snapPosition } = useGridSnap();

  const [drawingWall, setDrawingWall] = useState<DrawingWall | null>(null);

  const isDrawing = canvasToolMode === 'draw-wall';

  const handleMouseDown = useCallback(
    (stageX: number, stageY: number) => {
      if (!isDrawing) return;
      const snapped = snapPosition(stageX, stageY);
      setDrawingWall({ start: snapped, currentEnd: snapped });
    },
    [isDrawing, snapPosition]
  );

  const handleMouseMove = useCallback(
    (stageX: number, stageY: number) => {
      if (!isDrawing || !drawingWall) return;
      const snapped = snapPosition(stageX, stageY);
      setDrawingWall((prev) => (prev ? { ...prev, currentEnd: snapped } : null));
    },
    [isDrawing, drawingWall, snapPosition]
  );

  const handleMouseUp = useCallback(() => {
    if (!isDrawing || !drawingWall) return;

    const dx = drawingWall.currentEnd.x - drawingWall.start.x;
    const dy = drawingWall.currentEnd.y - drawingWall.start.y;
    const length = Math.sqrt(dx * dx + dy * dy);

    if (length >= MIN_WALL_LENGTH) {
      addWall({
        label: 'Wall',
        start: drawingWall.start,
        end: drawingWall.currentEnd,
        thickness: 8,
        style: 'solid',
        rotation: 0,
      });
    }

    setDrawingWall(null);
  }, [isDrawing, drawingWall, addWall]);

  const cancelDrawing = useCallback(() => {
    setDrawingWall(null);
  }, []);

  return {
    drawingWall,
    isDrawing,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    cancelDrawing,
  };
}
