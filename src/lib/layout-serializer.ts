import type { VenueConfig } from '@/types/venue';

const PX_PER_FT = 15;
const PX_PER_M = 30;

function pxToUnit(px: number, unit: 'ft' | 'm'): number {
  const scale = unit === 'ft' ? PX_PER_FT : PX_PER_M;
  return Math.round((px / scale) * 10) / 10;
}

export function serializeLayout(config: VenueConfig): string {
  const u = config.unit;
  const lines: string[] = [];

  lines.push(`Room: ${config.roomWidth}${u} x ${config.roomLength}${u}`);

  if (config.tables.length > 0) {
    lines.push('');
    lines.push('Tables:');
    for (const t of config.tables) {
      const x = pxToUnit(t.position.x, u);
      const y = pxToUnit(t.position.y, u);
      const w = pxToUnit(t.width, u);
      const h = pxToUnit(t.height, u);
      lines.push(`- "${t.label}" (${t.shape}, ${t.capacity} seats): position (${x}${u}, ${y}${u}), size ${w}${u} x ${h}${u}`);
    }
  }

  if (config.fixtures.length > 0) {
    lines.push('');
    lines.push('Fixtures:');
    for (const f of config.fixtures) {
      const x = pxToUnit(f.position.x, u);
      const y = pxToUnit(f.position.y, u);
      const w = pxToUnit(f.width, u);
      const h = pxToUnit(f.height, u);
      lines.push(`- "${f.label}" (${f.type}): position (${x}${u}, ${y}${u}), size ${w}${u} x ${h}${u}`);
    }
  }

  if (config.walls.length > 0) {
    lines.push('');
    lines.push('Walls:');
    for (const w of config.walls) {
      const sx = pxToUnit(w.start.x, u);
      const sy = pxToUnit(w.start.y, u);
      const ex = pxToUnit(w.end.x, u);
      const ey = pxToUnit(w.end.y, u);
      lines.push(`- ${w.style} wall: (${sx}${u}, ${sy}${u}) to (${ex}${u}, ${ey}${u})`);
    }
  }

  return lines.join('\n');
}
