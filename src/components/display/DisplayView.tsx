'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';

/* ------------------------------------------------------------------ */
/*  Shared types from share-encoder (compact wire format)              */
/* ------------------------------------------------------------------ */

interface TableData {
  l: string;   // label
  s: string;   // shape
  x: number;   // position x
  y: number;   // position y
  w: number;   // width
  h: number;   // height
  r: number;   // rotation
  c: number;   // capacity
  o: number;   // occupied count
  g?: string[]; // guest names
}

export interface FloorPlanData {
  v: number;   // version
  rw: number;  // room width
  rl: number;  // room length
  u: string;   // unit
  t: TableData[];
  n?: boolean; // names included
}

/* ------------------------------------------------------------------ */
/*  Props – discriminated union for the two modes                      */
/* ------------------------------------------------------------------ */

interface DisplayViewEncodedProps {
  mode: 'encoded';
  data: FloorPlanData;
}

interface DisplayViewStoreProps {
  mode: 'store';
}

export type DisplayViewProps = DisplayViewEncodedProps | DisplayViewStoreProps;

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const TEAL = '#0D9488';
const TEAL_LIGHT = '#14B8A6';
const TEAL_DIM = 'rgba(13,148,136,0.25)';
const BG = '#0f172a';
const SURFACE = '#1e293b';
const SURFACE_LIGHT = '#334155';
const TEXT_PRIMARY = '#f8fafc';
const TEXT_SECONDARY = '#94a3b8';
const TEXT_DIM = '#64748b';
const TABLE_FILL = '#1e293b';
const TABLE_STROKE = '#475569';

const AUTO_SCROLL_SPEED = 0.5; // px per frame

/* ------------------------------------------------------------------ */
/*  DisplayView                                                        */
/* ------------------------------------------------------------------ */

export default function DisplayView(props: DisplayViewProps) {
  // In 'store' mode we import data from the Zustand store.
  // That import is conditionally handled in the page wrapper.
  // Here we only receive resolved FloorPlanData via the 'encoded' mode.
  // For 'store' mode, the page component converts store state into
  // FloorPlanData before passing it through as 'encoded'.
  // So this component always receives FloorPlanData.
  if (props.mode === 'store') {
    // Should never reach here – page.tsx resolves store → encoded.
    return null;
  }

  return <DisplayViewInner data={props.data} />;
}

/* ------------------------------------------------------------------ */
/*  Inner component (always has data)                                  */
/* ------------------------------------------------------------------ */

