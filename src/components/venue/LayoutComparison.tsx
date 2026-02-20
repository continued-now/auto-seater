'use client';

import type { VenueConfig } from '@/types/venue';
import type { LayoutChange } from '@/types/layout-advisor';

interface LayoutComparisonProps {
  currentConfig: VenueConfig;
  suggestedChanges: LayoutChange[];
  summary: string;
}

const PREVIEW_W = 280;
const PREVIEW_H = 200;

function MiniLayout({
  config,
  label,
  changedIds,
}: {
  config: VenueConfig;
  label: string;
  changedIds?: Set<string>;
}) {
  const PX_PER_FT = 15;
  const PX_PER_M = 30;
  const ppu = config.unit === 'ft' ? PX_PER_FT : PX_PER_M;
  const roomWPx = config.roomWidth * ppu;
  const roomHPx = config.roomLength * ppu;
  const scaleX = PREVIEW_W / (roomWPx || 1);
  const scaleY = PREVIEW_H / (roomHPx || 1);
  const scale = Math.min(scaleX, scaleY) * 0.9;
  const ox = (PREVIEW_W - roomWPx * scale) / 2;
  const oy = (PREVIEW_H - roomHPx * scale) / 2;

  return (
    <div>
      <p className="text-xs font-medium text-slate-500 mb-1">{label}</p>
      <div
        className="bg-slate-50 border border-slate-200 rounded-lg relative overflow-hidden"
        style={{ width: PREVIEW_W, height: PREVIEW_H }}
      >
        {/* Room */}
        <div
          className="absolute border border-slate-300 bg-white"
          style={{ left: ox, top: oy, width: roomWPx * scale, height: roomHPx * scale }}
        />

        {/* Tables */}
        {config.tables.map((t) => {
          const isChanged = changedIds?.has(t.id);
          return (
            <div
              key={t.id}
              className={`absolute border ${isChanged ? 'border-teal-500 bg-teal-100/50' : 'border-slate-400 bg-slate-100/50'} ${
                t.shape === 'round' || t.shape === 'cocktail' ? 'rounded-full' : 'rounded-sm'
              }`}
              style={{
                left: ox + t.position.x * scale - (t.width * scale) / 2,
                top: oy + t.position.y * scale - (t.height * scale) / 2,
                width: t.width * scale,
                height: t.height * scale,
              }}
            >
              <span className="absolute inset-0 flex items-center justify-center text-[7px] text-slate-500 truncate">
                {t.label}
              </span>
            </div>
          );
        })}

        {/* Fixtures */}
        {config.fixtures.map((f) => {
          const isChanged = changedIds?.has(f.id);
          return (
            <div
              key={f.id}
              className={`absolute border rounded-sm ${isChanged ? 'border-teal-500 bg-teal-100/50' : 'border-slate-500 bg-slate-200/50'}`}
              style={{
                left: ox + f.position.x * scale - (f.width * scale) / 2,
                top: oy + f.position.y * scale - (f.height * scale) / 2,
                width: f.width * scale,
                height: f.height * scale,
              }}
            >
              <span className="absolute inset-0 flex items-center justify-center text-[7px] text-slate-500 truncate">
                {f.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function LayoutComparison({ currentConfig, suggestedChanges, summary }: LayoutComparisonProps) {
  // Build the suggested config by applying changes
  const suggestedConfig: VenueConfig = {
    ...currentConfig,
    tables: currentConfig.tables.map((t) => {
      const change = suggestedChanges.find((c) => c.objectId === t.id && c.objectType === 'table');
      if (!change) return t;
      return {
        ...t,
        position: { ...change.newPosition },
        rotation: change.newRotation ?? t.rotation,
      };
    }),
    fixtures: currentConfig.fixtures.map((f) => {
      const change = suggestedChanges.find((c) => c.objectId === f.id && c.objectType === 'fixture');
      if (!change) return f;
      return {
        ...f,
        position: { ...change.newPosition },
        rotation: change.newRotation ?? f.rotation,
      };
    }),
  };

  const changedIds = new Set(suggestedChanges.map((c) => c.objectId));

  return (
    <div>
      <div className="flex gap-4 justify-center">
        <MiniLayout config={currentConfig} label="Current Layout" />
        <MiniLayout config={suggestedConfig} label="Suggested Layout" changedIds={changedIds} />
      </div>
      <p className="text-xs text-slate-500 text-center mt-3">{summary}</p>
    </div>
  );
}
