'use client';

import { useEffect, useState, useMemo } from 'react';
import { decodeFloorPlanData } from '@/lib/share-encoder';

interface TableData {
  l: string;
  s: string;
  x: number;
  y: number;
  w: number;
  h: number;
  r: number;
  c: number;
  o: number;
  g?: string[];
}

interface FloorPlanData {
  v: number;
  rw: number;
  rl: number;
  u: string;
  t: TableData[];
  n?: boolean;
}

export default function ViewPage() {
  const [data, setData] = useState<FloorPlanData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) {
      setError(true);
      return;
    }
    const decoded = decodeFloorPlanData(hash);
    if (!decoded) {
      setError(true);
      return;
    }
    setData(decoded);
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center max-w-xs">
          <div className="mx-auto w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <h1 className="text-lg font-semibold text-slate-900 mb-1">Invalid Link</h1>
          <p className="text-sm text-slate-500">
            This floor plan link is invalid or has expired. Please scan the QR code again.
          </p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return <FloorPlanViewer data={data} />;
}

function FloorPlanViewer({ data }: { data: FloorPlanData }) {
  const pxPerUnit = data.u === 'ft' ? 15 : 30;
  const roomWidthPx = data.rw * pxPerUnit;
  const roomHeightPx = data.rl * pxPerUnit;

  // Compute bounding box from tables
  const bounds = useMemo(() => {
    if (data.t.length === 0) return { minX: 0, minY: 0, maxX: roomWidthPx, maxY: roomHeightPx };

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const t of data.t) {
      minX = Math.min(minX, t.x - t.w / 2);
      minY = Math.min(minY, t.y - t.h / 2);
      maxX = Math.max(maxX, t.x + t.w / 2);
      maxY = Math.max(maxY, t.y + t.h / 2);
    }
    // Use room bounds if tables are inside
    minX = Math.min(minX, 0);
    minY = Math.min(minY, 0);
    maxX = Math.max(maxX, roomWidthPx);
    maxY = Math.max(maxY, roomHeightPx);

    return { minX, minY, maxX, maxY };
  }, [data.t, roomWidthPx, roomHeightPx]);

  const viewWidth = bounds.maxX - bounds.minX + 60;
  const viewHeight = bounds.maxY - bounds.minY + 80;

  const totalSeated = data.t.reduce((sum, t) => sum + t.o, 0);
  const totalCapacity = data.t.reduce((sum, t) => sum + t.c, 0);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-slate-900">Seating Plan</h1>
            <p className="text-xs text-slate-500">
              {data.t.length} table{data.t.length !== 1 ? 's' : ''} · {totalSeated}/{totalCapacity} seated
              {data.n && ' · Names shown'}
            </p>
          </div>
          <div className="text-xs text-slate-400">
            {data.rw}{data.u} x {data.rl}{data.u}
          </div>
        </div>
      </div>

      {/* Floor Plan */}
      <div className="overflow-auto p-4">
        <div className="max-w-3xl mx-auto">
          <svg
            viewBox={`${bounds.minX - 30} ${bounds.minY - 30} ${viewWidth} ${viewHeight}`}
            className="w-full bg-white rounded-xl border border-slate-200 shadow-sm"
            style={{ maxHeight: '80vh' }}
          >
            {/* Room background */}
            <rect
              x={0}
              y={0}
              width={roomWidthPx}
              height={roomHeightPx}
              fill="#f8fafc"
              stroke="#cbd5e1"
              strokeWidth={1}
            />

            {/* Tables */}
            {data.t.map((table, idx) => (
              <TableSVG key={idx} table={table} showNames={data.n ?? false} />
            ))}
          </svg>
        </div>
      </div>

      {/* Table list */}
      <div className="max-w-2xl mx-auto px-4 pb-8">
        <h2 className="text-sm font-semibold text-slate-900 mb-2">Tables</h2>
        <div className="space-y-1.5">
          {data.t.map((table, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between bg-white rounded-lg border border-slate-200 px-3 py-2"
            >
              <div>
                <span className="text-sm font-medium text-slate-900">{table.l}</span>
                {data.n && table.g && table.g.length > 0 && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    {table.g.join(', ')}
                  </p>
                )}
              </div>
              <span className="text-xs text-slate-400">
                {table.o}/{table.c} seated
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TableSVG({ table, showNames }: { table: TableData; showNames: boolean }) {
  const isRound = table.s === 'round' || table.s === 'cocktail';
  const fillPct = table.c > 0 ? table.o / table.c : 0;

  return (
    <g transform={`translate(${table.x}, ${table.y}) rotate(${table.r})`}>
      {/* Table shape */}
      {isRound ? (
        <circle
          r={table.w / 2}
          fill="#f8fafc"
          stroke="#94a3b8"
          strokeWidth={1}
        />
      ) : (
        <rect
          x={-table.w / 2}
          y={-table.h / 2}
          width={table.w}
          height={table.h}
          rx={4}
          fill="#f8fafc"
          stroke="#94a3b8"
          strokeWidth={1}
        />
      )}

      {/* Table label */}
      <text
        x={0}
        y={-4}
        textAnchor="middle"
        fontSize={10}
        fontWeight={600}
        fill="#475569"
        fontFamily="system-ui, sans-serif"
      >
        {table.l}
      </text>

      {/* Occupancy count */}
      <text
        x={0}
        y={10}
        textAnchor="middle"
        fontSize={9}
        fill={fillPct >= 1 ? '#16a34a' : '#94a3b8'}
        fontFamily="system-ui, sans-serif"
      >
        {table.o}/{table.c}
      </text>

      {/* Seat dots arranged around the table */}
      {Array.from({ length: table.c }).map((_, i) => {
        const angle = (2 * Math.PI * i) / table.c - Math.PI / 2;
        const radius = isRound
          ? table.w / 2 + 14
          : Math.max(table.w, table.h) / 2 + 14;
        const sx = Math.cos(angle) * radius;
        const sy = Math.sin(angle) * radius;
        const isOccupied = i < table.o;

        return (
          <g key={i}>
            <circle
              cx={sx}
              cy={sy}
              r={8}
              fill={isOccupied ? '#DBEAFE' : '#ffffff'}
              stroke={isOccupied ? '#2563EB' : '#cbd5e1'}
              strokeWidth={1}
            />
            {showNames && table.g && table.g[i] && (
              <text
                x={sx}
                y={sy + 18}
                textAnchor="middle"
                fontSize={7}
                fill="#334155"
                fontFamily="system-ui, sans-serif"
              >
                {table.g[i].split(' ')[0]}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
}
