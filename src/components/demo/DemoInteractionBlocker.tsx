'use client';

import { useSeatingStore } from '@/stores/useSeatingStore';

export function DemoInteractionBlocker() {
  const isDemoMode = useSeatingStore((s) => s.isDemoMode);

  if (!isDemoMode) return null;

  return (
    <div
      className="absolute inset-0 z-40"
      style={{ pointerEvents: 'all' }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    />
  );
}
