import type { SeatPosition } from '@/types/seating';
import type { TableShape, SeatingSide } from '@/types/venue';

const SEAT_RADIUS = 14;
const SEAT_SPACING = 6;

export function getSeatPositions(
  shape: TableShape,
  capacity: number,
  width: number,
  height: number,
  seatingSide?: SeatingSide,
  endSeats?: boolean
): SeatPosition[] {
  if (capacity <= 0) return [];

  switch (shape) {
    case 'round':
    case 'cocktail':
      return getRoundSeats(capacity, width);
    case 'rectangular':
      return getRectangularSeats(capacity, width, height, seatingSide, endSeats);
    case 'square':
      return getRectangularSeats(capacity, width, width, seatingSide, endSeats);
    case 'head':
      return getHeadTableSeats(capacity, width);
    case 'sweetheart':
      return getSweetheartSeats(width);
    default:
      return getRoundSeats(capacity, width);
  }
}

function getRoundSeats(capacity: number, diameter: number): SeatPosition[] {
  const seats: SeatPosition[] = [];
  const radius = diameter / 2 + SEAT_RADIUS + SEAT_SPACING;
  for (let i = 0; i < capacity; i++) {
    const angle = (2 * Math.PI * i) / capacity - Math.PI / 2;
    seats.push({
      x: radius * Math.cos(angle),
      y: radius * Math.sin(angle),
      angle: (angle * 180) / Math.PI + 90,
    });
  }
  return seats;
}

function getRectangularSeats(
  capacity: number,
  width: number,
  height: number,
  seatingSide?: SeatingSide,
  endSeats?: boolean
): SeatPosition[] {
  const seats: SeatPosition[] = [];
  const seatDiameter = SEAT_RADIUS * 2 + SEAT_SPACING;
  const side = seatingSide ?? 'both';
  const includeEnds = endSeats !== false; // default true

  const halfW = width / 2 + SEAT_RADIUS + SEAT_SPACING;
  const halfH = height / 2 + SEAT_RADIUS + SEAT_SPACING;

  if (side === 'both') {
    // Split seats between top and bottom (and optionally ends)
    let longSideSlots = 0;
    let endSlots = 0;

    if (includeEnds) {
      // Distribute across top, bottom, left end, right end
      const maxPerLongSide = Math.max(1, Math.floor(width / seatDiameter));
      const maxPerShortSide = Math.max(1, Math.floor(height / seatDiameter));
      // Fill long sides first, then ends
      const longTotal = Math.min(capacity, maxPerLongSide * 2);
      const topCount = Math.ceil(longTotal / 2);
      const bottomCount = longTotal - topCount;
      const remaining = capacity - longTotal;
      const leftCount = Math.min(Math.ceil(remaining / 2), maxPerShortSide);
      const rightCount = Math.min(remaining - leftCount, maxPerShortSide);

      // Top side
      for (let i = 0; i < topCount; i++) {
        const xStart = -((topCount - 1) * seatDiameter) / 2;
        seats.push({ x: xStart + i * seatDiameter, y: -halfH, angle: 0 });
      }
      // Bottom side
      for (let i = 0; i < bottomCount; i++) {
        const xStart = -((bottomCount - 1) * seatDiameter) / 2;
        seats.push({ x: xStart + i * seatDiameter, y: halfH, angle: 180 });
      }
      // Left end
      for (let i = 0; i < leftCount; i++) {
        const yStart = -((leftCount - 1) * seatDiameter) / 2;
        seats.push({ x: -halfW, y: yStart + i * seatDiameter, angle: 270 });
      }
      // Right end
      for (let i = 0; i < rightCount; i++) {
        const yStart = -((rightCount - 1) * seatDiameter) / 2;
        seats.push({ x: halfW, y: yStart + i * seatDiameter, angle: 90 });
      }
    } else {
      // No end seats — only top and bottom
      const topCount = Math.ceil(capacity / 2);
      const bottomCount = capacity - topCount;

      for (let i = 0; i < topCount; i++) {
        const xStart = -((topCount - 1) * seatDiameter) / 2;
        seats.push({ x: xStart + i * seatDiameter, y: -halfH, angle: 0 });
      }
      for (let i = 0; i < bottomCount; i++) {
        const xStart = -((bottomCount - 1) * seatDiameter) / 2;
        seats.push({ x: xStart + i * seatDiameter, y: halfH, angle: 180 });
      }
    }
  } else {
    // One side only (top-only or bottom-only)
    const yPos = side === 'top-only' ? -halfH : halfH;
    const faceAngle = side === 'top-only' ? 0 : 180;

    for (let i = 0; i < capacity; i++) {
      const xStart = -((capacity - 1) * seatDiameter) / 2;
      seats.push({ x: xStart + i * seatDiameter, y: yPos, angle: faceAngle });
    }
  }

  return seats;
}

