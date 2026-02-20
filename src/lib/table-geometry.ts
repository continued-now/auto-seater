import type { SeatPosition } from '@/types/seating';
import type { TableShape } from '@/types/venue';

const SEAT_RADIUS = 14;
const SEAT_SPACING = 6;

export function getSeatPositions(
  shape: TableShape,
  capacity: number,
  width: number,
  height: number
): SeatPosition[] {
  switch (shape) {
    case 'round':
    case 'cocktail':
      return getRoundSeats(capacity, width);
    case 'rectangular':
      return getRectangularSeats(capacity, width, height);
    case 'square':
      return getRectangularSeats(capacity, width, width);
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
  height: number
): SeatPosition[] {
  const seats: SeatPosition[] = [];
  const seatDiameter = SEAT_RADIUS * 2 + SEAT_SPACING;

  const longSideCount = Math.ceil(capacity / 2);
  const shortSide = capacity - longSideCount;

  const halfW = width / 2 + SEAT_RADIUS + SEAT_SPACING;
  const halfH = height / 2 + SEAT_RADIUS + SEAT_SPACING;

  // Top side
  for (let i = 0; i < longSideCount; i++) {
    const xStart = -((longSideCount - 1) * seatDiameter) / 2;
    seats.push({
      x: xStart + i * seatDiameter,
      y: -halfH,
      angle: 0,
    });
  }

  // Bottom side
  for (let i = 0; i < shortSide; i++) {
    const xStart = -((shortSide - 1) * seatDiameter) / 2;
    seats.push({
      x: xStart + i * seatDiameter,
      y: halfH,
      angle: 180,
    });
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

export const SEAT_RENDER_RADIUS = SEAT_RADIUS;
