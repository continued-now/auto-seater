import type { VenueConfig } from '@/types/venue';

export interface RoomRect {
  id: string;
  label: string;
  x: number;      // top-left x in pixels
  y: number;      // top-left y in pixels
  width: number;   // in pixels
  height: number;  // in pixels
  color?: string;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Returns an array of RoomRects: the primary room at (0,0) + any additional rooms.
 */
export function getAllRoomRects(venue: VenueConfig, pxPerUnit: number): RoomRect[] {
  const rects: RoomRect[] = [];

  // Primary room
  rects.push({
    id: '__primary__',
    label: 'Main Room',
    x: 0,
    y: 0,
    width: venue.roomWidth * pxPerUnit,
    height: venue.roomLength * pxPerUnit,
  });

  // Additional rooms
  if (venue.rooms) {
    for (const room of venue.rooms) {
      rects.push({
        id: room.id,
        label: room.label,
        x: room.position.x,
        y: room.position.y,
        width: room.width * pxPerUnit,
        height: room.height * pxPerUnit,
        color: room.color,
      });
    }
  }

  return rects;
}

/**
 * Returns the bounding box that encompasses all rooms.
 */
export function getVenueBoundingBox(roomRects: RoomRect[]): BoundingBox {
  if (roomRects.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const r of roomRects) {
    minX = Math.min(minX, r.x);
    minY = Math.min(minY, r.y);
    maxX = Math.max(maxX, r.x + r.width);
    maxY = Math.max(maxY, r.y + r.height);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Computes the top-left position (in pixels) for a new room attached to a parent room's edge.
 */
export function computeNewRoomPosition(
  parentRect: RoomRect,
  edge: 'top' | 'right' | 'bottom' | 'left',
  newWidthPx: number,
  newHeightPx: number
): { x: number; y: number } {
  switch (edge) {
    case 'top':
      return {
        x: parentRect.x + (parentRect.width - newWidthPx) / 2,
        y: parentRect.y - newHeightPx,
      };
    case 'bottom':
      return {
        x: parentRect.x + (parentRect.width - newWidthPx) / 2,
        y: parentRect.y + parentRect.height,
      };
    case 'left':
      return {
        x: parentRect.x - newWidthPx,
        y: parentRect.y + (parentRect.height - newHeightPx) / 2,
      };
    case 'right':
      return {
        x: parentRect.x + parentRect.width,
        y: parentRect.y + (parentRect.height - newHeightPx) / 2,
      };
  }
}

/**
 * Returns the RoomRect that contains a given point, or null.
 */
export function getRoomAtPoint(roomRects: RoomRect[], x: number, y: number): RoomRect | null {
  // Check additional rooms first (they overlay), then primary
  for (let i = roomRects.length - 1; i >= 0; i--) {
    const r = roomRects[i];
    if (x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height) {
      return r;
    }
  }
  return null;
}

/**
 * Returns the center point (in pixels) of a room rect.
 */
export function getRoomCenter(rect: RoomRect): { x: number; y: number } {
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
  };
}
