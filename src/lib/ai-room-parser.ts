import type { DetectedRoom, DetectedObject, DetectedWall } from '@/types/photo-to-room';
import type { TableShape, FixtureType, WallStyle } from '@/types/venue';

const VALID_TABLE_SHAPES: TableShape[] = ['round', 'rectangular', 'square', 'head', 'sweetheart', 'cocktail'];
const VALID_FIXTURE_TYPES: FixtureType[] = [
  'stage', 'dance-floor', 'bar', 'buffet', 'dj-booth', 'photo-booth',
  'entrance', 'exit', 'restroom', 'pillar', 'door', 'window',
  'av-sound-room', 'kitchen', 'coat-check',
];
const VALID_WALL_STYLES: WallStyle[] = ['solid', 'partition'];

const MIN_CONFIDENCE = 0.2;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function fuzzyMatchTableShape(raw: string): TableShape {
  const lower = raw.toLowerCase().replace(/[_-\s]/g, '');
  for (const shape of VALID_TABLE_SHAPES) {
    if (lower.includes(shape)) return shape;
  }
  if (lower.includes('rect') || lower.includes('long')) return 'rectangular';
  if (lower.includes('circle') || lower.includes('circular')) return 'round';
  return 'rectangular';
}

function fuzzyMatchFixtureType(raw: string): FixtureType {
  const lower = raw.toLowerCase().replace(/[_-\s]/g, '');
  for (const type of VALID_FIXTURE_TYPES) {
    const normalized = type.replace(/-/g, '');
    if (lower.includes(normalized)) return type;
  }
  if (lower.includes('dance')) return 'dance-floor';
  if (lower.includes('dj')) return 'dj-booth';
  if (lower.includes('photo')) return 'photo-booth';
  if (lower.includes('av') || lower.includes('sound')) return 'av-sound-room';
  if (lower.includes('coat')) return 'coat-check';
  if (lower.includes('bath') || lower.includes('toilet') || lower.includes('wc')) return 'restroom';
  if (lower.includes('column') || lower.includes('post')) return 'pillar';
  return 'pillar'; // safe fallback for unknown fixtures
}

function parseObject(raw: Record<string, unknown>): DetectedObject | null {
  const type = raw.type as string;
  if (type !== 'table' && type !== 'fixture') return null;

  const subTypeRaw = (raw.subType as string) || '';
  const subType = type === 'table'
    ? fuzzyMatchTableShape(subTypeRaw)
    : fuzzyMatchFixtureType(subTypeRaw);

  const pos = raw.position as { x?: number; y?: number } | undefined;
  const confidence = clamp(Number(raw.confidence) || 0, 0, 1);

  if (confidence < MIN_CONFIDENCE) return null;

  return {
    type,
    subType,
    label: (raw.label as string) || `${type} ${Math.random().toString(36).slice(2, 6)}`,
    position: {
      x: clamp(Number(pos?.x) || 0, 0, 1),
      y: clamp(Number(pos?.y) || 0, 0, 1),
    },
    width: Math.max(Number(raw.width) || 1, 0.5),
    height: Math.max(Number(raw.height) || 1, 0.5),
    rotation: Number(raw.rotation) || 0,
    confidence,
  };
}

function parseWall(raw: Record<string, unknown>): DetectedWall | null {
  const start = raw.start as { x?: number; y?: number } | undefined;
  const end = raw.end as { x?: number; y?: number } | undefined;
  const confidence = clamp(Number(raw.confidence) || 0, 0, 1);

  if (confidence < MIN_CONFIDENCE) return null;

  const styleRaw = (raw.style as string) || 'solid';
  const style = VALID_WALL_STYLES.includes(styleRaw as WallStyle)
    ? (styleRaw as WallStyle)
    : 'solid';

  return {
    start: {
      x: clamp(Number(start?.x) || 0, 0, 1),
      y: clamp(Number(start?.y) || 0, 0, 1),
    },
    end: {
      x: clamp(Number(end?.x) || 0, 0, 1),
      y: clamp(Number(end?.y) || 0, 0, 1),
    },
    style,
    confidence,
  };
}

export function parseAIRoomResponse(raw: string): DetectedRoom {
  let parsed: Record<string, unknown>;
  try {
    // Strip markdown code fences if present
    const cleaned = raw.replace(/^```(?:json)?\s*\n?/m, '').replace(/\n?```\s*$/m, '').trim();
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('AI returned invalid JSON. Please try again.');
  }

  const width = Number(parsed.width);
  const height = Number(parsed.height);
  if (!width || !height || width <= 0 || height <= 0) {
    throw new Error('AI response missing valid room dimensions (width/height).');
  }

  const unitRaw = (parsed.unit as string) || 'ft';
  const unit = unitRaw === 'm' ? 'm' : 'ft';

  const rawObjects = Array.isArray(parsed.objects) ? parsed.objects : [];
  const rawWalls = Array.isArray(parsed.walls) ? parsed.walls : [];

  const objects = rawObjects
    .map((o: unknown) => parseObject(o as Record<string, unknown>))
    .filter((o): o is DetectedObject => o != null);

  const walls = rawWalls
    .map((w: unknown) => parseWall(w as Record<string, unknown>))
    .filter((w): w is DetectedWall => w != null);

  return { width, height, unit, objects, walls };
}
