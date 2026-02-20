'use client';

import { useCallback, useRef } from 'react';
import { useSeatingStore } from '@/stores/useSeatingStore';
import type { KonvaEventObject } from 'konva/lib/Node';

export function useCanvasInteraction() {
  const zoom = useSeatingStore((s) => s.zoom);
  const panOffset = useSeatingStore((s) => s.panOffset);
  const setZoom = useSeatingStore((s) => s.setZoom);
  const setPanOffset = useSeatingStore((s) => s.setPanOffset);
  const canvasToolMode = useSeatingStore((s) => s.canvasToolMode);
  const isPanning = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });

  const handleWheel = useCallback(
    (e: KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();
      const scaleBy = 1.08;
      const newZoom = e.evt.deltaY < 0 ? zoom * scaleBy : zoom / scaleBy;
      setZoom(newZoom);
    },
    [zoom, setZoom]
  );

  const handleMouseDown = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      // Skip left-click panning when in draw-wall mode
      if (canvasToolMode === 'draw-wall' && e.evt.button === 0) return;

      // Only pan on middle-click or when holding alt
      if (e.evt.button === 1 || e.evt.altKey) {
        isPanning.current = true;
        lastPointer.current = { x: e.evt.clientX, y: e.evt.clientY };
        e.evt.preventDefault();
      }
    },
    [canvasToolMode]
  );

  const handleMouseMove = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      if (!isPanning.current) return;
      const dx = e.evt.clientX - lastPointer.current.x;
      const dy = e.evt.clientY - lastPointer.current.y;
      lastPointer.current = { x: e.evt.clientX, y: e.evt.clientY };
      setPanOffset({ x: panOffset.x + dx, y: panOffset.y + dy });
    },
    [panOffset, setPanOffset]
  );

  const handleMouseUp = useCallback(() => {
    isPanning.current = false;
  }, []);

  return {
    zoom,
    panOffset,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
  };
}
