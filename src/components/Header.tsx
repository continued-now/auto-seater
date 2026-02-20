'use client';

import { Undo2, Redo2, Play, X } from 'lucide-react';
import { useSeatingStore } from '@/stores/useSeatingStore';
import { Button } from './ui/Button';
import { Tooltip, TooltipProvider } from './ui/Tooltip';

export function Header() {
  const lastSavedAt = useSeatingStore((s) => s.lastSavedAt);
  const isDemoMode = useSeatingStore((s) => s.isDemoMode);
  const startDemo = useSeatingStore((s) => s.startDemo);
  const exitDemo = useSeatingStore((s) => s.exitDemo);
  const store = useSeatingStore;

  const handleUndo = () => store.temporal.getState().undo();
  const handleRedo = () => store.temporal.getState().redo();

  return (
    <header className="flex items-center justify-between border-b border-border bg-white px-6 py-3">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-bold text-foreground tracking-tight">AutoSeater</h1>
        {isDemoMode && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 text-xs font-medium text-primary">
            Demo Mode
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {isDemoMode ? (
          <Button variant="ghost" size="sm" onClick={exitDemo}>
            <X size={14} />
            Exit Demo
          </Button>
        ) : (
          <>
            <Button variant="secondary" size="sm" onClick={startDemo}>
              <Play size={14} />
              See How It Works
            </Button>
            <SaveIndicator lastSavedAt={lastSavedAt} />
            <div className="w-px h-6 bg-border mx-1" />
            <TooltipProvider>
              <Tooltip content="Undo (Cmd+Z)">
                <Button variant="ghost" size="sm" onClick={handleUndo} aria-label="Undo">
                  <Undo2 size={16} />
                </Button>
              </Tooltip>
              <Tooltip content="Redo (Cmd+Shift+Z)">
                <Button variant="ghost" size="sm" onClick={handleRedo} aria-label="Redo">
                  <Redo2 size={16} />
                </Button>
              </Tooltip>
            </TooltipProvider>
          </>
        )}
      </div>
    </header>
  );
}

function SaveIndicator({ lastSavedAt }: { lastSavedAt: number | null }) {
  if (!lastSavedAt) return null;

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <div className="h-1.5 w-1.5 rounded-full bg-success" />
      <span>Saved</span>
    </div>
  );
}
