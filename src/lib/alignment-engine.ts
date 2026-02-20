import type { Table, Fixture, Position } from '@/types/venue';

export interface ObjectBounds {
  id: string;
  left: number;
  right: number;
  top: number;
  bottom: number;
  centerX: number;
  centerY: number;
}

export interface AlignmentGuide {
  orientation: 'horizontal' | 'vertical';
  position: number;
  start: number;
  end: number;
  type: 'edge' | 'center' | 'room-center';
}

export interface AlignmentSnapResult {
  snappedPosition: Position;
  guides: AlignmentGuide[];
  didSnapX: boolean;
  didSnapY: boolean;
}

export function getObjectBounds(obj: { id: string; position: Position; width: number; height: number }): ObjectBounds {
  const halfW = obj.width / 2;
  const halfH = obj.height / 2;
  return {
    id: obj.id,
    left: obj.position.x - halfW,
    right: obj.position.x + halfW,
    top: obj.position.y - halfH,
    bottom: obj.position.y + halfH,
    centerX: obj.position.x,
    centerY: obj.position.y,
  };
}

export function getBoundsFromPosition(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number
): ObjectBounds {
  const halfW = width / 2;
  const halfH = height / 2;
  return {
    id,
    left: x - halfW,
    right: x + halfW,
    top: y - halfH,
    bottom: y + halfH,
    centerX: x,
    centerY: y,
  };
}

interface RoomBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
  centerX: number;
  centerY: number;
}

export function computeAlignmentSnap(
  draggingBounds: ObjectBounds,
  otherBounds: ObjectBounds[],
  roomBounds: RoomBounds,
  threshold: number
): AlignmentSnapResult {
  let bestSnapX: { offset: number; distance: number } | null = null;
  let bestSnapY: { offset: number; distance: number } | null = null;
  const guides: AlignmentGuide[] = [];

  // Edges/center of the dragging object to check
  const dragXPoints = [
    { value: draggingBounds.left, label: 'left' as const },
    { value: draggingBounds.centerX, label: 'center' as const },
    { value: draggingBounds.right, label: 'right' as const },
  ];
  const dragYPoints = [
    { value: draggingBounds.top, label: 'top' as const },
    { value: draggingBounds.centerY, label: 'center' as const },
    { value: draggingBounds.bottom, label: 'bottom' as const },
  ];

  // Collect all target snap lines from other objects
  const targetXLines: { value: number; type: AlignmentGuide['type']; bounds: ObjectBounds }[] = [];
  const targetYLines: { value: number; type: AlignmentGuide['type']; bounds: ObjectBounds }[] = [];

  for (const other of otherBounds) {
    targetXLines.push(
      { value: other.left, type: 'edge', bounds: other },
      { value: other.centerX, type: 'center', bounds: other },
      { value: other.right, type: 'edge', bounds: other }
    );
    targetYLines.push(
      { value: other.top, type: 'edge', bounds: other },
      { value: other.centerY, type: 'center', bounds: other },
      { value: other.bottom, type: 'edge', bounds: other }
    );
  }

  // Room center lines
  const roomCenterBounds: ObjectBounds = {
    id: '__room__',
    left: roomBounds.left,
    right: roomBounds.right,
    top: roomBounds.top,
    bottom: roomBounds.bottom,
    centerX: roomBounds.centerX,
    centerY: roomBounds.centerY,
  };
  targetXLines.push({ value: roomBounds.centerX, type: 'room-center', bounds: roomCenterBounds });
  targetYLines.push({ value: roomBounds.centerY, type: 'room-center', bounds: roomCenterBounds });

  // Find best X snap
  for (const dragPoint of dragXPoints) {
    for (const target of targetXLines) {
      const distance = Math.abs(dragPoint.value - target.value);
      if (distance < threshold) {
        const offset = target.value - dragPoint.value;
        if (!bestSnapX || distance < bestSnapX.distance) {
          bestSnapX = { offset, distance };
        }
      }
    }
  }

  // Find best Y snap
  for (const dragPoint of dragYPoints) {
    for (const target of targetYLines) {
      const distance = Math.abs(dragPoint.value - target.value);
      if (distance < threshold) {
        const offset = target.value - dragPoint.value;
        if (!bestSnapY || distance < bestSnapY.distance) {
          bestSnapY = { offset, distance };
        }
      }
    }
  }

  // Compute snapped position
  const snappedX = draggingBounds.centerX + (bestSnapX?.offset ?? 0);
  const snappedY = draggingBounds.centerY + (bestSnapY?.offset ?? 0);

  // Recompute snapped bounds for guide line generation
  const snappedHalfW = (draggingBounds.right - draggingBounds.left) / 2;
  const snappedHalfH = (draggingBounds.bottom - draggingBounds.top) / 2;
  const snappedBounds: ObjectBounds = {
    id: draggingBounds.id,
    left: snappedX - snappedHalfW,
    right: snappedX + snappedHalfW,
    top: snappedY - snappedHalfH,
    bottom: snappedY + snappedHalfH,
    centerX: snappedX,
    centerY: snappedY,
  };

  // Generate guide lines for matched snaps
  if (bestSnapX) {
    const snappedDragXPoints = [snappedBounds.left, snappedBounds.centerX, snappedBounds.right];
    for (const target of targetXLines) {
      for (const dragVal of snappedDragXPoints) {
        if (Math.abs(dragVal - target.value) < 0.5) {
          // Compute vertical extent of guide line
          const allY = [
            snappedBounds.top,
            snappedBounds.bottom,
            target.bounds.top,
            target.bounds.bottom,
          ];
          guides.push({
            orientation: 'vertical',
            position: target.value,
            start: Math.min(...allY) - 10,
            end: Math.max(...allY) + 10,
            type: target.type,
          });
        }
      }
    }
  }

  if (bestSnapY) {
    const snappedDragYPoints = [snappedBounds.top, snappedBounds.centerY, snappedBounds.bottom];
    for (const target of targetYLines) {
      for (const dragVal of snappedDragYPoints) {
        if (Math.abs(dragVal - target.value) < 0.5) {
          const allX = [
            snappedBounds.left,
            snappedBounds.right,
            target.bounds.left,
            target.bounds.right,
          ];
          guides.push({
            orientation: 'horizontal',
            position: target.value,
            start: Math.min(...allX) - 10,
            end: Math.max(...allX) + 10,
            type: target.type,
          });
        }
      }
    }
  }

  return {
    snappedPosition: { x: snappedX, y: snappedY },
    guides,
    didSnapX: bestSnapX !== null,
    didSnapY: bestSnapY !== null,
  };
}
