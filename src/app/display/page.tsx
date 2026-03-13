'use client';

import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { decodeFloorPlanData } from '@/lib/share-encoder';
import { useSeatingStore } from '@/stores/useSeatingStore';
import DisplayView from '@/components/display/DisplayView';
import type { FloorPlanData } from '@/components/display/DisplayView';

/* ------------------------------------------------------------------ */
/*  Page wrapper (Suspense boundary for useSearchParams)               */
/* ------------------------------------------------------------------ */

export default function DisplayPage() {
  return (
    <Suspense
      fallback={
        <div
          className="min-h-screen flex items-center justify-center"
          style={{ background: '#0f172a' }}
        >
          <div className="w-8 h-8 border-2 border-slate-600 border-t-teal-500 rounded-full animate-spin" />
        </div>
      }
    >
      <DisplayPageInner />
    </Suspense>
  );
}

/* ------------------------------------------------------------------ */
/*  Inner component – resolves data source then renders DisplayView    */
/* ------------------------------------------------------------------ */

function DisplayPageInner() {
  const searchParams = useSearchParams();
  const encodedParam = searchParams.get('data');

  const [decodedData, setDecodedData] = useState<FloorPlanData | null>(null);
  const [error, setError] = useState(false);
  const [source, setSource] = useState<'encoded' | 'store' | null>(null);

  // -- Store data (used as fallback when no ?data= param) --
  const venue = useSeatingStore((s) => s.venue);
  const guests = useSeatingStore((s) => s.guests);

  // Decode from URL param
  useEffect(() => {
    if (encodedParam) {
      const decoded = decodeFloorPlanData(encodedParam);
      if (decoded) {
        setDecodedData(decoded);
        setSource('encoded');
      } else {
        setError(true);
      }
    } else {
      setSource('store');
    }
  }, [encodedParam]);

  // Convert store state into FloorPlanData
  const storeData = useMemo((): FloorPlanData | null => {
    if (source !== 'store') return null;
    if (!venue || venue.tables.length === 0) return null;

    const guestMap = new Map<string, string>();
    for (const g of guests) {
      guestMap.set(g.id, g.name);
    }

    return {
      v: 1,
      rw: venue.roomWidth,
      rl: venue.roomLength,
      u: venue.unit,
      n: true,
      t: venue.tables.map((table) => ({
        l: table.label,
        s: table.shape,
        x: Math.round(table.position.x),
        y: Math.round(table.position.y),
        w: Math.round(table.width),
        h: Math.round(table.height),
        r: Math.round(table.rotation),
        c: table.capacity,
        o: table.assignedGuestIds.length,
        g: table.assignedGuestIds
          .map((id) => guestMap.get(id) ?? '')
          .filter(Boolean),
      })),
    };
  }, [source, venue, guests]);

  // ---- Error state ----
  if (error) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ background: '#0f172a' }}
      >
        <div className="text-center max-w-xs">
          <div
            className="mx-auto w-14 h-14 rounded-xl flex items-center justify-center mb-4"
            style={{ background: '#1e293b' }}
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#94a3b8"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <h1 className="text-lg font-semibold text-slate-100 mb-1">
            Invalid Display Data
          </h1>
          <p className="text-sm text-slate-400">
            The encoded data could not be read. Please generate a new display
            link.
          </p>
        </div>
      </div>
    );
  }

  // ---- Loading / no data ----
  const resolvedData = decodedData ?? storeData;

  if (!resolvedData) {
    if (source === 'store') {
      return (
        <div
          className="min-h-screen flex items-center justify-center p-4"
          style={{ background: '#0f172a' }}
        >
          <div className="text-center max-w-xs">
            <div
              className="mx-auto w-14 h-14 rounded-xl flex items-center justify-center mb-4"
              style={{ background: '#1e293b' }}
            >
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#94a3b8"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="3" y1="9" x2="21" y2="9" />
                <line x1="9" y1="21" x2="9" y2="9" />
              </svg>
            </div>
            <h1 className="text-lg font-semibold text-slate-100 mb-1">
              No Seating Data
            </h1>
            <p className="text-sm text-slate-400">
              Set up your venue and add tables first, then open the display
              mode.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: '#0f172a' }}
      >
        <div className="w-8 h-8 border-2 border-slate-600 border-t-teal-500 rounded-full animate-spin" />
      </div>
    );
  }

  return <DisplayView mode="encoded" data={resolvedData} />;
}
