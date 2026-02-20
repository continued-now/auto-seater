'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';
import {
  Circle,
  Square,
  RectangleHorizontal,
  CrownIcon,
  Heart,
  Wine,
  Plus,
  Minus,
  Maximize,
  Grid3X3,
  Magnet,
  Crosshair,
  AlignVerticalJustifyCenter,
  RotateCw,
  Trash2,
  Save,
  FolderOpen,
  Music,
  UtensilsCrossed,
  Camera,
  DoorOpen,
  DoorClosed,
  Columns3,
  Menu,
  Mic2,
  MousePointer2,
  Pen,
  Ruler,
  Users,
  PanelRight,
  Aperture,
  Layers,
  Shirt,
  Volume2,
  ChevronDown,
  MoveHorizontal,
  MoveVertical,
  X,
} from 'lucide-react';
import { useSeatingStore } from '@/stores/useSeatingStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Tooltip, TooltipProvider } from '@/components/ui/Tooltip';
import { Checkbox } from '@/components/ui/Checkbox';
import { Dialog, DialogContent } from '@/components/ui/Dialog';
import { PREBUILT_TEMPLATES, COMMON_FIXTURE_TYPES, TEMPLATE_FIXTURES } from '@/lib/venue-templates';
import { ProBadge } from '@/components/ui/ProBadge';
import { useFeatureGate } from '@/hooks/useFeatureGate';
import { createId } from '@/lib/id';
import { getAllRoomRects, computeNewRoomPosition, getVenueBoundingBox, getRoomCenter } from '@/lib/room-geometry';
import type { TableShape, FixtureType } from '@/types/venue';
import PhotoToRoomDialog from './PhotoToRoomDialog';
import LayoutAdvisorDialog from './LayoutAdvisorDialog';
import { Sparkles } from 'lucide-react';

const VenueCanvasInner = dynamic(
  () => import('./VenueCanvasInner').then((m) => ({ default: m.VenueCanvasInner })),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 bg-slate-100 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading canvas...</p>
      </div>
    ),
  }
);

const TABLE_SHAPES: { shape: TableShape; label: string; icon: React.ElementType }[] = [
  { shape: 'round', label: 'Round', icon: Circle },
  { shape: 'rectangular', label: 'Rectangular', icon: RectangleHorizontal },
  { shape: 'square', label: 'Square', icon: Square },
  { shape: 'head', label: 'Head Table', icon: CrownIcon },
  { shape: 'sweetheart', label: 'Sweetheart', icon: Heart },
  { shape: 'cocktail', label: 'Cocktail', icon: Wine },
];

const FIXTURE_TYPES: { type: FixtureType; label: string; icon: React.ElementType; width: number; height: number }[] = [
  { type: 'stage', label: 'Stage', icon: Mic2, width: 200, height: 100 },
  { type: 'dance-floor', label: 'Dance Floor', icon: Music, width: 180, height: 180 },
  { type: 'bar', label: 'Bar', icon: Wine, width: 120, height: 40 },
  { type: 'buffet', label: 'Buffet', icon: UtensilsCrossed, width: 160, height: 40 },
  { type: 'dj-booth', label: 'DJ Booth', icon: Music, width: 60, height: 60 },
  { type: 'photo-booth', label: 'Photo Booth', icon: Camera, width: 80, height: 80 },
  { type: 'entrance', label: 'Entrance', icon: DoorOpen, width: 60, height: 20 },
  { type: 'exit', label: 'Exit', icon: DoorClosed, width: 60, height: 20 },
  { type: 'restroom', label: 'Restroom', icon: DoorOpen, width: 80, height: 60 },
  { type: 'pillar', label: 'Pillar', icon: Columns3, width: 20, height: 20 },
  { type: 'door', label: 'Door', icon: PanelRight, width: 60, height: 20 },
  { type: 'window', label: 'Window', icon: Aperture, width: 80, height: 10 },
  { type: 'av-sound-room', label: 'AV Room', icon: Volume2, width: 100, height: 80 },
  { type: 'kitchen', label: 'Kitchen', icon: UtensilsCrossed, width: 120, height: 100 },
  { type: 'coat-check', label: 'Coat Check', icon: Shirt, width: 80, height: 40 },
];

