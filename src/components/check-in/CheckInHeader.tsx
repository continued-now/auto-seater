'use client';

import { Button } from '@/components/ui/Button';
import { ArrowLeft, QrCode } from 'lucide-react';
import type { CheckInStats } from '@/lib/check-in-utils';

interface CheckInHeaderProps {
  stats: CheckInStats;
  onExit: () => void;
  onExportQRBadges?: () => void;
}

export function CheckInHeader({ stats, onExit, onExportQRBadges }: CheckInHeaderProps) {
  return (
    <div className="bg-white border-b border-slate-200 px-4 py-3">
      <div className="max-w-2xl mx-auto flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onExit}
          className="flex-shrink-0"
        >
          <ArrowLeft size={16} />
          <span className="ml-1">Exit</span>
        </Button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-semibold text-slate-900">
              {stats.arrived}/{stats.total} arrived
            </span>
            <span className="text-sm font-medium text-slate-500">
              {stats.percentage}%
            </span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${stats.percentage}%`,
                backgroundColor: '#0891B2',
              }}
            />
          </div>
        </div>

        <div className="flex-shrink-0 flex items-center gap-2">
          {onExportQRBadges && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onExportQRBadges}
              className="text-slate-500 hover:text-slate-700"
            >
              <QrCode size={16} />
              <span className="ml-1 hidden sm:inline">QR Badges</span>
            </Button>
          )}
          <div className="text-xs text-slate-400">
            {stats.pending} pending
          </div>
        </div>
      </div>
    </div>
  );
}
