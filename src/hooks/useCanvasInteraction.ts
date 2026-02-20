'use client';

import { useCallback, useRef } from 'react';
import { useSeatingStore } from '@/stores/useSeatingStore';
import type { KonvaEventObject } from 'konva/lib/Node';

function getTouchDistance(t1: Touch, t2: Touch): number {
  const dx = t1.clientX - t2.clientX;
  const dy = t1.clientY - t2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

export function useCanvasInteraction() {
  const zoom = useSeatingStore((s) => s.zoom);
  const panOffset = useSeatingStore((s) => s.panOffset);
  const setZoom = useSeatingStore((s) => s.setZoom);
  const setPanOffset = useSeatingStore((s) => s.setPanOffset);
  const canvasToolMode = useSeatingStore((s) => s.canvasToolMode);
  const isPanning = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });

  // Touch state refs
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const lastPinchDistRef = useRef<number | null>(null);

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

  // --- Touch handlers for pan and pinch-to-zoom ---

  const handleTouchStart = useCallback(
    (e: KonvaEventObject<TouchEvent>) => {
      const touches = e.evt.touches;
      if (touches.length === 1) {
        // Single finger — start pan
        touchStartRef.current = { x: touches[0].clientX, y: touches[0].clientY };
        lastPinchDistRef.current = null;
      } else if (touches.length === 2) {
        // Two fingers — start pinch zoom
        touchStartRef.current = null;
        lastPinchDistRef.current = getTouchDistance(touches[0], touches[1]);
      }
    },
    []
  );

  const handleTouchMove = useCallback(
    (e: KonvaEventObject<TouchEvent>) => {
      e.evt.preventDefault();
      const touches = e.evt.touches;

      if (touches.length === 1 && touchStartRef.current) {
        // Single finger pan
        const dx = touches[0].clientX - touchStartRef.current.x;
        const dy = touches[0].clientY - touchStartRef.current.y;
        touchStartRef.current = { x: touches[0].clientX, y: touches[0].clientY };
        setPanOffset({ x: panOffset.x + dx, y: panOffset.y + dy });
      } else if (touches.length === 2 && lastPinchDistRef.current !== null) {
        // Pinch zoom
        const newDist = getTouchDistance(touches[0], touches[1]);
        const scaleFactor = newDist / lastPinchDistRef.current;
        lastPinchDistRef.current = newDist;
        setZoom(zoom * scaleFactor);
      }
    },
    [panOffset, setPanOffset, zoom, setZoom]
  );

  const handleTouchEnd = useCallback(() => {
    touchStartRef.current = null;
    lastPinchDistRef.current = null;
  }, []);

  return {
    zoom,
    panOffset,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  };
}
