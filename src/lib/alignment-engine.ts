import type { Table, Fixture, Position, UserGuide } from '@/types/venue';

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

export interface RoomBounds {
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
  roomBounds: RoomBounds | RoomBounds[],
  threshold: number,
  userGuides: UserGuide[] = []
): AlignmentSnapResult {
  const allRoomBounds = Array.isArray(roomBounds) ? roomBounds : [roomBounds];

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

  // Room center + edge lines for all rooms
  for (let ri = 0; ri < allRoomBounds.length; ri++) {
    const rb = allRoomBounds[ri];
    const roomCenterBounds: ObjectBounds = {
      id: `__room_${ri}__`,
      left: rb.left,
      right: rb.right,
      top: rb.top,
      bottom: rb.bottom,
      centerX: rb.centerX,
      centerY: rb.centerY,
    };
    targetXLines.push(
      { value: rb.centerX, type: 'room-center', bounds: roomCenterBounds },
      { value: rb.left, type: 'edge', bounds: roomCenterBounds },
      { value: rb.right, type: 'edge', bounds: roomCenterBounds }
    );
    targetYLines.push(
      { value: rb.centerY, type: 'room-center', bounds: roomCenterBounds },
      { value: rb.top, type: 'edge', bounds: roomCenterBounds },
      { value: rb.bottom, type: 'edge', bounds: roomCenterBounds }
    );
  }

  // User-placed guide lines (use first room bounds for extent)
  const primaryRb = allRoomBounds[0];
  for (const guide of userGuides) {
    const guideBounds: ObjectBounds = {
      id: `__guide_${guide.id}__`,
      left: guide.axis === 'vertical' ? guide.position : primaryRb.left,
      right: guide.axis === 'vertical' ? guide.position : primaryRb.right,
      top: guide.axis === 'horizontal' ? guide.position : primaryRb.top,
      bottom: guide.axis === 'horizontal' ? guide.position : primaryRb.bottom,
      centerX: guide.axis === 'vertical' ? guide.position : primaryRb.centerX,
      centerY: guide.axis === 'horizontal' ? guide.position : primaryRb.centerY,
    };
    if (guide.axis === 'vertical') {
      targetXLines.push({ value: guide.position, type: 'center', bounds: guideBounds });
    } else {
      targetYLines.push({ value: guide.position, type: 'center', bounds: guideBounds });
    }
  }

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
