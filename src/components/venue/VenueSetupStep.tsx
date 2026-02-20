'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
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
} from 'lucide-react';
import { useSeatingStore } from '@/stores/useSeatingStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Tooltip, TooltipProvider } from '@/components/ui/Tooltip';
import { Checkbox } from '@/components/ui/Checkbox';
import { Dialog, DialogContent } from '@/components/ui/Dialog';
import { PREBUILT_TEMPLATES } from '@/lib/venue-templates';
import type { TableShape, FixtureType } from '@/types/venue';

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

  const selectedTable = selectedElementType === 'table' ? venue.tables.find((t) => t.id === selectedElementId) ?? null : null;
  const selectedFixture = selectedElementType === 'fixture' ? venue.fixtures.find((f) => f.id === selectedElementId) ?? null : null;
  const selectedWall = selectedElementType === 'wall' ? venue.walls.find((w) => w.id === selectedElementId) ?? null : null;

  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDesc, setTemplateDesc] = useState('');
  const [templateTab, setTemplateTab] = useState<'prebuilt' | 'saved'>('prebuilt');

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
      addTable(shape);
    },
    [addTable]
  );

  const handleAddFixture = useCallback(
    (type: FixtureType, width: number, height: number) => {
      addFixture({
        type,
        label: type,
        position: { x: 100, y: 100 },
        rotation: 0,
        width,
        height,
      });
    },
    [addFixture]
  );

  const handleFitToView = useCallback(() => {
    if (!canvasContainerRef.current) return;
    const unit = venue.unit === 'ft' ? 15 : 30;
    const roomW = venue.roomWidth * unit;
    const roomH = venue.roomHeight * unit;
    const padded = 40;
    const scaleX = (canvasSize.width - padded * 2) / roomW;
    const scaleY = (canvasSize.height - padded * 2) / roomH;
    const newZoom = Math.min(scaleX, scaleY, 2);
    setZoom(newZoom);
    setPanOffset({
      x: (canvasSize.width - roomW * newZoom) / 2,
      y: (canvasSize.height - roomH * newZoom) / 2,
    });
  }, [venue.roomWidth, venue.roomHeight, venue.unit, canvasSize, setZoom, setPanOffset]);

  const handleSaveTemplate = useCallback(() => {
    if (!templateName.trim()) return;
    saveTemplate(templateName.trim(), templateDesc.trim());
    setTemplateName('');
    setTemplateDesc('');
    setSaveDialogOpen(false);
  }, [templateName, templateDesc, saveTemplate]);

  // Compute wall length for display
  const wallLength = selectedWall
    ? Math.sqrt(
        (selectedWall.end.x - selectedWall.start.x) ** 2 + (selectedWall.end.y - selectedWall.start.y) ** 2
      )
    : 0;
  const pxPerUnit = venue.unit === 'ft' ? 15 : 30;

  return (
    <TooltipProvider>
      <div className="flex h-full bg-slate-50">
        {/* Left sidebar */}
        <div className="w-64 border-r border-border bg-white flex flex-col overflow-y-auto shrink-0">
          {/* Room dimensions */}
          <SidebarSection title="Room Dimensions">
            <div className="flex gap-2">
              <Input
                type="number"
                value={venue.roomWidth}
                onChange={(e) => updateVenueConfig({ roomWidth: Number(e.target.value) || 1 })}
                min={1}
                className="w-full"
                label="Width"
              />
              <Input
                type="number"
                value={venue.roomHeight}
                onChange={(e) => updateVenueConfig({ roomHeight: Number(e.target.value) || 1 })}
                min={1}
                className="w-full"
                label="Height"
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
              {FIXTURE_TYPES.map(({ type, label, icon: Icon, width, height }) => (
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
              <Input
                type="number"
                label="Grid Size"
                value={venue.gridSize}
                onChange={(e) => updateVenueConfig({ gridSize: Math.max(1, Number(e.target.value) || 1) })}
                min={1}
              />
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
        </div>

        {/* Main canvas area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top toolbar */}
          <div className="h-10 border-b border-border bg-white flex items-center px-3 gap-2 shrink-0">
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

            <span className="text-xs text-slate-400">
              {venue.tables.length} table{venue.tables.length !== 1 ? 's' : ''} &middot;{' '}
              {venue.fixtures.length} fixture{venue.fixtures.length !== 1 ? 's' : ''}
              {venue.walls.length > 0 && (
                <> &middot; {venue.walls.length} wall{venue.walls.length !== 1 ? 's' : ''}</>
              )}
            </span>

            <span className="text-xs text-slate-400 ml-auto">
              {venue.roomWidth}&times;{venue.roomHeight} {venue.unit}
            </span>
          </div>

          {/* Canvas */}
          <div ref={canvasContainerRef} className="flex-1 relative bg-slate-100 overflow-hidden">
            <VenueCanvasInner width={canvasSize.width} height={canvasSize.height} />
          </div>
        </div>

        {/* Right sidebar — selected element panel */}
        {selectedTable && (
          <div className="w-60 border-l border-border bg-white flex flex-col overflow-y-auto shrink-0">
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
                    min={10}
                    value={selectedTable.width}
                    onChange={(e) =>
                      updateTable(selectedTable.id, { width: Math.max(10, Number(e.target.value) || 10) })
                    }
                  />
                  <Input
                    label="Height"
                    type="number"
                    min={10}
                    value={selectedTable.height}
                    onChange={(e) =>
                      updateTable(selectedTable.id, { height: Math.max(10, Number(e.target.value) || 10) })
                    }
                  />
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
        )}

        {selectedFixture && (
          <div className="w-60 border-l border-border bg-white flex flex-col overflow-y-auto shrink-0">
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
                    min={10}
                    value={selectedFixture.width}
                    onChange={(e) =>
                      updateFixture(selectedFixture.id, { width: Math.max(10, Number(e.target.value) || 10) })
                    }
                  />
                  <Input
                    label="Height"
                    type="number"
                    min={10}
                    value={selectedFixture.height}
                    onChange={(e) =>
                      updateFixture(selectedFixture.id, { height: Math.max(10, Number(e.target.value) || 10) })
                    }
                  />
                </div>
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
        )}

        {selectedWall && (
          <div className="w-60 border-l border-border bg-white flex flex-col overflow-y-auto shrink-0">
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
                  min={2}
                  max={30}
                  value={selectedWall.thickness}
                  onChange={(e) =>
                    updateWall(selectedWall.id, { thickness: Math.max(2, Number(e.target.value) || 8) })
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
        )}

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
                        }}
                      >
                        Load
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteTemplate(tpl.id)}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>
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
