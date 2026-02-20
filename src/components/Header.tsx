'use client';

import { Undo2, Redo2 } from 'lucide-react';
import { useSeatingStore } from '@/stores/useSeatingStore';
import { Button } from './ui/Button';
import { Tooltip, TooltipProvider } from './ui/Tooltip';

export function Header() {
  const lastSavedAt = useSeatingStore((s) => s.lastSavedAt);
  const store = useSeatingStore;

  const handleUndo = () => store.temporal.getState().undo();
  const handleRedo = () => store.temporal.getState().redo();

  return (
    <header className="flex items-center justify-between border-b border-border bg-white px-6 py-3">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-bold text-foreground tracking-tight">AutoSeater</h1>
      </div>

      <div className="flex items-center gap-2">
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
