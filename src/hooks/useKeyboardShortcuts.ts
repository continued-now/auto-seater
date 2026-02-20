'use client';

import { useEffect } from 'react';
import { useSeatingStore } from '@/stores/useSeatingStore';

export function useKeyboardShortcuts() {
  const store = useSeatingStore;

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isMod = e.metaKey || e.ctrlKey;

      // Undo: Cmd+Z
      if (isMod && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        store.temporal.getState().undo();
      }

      // Redo: Cmd+Shift+Z
      if (isMod && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        store.temporal.getState().redo();
      }

      // Skip shortcuts when input is focused
      if (isInputFocused()) return;

      const state = useSeatingStore.getState();

      // Escape — cancel wall drawing or deselect
      if (e.key === 'Escape') {
        e.preventDefault();
        if (state.canvasToolMode === 'draw-wall') {
          state.setCanvasToolMode('select');
        } else if (state.selectedElementId || state.selectedTableId) {
          state.clearSelection();
        }
        return;
      }

      // Delete/Backspace — delete selected element on venue step
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (state.currentStep === 'venue' && state.selectedElementId && state.selectedElementType) {
          e.preventDefault();
          const id = state.selectedElementId;
          const type = state.selectedElementType;
          if (type === 'table') state.deleteTable(id);
          else if (type === 'fixture') state.deleteFixture(id);
          else if (type === 'wall') state.deleteWall(id);
          return;
        }
        // Fall back to deleting selected guests
        const selectedIds = state.selectedGuestIds;
        if (selectedIds.length > 0) {
          e.preventDefault();
          state.deleteGuests(selectedIds);
        }
        return;
      }

      // W — toggle wall draw tool (venue step only)
      if (e.key === 'w' || e.key === 'W') {
        if (state.currentStep === 'venue') {
          e.preventDefault();
          state.setCanvasToolMode(state.canvasToolMode === 'draw-wall' ? 'select' : 'draw-wall');
        }
        return;
      }

      // V — switch to select tool
      if (e.key === 'v' || e.key === 'V') {
        if (state.currentStep === 'venue') {
          e.preventDefault();
          state.setCanvasToolMode('select');
        }
        return;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}

function isInputFocused(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || (el as HTMLElement).isContentEditable;
}
