'use client';

import { useEffect, useRef } from 'react';
import { X, Link, Unlink } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import type { ConstraintViolation, Constraint } from '@/types/constraint';
import type { Guest } from '@/types/guest';
import type { Table } from '@/types/venue';

interface ViolationDetailsPanelProps {
  violations: ConstraintViolation[];
  constraints: Constraint[];
  guests: Guest[];
  tables: Table[];
  onClose: () => void;
}

export function ViolationDetailsPanel({
  violations,
  constraints,
  guests,
  tables,
  onClose,
}: ViolationDetailsPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const constraintMap = new Map(constraints.map((c) => [c.id, c]));

  return (
    <div
      ref={panelRef}
      className="absolute top-12 right-3 z-20 w-80 bg-white rounded-xl border border-slate-200 shadow-xl animate-in fade-in slide-in-from-top-2 duration-150"
    >
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-100">
        <h4 className="text-sm font-semibold text-slate-900">
          {violations.length} Violation{violations.length !== 1 ? 's' : ''}
        </h4>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X size={14} />
        </button>
      </div>
      <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
        {violations.map((v, i) => {
          const constraint = constraintMap.get(v.constraintId);
          const isMustNotSit = constraint?.type === 'must-not-sit-together';
          return (
            <div key={`${v.constraintId}-${v.tableId}-${i}`} className="px-3 py-2.5 hover:bg-slate-50 transition-colors">
              <div className="flex items-start gap-2">
                <div className="mt-0.5 shrink-0">
                  {isMustNotSit ? (
                    <div className="w-5 h-5 rounded-full bg-red-50 flex items-center justify-center">
                      <X size={10} className="text-red-600" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-amber-50 flex items-center justify-center">
                      <Unlink size={10} className="text-amber-600" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-700 leading-relaxed">{v.message}</p>
                  {constraint?.reason && (
                    <p className="text-[11px] text-slate-400 mt-0.5">Reason: {constraint.reason}</p>
                  )}
                  <div className="mt-1">
                    <Badge
                      color={isMustNotSit ? '#DC2626' : '#D97706'}
                      bgColor={isMustNotSit ? '#FEE2E2' : '#FEF3C7'}
                    >
                      {isMustNotSit ? (
                        <><Unlink size={8} className="mr-0.5" /> must not sit together</>
                      ) : (
                        <><Link size={8} className="mr-0.5" /> must sit together</>
                      )}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
