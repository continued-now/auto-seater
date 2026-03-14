'use client';

import { useState, useEffect } from 'react';

type TableLabel = [string] | [string, string];

interface TableDef {
  x: number;
  y: number;
  r?: number;
  rect?: boolean;
  w?: number;
  h?: number;
  seats: number;
  occupied: number;
  lines: TableLabel;
  animateSeat?: boolean;
}

interface Scenario {
  id: string;
  label: string;
  tables: TableDef[];
}

// Seat dot radius
const SR = 7;
// Gap between table edge and seat dot centre
const GAP = 11;

/**
 * For rectangular tables: seats are placed in straight rows along the
 * long (horizontal) edges — top row and bottom row.
 * This looks realistic for conference tables and is much more compact
 * vertically than a circular arrangement.
 */
function LinearSeats({ t }: { t: TableDef }) {
  const w = t.w!;
  const h = t.h!;
  const topCount = Math.floor(t.seats / 2);
  const botCount = Math.ceil(t.seats / 2);
  const topY = t.y - h / 2 - GAP;
  const botY = t.y + h / 2 + GAP;

  const xPositions = (count: number) => {
    if (count === 1) return [t.x];
    const span = w - 24;
    return Array.from({ length: count }, (_, i) => t.x - span / 2 + (i * span) / (count - 1));
  };

  const dots: { cx: number; cy: number; idx: number }[] = [
    ...xPositions(topCount).map((cx, i) => ({ cx, cy: topY, idx: i })),
    ...xPositions(botCount).map((cx, i) => ({ cx, cy: botY, idx: topCount + i })),
  ];

  return (
    <>
      {dots.map(({ cx, cy, idx }) => {
        const isOccupied = idx < t.occupied;
        const isAnimated = t.animateSeat && idx === t.occupied;
        return (
          <circle
            key={idx}
            cx={cx}
            cy={cy}
            r={SR}
            fill={isOccupied || isAnimated ? '#DBEAFE' : '#ffffff'}
            stroke={isOccupied || isAnimated ? '#2563EB' : '#cbd5e1'}
            strokeWidth={1}
            className={isAnimated ? 'seat-appear' : undefined}
          />
        );
      })}
    </>
  );
}

/**
 * For round tables: seats arranged in a circle around the table.
 */
function CircularSeats({ t }: { t: TableDef }) {
  const seatR = (t.r ?? 30) + GAP;
  return (
    <>
      {Array.from({ length: t.seats }).map((_, i) => {
        const angle = (2 * Math.PI * i) / t.seats - Math.PI / 2;
        const cx = t.x + Math.cos(angle) * seatR;
        const cy = t.y + Math.sin(angle) * seatR;
        const isOccupied = i < t.occupied;
        const isAnimated = t.animateSeat && i === t.occupied;
        return (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={SR}
            fill={isOccupied || isAnimated ? '#DBEAFE' : '#ffffff'}
            stroke={isOccupied || isAnimated ? '#2563EB' : '#cbd5e1'}
            strokeWidth={1}
            className={isAnimated ? 'seat-appear' : undefined}
          />
        );
      })}
    </>
  );
}

function TableLabel({ t, visible }: { t: TableDef; visible: boolean }) {
  return (
    <g style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.28s ease' }}>
      {t.lines.length === 1 ? (
        <text
          x={t.x} y={t.y + 1}
          textAnchor="middle" dominantBaseline="middle"
          fontSize={10} fontWeight={600} fill="#475569" fontFamily="system-ui, sans-serif"
        >
          {t.lines[0]}
        </text>
      ) : (
        <text textAnchor="middle" fontSize={9} fontWeight={600} fill="#475569" fontFamily="system-ui, sans-serif">
          <tspan x={t.x} y={t.y - 5}>{t.lines[0]}</tspan>
          <tspan x={t.x} y={t.y + 7}>{t.lines[1]}</tspan>
        </text>
      )}
    </g>
  );
}

// ─── Scenario data ─────────────────────────────────────────────────────────
// viewBox: 560 × 340
// Seat dot bounds = table_center ± (r + GAP + SR) = ± (r + 18) for circles
//                  = table_center_y ± (h/2 + GAP + SR) for linear rows
//
// Wedding  — head table (linear) + 2 rows of round tables
// Corporate — 2 rows of rectangular conference tables (linear seats)
// Alumni   — 3 rows of staggered round tables

