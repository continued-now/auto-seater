'use client';

import { useState, useMemo, useCallback, useRef, useEffect, type DragEvent } from 'react';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';
import { useSeatingStore } from '@/stores/useSeatingStore';
import { useFeatureGate } from '@/hooks/useFeatureGate';
import { fireConfetti } from '@/lib/confetti';
import { UpgradeDialog } from '@/components/ui/UpgradeDialog';
import { ProBadge } from '@/components/ui/ProBadge';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Checkbox } from '@/components/ui/Checkbox';
import { Tooltip, TooltipProvider } from '@/components/ui/Tooltip';
import { ExportPanel } from '@/components/export/ExportPanel';
import { ViolationDetailsPanel } from './ViolationDetailsPanel';
import { ConflictWizard } from './ConflictWizard';
import { SeatingStatsPanel } from './SeatingStatsPanel';
import { rsvpStatusColors, dietaryTagColors } from '@/lib/colour-palette';
import { getSeatPositions, SEAT_RENDER_RADIUS } from '@/lib/table-geometry';
import type { Guest } from '@/types/guest';
import type { Table } from '@/types/venue';
import type { SeatingCanvasInnerHandle } from './SeatingCanvasInner';
import type Konva from 'konva';
import {
  Search,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Link,
  Unlink,
  Users,
  AlertTriangle,
  ChevronDown,
  GripVertical,
  UtensilsCrossed,
  X,
  LayoutGrid,
  Wand2,
  Eraser,
  ArrowLeftRight,
  Heart,
  Flame,
} from 'lucide-react';

const SeatingCanvasInner = dynamic(
  () => import('./SeatingCanvasInner').then((m) => ({ default: m.SeatingCanvasInner })),
  { ssr: false, loading: () => <div className="flex-1 bg-slate-100 animate-pulse" /> }
);

type FilterTab = 'all' | 'unseated' | 'seated';