function DisplayViewInner({ data }: { data: FloorPlanData }) {
  const [search, setSearch] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const isPaused = useRef(false);

  const pxPerUnit = data.u === 'ft' ? 15 : 30;
  const roomWidthPx = data.rw * pxPerUnit;
  const roomHeightPx = data.rl * pxPerUnit;

  // ---- Bounding box for SVG viewport ----
  const bounds = useMemo(() => {
    if (data.t.length === 0)
      return { minX: 0, minY: 0, maxX: roomWidthPx, maxY: roomHeightPx };

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const t of data.t) {
      const seatRadius = Math.max(t.w, t.h) / 2 + 22;
      minX = Math.min(minX, t.x - seatRadius);
      minY = Math.min(minY, t.y - seatRadius);
      maxX = Math.max(maxX, t.x + seatRadius);
      maxY = Math.max(maxY, t.y + seatRadius);
    }
    minX = Math.min(minX, 0);
    minY = Math.min(minY, 0);
    maxX = Math.max(maxX, roomWidthPx);
    maxY = Math.max(maxY, roomHeightPx);

    return { minX, minY, maxX, maxY };
  }, [data.t, roomWidthPx, roomHeightPx]);

  const viewWidth = bounds.maxX - bounds.minX + 80;
  const viewHeight = bounds.maxY - bounds.minY + 80;

  // ---- Search logic ----
  const searchLower = search.trim().toLowerCase();

  const matchedTableLabels = useMemo(() => {
    if (!searchLower) return new Set<string>();
    const labels = new Set<string>();
    for (const t of data.t) {
      if (t.g) {
        for (const g of t.g) {
          if (g.toLowerCase().includes(searchLower)) {
            labels.add(t.l);
          }
        }
      }
    }
    return labels;
  }, [data.t, searchLower]);

  // ---- Filtered guest list grouped by table ----
  const tableGroups = useMemo(() => {
    return data.t
      .filter((t) => t.g && t.g.length > 0)
      .map((t) => {
        const guests = t.g ?? [];
        const filtered = searchLower
          ? guests.filter((g) => g.toLowerCase().includes(searchLower))
          : guests;
        return { label: t.l, guests: filtered, allGuests: guests };
      })
      .filter((group) => (searchLower ? group.guests.length > 0 : true));
  }, [data.t, searchLower]);

  // ---- Auto-scroll ----
  const animate = useCallback(() => {
    if (!isPaused.current && scrollRef.current) {
      const el = scrollRef.current;
      el.scrollTop += AUTO_SCROLL_SPEED;
      // Loop back to top when we hit the bottom
      if (el.scrollTop >= el.scrollHeight - el.clientHeight) {
        el.scrollTop = 0;
      }
    }
    animationRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    // Pause auto-scroll when searching
    isPaused.current = searchLower.length > 0;
  }, [searchLower]);

  useEffect(() => {
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [animate]);

  // ---- Summary stats ----
  const totalSeated = data.t.reduce((sum, t) => sum + t.o, 0);
  const totalCapacity = data.t.reduce((sum, t) => sum + t.c, 0);

  return (
    <div
      className="min-h-screen w-full flex flex-col"
      style={{ background: BG, color: TEXT_PRIMARY }}
    >
      {/* ---- Top bar ---- */}
      <header
        className="flex-shrink-0 flex items-center gap-4 px-6 py-4 border-b"
        style={{ borderColor: SURFACE_LIGHT }}
      >
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate" style={{ color: TEXT_PRIMARY }}>
            Seating Plan
          </h1>
          <p className="text-sm" style={{ color: TEXT_SECONDARY }}>
            {data.t.length} table{data.t.length !== 1 ? 's' : ''} &middot;{' '}
            {totalSeated}/{totalCapacity} seated
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full max-w-sm">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke={TEXT_DIM}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search guest name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg text-base outline-none placeholder:text-slate-500"
            style={{
              background: SURFACE,
              color: TEXT_PRIMARY,
              border: `1px solid ${SURFACE_LIGHT}`,
            }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: TEXT_DIM }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      </header>

      {/* ---- Main area ---- */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left: Floor plan (60%) */}
        <div className="lg:w-[60%] w-full flex items-center justify-center p-4 lg:p-6 overflow-hidden">
          <svg
            viewBox={`${bounds.minX - 40} ${bounds.minY - 40} ${viewWidth} ${viewHeight}`}
            className="w-full h-full"
            style={{ maxHeight: 'calc(100vh - 80px)' }}
          >
            {/* Room background */}
            <rect
              x={0}
              y={0}
              width={roomWidthPx}
              height={roomHeightPx}
              fill={SURFACE}
              stroke={SURFACE_LIGHT}
              strokeWidth={1}
              rx={4}
            />

            {/* Tables */}
            {data.t.map((table, idx) => {
              const isHighlighted = matchedTableLabels.has(table.l);
              return (
                <DisplayTable
                  key={idx}
                  table={table}
                  highlighted={isHighlighted}
                  searching={searchLower.length > 0}
                />
              );
            })}
          </svg>
        </div>

        {/* Right: Guest list (40%) */}
        <div
          className="lg:w-[40%] w-full flex flex-col border-t lg:border-t-0 lg:border-l overflow-hidden"
          style={{ borderColor: SURFACE_LIGHT }}
        >
          {/* Search result summary */}
          {searchLower && (
            <div
              className="flex-shrink-0 px-5 py-3 text-sm font-medium"
              style={{ background: TEAL_DIM, color: TEAL_LIGHT }}
            >
              {matchedTableLabels.size > 0
                ? `Found at ${Array.from(matchedTableLabels).join(', ')}`
                : 'No guests found'}
            </div>
          )}

          {/* Scrolling guest list */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-5 py-4"
            onMouseEnter={() => {
              isPaused.current = true;
            }}
            onMouseLeave={() => {
              if (!searchLower) isPaused.current = false;
            }}
          >
            {tableGroups.length === 0 && !searchLower && (
              <p className="text-center py-8" style={{ color: TEXT_DIM }}>
                No guest names available
              </p>
            )}

            {tableGroups.length === 0 && searchLower && (
              <p className="text-center py-8" style={{ color: TEXT_DIM }}>
                No matching guests
              </p>
            )}

            <div className="space-y-5">
              {tableGroups.map((group) => {
                const isMatch = matchedTableLabels.has(group.label);
                return (
                  <div key={group.label}>
                    <div
                      className="flex items-center gap-2 mb-2"
                    >
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: isMatch ? TEAL : TEXT_DIM }}
                      />
                      <h3
                        className="text-sm font-semibold uppercase tracking-wide"
                        style={{ color: isMatch ? TEAL_LIGHT : TEXT_SECONDARY }}
                      >
                        {group.label}
                      </h3>
                      <span
                        className="text-xs ml-auto"
                        style={{ color: TEXT_DIM }}
                      >
                        {group.allGuests.length} guest
                        {group.allGuests.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {(searchLower ? group.guests : group.allGuests).map(
                        (name, i) => {
                          const nameMatch =
                            searchLower &&
                            name.toLowerCase().includes(searchLower);
                          return (
                            <div
                              key={i}
                              className="px-3 py-2 rounded-lg text-base"
                              style={{
                                background: nameMatch ? TEAL_DIM : 'transparent',
                                color: nameMatch ? TEAL_LIGHT : TEXT_PRIMARY,
                                fontWeight: nameMatch ? 600 : 400,
                              }}
                            >
                              {name}
                            </div>
                          );
                        }
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Table SVG (dark-themed)                                            */
/* ------------------------------------------------------------------ */

function DisplayTable({
  table,
  highlighted,
  searching,
}: {
  table: TableData;
  highlighted: boolean;
  searching: boolean;
}) {
  const isRound = table.s === 'round' || table.s === 'cocktail';
  const opacity = searching && !highlighted ? 0.3 : 1;

  const fill = highlighted ? TEAL_DIM : TABLE_FILL;
  const stroke = highlighted ? TEAL : TABLE_STROKE;
  const labelColor = highlighted ? TEAL_LIGHT : TEXT_PRIMARY;
  const countColor = highlighted ? TEAL : TEXT_SECONDARY;

  return (
    <g
      transform={`translate(${table.x}, ${table.y}) rotate(${table.r})`}
      opacity={opacity}
      style={{ transition: 'opacity 0.3s ease' }}
    >
      {/* Table shape */}
      {isRound ? (
        <circle r={table.w / 2} fill={fill} stroke={stroke} strokeWidth={1.5} />
      ) : (
        <rect
          x={-table.w / 2}
          y={-table.h / 2}
          width={table.w}
          height={table.h}
          rx={6}
          fill={fill}
          stroke={stroke}
          strokeWidth={1.5}
        />
      )}

      {/* Label */}
      <text
        x={0}
        y={-4}
        textAnchor="middle"
        fontSize={11}
        fontWeight={700}
        fill={labelColor}
        fontFamily="system-ui, sans-serif"
      >
        {table.l}
      </text>

      {/* Occupancy */}
      <text
        x={0}
        y={10}
        textAnchor="middle"
        fontSize={9}
        fill={countColor}
        fontFamily="system-ui, sans-serif"
      >
        {table.o}/{table.c}
      </text>

      {/* Seat dots */}
      {Array.from({ length: table.c }).map((_, i) => {
        const angle = (2 * Math.PI * i) / table.c - Math.PI / 2;
        const radius = isRound
          ? table.w / 2 + 14
          : Math.max(table.w, table.h) / 2 + 14;
        const sx = Math.cos(angle) * radius;
        const sy = Math.sin(angle) * radius;
        const isOccupied = i < table.o;

        return (
          <circle
            key={i}
            cx={sx}
            cy={sy}
            r={7}
            fill={
              highlighted && isOccupied
                ? TEAL_DIM
                : isOccupied
                ? SURFACE_LIGHT
                : 'transparent'
            }
            stroke={
              highlighted
                ? TEAL
                : isOccupied
                ? TEXT_DIM
                : SURFACE_LIGHT
            }
            strokeWidth={1}
          />
        );
      })}
    </g>
  );
}