const SCENARIOS: Scenario[] = [
  // ── Wedding ───────────────────────────────────────────────────────────────
  {
    id: 'wedding',
    label: 'Wedding',
    tables: [
      // Head table: linear seats → top at y-17-11=y-28, bottom at y+17+11=y+28
      { x: 280, y: 52,  rect: true, w: 160, h: 34, seats: 6,  occupied: 6,  lines: ['Head Table'] },
      // Row 1 at y=172 → top seat: 172-(30+18)=124, bottom: 172+(30+18)=220
      { x: 90,  y: 172, r: 30, seats: 6, occupied: 5, lines: ["Bride's", "Family"] },
      { x: 208, y: 167, r: 27, seats: 5, occupied: 4, lines: ["Groom's", "Family"] },
      { x: 333, y: 172, r: 30, seats: 6, occupied: 6, lines: ['Bridesmaids'] },
      { x: 455, y: 167, r: 27, seats: 5, occupied: 3, lines: ['Groomsmen'] },
      // Row 2 at y=285 → top seat: 285-48=237, bottom: 285+48=333 (< 340 ✓)
      { x: 148, y: 285, r: 30, seats: 6, occupied: 4, lines: ['College', 'Friends'], animateSeat: true },
      { x: 280, y: 289, r: 27, seats: 5, occupied: 2, lines: ['High', 'School'] },
      { x: 412, y: 285, r: 30, seats: 6, occupied: 5, lines: ['Family', 'Friends'] },
    ],
  },

  // ── Corporate ─────────────────────────────────────────────────────────────
  {
    id: 'corporate',
    label: 'Corporate',
    tables: [
      // Row 1 at y=108 → linear: top at 108-19-11=78, bottom at 108+19+11=138
      { x: 100, y: 108, rect: true, w: 100, h: 38, seats: 6, occupied: 6, lines: ['C-Suite'] },
      { x: 280, y: 108, rect: true, w: 100, h: 38, seats: 5, occupied: 4, lines: ['Board'] },
      { x: 460, y: 108, rect: true, w: 100, h: 38, seats: 6, occupied: 5, lines: ['Partners'] },
      // Row 2 at y=240 → top: 240-30=210 (gap from 138: 72px ✓), bottom: 240+30=270 (< 340 ✓)
      { x: 100, y: 240, rect: true, w: 100, h: 38, seats: 8, occupied: 8, lines: ['Exec', 'Team'] },
      { x: 280, y: 240, rect: true, w: 100, h: 38, seats: 6, occupied: 3, lines: ['Engineering'], animateSeat: true },
      { x: 460, y: 240, rect: true, w: 100, h: 38, seats: 6, occupied: 5, lines: ['Sales'] },
    ],
  },

  // ── Alumni ────────────────────────────────────────────────────────────────
  {
    id: 'alumni',
    label: 'Alumni Reunion',
    tables: [
      // Row 1 at y=82 → top: 82-46=36 (> 0 ✓), bottom: 82+46=128
      { x: 120, y: 82,  r: 28, seats: 6, occupied: 5, lines: ["Class", "of '95"] },
      { x: 280, y: 75,  r: 25, seats: 5, occupied: 6, lines: ["Class", "of '00"] },
      { x: 440, y: 82,  r: 28, seats: 6, occupied: 4, lines: ["Class", "of '05"] },
      // Row 2 at y=196 → top: 196-46=150 (gap from 128: 22px ✓), bottom: 196+46=242
      { x: 120, y: 196, r: 28, seats: 6, occupied: 5, lines: ["Class", "of '10"] },
      { x: 280, y: 189, r: 25, seats: 5, occupied: 4, lines: ["Class", "of '15"] },
      { x: 440, y: 196, r: 28, seats: 6, occupied: 3, lines: ["Class", "of '20"] },
      // Row 3 at y=291 → top: 291-46=245 (gap from 242: 3px ✓), bottom: 291+46=337 (< 340 ✓)
      { x: 188, y: 291, r: 28, seats: 6, occupied: 5, lines: ['Faculty'], animateSeat: true },
      { x: 372, y: 291, r: 25, seats: 5, occupied: 2, lines: ['Staff'] },
    ],
  },
];

// ─── Component ──────────────────────────────────────────────────────────────

export function HeroFloorPlanPreview() {
  const [scenarioIdx, setScenarioIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => setVisible(false), 3500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (visible) return;
    const t = setTimeout(() => { setScenarioIdx((i) => (i + 1) % SCENARIOS.length); setVisible(true); }, 320);
    return () => clearTimeout(t);
  }, [visible]);

  const switchTo = (idx: number) => {
    if (idx === scenarioIdx) return;
    setVisible(false);
    setTimeout(() => { setScenarioIdx(idx); setVisible(true); }, 320);
  };

  const scenario = SCENARIOS[scenarioIdx];

  return (
    <div className="mt-12 max-w-xl mx-auto">
      <div className="flex items-center justify-center gap-2 mb-4">
        {SCENARIOS.map((s, i) => (
          <button
            key={s.id}
            onClick={() => switchTo(i)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer border ${
              i === scenarioIdx
                ? 'border-blue-200 bg-blue-50 text-blue-700'
                : 'border-slate-200 bg-white text-slate-400 hover:text-slate-600 hover:border-slate-300'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <svg viewBox="0 0 560 340" className="w-full" role="img" aria-label={`${scenario.label} seating layout`}>
        <rect x="0" y="0" width="560" height="340" rx="12" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1" />

        <g key={scenarioIdx}>
          {scenario.tables.map((t, idx) => (
            <g key={idx}>
              {/* Table shape */}
              {t.rect ? (
                <rect
                  x={t.x - (t.w ?? 0) / 2} y={t.y - (t.h ?? 0) / 2}
                  width={t.w} height={t.h} rx={4}
                  fill="#ffffff" stroke="#94a3b8" strokeWidth={1}
                />
              ) : (
                <circle cx={t.x} cy={t.y} r={t.r} fill="#ffffff" stroke="#94a3b8" strokeWidth={1} />
              )}

              {/* Seat dots */}
              {t.seats > 0 && (t.rect
                ? <LinearSeats t={t} />
                : <CircularSeats t={t} />
              )}

              {/* Label */}
              <TableLabel t={t} visible={visible} />
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}
