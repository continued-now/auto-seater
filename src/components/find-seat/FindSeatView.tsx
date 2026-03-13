'use client';

import { useMemo } from 'react';
import type { SeatData, SeatTableData } from '@/lib/seat-encoder';

interface FindSeatViewProps {
  data: SeatData;
}

export default function FindSeatView({ data }: FindSeatViewProps) {
  const pxPerUnit = data.u === 'ft' ? 15 : 30;
  const roomWidthPx = data.rw * pxPerUnit;
  const roomHeightPx = data.rl * pxPerUnit;

  const bounds = useMemo(() => {
    if (data.tables.length === 0) {
      return { minX: 0, minY: 0, maxX: roomWidthPx, maxY: roomHeightPx };
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const t of data.tables) {
      minX = Math.min(minX, t.x - t.w / 2);
      minY = Math.min(minY, t.y - t.h / 2);
      maxX = Math.max(maxX, t.x + t.w / 2);
      maxY = Math.max(maxY, t.y + t.h / 2);
    }
    minX = Math.min(minX, 0);
    minY = Math.min(minY, 0);
    maxX = Math.max(maxX, roomWidthPx);
    maxY = Math.max(maxY, roomHeightPx);

    return { minX, minY, maxX, maxY };
  }, [data.tables, roomWidthPx, roomHeightPx]);

  const viewWidth = bounds.maxX - bounds.minX + 60;
  const viewHeight = bounds.maxY - bounds.minY + 60;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-start px-4 py-8">
      {/* Main card */}
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden">
        {/* Greeting header */}
        <div className="px-6 pt-6 pb-4 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center mb-3">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0D9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-900">
            Hi {data.name}!
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            You&apos;re at <span className="font-semibold text-teal-700">{data.table}</span>
          </p>
        </div>

        {/* Divider */}
        <div className="mx-6 border-t border-slate-100" />

        {/* Mini floor plan */}
        <div className="p-4">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 text-center">
            Floor Plan
          </p>
          <svg
            viewBox={`${bounds.minX - 30} ${bounds.minY - 30} ${viewWidth} ${viewHeight}`}
            className="w-full rounded-xl border border-slate-100 bg-slate-50"
            style={{ maxHeight: '50vh' }}
          >
            {/* Pulse animation definition */}
            <defs>
              <style>{`
                @keyframes seat-pulse {
                  0%, 100% { opacity: 1; }
                  50% { opacity: 0.6; }
                }
                .highlighted-table {
                  animation: seat-pulse 2s ease-in-out infinite;
                }
              `}</style>
            </defs>

            {/* Room background */}
            <rect
              x={0}
              y={0}
              width={roomWidthPx}
              height={roomHeightPx}
              fill="#ffffff"
              stroke="#e2e8f0"
              strokeWidth={1}
              rx={4}
            />

            {/* All tables */}
            {data.tables.map((table, idx) => (
              <MiniTableSVG key={idx} table={table} />
            ))}
          </svg>
        </div>

        {/* Footer hint */}
        <div className="px-6 pb-5 pt-1 text-center">
          <p className="text-xs text-slate-400">
            Your table is highlighted in teal
          </p>
        </div>
      </div>

      {/* Branding */}
      <p className="text-xs text-slate-300 mt-6">
        Powered by AutoSeater
      </p>
    </div>
  );
}

function MiniTableSVG({ table }: { table: SeatTableData }) {
  const isRound = table.s === 'round' || table.s === 'cocktail';
  const isHighlighted = table.hl;

  const fillColor = isHighlighted ? '#CCFBF1' : '#f1f5f9';
  const strokeColor = isHighlighted ? '#0D9488' : '#cbd5e1';
  const strokeWidth = isHighlighted ? 2 : 1;
  const labelColor = isHighlighted ? '#0D9488' : '#94a3b8';
  const labelWeight = isHighlighted ? 700 : 500;

  return (
    <g
      transform={`translate(${table.x}, ${table.y}) rotate(${table.r})`}
      className={isHighlighted ? 'highlighted-table' : ''}
    >
      {isRound ? (
        <circle
          r={table.w / 2}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
        />
      ) : (
        <rect
          x={-table.w / 2}
          y={-table.h / 2}
          width={table.w}
          height={table.h}
          rx={4}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
        />
      )}

      {/* Table label */}
      <text
        x={0}
        y={4}
        textAnchor="middle"
        fontSize={10}
        fontWeight={labelWeight}
        fill={labelColor}
        fontFamily="system-ui, sans-serif"
      >
        {table.l}
      </text>
    </g>
  );
}
