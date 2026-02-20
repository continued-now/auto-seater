'use client';

import type { VenueConfig } from '@/types/venue';
import type { LayoutIssue } from '@/types/layout-advisor';

interface BottleneckOverlayProps {
  config: VenueConfig;
  issues: LayoutIssue[];
  highlightedIssueId: string | null;
}

const PREVIEW_W = 360;
const PREVIEW_H = 260;

const SEVERITY_COLORS: Record<string, { bg: string; border: string }> = {
  critical: { bg: 'bg-red-500/20', border: 'border-red-500' },
  warning: { bg: 'bg-amber-500/15', border: 'border-amber-500' },
  info: { bg: 'bg-blue-500/10', border: 'border-blue-500' },
};

export default function BottleneckOverlay({ config, issues, highlightedIssueId }: BottleneckOverlayProps) {
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
    <div
      className="bg-slate-50 border border-slate-200 rounded-lg relative overflow-hidden"
      style={{ width: PREVIEW_W, height: PREVIEW_H }}
    >
      {/* Room boundary */}
      <div
        className="absolute border border-slate-300 bg-white"
        style={{ left: ox, top: oy, width: roomWPx * scale, height: roomHPx * scale }}
      />

      {/* Tables */}
      {config.tables.map((t) => (
        <div
          key={t.id}
          className={`absolute border border-slate-400 bg-slate-100/50 ${
            t.shape === 'round' || t.shape === 'cocktail' ? 'rounded-full' : 'rounded-sm'
          }`}
          style={{
            left: ox + t.position.x * scale - (t.width * scale) / 2,
            top: oy + t.position.y * scale - (t.height * scale) / 2,
            width: t.width * scale,
            height: t.height * scale,
          }}
        />
      ))}

      {/* Fixtures */}
      {config.fixtures.map((f) => (
        <div
          key={f.id}
          className="absolute border border-slate-500 bg-slate-200/50 rounded-sm"
          style={{
            left: ox + f.position.x * scale - (f.width * scale) / 2,
            top: oy + f.position.y * scale - (f.height * scale) / 2,
            width: f.width * scale,
            height: f.height * scale,
          }}
        />
      ))}

      {/* Issue zones */}
      {issues.map((issue, idx) => {
        const colors = SEVERITY_COLORS[issue.severity] || SEVERITY_COLORS.info;
        const isHighlighted = issue.id === highlightedIssueId;

        return (
          <div
            key={issue.id}
            className={`absolute ${colors.bg} border ${colors.border} rounded ${
              isHighlighted ? 'border-2 opacity-100' : 'border opacity-70'
            }`}
            style={{
              left: ox + issue.zone.x * scale,
              top: oy + issue.zone.y * scale,
              width: issue.zone.width * scale,
              height: issue.zone.height * scale,
            }}
          >
            <span className="absolute top-0.5 left-1 text-[10px] font-bold text-slate-700">
              {idx + 1}
            </span>
          </div>
        );
      })}
    </div>
  );
}