export function SeatingStep() {
  const guests = useSeatingStore((s) => s.guests);
  const venue = useSeatingStore((s) => s.venue);
  const constraints = useSeatingStore((s) => s.constraints);
  const searchQuery = useSeatingStore((s) => s.searchQuery);
  const setSearchQuery = useSeatingStore((s) => s.setSearchQuery);
  const selectedGuestIds = useSeatingStore((s) => s.selectedGuestIds);
  const setSelectedGuestIds = useSeatingStore((s) => s.setSelectedGuestIds);
  const toggleGuestSelection = useSeatingStore((s) => s.toggleGuestSelection);
  const zoom = useSeatingStore((s) => s.zoom);
  const setZoom = useSeatingStore((s) => s.setZoom);
  const assignGuestToTable = useSeatingStore((s) => s.assignGuestToTable);
  const unassignGuest = useSeatingStore((s) => s.unassignGuest);
  const addConstraint = useSeatingStore((s) => s.addConstraint);
  const bulkAssignToTable = useSeatingStore((s) => s.bulkAssignToTable);
  const autoAssignGuests = useSeatingStore((s) => s.autoAssignGuests);
  const clearAllAssignments = useSeatingStore((s) => s.clearAllAssignments);
  const getViolations = useSeatingStore((s) => s.getViolations);
  const setCurrentStep = useSeatingStore((s) => s.setCurrentStep);
  const swapGuests = useSeatingStore((s) => s.swapGuests);

  const { canAccess, requirePro, upgradeOpen, setUpgradeOpen, upgradeFeature } = useFeatureGate();

  const filterTab = useSeatingStore((s) => s.seatingFilterTab);
  const setFilterTab = useSeatingStore((s) => s.setSeatingFilterTab);
  const [showConstraints, setShowConstraints] = useState(true);
  const [showViolationPanel, setShowViolationPanel] = useState(false);
  const [showConflictWizard, setShowConflictWizard] = useState(false);
  const [draggedGuestId, setDraggedGuestId] = useState<string | null>(null);
  const [bulkTableId, setBulkTableId] = useState<string | null>(null);
  const [showBulkSelect, setShowBulkSelect] = useState(false);
  const [pendingBulkAssign, setPendingBulkAssign] = useState<{ tableId: string } | null>(null);
  const [heatmapMode, setHeatmapMode] = useState(false);
  const [guestPanelOpen, setGuestPanelOpen] = useState(false);
  const [touchDragGuest, setTouchDragGuest] = useState<{ guestId: string; x: number; y: number } | null>(null);
  const touchStartRef = useRef<{ guestId: string; startX: number; startY: number } | null>(null);
  const touchDragPos = useRef<{ x: number; y: number } | null>(null);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const canvasInnerRef = useRef<SeatingCanvasInnerHandle>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const lastClickedIndexRef = useRef<number | null>(null);

  // Keep stageRef in sync with canvas inner handle
  const updateStageRef = useCallback(() => {
    stageRef.current = canvasInnerRef.current?.getStageNode() ?? null;
  }, []);

  const violations = useMemo(() => getViolations(), [getViolations, constraints, guests, venue.tables]);

  const guestMap = useMemo(() => {
    const map = new Map<string, Guest>();
    for (const g of guests) map.set(g.id, g);
    return map;
  }, [guests]);

  const unseatedCount = useMemo(() => guests.filter((g) => !g.tableId).length, [guests]);

  const filteredGuests = useMemo(() => {
    let result = guests;

    if (filterTab === 'unseated') result = result.filter((g) => !g.tableId);
    else if (filterTab === 'seated') result = result.filter((g) => g.tableId);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (g) =>
          g.name.toLowerCase().includes(q) ||
          g.email.toLowerCase().includes(q)
      );
    }

    return result.slice().sort((a, b) => a.name.localeCompare(b.name));
  }, [guests, filterTab, searchQuery]);

  const getTableLabel = useCallback(
    (tableId: string | null) => {
      if (!tableId) return null;
      const table = venue.tables.find((t) => t.id === tableId);
      return table?.label ?? null;
    },
    [venue.tables]
  );

  // --- Drag handlers ---
  const handleDragStart = useCallback(
    (e: DragEvent<HTMLDivElement>, guestId: string) => {
      e.dataTransfer.setData('guestId', guestId);
      e.dataTransfer.effectAllowed = 'move';
      setDraggedGuestId(guestId);
    },
    []
  );

  const handleDragEnd = useCallback(() => {
    setDraggedGuestId(null);
  }, []);

  const handleCanvasDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleCanvasDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const guestId = e.dataTransfer.getData('guestId');
      if (!guestId || !canvasWrapperRef.current) return;

      const rect = canvasWrapperRef.current.getBoundingClientRect();
      const panOffset = useSeatingStore.getState().panOffset;
      const currentZoom = useSeatingStore.getState().zoom;

      // Convert drop position to canvas coordinates
      const canvasX = (e.clientX - rect.left - panOffset.x) / currentZoom;
      const canvasY = (e.clientY - rect.top - panOffset.y) / currentZoom;

      // Find closest empty seat
      let bestDist = Infinity;
      let bestTable: Table | null = null;
      let bestSeatIdx = -1;

      for (const table of venue.tables) {
        const seats = getSeatPositions(table.shape, table.capacity, table.width, table.height);
        for (let i = 0; i < seats.length; i++) {
          const seatX = table.position.x + seats[i].x;
          const seatY = table.position.y + seats[i].y;
          const dist = Math.hypot(canvasX - seatX, canvasY - seatY);

          // Check if seat is occupied by someone else
          const occupant = guests.find((g) => g.tableId === table.id && g.seatIndex === i);
          if (occupant && occupant.id !== guestId) continue;

          if (dist < bestDist) {
            bestDist = dist;
            bestTable = table;
            bestSeatIdx = i;
          }
        }
      }

      // Only assign if drop is reasonably close to a seat
      const maxDropDist = 80 / currentZoom;
      if (bestTable && bestSeatIdx >= 0 && bestDist < maxDropDist) {
        const occupied = guests.filter((g) => g.tableId === bestTable!.id && g.id !== guestId).length;
        assignGuestToTable(guestId, bestTable.id, bestSeatIdx);
        if (occupied + 1 > bestTable.capacity) {
          toast.warning(`${bestTable.label} is now over capacity (${occupied + 1}/${bestTable.capacity})`);
        }
      }

      setDraggedGuestId(null);
    },
    [venue.tables, guests, assignGuestToTable]
  );

  // --- Shared seat-finding logic for drop/touch ---
  const findAndAssignSeat = useCallback(
    (clientX: number, clientY: number, guestId: string) => {
      if (!canvasWrapperRef.current) return;
      const rect = canvasWrapperRef.current.getBoundingClientRect();
      const currentPanOffset = useSeatingStore.getState().panOffset;
      const currentZoom = useSeatingStore.getState().zoom;

      const canvasX = (clientX - rect.left - currentPanOffset.x) / currentZoom;
      const canvasY = (clientY - rect.top - currentPanOffset.y) / currentZoom;

      let bestDist = Infinity;
      let bestTable: Table | null = null;
      let bestSeatIdx = -1;

      for (const table of venue.tables) {
        const seats = getSeatPositions(table.shape, table.capacity, table.width, table.height);
        for (let i = 0; i < seats.length; i++) {
          const seatX = table.position.x + seats[i].x;
          const seatY = table.position.y + seats[i].y;
          const dist = Math.hypot(canvasX - seatX, canvasY - seatY);

          const occupant = guests.find((g) => g.tableId === table.id && g.seatIndex === i);
          if (occupant && occupant.id !== guestId) continue;

          if (dist < bestDist) {
            bestDist = dist;
            bestTable = table;
            bestSeatIdx = i;
          }
        }
      }

      const maxDropDist = 80 / currentZoom;
      if (bestTable && bestSeatIdx >= 0 && bestDist < maxDropDist) {
        assignGuestToTable(guestId, bestTable.id, bestSeatIdx);
      }
    },
    [venue.tables, guests, assignGuestToTable]
  );

  // --- Touch drag handlers for guest list items ---
  const handleGuestTouchStart = useCallback(
    (e: React.TouchEvent<HTMLDivElement>, guestId: string) => {
      const touch = e.touches[0];
      touchStartRef.current = { guestId, startX: touch.clientX, startY: touch.clientY };
      touchDragPos.current = null;
    },
    []
  );

  const handleGuestTouchMove = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (!touchStartRef.current) return;
      const touch = e.touches[0];
      const dx = Math.abs(touch.clientX - touchStartRef.current.startX);
      const dy = Math.abs(touch.clientY - touchStartRef.current.startY);
      // Only start drag after a small movement threshold to avoid accidental drags
      if (dx < 8 && dy < 8 && !touchDragPos.current) return;

      e.preventDefault();
      touchDragPos.current = { x: touch.clientX, y: touch.clientY };
      setTouchDragGuest({
        guestId: touchStartRef.current.guestId,
        x: touch.clientX,
        y: touch.clientY,
      });
      setDraggedGuestId(touchStartRef.current.guestId);
    },
    []
  );

  const handleGuestTouchEnd = useCallback(() => {
    if (touchDragPos.current && touchStartRef.current) {
      findAndAssignSeat(touchDragPos.current.x, touchDragPos.current.y, touchStartRef.current.guestId);
    }
    touchStartRef.current = null;
    touchDragPos.current = null;
    setTouchDragGuest(null);
    setDraggedGuestId(null);
  }, [findAndAssignSeat]);

  // --- Selection helpers ---
  const allSelected =
    filteredGuests.length > 0 &&
    filteredGuests.every((g) => selectedGuestIds.includes(g.id));

  const someSelected =
    !allSelected && filteredGuests.some((g) => selectedGuestIds.includes(g.id));

  const handleSelectAll = useCallback(() => {
    if (allSelected) {
      setSelectedGuestIds([]);
    } else {
      setSelectedGuestIds(filteredGuests.map((g) => g.id));
    }
  }, [allSelected, filteredGuests, setSelectedGuestIds]);

  // --- Constraint creation ---
  const handleAddConstraint = useCallback(
    (type: 'must-sit-together' | 'must-not-sit-together' | 'prefer-near') => {
      if (selectedGuestIds.length !== 2) return;
      const [a, b] = selectedGuestIds;
      addConstraint(type, [a, b], '');
      setSelectedGuestIds([]);
      const labels: Record<string, string> = {
        'must-sit-together': 'Together constraint added',
        'must-not-sit-together': 'Apart constraint added',
        'prefer-near': 'Prefer near constraint added',
      };
      toast.success(labels[type]);
    },
    [selectedGuestIds, addConstraint, setSelectedGuestIds]
  );

  // --- Swap seats ---
  const handleSwapSeats = useCallback(() => {
    if (selectedGuestIds.length !== 2) return;
    const [a, b] = selectedGuestIds;
    swapGuests(a, b);
    setSelectedGuestIds([]);
    toast.success('Seats swapped');
  }, [selectedGuestIds, swapGuests, setSelectedGuestIds]);

  // --- Bulk assign ---
  const handleBulkAssign = useCallback(() => {
    if (!pendingBulkAssign || selectedGuestIds.length === 0) return;
    const table = venue.tables.find((t) => t.id === pendingBulkAssign.tableId);
    const seatsLeft = table ? table.capacity - table.assignedGuestIds.length : 0;
    const overflow = selectedGuestIds.length - seatsLeft;
    bulkAssignToTable(selectedGuestIds, pendingBulkAssign.tableId);
    setSelectedGuestIds([]);
    setPendingBulkAssign(null);
    setBulkTableId(null);
    setShowBulkSelect(false);
    if (overflow > 0) {
      toast.warning(`Assigned ${selectedGuestIds.length} guest${selectedGuestIds.length !== 1 ? 's' : ''} — ${table?.label ?? 'table'} is now over capacity by ${overflow}`);
    } else {
      toast.success(`Assigned ${selectedGuestIds.length} guest${selectedGuestIds.length !== 1 ? 's' : ''}`);
    }
  }, [pendingBulkAssign, selectedGuestIds, bulkAssignToTable, setSelectedGuestIds, venue.tables]);

  const handleAutoAssign = useCallback(() => {
    if (!requirePro('auto-assign', 'Auto-assign seating')) return;
    const count = autoAssignGuests();
    if (count === 0) {
      toast.info('No eligible guests to assign');
    } else {
      toast.success(`Assigned ${count} guest${count !== 1 ? 's' : ''}`);
    }
  }, [autoAssignGuests, requirePro]);

  const handleClearAll = useCallback(() => {
    clearAllAssignments();
    toast.success('All assignments cleared');
  }, [clearAllAssignments]);

  const seatedCount = useMemo(() => guests.filter((g) => g.tableId).length, [guests]);

  const confettiFiredRef = useRef(false);
  useEffect(() => {
    if (guests.length > 0 && seatedCount === guests.length && !confettiFiredRef.current) {
      confettiFiredRef.current = true;
      fireConfetti();
      toast.success('All guests are seated!');
    }
    if (seatedCount < guests.length) {
      confettiFiredRef.current = false;
    }
  }, [seatedCount, guests.length]);

  const unassignedConfirmed = useMemo(() => {
    return guests.filter((g) => g.rsvpStatus === 'confirmed' && !g.tableId);
  }, [guests]);

  const confirmedCount = useMemo(
    () => guests.filter((g) => g.rsvpStatus === 'confirmed').length,
    [guests]
  );
  const totalCapacity = useMemo(
    () => venue.tables.reduce((sum, t) => sum + t.capacity, 0),
    [venue.tables]
  );
  const [capacityDismissed, setCapacityDismissed] = useState(false);

  const filterTabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'unseated', label: 'Unseated' },
    { key: 'seated', label: 'Seated' },
  ];

  return (
    <TooltipProvider>
      <div className="flex h-full overflow-hidden">
        {/* Backdrop overlay for mobile guest panel */}
        {guestPanelOpen && (
          <div
            className="fixed inset-0 bg-black/20 z-30 lg:hidden"
            onClick={() => setGuestPanelOpen(false)}
          />
        )}

        {/* Left Panel - Guest List */}
        <div
          className={`fixed inset-y-0 left-0 z-40 w-72 bg-white border-r border-slate-200 flex flex-col transform transition-transform duration-200 ${
            guestPanelOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:relative lg:translate-x-0 lg:w-80 lg:flex-shrink-0`}
        >
          {/* Header */}
          <div className="p-3 border-b border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-900">Guests</h3>
              <div className="flex items-center gap-2">
                {unseatedCount > 0 && (
                  <Badge color="#D97706" bgColor="#FEF3C7">
                    {unseatedCount} unassigned
                  </Badge>
                )}
                <button
                  className="lg:hidden p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  onClick={() => setGuestPanelOpen(false)}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Escape' && setSearchQuery('')}
                placeholder="Search guests..."
                className="w-full h-8 rounded-md border border-slate-200 bg-white pl-8 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-2 focus:outline-blue-500 focus:border-transparent"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex mt-2 gap-1">
              {filterTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setFilterTab(tab.key)}
                  className={`flex-1 px-2 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    filterTab === tab.key
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Select All */}
          {filteredGuests.length > 0 && (
            <div className="px-3 py-1.5 border-b border-slate-100 flex items-center gap-2">
              <Checkbox
                checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-xs text-slate-500">
                {selectedGuestIds.length > 0
                  ? `${selectedGuestIds.length} selected`
                  : `${filteredGuests.length} guests`}
              </span>
            </div>
          )}

          {/* Guest List */}
          <div className="flex-1 overflow-y-auto">
            {filteredGuests.length === 0 ? (
              <div className="p-4 text-center text-sm text-slate-400">
                {searchQuery
                  ? 'No guests match your search.'
                  : filterTab === 'unseated' && guests.length > 0
                  ? <span className="text-green-600 font-medium">All guests seated!</span>
                  : 'No guests yet.'}
              </div>
            ) : (
              filteredGuests.map((guest, guestIndex) => {
                const isSelected = selectedGuestIds.includes(guest.id);
                const isDragging = draggedGuestId === guest.id;
                const tableLabel = getTableLabel(guest.tableId);
                const rsvpColor = rsvpStatusColors[guest.rsvpStatus];

                return (
                  <div
                    key={guest.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, guest.id)}
                    onDragEnd={handleDragEnd}
                    onTouchStart={(e) => handleGuestTouchStart(e, guest.id)}
                    onTouchMove={handleGuestTouchMove}
                    onTouchEnd={handleGuestTouchEnd}
                    style={{ contentVisibility: 'auto', containIntrinsicSize: '0 48px' }}
                    className={`flex items-center gap-2 px-3 py-2 border-b border-slate-50 cursor-grab active:cursor-grabbing transition-all ${
                      isDragging ? 'opacity-40 scale-95' : ''
                    } ${isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                  >
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        if (e.shiftKey && lastClickedIndexRef.current !== null) {
                          const start = Math.min(lastClickedIndexRef.current, guestIndex);
                          const end = Math.max(lastClickedIndexRef.current, guestIndex);
                          const rangeIds = filteredGuests.slice(start, end + 1).map((g) => g.id);
                          const merged = new Set([...selectedGuestIds, ...rangeIds]);
                          setSelectedGuestIds(Array.from(merged));
                        } else {
                          toggleGuestSelection(guest.id);
                        }
                        lastClickedIndexRef.current = guestIndex;
                      }}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => { /* handled by parent onClick for shift support */ }}
                      />
                    </div>
                    <GripVertical size={12} className="text-slate-300 flex-shrink-0" />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium text-slate-900 truncate">
                          {guest.name}
                        </span>
                        <Badge color={rsvpColor?.text} bgColor={rsvpColor?.bg}>
                          {guest.rsvpStatus}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        {tableLabel ? (
                          <span className="text-xs text-blue-600">{tableLabel}</span>
                        ) : (
                          <span className="text-xs text-slate-400">Unassigned</span>
                        )}
                        {guest.dietaryTags.length > 0 && (
                          <Tooltip content={guest.dietaryTags.join(', ')}>
                            <span>
                              <UtensilsCrossed
                                size={10}
                                className="text-amber-500 ml-1"
                              />
                            </span>
                          </Tooltip>
                        )}
                      </div>
                    </div>

                    {guest.tableId && (
                      <Tooltip content="Unassign from table">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            unassignGuest(guest.id);
                          }}
                          className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                        >
                          <X size={12} />
                        </button>
                      </Tooltip>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Panel - Canvas */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Capacity warning banner */}
          {!capacityDismissed && confirmedCount > totalCapacity && venue.tables.length > 0 && (
            <div className="bg-red-50 border-b border-red-200 px-3 py-2 flex items-center gap-2">
              <AlertTriangle size={14} className="text-red-500 flex-shrink-0" />
              <span className="text-sm text-red-800">
                <strong>{confirmedCount}</strong> confirmed guests but only <strong>{totalCapacity}</strong> seats.{' '}
                <button onClick={() => setCurrentStep('venue')} className="underline cursor-pointer">Add tables</button>
              </span>
              <button onClick={() => setCapacityDismissed(true)} className="ml-auto text-red-400 hover:text-red-600 cursor-pointer">
                <X size={14} />
              </button>
            </div>
          )}
          {/* Gap detection banner */}
          {unassignedConfirmed.length > 0 && venue.tables.length > 0 && (
            <div className="bg-amber-50 border-b border-amber-200 px-3 py-2 flex items-center gap-2">
              <AlertTriangle size={14} className="text-amber-600 flex-shrink-0" />
              <span className="text-sm text-amber-800">
                <strong>{unassignedConfirmed.length}</strong> confirmed guest{unassignedConfirmed.length !== 1 ? 's' : ''} still need{unassignedConfirmed.length === 1 ? 's' : ''} a seat
              </span>
              <button
                onClick={() => setFilterTab('unseated')}
                className="text-sm text-amber-700 underline hover:text-amber-900 ml-auto cursor-pointer"
              >
                Show unseated
              </button>
            </div>
          )}
          {/* Toolbar */}
          <div className="h-10 border-b border-slate-200 bg-white flex items-center gap-1 px-3 overflow-x-auto">
            {/* Guest panel toggle (mobile only) */}
            <button
              className="lg:hidden relative flex items-center justify-center p-1.5 rounded-md hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer flex-shrink-0"
              onClick={() => setGuestPanelOpen(true)}
            >
              <Users className="w-4 h-4" />
              {unseatedCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-amber-500 text-white text-[10px] font-bold px-1">
                  {unseatedCount}
                </span>
              )}
            </button>

            <div className="w-px h-5 bg-slate-200 mx-1 lg:hidden flex-shrink-0" />

            <Tooltip content="Zoom in">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setZoom(zoom * 1.2)}
              >
                <ZoomIn size={14} />
              </Button>
            </Tooltip>
            <span className="text-xs text-slate-500 w-12 text-center tabular-nums">
              {Math.round(zoom * 100)}%
            </span>
            <Tooltip content="Zoom out">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setZoom(zoom / 1.2)}
              >
                <ZoomOut size={14} />
              </Button>
            </Tooltip>
            <Tooltip content="Reset zoom">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setZoom(1)}
              >
                <Maximize2 size={14} />
              </Button>
            </Tooltip>

            <Tooltip content={heatmapMode ? 'Hide heatmap' : 'Show table fill heatmap'}>
              <Button
                variant={heatmapMode ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setHeatmapMode(!heatmapMode)}
                className={heatmapMode ? 'bg-teal-100 text-teal-700 hover:bg-teal-200' : ''}
              >
                <Flame size={14} />
                <span className="ml-1 hidden sm:inline">Heatmap</span>
              </Button>
            </Tooltip>

            <div className="w-px h-5 bg-slate-200 mx-1" />

            <Tooltip content={showConstraints ? 'Hide constraints' : 'Show constraints'}>
              <Button
                variant={showConstraints ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setShowConstraints(!showConstraints)}
              >
                <Link size={14} />
                <span className="ml-1 hidden sm:inline">Constraints</span>
              </Button>
            </Tooltip>

            {violations.length > 0 && (() => {
              const errorCount = violations.filter((v) => v.severity !== 'warning').length;
              const warningCount = violations.filter((v) => v.severity === 'warning').length;
              return (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setShowViolationPanel((v) => !v)}
                    className="flex items-center gap-1.5 cursor-pointer"
                  >
                    {errorCount > 0 && (
                      <Badge color="#DC2626" bgColor="#FEE2E2">
                        <AlertTriangle size={10} className="mr-1" />
                        {errorCount} error{errorCount !== 1 ? 's' : ''}
                      </Badge>
                    )}
                    {warningCount > 0 && (
                      <Badge color="#D97706" bgColor="#FEF3C7">
                        <AlertTriangle size={10} className="mr-1" />
                        {warningCount} warning{warningCount !== 1 ? 's' : ''}
                      </Badge>
                    )}
                  </button>
                  {errorCount > 0 && (
                    <Tooltip content="Fix conflicts one by one">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowConflictWizard(true)}
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                      >
                        <Wand2 size={14} />
                        <span className="ml-1 hidden sm:inline">Fix</span>
                      </Button>
                    </Tooltip>
                  )}
                </div>
              );
            })()}

            <div className="w-px h-5 bg-slate-200 mx-1" />

            <Tooltip content="Auto-assign unassigned guests to seats">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleAutoAssign}
                disabled={unseatedCount === 0 || venue.tables.length === 0}
              >
                <Wand2 size={14} />
                <span className="ml-1 hidden sm:inline">Auto-fill</span>
                {!canAccess('auto-assign') && <ProBadge />}
              </Button>
            </Tooltip>
            {seatedCount > 0 && (
              <Tooltip content="Clear all seat assignments">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAll}
                >
                  <Eraser size={14} />
                  <span className="ml-1 hidden sm:inline">Clear</span>
                </Button>
              </Tooltip>
            )}

            <div className="w-px h-5 bg-slate-200 mx-1" />

            <ExportPanel stageRef={stageRef} />

            <div className="flex-1" />

            <span className="text-xs text-slate-400 hidden sm:inline">
              {venue.tables.length} table{venue.tables.length !== 1 ? 's' : ''} |{' '}
              {seatedCount}/{guests.length} seated
            </span>
          </div>

          {/* Canvas Area */}
          {venue.tables.length === 0 ? (
            <div className="flex-1 flex items-center justify-center bg-slate-50">
              <div className="text-center max-w-xs">
                <div className="mx-auto w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
                  <LayoutGrid size={24} className="text-slate-400" />
                </div>
                <h3 className="text-base font-semibold text-slate-900 mb-1">Set up your venue first</h3>
                <p className="text-sm text-slate-500 mb-4">
                  Add tables in the Venue tab before assigning seats.
                </p>
                <Button variant="primary" size="sm" onClick={() => setCurrentStep('venue')}>
                  Go to Venue
                </Button>
              </div>
            </div>
          ) : (
            <div
              ref={canvasWrapperRef}
              className="flex-1 relative bg-slate-100"
              onDragOver={handleCanvasDragOver}
              onDrop={handleCanvasDrop}
            >
              <SeatingCanvasInner
                ref={(handle: SeatingCanvasInnerHandle | null) => {
                  (canvasInnerRef as React.MutableRefObject<SeatingCanvasInnerHandle | null>).current = handle;
                  stageRef.current = handle?.getStageNode() ?? null;
                }}
                showConstraints={showConstraints}
                draggedGuestId={draggedGuestId}
                heatmapMode={heatmapMode}
              />
              {showViolationPanel && violations.length > 0 && (
                <ViolationDetailsPanel
                  violations={violations}
                  constraints={constraints}
                  guests={guests}
                  tables={venue.tables}
                  onClose={() => setShowViolationPanel(false)}
                />
              )}
              <SeatingStatsPanel guests={guests} tables={venue.tables} />
            </div>
          )}
        </div>

        {/* Bulk assign confirmation card */}
        {pendingBulkAssign && (() => {
          const table = venue.tables.find((t) => t.id === pendingBulkAssign.tableId);
          const seatsLeft = table ? table.capacity - table.assignedGuestIds.length : 0;
          const overflow = selectedGuestIds.length - seatsLeft;
          return (
            <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-50 bg-white rounded-xl shadow-lg border border-slate-200 px-4 py-3 min-w-[260px]">
              <p className="text-sm font-medium text-slate-900 mb-1">Confirm assignment</p>
              <p className="text-xs text-slate-500 mb-1">
                Assign {selectedGuestIds.length} guest{selectedGuestIds.length !== 1 ? 's' : ''} to {table?.label ?? 'table'}
                {' '}({seatsLeft} seat{seatsLeft !== 1 ? 's' : ''} remaining)
              </p>
              {overflow > 0 && (
                <p className="text-xs text-red-600 mb-2 flex items-center gap-1">
                  <AlertTriangle size={12} className="flex-shrink-0" />
                  {overflow} more guest{overflow !== 1 ? 's' : ''} than available seats
                </p>
              )}
              <div className="flex gap-2 mt-2">
                <Button variant="primary" size="sm" onClick={handleBulkAssign} className="flex-1">
                  Confirm Assign
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setPendingBulkAssign(null)} className="flex-1">
                  Cancel
                </Button>
              </div>
            </div>
          );
        })()}

        {/* Bottom Action Bar (when guests selected) */}
        {selectedGuestIds.length > 0 && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-white rounded-xl shadow-lg border border-slate-200 px-3 sm:px-4 py-2 sm:py-2.5 flex items-center gap-2 sm:gap-3 max-w-[calc(100vw-2rem)]">
            <span className="text-xs sm:text-sm font-medium text-slate-700 shrink-0">
              {selectedGuestIds.length} selected
            </span>

            <div className="w-px h-5 bg-slate-200 shrink-0" />

            {selectedGuestIds.length === 2 && (
              <>
                <Tooltip content="Must sit together">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleAddConstraint('must-sit-together')}
                  >
                    <Link size={14} className="text-green-600" />
                    <span className="ml-1 hidden sm:inline">Together</span>
                  </Button>
                </Tooltip>
                <Tooltip content="Must not sit together">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleAddConstraint('must-not-sit-together')}
                  >
                    <Unlink size={14} className="text-red-600" />
                    <span className="ml-1 hidden sm:inline">Apart</span>
                  </Button>
                </Tooltip>
                <Tooltip content="Prefer to sit near each other">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleAddConstraint('prefer-near')}
                  >
                    <Heart size={14} className="text-amber-500" />
                    <span className="ml-1 hidden sm:inline">Prefer Near</span>
                  </Button>
                </Tooltip>

                {selectedGuestIds.every(id => guestMap.get(id)?.tableId) && (
                  <Tooltip content="Swap their seats">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSwapSeats}
                    >
                      <ArrowLeftRight size={14} className="text-blue-600" />
                      <span className="ml-1 hidden sm:inline">Swap Seats</span>
                    </Button>
                  </Tooltip>
                )}

                <div className="w-px h-5 bg-slate-200 shrink-0" />
              </>
            )}

            {/* Bulk assign */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowBulkSelect(!showBulkSelect)}
              >
                <Users size={14} />
                <span className="ml-1 hidden sm:inline">Assign to table</span>
                <ChevronDown size={12} className="ml-0.5" />
              </Button>

              {showBulkSelect && (
                <div className="absolute bottom-full mb-2 left-0 bg-white rounded-lg shadow-lg border border-slate-200 py-1 min-w-[220px] max-h-48 overflow-y-auto">
                  {venue.tables.map((table) => {
                    const seatsLeft = table.capacity - table.assignedGuestIds.length;
                    const usageRatio = table.capacity > 0 ? table.assignedGuestIds.length / table.capacity : 1;
                    const capacityColor = seatsLeft <= 0
                      ? 'text-red-600 font-medium'
                      : usageRatio > 0.8
                      ? 'text-amber-600 font-medium'
                      : 'text-green-600';
                    const overflow = selectedGuestIds.length - seatsLeft;
                    return (
                      <button
                        key={table.id}
                        onClick={() => {
                          setPendingBulkAssign({ tableId: table.id });
                          setShowBulkSelect(false);
                        }}
                        disabled={seatsLeft <= 0}
                        className="w-full px-3 py-1.5 text-left text-sm hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-slate-700">{table.label}</span>
                          <span className={`text-xs ${capacityColor}`}>
                            {seatsLeft} seat{seatsLeft !== 1 ? 's' : ''} left
                          </span>
                        </div>
                        {overflow > 0 && seatsLeft > 0 && (
                          <p className="text-[11px] text-red-500 mt-0.5">
                            {overflow} more guest{overflow !== 1 ? 's' : ''} than available seats
                          </p>
                        )}
                      </button>
                    );
                  })}
                  {venue.tables.length === 0 && (
                    <div className="px-3 py-2 text-sm text-slate-400">No tables configured</div>
                  )}
                </div>
              )}
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedGuestIds([])}
            >
              <X size={14} />
            </Button>
          </div>
        )}
      </div>

      {/* Touch drag ghost */}
      {touchDragGuest && (
        <div
          className="fixed pointer-events-none z-50 bg-blue-100 border border-blue-300 rounded px-2 py-1 text-sm shadow-lg"
          style={{ left: touchDragGuest.x - 40, top: touchDragGuest.y - 20 }}
        >
          {guests.find((g) => g.id === touchDragGuest.guestId)?.name || 'Guest'}
        </div>
      )}
      <UpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} feature={upgradeFeature} />
      {showConflictWizard && (
        <ConflictWizard
          violations={violations}
          constraints={constraints}
          guests={guests}
          tables={venue.tables}
          onClose={() => setShowConflictWizard(false)}
        />
      )}
    </TooltipProvider>
  );
}