function getHeadTableSeats(capacity: number, width: number): SeatPosition[] {
  const seats: SeatPosition[] = [];
  const seatDiameter = SEAT_RADIUS * 2 + SEAT_SPACING;
  const halfH = 20 + SEAT_RADIUS + SEAT_SPACING;

  // All seats on one side (front-facing)
  for (let i = 0; i < capacity; i++) {
    const xStart = -((capacity - 1) * seatDiameter) / 2;
    seats.push({
      x: xStart + i * seatDiameter,
      y: -halfH,
      angle: 0,
    });
  }

  return seats;
}

function getSweetheartSeats(width: number): SeatPosition[] {
  const halfH = 20 + SEAT_RADIUS + SEAT_SPACING;
  const spacing = 20;
  return [
    { x: -spacing, y: -halfH, angle: 0 },
    { x: spacing, y: -halfH, angle: 0 },
  ];
}

export function getTableDefaults(shape: TableShape): {
  width: number;
  height: number;
  capacity: number;
} {
  switch (shape) {
    case 'round':
      return { width: 80, height: 80, capacity: 8 };
    case 'rectangular':
      return { width: 140, height: 60, capacity: 8 };
    case 'square':
      return { width: 80, height: 80, capacity: 4 };
    case 'head':
      return { width: 240, height: 40, capacity: 10 };
    case 'sweetheart':
      return { width: 80, height: 40, capacity: 2 };
    case 'cocktail':
      return { width: 40, height: 40, capacity: 0 };
    default:
      return { width: 80, height: 80, capacity: 8 };
  }
}

/**
 * Calculate a suggested seat count based on table shape and dimensions.
 * Uses the space available (perimeter or sides) to fit seats comfortably.
 */
export function getSuggestedCapacity(
  shape: TableShape,
  width: number,
  height: number,
  seatingSide?: SeatingSide,
  endSeats?: boolean
): number {
  const seatDiameter = SEAT_RADIUS * 2 + SEAT_SPACING;
  const side = seatingSide ?? 'both';
  const includeEnds = endSeats !== false;

  switch (shape) {
    case 'round':
    case 'cocktail': {
      const circumference = Math.PI * width;
      return Math.max(1, Math.floor(circumference / seatDiameter));
    }
    case 'rectangular':
    case 'square': {
      const h = shape === 'square' ? width : height;
      const longSideMax = Math.max(1, Math.floor(width / seatDiameter));
      const shortSideMax = Math.max(1, Math.floor(h / seatDiameter));

      if (side === 'top-only' || side === 'bottom-only') {
        return longSideMax;
      }
      // Both sides
      let total = longSideMax * 2;
      if (includeEnds) {
        total += shortSideMax * 2;
      }
      return total;
    }
    case 'head': {
      return Math.max(1, Math.floor(width / seatDiameter));
    }
    case 'sweetheart':
      return 2;
    default:
      return 4;
  }
}

export const SEAT_RENDER_RADIUS = SEAT_RADIUS;
