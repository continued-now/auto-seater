'use client';

import { useState, useRef, useCallback, useEffect, useSyncExternalStore } from 'react';
import { Undo2, Redo2, Play, X, FolderOpen, Calendar, Zap, ChevronDown, Plus, Trash2 } from 'lucide-react';
import { useSeatingStore } from '@/stores/useSeatingStore';
import { Button } from './ui/Button';
import { Tooltip, TooltipProvider } from './ui/Tooltip';
import { UpgradeDialog } from './ui/UpgradeDialog';
import { toast } from 'sonner';
import { exportProject, importProject } from '@/lib/project-io';
import { listEvents, type EventMeta } from '@/lib/event-storage';
import { ProgressDashboard } from './ProgressDashboard';

export function Header() {
  const lastSavedAt = useSeatingStore((s) => s.lastSavedAt);
  const isDemoMode = useSeatingStore((s) => s.isDemoMode);
  const startDemo = useSeatingStore((s) => s.startDemo);
  const exitDemo = useSeatingStore((s) => s.exitDemo);
  const store = useSeatingStore;

  const guests = useSeatingStore((s) => s.guests);
  const households = useSeatingStore((s) => s.households);
  const socialCircles = useSeatingStore((s) => s.socialCircles);
  const venue = useSeatingStore((s) => s.venue);
  const constraints = useSeatingStore((s) => s.constraints);
  const templates = useSeatingStore((s) => s.templates);
  const loadSnapshot = useSeatingStore((s) => s.loadSnapshot);

  const eventDate = useSeatingStore((s) => s.eventDate);
  const setEventDate = useSeatingStore((s) => s.setEventDate);

  const eventName = useSeatingStore((s) => s.eventName);
  const setEventName = useSeatingStore((s) => s.setEventName);
  const currentEventId = useSeatingStore((s) => s.currentEventId);
  const switchEvent = useSeatingStore((s) => s.switchEvent);
  const createNewEvent = useSeatingStore((s) => s.createNewEvent);
  const deleteEventAction = useSeatingStore((s) => s.deleteEvent);

  const userTier = useSeatingStore((s) => s.userTier);
  const [showProjectMenu, setShowProjectMenu] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [showEventMenu, setShowEventMenu] = useState(false);
  const [events, setEvents] = useState<EventMeta[]>([]);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(eventName);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showEventMenu) {
      listEvents().then(setEvents);
    }
  }, [showEventMenu]);

  useEffect(() => {
    if (editingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [editingName]);

  const handleNameSave = useCallback(() => {
    const trimmed = nameInput.trim();
    if (trimmed && trimmed !== eventName) {
      setEventName(trimmed);
    }
    setEditingName(false);
  }, [nameInput, eventName, setEventName]);

  const handleSwitchEvent = useCallback(async (id: string) => {
    setShowEventMenu(false);
    await switchEvent(id);
    toast.success('Event loaded');
  }, [switchEvent]);

  const handleNewEvent = useCallback(async () => {
    setShowEventMenu(false);
    await createNewEvent('Untitled Event');
    setNameInput('Untitled Event');
    toast.success('New event created');
  }, [createNewEvent]);

  const handleDeleteEvent = useCallback(async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    await deleteEventAction(id);
    setEvents((prev) => prev.filter((e) => e.id !== id));
    toast.success(`"${name}" deleted`);
  }, [deleteEventAction]);

  const handleUndo = () => store.temporal.getState().undo();
  const handleRedo = () => store.temporal.getState().redo();

  const canUndo = useSyncExternalStore(
    store.temporal.subscribe,
    () => store.temporal.getState().pastStates.length > 0,
    () => false,
  );
  const canRedo = useSyncExternalStore(
    store.temporal.subscribe,
    () => store.temporal.getState().futureStates.length > 0,
    () => false,
  );

  const handleExport = () => {
    exportProject({ guests, households, socialCircles, venue, constraints, templates });
    setShowProjectMenu(false);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
    setShowProjectMenu(false);
  };

  const handleCopyGuestList = useCallback(async () => {
    if (guests.length === 0) {
      toast.error('No guests to copy');
      setShowProjectMenu(false);
      return;
    }
    const lines = guests.map((g) => {
      const parts = [g.name];
      if (g.rsvpStatus !== 'pending') parts.push(`(${g.rsvpStatus})`);
      const table = venue.tables.find((t) => t.assignedGuestIds.includes(g.id));
      if (table) parts.push(`→ ${table.label}`);
      if (g.dietaryTags.length > 0) parts.push(`[${g.dietaryTags.join(', ')}]`);
      return parts.join(' ');
    });
    const text = `Guest List (${guests.length} guests)\n${'─'.repeat(30)}\n${lines.join('\n')}`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Guest list copied to clipboard');
    } catch {
      toast.error('Failed to copy to clipboard');
    }
    setShowProjectMenu(false);
  }, [guests, venue.tables, setShowProjectMenu]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const snapshot = await importProject(file);
      loadSnapshot(snapshot);
      toast.success('Project loaded successfully');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load project');
    }
    e.target.value = '';
  };

  return (
    <header className="flex items-center justify-between border-b border-border bg-white px-3 py-2 sm:px-6 sm:py-3 shrink-0">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <h1 className="text-base sm:text-lg font-bold text-foreground tracking-tight truncate">AutoSeater</h1>
        {isDemoMode && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 text-xs font-medium text-primary shrink-0">
            Demo
          </span>
        )}
        {!isDemoMode && userTier === 'pro' && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 text-xs font-semibold text-emerald-700 border border-emerald-200 shrink-0">
            PRO
          </span>
        )}
        {!isDemoMode && userTier === 'free' && (
          <button
            onClick={() => setUpgradeOpen(true)}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-xs font-semibold text-amber-700 border border-amber-200 shrink-0 hover:bg-amber-100 transition-colors cursor-pointer"
          >
            <Zap size={10} /> Upgrade
          </button>
        )}
        {!isDemoMode && (
          <div className="flex items-center gap-1 ml-2">
            <span className="text-slate-300 hidden sm:inline">|</span>
            {editingName ? (
              <input
                ref={nameInputRef}
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onBlur={handleNameSave}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleNameSave();
                  if (e.key === 'Escape') { setEditingName(false); setNameInput(eventName); }
                }}
                className="text-sm font-medium text-slate-700 bg-transparent border-b border-blue-400 outline-none px-0.5 w-36"
              />
            ) : (
              <button
                onClick={() => { setNameInput(eventName); setEditingName(true); }}
                className="text-sm font-medium text-slate-600 hover:text-slate-900 truncate max-w-[140px] cursor-pointer"
                title="Click to rename event"
              >
                {eventName}
              </button>
            )}
            <div className="relative">
              <button
                onClick={() => setShowEventMenu(!showEventMenu)}
                className="p-0.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <ChevronDown size={14} />
              </button>
              {showEventMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowEventMenu(false)} />
                  <div className="absolute left-0 top-full mt-1 z-20 bg-white rounded-lg shadow-lg border border-slate-200 py-1 min-w-[220px]">
                    <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Events</div>
                    {events.length === 0 && (
                      <div className="px-3 py-2 text-xs text-slate-400">No saved events</div>
                    )}
                    {events.map((evt) => (
                      <div
                        key={evt.id}
                        className={`flex items-center gap-2 px-3 py-2 hover:bg-slate-50 group ${evt.id === currentEventId ? 'bg-blue-50' : ''}`}
                      >
                        <button
                          onClick={() => handleSwitchEvent(evt.id)}
                          className="flex-1 text-left min-w-0 cursor-pointer"
                        >
                          <div className="text-sm text-slate-700 truncate">{evt.name}</div>
                          <div className="text-[10px] text-slate-400">
                            {new Date(evt.updatedAt).toLocaleDateString()}
                          </div>
                        </button>
                        {evt.id !== currentEventId && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteEvent(evt.id, evt.name); }}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-slate-300 hover:text-red-500 transition-opacity cursor-pointer"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    ))}
                    <div className="border-t border-slate-100 mt-1 pt-1">
                      <button
                        onClick={handleNewEvent}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 cursor-pointer"
                      >
                        <Plus size={14} /> New Event
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {isDemoMode ? (
          <Button variant="ghost" size="sm" onClick={exitDemo}>
            <X size={14} />
            <span className="hidden sm:inline">Exit Demo</span>
          </Button>
        ) : (
          <>
            <Button variant="secondary" size="sm" onClick={startDemo} className="hidden sm:inline-flex">
              <Play size={14} />
              See How It Works
            </Button>
            <Button variant="secondary" size="sm" onClick={startDemo} className="sm:hidden" aria-label="Demo">
              <Play size={14} />
            </Button>
            {/* Event date */}
            <div className="flex items-center gap-1.5">
              <Calendar size={14} className="text-slate-400" />
              <input
                type="date"
                value={eventDate ?? ''}
                onChange={(e) => setEventDate(e.target.value || null)}
                className="text-xs text-slate-600 bg-transparent border-none focus:outline-none cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute"
                style={{ width: eventDate ? 'auto' : '70px' }}
                title="Set event date"
              />
              {!eventDate && (
                <span className="text-xs text-slate-400">Set date</span>
              )}
              {eventDate && (() => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const event = new Date(eventDate + 'T00:00:00');
                const diffDays = Math.ceil((event.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                if (diffDays < 0) return <span className="text-xs text-slate-400">Past event</span>;
                if (diffDays === 0) return <span className="text-xs font-medium text-emerald-600">Today!</span>;
                if (diffDays === 1) return <span className="text-xs text-amber-600">Tomorrow</span>;
                if (diffDays <= 7) return <span className="text-xs text-amber-600">{diffDays}d away</span>;
                return <span className="text-xs text-slate-400">{diffDays}d away</span>;
              })()}
            </div>
            <ProgressDashboard />
            <div className="w-px h-6 bg-border mx-0.5 sm:mx-1 hidden sm:block" />
            {/* Project menu */}
            <div className="relative">
              <Button variant="ghost" size="sm" onClick={() => setShowProjectMenu(!showProjectMenu)}>
                <FolderOpen size={14} />
                <span className="hidden sm:inline ml-1">Project</span>
              </Button>
              {showProjectMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowProjectMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 z-20 bg-white rounded-lg shadow-lg border border-slate-200 py-1 min-w-[160px]">
                    <button
                      onClick={handleExport}
                      className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      Save Project File
                    </button>
                    <button
                      onClick={handleImportClick}
                      className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      Load Project File
                    </button>
                  </div>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleFileChange}
            />
            <SaveIndicator lastSavedAt={lastSavedAt} />
            <div className="w-px h-6 bg-border mx-0.5 sm:mx-1 hidden sm:block" />
            <TooltipProvider>
              <Tooltip content="Undo (Cmd+Z)">
                <Button variant="ghost" size="sm" onClick={handleUndo} disabled={!canUndo} aria-label="Undo">
                  <Undo2 size={16} />
                </Button>
              </Tooltip>
              <Tooltip content="Redo (Cmd+Shift+Z)">
                <Button variant="ghost" size="sm" onClick={handleRedo} disabled={!canRedo} aria-label="Redo">
                  <Redo2 size={16} />
                </Button>
              </Tooltip>
            </TooltipProvider>
          </>
        )}
      </div>
      <UpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} />
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