export function VenueSetupStep() {
  const venue = useSeatingStore((s) => s.venue);
  const templates = useSeatingStore((s) => s.templates);
  const selectedElementId = useSeatingStore((s) => s.selectedElementId);
  const selectedElementType = useSeatingStore((s) => s.selectedElementType);
  const canvasToolMode = useSeatingStore((s) => s.canvasToolMode);
  const zoom = useSeatingStore((s) => s.zoom);
  const setZoom = useSeatingStore((s) => s.setZoom);
  const setPanOffset = useSeatingStore((s) => s.setPanOffset);
  const updateVenueConfig = useSeatingStore((s) => s.updateVenueConfig);
  const addTable = useSeatingStore((s) => s.addTable);
  const updateTable = useSeatingStore((s) => s.updateTable);
  const deleteTable = useSeatingStore((s) => s.deleteTable);
  const addFixture = useSeatingStore((s) => s.addFixture);
  const updateFixture = useSeatingStore((s) => s.updateFixture);
  const deleteFixture = useSeatingStore((s) => s.deleteFixture);
  const updateWall = useSeatingStore((s) => s.updateWall);
  const deleteWall = useSeatingStore((s) => s.deleteWall);
  const saveTemplate = useSeatingStore((s) => s.saveTemplate);
  const loadTemplate = useSeatingStore((s) => s.loadTemplate);
  const deleteTemplate = useSeatingStore((s) => s.deleteTemplate);
  const loadPrebuiltTemplate = useSeatingStore((s) => s.loadPrebuiltTemplate);
  const setSelectedElement = useSeatingStore((s) => s.setSelectedElement);
  const clearSelection = useSeatingStore((s) => s.clearSelection);
  const setCanvasToolMode = useSeatingStore((s) => s.setCanvasToolMode);
  const activeTemplateId = useSeatingStore((s) => s.activeTemplateId);
  const addRoom = useSeatingStore((s) => s.addRoom);
  const updateRoom = useSeatingStore((s) => s.updateRoom);
  const deleteRoom = useSeatingStore((s) => s.deleteRoom);
  const selectedRoomId = useSeatingStore((s) => s.selectedRoomId);
  const setSelectedRoomId = useSeatingStore((s) => s.setSelectedRoomId);

  const { canAccess } = useFeatureGate();
  const canCustomDimensions = canAccess('custom-dimensions');

  const selectedTable = selectedElementType === 'table' ? venue.tables.find((t) => t.id === selectedElementId) ?? null : null;
  const selectedFixture = selectedElementType === 'fixture' ? venue.fixtures.find((f) => f.id === selectedElementId) ?? null : null;
  const selectedWall = selectedElementType === 'wall' ? venue.walls.find((w) => w.id === selectedElementId) ?? null : null;
  const selectedRoom = selectedElementType === 'room' ? (venue.rooms ?? []).find((r) => r.id === selectedElementId) ?? null : null;

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDesc, setTemplateDesc] = useState('');
  const [templateTab, setTemplateTab] = useState<'prebuilt' | 'saved'>('prebuilt');
  const [showMoreFixtures, setShowMoreFixtures] = useState(false);

  // Add Room dialog state
  const [addRoomDialogOpen, setAddRoomDialogOpen] = useState(false);
  const [newRoomLabel, setNewRoomLabel] = useState('');
  const [newRoomWidth, setNewRoomWidth] = useState(20);
  const [newRoomHeight, setNewRoomHeight] = useState(15);
  const [newRoomAttachTo, setNewRoomAttachTo] = useState('__primary__');
  const [newRoomEdge, setNewRoomEdge] = useState<'top' | 'right' | 'bottom' | 'left'>('right');

  // AI Tools dialog state
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false);
  const [advisorDialogOpen, setAdvisorDialogOpen] = useState(false);
  const hasObjectsForAdvisor = venue.tables.length > 0 || venue.fixtures.length > 0;

  const pxPerUnit = venue.unit === 'ft' ? 15 : 30;
  const roomRects = useMemo(() => getAllRoomRects(venue, pxPerUnit), [venue, pxPerUnit]);

  // Split fixtures into primary (common + template-relevant) and secondary (everything else)
  const { primaryFixtures, secondaryFixtures } = useMemo(() => {
    const templateSpecific = activeTemplateId ? (TEMPLATE_FIXTURES[activeTemplateId] ?? []) : [];
    const primaryTypes = new Set([...COMMON_FIXTURE_TYPES, ...templateSpecific]);

    // No template selected — show all fixtures as primary
    if (!activeTemplateId) {
      return { primaryFixtures: FIXTURE_TYPES, secondaryFixtures: [] };
    }

    const primary = FIXTURE_TYPES.filter((f) => primaryTypes.has(f.type));
    const secondary = FIXTURE_TYPES.filter((f) => !primaryTypes.has(f.type));
    return { primaryFixtures: primary, secondaryFixtures: secondary };
  }, [activeTemplateId]);

  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setCanvasSize({
          width: Math.floor(entry.contentRect.width),
          height: Math.floor(entry.contentRect.height),
        });
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const handleAddTable = useCallback(
    (shape: TableShape) => {
      addTable(shape, selectedRoomId ?? undefined);
    },
    [addTable, selectedRoomId]
  );

  const handleAddFixture = useCallback(
    (type: FixtureType, width: number, height: number) => {
      const pxPerUnit = venue.unit === 'ft' ? 15 : 30;
      const currentRoomRects = getAllRoomRects(venue, pxPerUnit);
      const targetRoom = selectedRoomId
        ? currentRoomRects.find((r) => r.id === selectedRoomId)
        : currentRoomRects[0];
      const roomW = targetRoom ? targetRoom.width : venue.roomWidth * pxPerUnit;
      const roomL = targetRoom ? targetRoom.height : venue.roomLength * pxPerUnit;
      const roomX = targetRoom ? targetRoom.x : 0;
      const roomY = targetRoom ? targetRoom.y : 0;
      const centerX = roomX + roomW / 2;
      const centerY = roomY + roomL / 2;

      // Count existing fixtures of same type to offset placement
      const sameTypeCount = venue.fixtures.filter((f) => f.type === type).length;
      const offset = sameTypeCount * (width + 20);

      let position = { x: centerX, y: centerY };
      let rotation = 0;
      let doorStyle: 'swing-in' | 'swing-out' | 'sliding' | 'double' | undefined;

      if (type === 'entrance') {
        position = { x: Math.min(centerX + offset, roomX + roomW - width / 2), y: roomY + roomL - height / 2 };
        doorStyle = 'swing-in';
      } else if (type === 'exit') {
        position = { x: Math.min(centerX + offset, roomX + roomW - width / 2), y: roomY + height / 2 };
        doorStyle = 'swing-out';
      } else if (type === 'door') {
        position = { x: roomX + width / 2, y: Math.min(centerY + offset, roomY + roomL - height / 2) };
        doorStyle = 'swing-in';
      } else if (type === 'restroom') {
        const inset = 2.5 * (venue.unit === 'ft' ? 15 : 30);
        position = { x: roomX + roomW - width / 2 - inset, y: roomY + height / 2 + inset };
      } else if (type === 'window') {
        position = { x: roomX + roomW - height / 2, y: Math.min(centerY + offset, roomY + roomL - width / 2) };
        rotation = 90;
      }

      addFixture({
        type,
        label: type,
        position,
        rotation,
        width,
        height,
        doorStyle,
        roomId: selectedRoomId ?? undefined,
      });
    },
    [addFixture, venue.unit, venue.roomWidth, venue.roomLength, venue.fixtures, selectedRoomId, venue]
  );

  const handleFitToView = useCallback(() => {
    if (!canvasContainerRef.current) return;
    const unit = venue.unit === 'ft' ? 15 : 30;
    const currentRoomRects = getAllRoomRects(venue, unit);
    const bbox = getVenueBoundingBox(currentRoomRects);
    const totalW = bbox.width || venue.roomWidth * unit;
    const totalH = bbox.height || venue.roomLength * unit;
    const padded = 40;
    const scaleX = (canvasSize.width - padded * 2) / totalW;
    const scaleY = (canvasSize.height - padded * 2) / totalH;
    const newZoom = Math.min(scaleX, scaleY, 2);
    setZoom(newZoom);
    setPanOffset({
      x: (canvasSize.width - totalW * newZoom) / 2 - bbox.x * newZoom,
      y: (canvasSize.height - totalH * newZoom) / 2 - bbox.y * newZoom,
    });
  }, [venue, canvasSize, setZoom, setPanOffset]);

  // Auto-center canvas when room dimensions or unit change
  useEffect(() => {
    handleFitToView();
  }, [handleFitToView]);

  const handleAddRoom = useCallback(() => {
    const label = newRoomLabel.trim() || `Room ${(venue.rooms?.length ?? 0) + 2}`;
    const currentRoomRects = getAllRoomRects(venue, pxPerUnit);
    const parentRect = currentRoomRects.find((r) => r.id === newRoomAttachTo) ?? currentRoomRects[0];
    const newWidthPx = newRoomWidth * pxPerUnit;
    const newHeightPx = newRoomHeight * pxPerUnit;
    const pos = computeNewRoomPosition(parentRect, newRoomEdge, newWidthPx, newHeightPx);

    const roomId = addRoom({
      label,
      position: pos,
      width: newRoomWidth,
      height: newRoomHeight,
      parentRoomId: newRoomAttachTo,
      attachEdge: newRoomEdge,
    });

    // Auto-create a connection door fixture at the shared wall
    const doorW = 60;
    const doorH = 20;
    let doorPos = { x: 0, y: 0 };
    let doorRotation = 0;
    if (newRoomEdge === 'top') {
      doorPos = { x: parentRect.x + parentRect.width / 2, y: parentRect.y };
    } else if (newRoomEdge === 'bottom') {
      doorPos = { x: parentRect.x + parentRect.width / 2, y: parentRect.y + parentRect.height };
    } else if (newRoomEdge === 'left') {
      doorPos = { x: parentRect.x, y: parentRect.y + parentRect.height / 2 };
      doorRotation = 90;
    } else if (newRoomEdge === 'right') {
      doorPos = { x: parentRect.x + parentRect.width, y: parentRect.y + parentRect.height / 2 };
      doorRotation = 90;
    }

    addFixture({
      type: 'door',
      label: `Door to ${label}`,
      position: doorPos,
      rotation: doorRotation,
      width: doorW,
      height: doorH,
      doorStyle: 'swing-in',
      roomId,
    });

    setAddRoomDialogOpen(false);
    setNewRoomLabel('');
    setNewRoomWidth(20);
    setNewRoomHeight(15);
    setSelectedRoomId(roomId);
  }, [newRoomLabel, newRoomWidth, newRoomHeight, newRoomAttachTo, newRoomEdge, venue, pxPerUnit, addRoom, addFixture, setSelectedRoomId]);

  const handleSaveTemplate = useCallback(() => {
    if (!templateName.trim()) return;
    saveTemplate(templateName.trim(), templateDesc.trim());
    setTemplateName('');
    setTemplateDesc('');
    setSaveDialogOpen(false);
    toast.success('Template saved');
  }, [templateName, templateDesc, saveTemplate]);

  // Compute wall length for display
  const wallLength = selectedWall
    ? Math.sqrt(
        (selectedWall.end.x - selectedWall.start.x) ** 2 + (selectedWall.end.y - selectedWall.start.y) ** 2
      )
    : 0;

  return (
    <TooltipProvider>
      <div className="flex h-full bg-slate-50 relative">
        {/* Left sidebar backdrop (mobile only) */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/20 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Left sidebar */}
        <div
          className={`fixed inset-y-0 left-0 z-40 w-64 border-r border-border bg-white flex flex-col overflow-y-auto transform transition-transform duration-200 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:relative lg:translate-x-0 lg:shrink-0`}
        >
          {/* Close button (mobile only) */}
          <div className="lg:hidden flex items-center justify-between px-3 py-2 border-b border-border">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Venue Setup</span>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1 rounded-md hover:bg-slate-100 text-slate-500 cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Room dimensions */}
          <SidebarSection title="Room Dimensions">
            <div className="flex gap-2">
              <Input
                type="number"
                value={venue.roomWidth}
                onChange={(e) => updateVenueConfig({ roomWidth: Math.max(0, Number(e.target.value) || 0) })}
                min={0}
                className="w-full"
                label="Width"
              />
              <Input
                type="number"
                value={venue.roomLength}
                onChange={(e) => updateVenueConfig({ roomLength: Math.max(0, Number(e.target.value) || 0) })}
                min={0}
                className="w-full"
                label="Length"
              />
            </div>
            <div className="flex gap-1 mt-2">
              <Button
                variant={venue.unit === 'ft' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => updateVenueConfig({ unit: 'ft' })}
              >
                Feet
              </Button>
              <Button
                variant={venue.unit === 'm' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => updateVenueConfig({ unit: 'm' })}
              >
                Metres
              </Button>
            </div>
          </SidebarSection>

          {/* Rooms */}
          <SidebarSection title="Rooms">
            <div className="space-y-1.5">
              {/* Main Room — always first */}
              <button
                onClick={() => {
                  setSelectedRoomId(null);
                  clearSelection();
                }}
                className={`w-full flex items-center gap-2 p-1.5 rounded-lg border text-left text-xs transition-colors cursor-pointer ${
                  !selectedRoomId
                    ? 'border-blue-400 bg-blue-50 text-blue-700'
                    : 'border-border hover:border-blue-300 hover:bg-blue-50 text-slate-600'
                }`}
              >
                <span className="font-medium truncate flex-1">Main Room</span>
                <span className="text-[10px] text-slate-500">{venue.roomWidth}x{venue.roomLength}</span>
              </button>

              {/* Additional rooms */}
              {(venue.rooms ?? []).map((room) => (
                <div key={room.id} className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setSelectedRoomId(room.id);
                      setSelectedElement(room.id, 'room');
                    }}
                    className={`flex-1 flex items-center gap-2 p-1.5 rounded-lg border text-left text-xs transition-colors cursor-pointer ${
                      selectedRoomId === room.id
                        ? 'border-blue-400 bg-blue-50 text-blue-700'
                        : 'border-border hover:border-blue-300 hover:bg-blue-50 text-slate-600'
                    }`}
                  >
                    {room.color && (
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: room.color }}
                      />
                    )}
                    <span className="font-medium truncate flex-1" title={room.label}>{room.label}</span>
                    <span className="text-[10px] text-slate-500">{room.width}x{room.height}</span>
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Delete this room?')) deleteRoom(room.id);
                    }}
                    className="text-slate-400 hover:text-red-500 transition-colors cursor-pointer p-0.5"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}

              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={() => {
                  setNewRoomLabel(`Room ${(venue.rooms?.length ?? 0) + 2}`);
                  setAddRoomDialogOpen(true);
                }}
              >
                <Plus size={14} /> Add Room
              </Button>
            </div>
          </SidebarSection>

          {/* Tables */}
          <SidebarSection title="Add Tables">
            <div className="grid grid-cols-3 gap-1.5">
              {TABLE_SHAPES.map(({ shape, label, icon: Icon }) => (
                <Tooltip key={shape} content={label} side="bottom">
                  <button
                    onClick={() => handleAddTable(shape)}
                    className="flex flex-col items-center gap-1 p-2 rounded-lg border border-border hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer"
                  >
                    <Icon size={18} className="text-slate-600" />
                    <span className="text-[10px] text-slate-500 leading-tight">{label}</span>
                  </button>
                </Tooltip>
              ))}
            </div>
          </SidebarSection>

          {/* Structural — wall draw tool */}
          <SidebarSection title="Structural">
            <div className="flex gap-1.5">
              <Tooltip content="Select Tool (V)">
                <button
                  onClick={() => setCanvasToolMode('select')}
                  className={`flex items-center gap-1.5 p-2 rounded-lg border transition-colors cursor-pointer flex-1 ${
                    canvasToolMode === 'select'
                      ? 'border-blue-400 bg-blue-50 text-blue-700'
                      : 'border-border hover:border-blue-300 hover:bg-blue-50 text-slate-600'
                  }`}
                >
                  <MousePointer2 size={14} />
                  <span className="text-[10px] leading-tight">Select</span>
                </button>
              </Tooltip>
              <Tooltip content="Draw Wall (W)">
                <button
                  onClick={() => setCanvasToolMode(canvasToolMode === 'draw-wall' ? 'select' : 'draw-wall')}
                  className={`flex items-center gap-1.5 p-2 rounded-lg border transition-colors cursor-pointer flex-1 ${
                    canvasToolMode === 'draw-wall'
                      ? 'border-blue-400 bg-blue-50 text-blue-700'
                      : 'border-border hover:border-blue-300 hover:bg-blue-50 text-slate-600'
                  }`}
                >
                  <Pen size={14} />
                  <span className="text-[10px] leading-tight">Wall</span>
                </button>
              </Tooltip>
            </div>
          </SidebarSection>

          {/* Fixtures */}
          <SidebarSection title="Add Fixtures">
            <div className="grid grid-cols-2 gap-1.5">
              {primaryFixtures.map(({ type, label, icon: Icon, width, height }) => (
                <Tooltip key={type} content={label} side="bottom">
                  <button
                    onClick={() => handleAddFixture(type, width, height)}
                    className="flex items-center gap-1.5 p-1.5 rounded-lg border border-border hover:border-blue-300 hover:bg-blue-50 transition-colors text-left cursor-pointer"
                  >
                    <Icon size={14} className="text-slate-500 shrink-0" />
                    <span className="text-[10px] text-slate-500 leading-tight truncate">{label}</span>
                  </button>
                </Tooltip>
              ))}
            </div>
            {secondaryFixtures.length > 0 && (
              <div className="mt-2">
                <button
                  onClick={() => setShowMoreFixtures(!showMoreFixtures)}
                  className="flex items-center gap-1 w-full text-[10px] text-slate-400 hover:text-slate-600 transition-colors py-1 cursor-pointer"
                >
                  <ChevronDown
                    size={12}
                    className={`transition-transform ${showMoreFixtures ? 'rotate-180' : ''}`}
                  />
                  {showMoreFixtures ? 'Show less' : `More fixtures (${secondaryFixtures.length})`}
                </button>
                {showMoreFixtures && (
                  <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                    {secondaryFixtures.map(({ type, label, icon: Icon, width, height }) => (
                      <Tooltip key={type} content={label} side="bottom">
                        <button
                          onClick={() => handleAddFixture(type, width, height)}
                          className="flex items-center gap-1.5 p-1.5 rounded-lg border border-border hover:border-blue-300 hover:bg-blue-50 transition-colors text-left cursor-pointer"
                        >
                          <Icon size={14} className="text-slate-500 shrink-0" />
                          <span className="text-[10px] text-slate-500 leading-tight truncate">{label}</span>
                        </button>
                      </Tooltip>
                    ))}
                  </div>
                )}
              </div>
            )}
          </SidebarSection>

          {/* Grid controls */}
          <SidebarSection title="Grid">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={venue.showGrid}
                  onCheckedChange={(checked) => updateVenueConfig({ showGrid: checked })}
                />
                <Grid3X3 size={14} className="text-slate-500" />
                Show Grid
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={venue.snapToGrid}
                  onCheckedChange={(checked) => updateVenueConfig({ snapToGrid: checked })}
                />
                <Magnet size={14} className="text-slate-500" />
                Snap to Grid
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={venue.snapToGuides}
                  onCheckedChange={(checked) => updateVenueConfig({ snapToGuides: checked })}
                />
                <AlignVerticalJustifyCenter size={14} className="text-slate-500" />
                Snap to Guides
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={venue.showRoomCenter}
                  onCheckedChange={(checked) => updateVenueConfig({ showRoomCenter: checked })}
                />
                <Crosshair size={14} className="text-slate-500" />
                Show Room Center
              </label>
              <Input
                type="number"
                label="Grid Size"
                value={venue.gridSize}
                onChange={(e) => updateVenueConfig({ gridSize: Math.max(0, Number(e.target.value) || 0) })}
                min={0}
              />
            </div>
          </SidebarSection>

          {/* User Guides */}
          <SidebarSection title="Guides">
            <div className="space-y-2">
              <div className="flex gap-1.5">
                <Tooltip content="Add Horizontal Guide">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      const pxPerUnit = venue.unit === 'ft' ? 15 : 30;
                      const centerY = (venue.roomLength * pxPerUnit) / 2;
                      updateVenueConfig({
                        guides: [...venue.guides, { id: createId(), axis: 'horizontal', position: centerY }],
                      });
                    }}
                  >
                    <MoveHorizontal size={14} /> H-Guide
                  </Button>
                </Tooltip>
                <Tooltip content="Add Vertical Guide">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      const pxPerUnit = venue.unit === 'ft' ? 15 : 30;
                      const centerX = (venue.roomWidth * pxPerUnit) / 2;
                      updateVenueConfig({
                        guides: [...venue.guides, { id: createId(), axis: 'vertical', position: centerX }],
                      });
                    }}
                  >
                    <MoveVertical size={14} /> V-Guide
                  </Button>
                </Tooltip>
              </div>
              {venue.guides.length > 0 && (
                <div className="space-y-1">
                  {venue.guides.map((guide) => {
                    const pxPerUnit = venue.unit === 'ft' ? 15 : 30;
                    const posInUnits = Number((guide.position / pxPerUnit).toFixed(1));
                    return (
                      <div key={guide.id} className="flex items-center gap-1.5 text-xs">
                        <span className="text-slate-400 w-4">
                          {guide.axis === 'horizontal' ? 'H' : 'V'}
                        </span>
                        <Input
                          type="number"
                          step={0.5}
                          value={posInUnits}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            if (!isNaN(val)) {
                              updateVenueConfig({
                                guides: venue.guides.map((g) =>
                                  g.id === guide.id ? { ...g, position: val * pxPerUnit } : g
                                ),
                              });
                            }
                          }}
                          className="flex-1"
                        />
                        <span className="text-slate-400">{venue.unit}</span>
                        <button
                          onClick={() =>
                            updateVenueConfig({
                              guides: venue.guides.filter((g) => g.id !== guide.id),
                            })
                          }
                          className="text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </SidebarSection>

          {/* Templates */}
          <SidebarSection title="Templates">
            <div className="flex gap-1.5">
              <Button variant="secondary" size="sm" onClick={() => setSaveDialogOpen(true)} className="flex-1">
                <Save size={14} /> Save
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setTemplateDialogOpen(true)} className="flex-1">
                <FolderOpen size={14} /> Load
              </Button>
            </div>
          </SidebarSection>

          {/* AI Tools */}
          <SidebarSection title="AI Tools">
            <div className="space-y-1.5">
              <Button
                variant="secondary"
                size="sm"
                className="w-full justify-start"
                onClick={() => setPhotoDialogOpen(true)}
              >
                <Camera size={14} /> Photo to Room <ProBadge />
              </Button>
              <Tooltip content={hasObjectsForAdvisor ? 'Analyze and optimize your layout' : 'Add tables or fixtures first'}>
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full justify-start"
                  disabled={!hasObjectsForAdvisor}
                  onClick={() => setAdvisorDialogOpen(true)}
                >
                  <Sparkles size={14} /> AI Layout Advisor <ProBadge />
                </Button>
              </Tooltip>
            </div>
          </SidebarSection>
        </div>

        {/* Main canvas area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top toolbar */}
          <div className="h-10 border-b border-border bg-white flex items-center px-3 gap-2 shrink-0 overflow-x-auto">
            {/* Sidebar toggle (mobile only) */}
            <Tooltip content="Toggle Sidebar">
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden shrink-0"
                onClick={() => setSidebarOpen(true)}
                aria-label="Toggle sidebar"
              >
                <Menu size={16} />
              </Button>
            </Tooltip>
            <Tooltip content="Zoom Out">
              <Button variant="ghost" size="sm" onClick={() => setZoom(zoom / 1.2)}>
                <Minus size={14} />
              </Button>
            </Tooltip>
            <span className="text-xs text-slate-500 min-w-[3rem] text-center tabular-nums">
              {Math.round(zoom * 100)}%
            </span>
            <Tooltip content="Zoom In">
              <Button variant="ghost" size="sm" onClick={() => setZoom(zoom * 1.2)}>
                <Plus size={14} />
              </Button>
            </Tooltip>
            <Tooltip content="Fit to View">
              <Button variant="ghost" size="sm" onClick={handleFitToView}>
                <Maximize size={14} />
              </Button>
            </Tooltip>

            <div className="w-px h-5 bg-border mx-1" />

            {/* Blueprint mode toggle */}
            <Tooltip content="Blueprint Mode">
              <Button
                variant={venue.blueprintMode ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => updateVenueConfig({ blueprintMode: !venue.blueprintMode })}
              >
                <Ruler size={14} />
              </Button>
            </Tooltip>

            <div className="w-px h-5 bg-border mx-1" />

            <span className="text-xs text-slate-400 hidden sm:inline">
              {venue.tables.length} table{venue.tables.length !== 1 ? 's' : ''} &middot;{' '}
              {venue.fixtures.length} fixture{venue.fixtures.length !== 1 ? 's' : ''}
              {venue.walls.length > 0 && (
                <> &middot; {venue.walls.length} wall{venue.walls.length !== 1 ? 's' : ''}</>
              )}
            </span>

            <span className="text-xs text-slate-400 ml-auto shrink-0">
              {venue.roomWidth}&times;{venue.roomLength} {venue.unit}
            </span>
          </div>

          {/* Canvas */}
          <div ref={canvasContainerRef} className="flex-1 relative bg-slate-100 overflow-hidden">
            <VenueCanvasInner width={canvasSize.width} height={canvasSize.height} />
          </div>
        </div>

        {/* Right sidebar — selected element panel */}
        {selectedTable && (
          <>
            <div
              className="fixed inset-0 bg-black/20 z-30 lg:hidden"
              onClick={() => clearSelection()}
            />
            <div className="fixed inset-x-0 bottom-0 max-h-[60vh] rounded-t-xl z-40 bg-white border-t shadow-lg overflow-y-auto lg:relative lg:w-60 lg:border-l lg:border-t-0 lg:rounded-none lg:max-h-none lg:shadow-none lg:inset-auto lg:shrink-0">
              <div className="lg:hidden flex justify-center py-2">
                <div className="w-10 h-1 bg-gray-300 rounded-full" />
              </div>
              <SidebarSection title="Selected Table">
                <div className="space-y-3">
                  <Input
                    label="Label"
                    value={selectedTable.label}
                    onChange={(e) => updateTable(selectedTable.id, { label: e.target.value })}
                  />
                  <Input
                    label="Capacity"
                    type="number"
                  min={0}
                  value={selectedTable.capacity}
                  onChange={(e) =>
                    updateTable(selectedTable.id, { capacity: Math.max(0, Number(e.target.value) || 0) })
                  }
                />
                {/* Seating side — rectangular/square only */}
                {(selectedTable.shape === 'rectangular' || selectedTable.shape === 'square') && selectedTable.capacity > 0 && (
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">Seating sides</label>
                    <div className="grid grid-cols-3 gap-1">
                      {([
                        { value: 'both', label: 'Both' },
                        { value: 'top-only', label: 'Top' },
                        { value: 'bottom-only', label: 'Bottom' },
                      ] as const).map(({ value, label }) => (
                        <Button
                          key={value}
                          variant={(selectedTable.seatingSide ?? 'both') === value ? 'primary' : 'secondary'}
                          size="sm"
                          onClick={() => updateTable(selectedTable.id, { seatingSide: value })}
                          className="text-[10px]"
                        >
                          {label}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
                {/* End seats toggle — rectangular/square with both sides */}
                {(selectedTable.shape === 'rectangular' || selectedTable.shape === 'square') &&
                  selectedTable.capacity > 0 &&
                  (selectedTable.seatingSide ?? 'both') === 'both' && (
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <Checkbox
                      checked={selectedTable.endSeats !== false}
                      onCheckedChange={(checked) => updateTable(selectedTable.id, { endSeats: checked })}
                    />
                    Include end seats
                  </label>
                )}
                <div className="flex items-center gap-2">
                  <Input
                    label="Rotation"
                    type="number"
                    value={selectedTable.rotation}
                    onChange={(e) =>
                      updateTable(selectedTable.id, { rotation: Number(e.target.value) || 0 })
                    }
                    className="flex-1"
                  />
                  <div className="pt-5">
                    <Tooltip content="Rotate 45deg">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          updateTable(selectedTable.id, {
                            rotation: (selectedTable.rotation + 45) % 360,
                          })
                        }
                      >
                        <RotateCw size={14} />
                      </Button>
                    </Tooltip>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Input
                    label="Width"
                    type="number"
                    min={0}
                    value={selectedTable.width}
                    onChange={(e) =>
                      updateTable(selectedTable.id, { width: Math.max(0, Number(e.target.value) || 0) })
                    }
                  />
                  <Input
                    label="Height"
                    type="number"
                    min={0}
                    value={selectedTable.height}
                    onChange={(e) =>
                      updateTable(selectedTable.id, { height: Math.max(0, Number(e.target.value) || 0) })
                    }
                  />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <label className="text-xs text-slate-500">Position ({venue.unit})</label>
                    {!canCustomDimensions && <ProBadge />}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      label={`X (${venue.unit})`}
                      type="number"
                      min={0}
                      step={0.1}
                      value={Number((selectedTable.position.x / pxPerUnit).toFixed(1))}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (!isNaN(val)) updateTable(selectedTable.id, { position: { ...selectedTable.position, x: val * pxPerUnit } });
                      }}
                      disabled={!canCustomDimensions}
                    />
                    <Input
                      label={`Y (${venue.unit})`}
                      type="number"
                      min={0}
                      step={0.1}
                      value={Number((selectedTable.position.y / pxPerUnit).toFixed(1))}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (!isNaN(val)) updateTable(selectedTable.id, { position: { ...selectedTable.position, y: val * pxPerUnit } });
                      }}
                      disabled={!canCustomDimensions}
                    />
                  </div>
                </div>
                <div className="text-xs text-slate-400">
                  Shape: {selectedTable.shape} &middot; Assigned:{' '}
                  {selectedTable.assignedGuestIds.length}/{selectedTable.capacity}
                </div>
                <Button
                  variant="danger"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    deleteTable(selectedTable.id);
                    clearSelection();
                  }}
                >
                  <Trash2 size={14} /> Delete
                </Button>
              </div>
            </SidebarSection>
            </div>
          </>
        )}

        {selectedFixture && (
          <>
            <div
              className="fixed inset-0 bg-black/20 z-30 lg:hidden"
              onClick={() => clearSelection()}
            />
            <div className="fixed inset-x-0 bottom-0 max-h-[60vh] rounded-t-xl z-40 bg-white border-t shadow-lg overflow-y-auto lg:relative lg:w-60 lg:border-l lg:border-t-0 lg:rounded-none lg:max-h-none lg:shadow-none lg:inset-auto lg:shrink-0">
              <div className="lg:hidden flex justify-center py-2">
                <div className="w-10 h-1 bg-gray-300 rounded-full" />
              </div>
            <SidebarSection title="Selected Fixture">
              <div className="space-y-3">
                <Input
                  label="Label"
                  value={selectedFixture.label}
                  onChange={(e) => updateFixture(selectedFixture.id, { label: e.target.value })}
                />
                <div className="flex items-center gap-2">
                  <Input
                    label="Rotation"
                    type="number"
                    value={selectedFixture.rotation}
                    onChange={(e) =>
                      updateFixture(selectedFixture.id, { rotation: Number(e.target.value) || 0 })
                    }
                    className="flex-1"
                  />
                  <div className="pt-5">
                    <Tooltip content="Rotate 45deg">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          updateFixture(selectedFixture.id, {
                            rotation: (selectedFixture.rotation + 45) % 360,
                          })
                        }
                      >
                        <RotateCw size={14} />
                      </Button>
                    </Tooltip>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Input
                    label="Width"
                    type="number"
                    min={0}
                    value={selectedFixture.width}
                    onChange={(e) =>
                      updateFixture(selectedFixture.id, { width: Math.max(0, Number(e.target.value) || 0) })
                    }
                  />
                  <Input
                    label="Height"
                    type="number"
                    min={0}
                    value={selectedFixture.height}
                    onChange={(e) =>
                      updateFixture(selectedFixture.id, { height: Math.max(0, Number(e.target.value) || 0) })
                    }
                  />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <label className="text-xs text-slate-500">Position ({venue.unit})</label>
                    {!canCustomDimensions && <ProBadge />}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      label={`X (${venue.unit})`}
                      type="number"
                      step={0.1}
                      value={Number((selectedFixture.position.x / pxPerUnit).toFixed(1))}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (!isNaN(val)) updateFixture(selectedFixture.id, { position: { ...selectedFixture.position, x: val * pxPerUnit } });
                      }}
                      disabled={!canCustomDimensions}
                    />
                    <Input
                      label={`Y (${venue.unit})`}
                      type="number"
                      step={0.1}
                      value={Number((selectedFixture.position.y / pxPerUnit).toFixed(1))}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (!isNaN(val)) updateFixture(selectedFixture.id, { position: { ...selectedFixture.position, y: val * pxPerUnit } });
                      }}
                      disabled={!canCustomDimensions}
                    />
                  </div>
                </div>
                {/* Door style selector for entrance/exit/door */}
                {(selectedFixture.type === 'entrance' || selectedFixture.type === 'exit' || selectedFixture.type === 'door') && (
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">Door Style</label>
                    <div className="grid grid-cols-2 gap-1">
                      {(['swing-in', 'swing-out', 'sliding', 'double'] as const).map((style) => (
                        <Button
                          key={style}
                          variant={selectedFixture.doorStyle === style ? 'primary' : 'secondary'}
                          size="sm"
                          onClick={() => updateFixture(selectedFixture.id, { doorStyle: style })}
                          className="text-[10px]"
                        >
                          {style === 'swing-in' ? 'Swing In' : style === 'swing-out' ? 'Swing Out' : style === 'sliding' ? 'Sliding' : 'Double'}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
                {/* Check-in point toggle for door types */}
                {(selectedFixture.type === 'entrance' || selectedFixture.type === 'exit' || selectedFixture.type === 'door') && (
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={selectedFixture.isCheckIn ?? false}
                      onCheckedChange={(checked) => updateFixture(selectedFixture.id, { isCheckIn: checked })}
                    />
                    Check-in Point
                  </label>
                )}
                <div className="text-xs text-slate-400">
                  Type: {selectedFixture.type}
                </div>
                <Button
                  variant="danger"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    deleteFixture(selectedFixture.id);
                    clearSelection();
                  }}
                >
                  <Trash2 size={14} /> Delete
                </Button>
              </div>
            </SidebarSection>
            </div>
          </>
        )}

        {selectedWall && (
          <>
            <div
              className="fixed inset-0 bg-black/20 z-30 lg:hidden"
              onClick={() => clearSelection()}
            />
            <div className="fixed inset-x-0 bottom-0 max-h-[60vh] rounded-t-xl z-40 bg-white border-t shadow-lg overflow-y-auto lg:relative lg:w-60 lg:border-l lg:border-t-0 lg:rounded-none lg:max-h-none lg:shadow-none lg:inset-auto lg:shrink-0">
              <div className="lg:hidden flex justify-center py-2">
                <div className="w-10 h-1 bg-gray-300 rounded-full" />
              </div>
            <SidebarSection title="Selected Wall">
              <div className="space-y-3">
                <Input
                  label="Label"
                  value={selectedWall.label}
                  onChange={(e) => updateWall(selectedWall.id, { label: e.target.value })}
                />
                <Input
                  label="Thickness"
                  type="number"
                  min={0}
                  max={30}
                  value={selectedWall.thickness}
                  onChange={(e) =>
                    updateWall(selectedWall.id, { thickness: Math.max(0, Number(e.target.value) || 0) })
                  }
                />
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Style</label>
                  <div className="flex gap-1">
                    <Button
                      variant={selectedWall.style === 'solid' ? 'primary' : 'secondary'}
                      size="sm"
                      onClick={() => updateWall(selectedWall.id, { style: 'solid' })}
                      className="flex-1"
                    >
                      Solid
                    </Button>
                    <Button
                      variant={selectedWall.style === 'partition' ? 'primary' : 'secondary'}
                      size="sm"
                      onClick={() => updateWall(selectedWall.id, { style: 'partition' })}
                      className="flex-1"
                    >
                      Partition
                    </Button>
                  </div>
                </div>
                <div className="text-xs text-slate-400">
                  Length: {(wallLength / pxPerUnit).toFixed(1)} {venue.unit}
                </div>
                <Button
                  variant="danger"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    deleteWall(selectedWall.id);
                    clearSelection();
                  }}
                >
                  <Trash2 size={14} /> Delete
                </Button>
              </div>
            </SidebarSection>
            </div>
          </>
        )}

        {/* Room properties panel */}
        {selectedRoom && (
          <>
            <div
              className="fixed inset-0 bg-black/20 z-30 lg:hidden"
              onClick={() => clearSelection()}
            />
            <div className="fixed inset-x-0 bottom-0 max-h-[60vh] rounded-t-xl z-40 bg-white border-t shadow-lg overflow-y-auto lg:relative lg:w-60 lg:border-l lg:border-t-0 lg:rounded-none lg:max-h-none lg:shadow-none lg:inset-auto lg:shrink-0">
              <div className="lg:hidden flex justify-center py-2">
                <div className="w-10 h-1 bg-gray-300 rounded-full" />
              </div>
            <SidebarSection title="Selected Room">
              <div className="space-y-3">
                <Input
                  label="Label"
                  value={selectedRoom.label}
                  onChange={(e) => updateRoom(selectedRoom.id, { label: e.target.value })}
                />
                <div className="flex gap-2">
                  <Input
                    label={`Width (${venue.unit})`}
                    type="number"
                    min={0}
                    value={selectedRoom.width}
                    onChange={(e) =>
                      updateRoom(selectedRoom.id, { width: Math.max(0, Number(e.target.value) || 0) })
                    }
                  />
                  <Input
                    label={`Height (${venue.unit})`}
                    type="number"
                    min={0}
                    value={selectedRoom.height}
                    onChange={(e) =>
                      updateRoom(selectedRoom.id, { height: Math.max(0, Number(e.target.value) || 0) })
                    }
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Color (optional)</label>
                  <div className="flex gap-1.5">
                    {['#e8f0fe', '#fef3c7', '#dcfce7', '#fce7f3', '#e0e7ff', undefined].map((color, i) => (
                      <button
                        key={i}
                        onClick={() => updateRoom(selectedRoom.id, { color })}
                        className={`w-6 h-6 rounded-full border-2 cursor-pointer ${
                          selectedRoom.color === color ? 'border-blue-500' : 'border-slate-200'
                        }`}
                        style={{ backgroundColor: color ?? '#ffffff' }}
                      />
                    ))}
                  </div>
                </div>
                <Button
                  variant="danger"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    deleteRoom(selectedRoom.id);
                    clearSelection();
                  }}
                >
                  <Trash2 size={14} /> Delete Room
                </Button>
              </div>
            </SidebarSection>
            </div>
          </>
        )}

        {/* Add Room dialog */}
        <Dialog open={addRoomDialogOpen} onOpenChange={setAddRoomDialogOpen}>
          <DialogContent title="Add Room" description="Add a new room extending from an existing room wall.">
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-500 block mb-1">Attach to</label>
                <select
                  value={newRoomAttachTo}
                  onChange={(e) => setNewRoomAttachTo(e.target.value)}
                  className="w-full border border-border rounded-md px-2 py-1.5 text-sm"
                >
                  <option value="__primary__">Main Room</option>
                  {(venue.rooms ?? []).map((r) => (
                    <option key={r.id} value={r.id}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Edge</label>
                <div className="grid grid-cols-4 gap-1">
                  {(['top', 'right', 'bottom', 'left'] as const).map((edge) => (
                    <Button
                      key={edge}
                      variant={newRoomEdge === edge ? 'primary' : 'secondary'}
                      size="sm"
                      onClick={() => setNewRoomEdge(edge)}
                      className="capitalize"
                    >
                      {edge}
                    </Button>
                  ))}
                </div>
              </div>
              <Input
                label="Label"
                value={newRoomLabel}
                onChange={(e) => setNewRoomLabel(e.target.value)}
                placeholder="e.g. Lobby"
              />
              <div className="flex gap-2">
                <Input
                  label={`Width (${venue.unit})`}
                  type="number"
                  min={0}
                  value={newRoomWidth}
                  onChange={(e) => setNewRoomWidth(Math.max(0, Number(e.target.value) || 0))}
                />
                <Input
                  label={`Height (${venue.unit})`}
                  type="number"
                  min={0}
                  value={newRoomHeight}
                  onChange={(e) => setNewRoomHeight(Math.max(0, Number(e.target.value) || 0))}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" size="sm" onClick={() => setAddRoomDialogOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" onClick={handleAddRoom}>
                  <Plus size={14} /> Add Room
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Save template dialog */}
        <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
          <DialogContent title="Save Template" description="Save the current venue layout as a reusable template.">
            <div className="space-y-3">
              <Input
                label="Template Name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g. Banquet Hall 200 pax"
              />
              <Input
                label="Description"
                value={templateDesc}
                onChange={(e) => setTemplateDesc(e.target.value)}
                placeholder="Optional description"
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" size="sm" onClick={() => setSaveDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSaveTemplate}
                  disabled={!templateName.trim()}
                >
                  <Save size={14} /> Save
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Load template dialog — Pre-built + Saved tabs */}
        <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
          <DialogContent title="Load Template" description="Choose a pre-built template or load a saved layout.">
            {/* Tabs */}
            <div className="flex gap-1 mb-3">
              <button
                onClick={() => setTemplateTab('prebuilt')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  templateTab === 'prebuilt'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'text-slate-500 hover:text-slate-700 border border-transparent'
                }`}
              >
                Pre-built
              </button>
              <button
                onClick={() => setTemplateTab('saved')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  templateTab === 'saved'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'text-slate-500 hover:text-slate-700 border border-transparent'
                }`}
              >
                My Templates ({templates.length})
              </button>
            </div>

            {templateTab === 'prebuilt' ? (
              <div className="grid grid-cols-2 gap-2 max-h-80 overflow-y-auto">
                {PREBUILT_TEMPLATES.map((tpl, index) => (
                  <div
                    key={tpl.name}
                    className="p-3 rounded-lg border border-border hover:border-blue-300 hover:bg-blue-50/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-1">
                      <p className="text-sm font-medium text-foreground leading-tight">{tpl.name}</p>
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full shrink-0 ml-1">
                        <Users size={10} className="inline -mt-0.5 mr-0.5" />
                        {tpl.guestCapacity}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{tpl.description}</p>
                    <Button
                      variant="primary"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        loadPrebuiltTemplate(index);
                        setTemplateDialogOpen(false);
                      }}
                    >
                      Use Template
                    </Button>
                  </div>
                ))}
              </div>
            ) : templates.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No saved templates yet.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {templates.map((tpl) => (
                  <div
                    key={tpl.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-slate-50"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{tpl.name}</p>
                      {tpl.description && (
                        <p className="text-xs text-muted-foreground truncate">{tpl.description}</p>
                      )}
                      <p className="text-xs text-slate-400 mt-0.5">
                        {tpl.config.tables.length} tables &middot;{' '}
                        {new Date(tpl.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0 ml-2">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          loadTemplate(tpl.id);
                          setTemplateDialogOpen(false);
                          toast.success('Template loaded');
                        }}
                      >
                        Load
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => { deleteTemplate(tpl.id); toast.success('Template deleted'); }}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>
        {/* AI Tools Dialogs */}
        <PhotoToRoomDialog open={photoDialogOpen} onOpenChange={setPhotoDialogOpen} />
        <LayoutAdvisorDialog open={advisorDialogOpen} onOpenChange={setAdvisorDialogOpen} />
      </div>
    </TooltipProvider>
  );
}

// --- Helper components ---

function SidebarSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-3 border-b border-border">
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{title}</h3>
      {children}
    </div>
  );
}
