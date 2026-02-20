'use client';

import { memo, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Stage, Layer, Rect, Circle, Group, Line, Text, Arc, Transformer } from 'react-konva';
import type Konva from 'konva';
import { useSeatingStore } from '@/stores/useSeatingStore';
import { useCanvasInteraction } from '@/hooks/useCanvasInteraction';
import { useGridSnap } from '@/hooks/useGridSnap';
import { useWallDrawing } from '@/hooks/useWallDrawing';
import { computeAlignmentSnap, getBoundsFromPosition, getObjectBounds } from '@/lib/alignment-engine';
import type { AlignmentGuide, RoomBounds } from '@/lib/alignment-engine';
import { AlignmentGuideLines } from './AlignmentGuideLines';
import { RoomCenterGuides } from './RoomCenterGuides';
import { getAllRoomRects } from '@/lib/room-geometry';
import type { Table, Fixture, Wall, TableShape } from '@/types/venue';
import { getSeatPositions } from '@/lib/table-geometry';

interface VenueCanvasInnerProps {
  width: number;
  height: number;
}

export function VenueCanvasInner({ width, height }: VenueCanvasInnerProps) {
  const venue = useSeatingStore((s) => s.venue);
  const selectedElementId = useSeatingStore((s) => s.selectedElementId);
  const selectedElementType = useSeatingStore((s) => s.selectedElementType);
  const setSelectedElement = useSeatingStore((s) => s.setSelectedElement);
  const clearSelection = useSeatingStore((s) => s.clearSelection);
  const updateTable = useSeatingStore((s) => s.updateTable);
  const updateFixture = useSeatingStore((s) => s.updateFixture);
  const updateWall = useSeatingStore((s) => s.updateWall);
  const canvasToolMode = useSeatingStore((s) => s.canvasToolMode);

  const { zoom, panOffset, handleWheel, handleMouseDown: handlePanMouseDown, handleMouseMove: handlePanMouseMove, handleMouseUp: handlePanMouseUp, handleTouchStart: handlePanTouchStart, handleTouchMove: handlePanTouchMove, handleTouchEnd: handlePanTouchEnd } =
    useCanvasInteraction();
  const { snapPosition, gridPixels, pixelsPerUnit } = useGridSnap();
  const { drawingWall, isDrawing, handleMouseDown: handleWallMouseDown, handleMouseMove: handleWallMouseMove, handleMouseUp: handleWallMouseUp } =
    useWallDrawing();

  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);

  const [activeGuides, setActiveGuides] = useState<AlignmentGuide[]>([]);

  // Snap-escape hysteresis: track whether we're currently locked to a snap on each axis
  // and what the snapped coordinate is, so we can require a larger pull to break free
  const snapLockRef = useRef<{ x: number | null; y: number | null }>({ x: null, y: null });
  const ESCAPE_MULTIPLIER = 2; // must pull 2x the snap threshold to break free

  const [editingTableId, setEditingTableId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  const roomWidthPx = venue.roomWidth * pixelsPerUnit;
  const roomLengthPx = venue.roomLength * pixelsPerUnit;

  const bp = venue.blueprintMode;

  // Room size warning: minimum 3x3 metres (~10x10 ft)
  const minSizeMetres = 3;
  const minSizeFt = 10;
  const minWidth = venue.unit === 'ft' ? minSizeFt : minSizeMetres;
  const minLength = venue.unit === 'ft' ? minSizeFt : minSizeMetres;
  const roomTooSmall = venue.roomWidth < minWidth || venue.roomLength < minLength;

  const SNAP_THRESHOLD = 8 / zoom;

  // Compute all room rectangles for multi-room rendering
  const roomRects = useMemo(
    () => getAllRoomRects(venue, pixelsPerUnit),
    [venue, pixelsPerUnit]
  );

  // Build array of RoomBounds for alignment engine (all rooms)
  const allRoomBounds: RoomBounds[] = useMemo(
    () => roomRects.map((r) => ({
      left: r.x,
      right: r.x + r.width,
      top: r.y,
      bottom: r.y + r.height,
      centerX: r.x + r.width / 2,
      centerY: r.y + r.height / 2,
    })),
    [roomRects]
  );

  // Keep a single-room fallback for backwards compat
  const roomBounds = useMemo(() => ({
    left: 0,
    right: roomWidthPx,
    top: 0,
    bottom: roomLengthPx,
    centerX: roomWidthPx / 2,
    centerY: roomLengthPx / 2,
  }), [roomWidthPx, roomLengthPx]);

  // Compute glow rect behind selected element
  const selectionGlow = useMemo(() => {
    if (!selectedElementId) return null;
    const pad = 6 / zoom;
    const table = venue.tables.find((t) => t.id === selectedElementId);
    if (table) {
      return {
        x: table.position.x - table.width / 2 - pad,
        y: table.position.y - table.height / 2 - pad,
        width: table.width + pad * 2,
        height: table.height + pad * 2,
        rotation: table.rotation,
        originX: table.position.x,
        originY: table.position.y,
      };
    }
    const fixture = venue.fixtures.find((f) => f.id === selectedElementId);
    if (fixture) {
      return {
        x: fixture.position.x - fixture.width / 2 - pad,
        y: fixture.position.y - fixture.height / 2 - pad,
        width: fixture.width + pad * 2,
        height: fixture.height + pad * 2,
        rotation: fixture.rotation,
        originX: fixture.position.x,
        originY: fixture.position.y,
      };
    }
    return null;
  }, [selectedElementId, venue.tables, venue.fixtures, zoom]);

  // Attach Transformer to selected element
  useEffect(() => {
    const tr = transformerRef.current;
    const stage = stageRef.current;
    if (!tr || !stage) return;

    if (selectedElementId) {
      const node = stage.findOne(`#${selectedElementId}`);
      if (node) {
        tr.nodes([node]);
        tr.getLayer()?.batchDraw();
        return;
      }
    }
    tr.nodes([]);
    tr.getLayer()?.batchDraw();
  }, [selectedElementId, venue.tables, venue.fixtures, venue.walls]);

  // Grid lines for all rooms
  const gridLines = useMemo(() => {
    if (!venue.showGrid || gridPixels <= 0) return [];
    const lines: { points: number[]; key: string; isMajor: boolean }[] = [];
    for (const room of roomRects) {
      const rx = room.x;
      const ry = room.y;
      const rw = room.width;
      const rh = room.height;
      for (let x = 0; x <= rw; x += gridPixels) {
        const gridIndex = Math.round(x / gridPixels);
        lines.push({
          points: [rx + x, ry, rx + x, ry + rh],
          key: `v-${room.id}-${x}`,
          isMajor: bp && gridIndex % 5 === 0,
        });
      }
      for (let y = 0; y <= rh; y += gridPixels) {
        const gridIndex = Math.round(y / gridPixels);
        lines.push({
          points: [rx, ry + y, rx + rw, ry + y],
          key: `h-${room.id}-${y}`,
          isMajor: bp && gridIndex % 5 === 0,
        });
      }
    }
    return lines;
  }, [venue.showGrid, roomRects, gridPixels, bp]);

  const getStagePointer = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>): { x: number; y: number } | null => {
      const stage = stageRef.current;
      if (!stage) return null;
      const pos = stage.getPointerPosition();
      if (!pos) return null;
      return {
        x: (pos.x - panOffset.x) / zoom,
        y: (pos.y - panOffset.y) / zoom,
      };
    },
    [panOffset, zoom]
  );

  // Stable selection callbacks for memoized child components
  const handleSelectTable = useCallback(
    (tableId: string) => {
      setSelectedElement(tableId, 'table');
    },
    [setSelectedElement]
  );

  const handleSelectFixture = useCallback(
    (fixtureId: string) => {
      setSelectedElement(fixtureId, 'fixture');
    },
    [setSelectedElement]
  );

  const handleSelectWall = useCallback(
    (wallId: string) => {
      setSelectedElement(wallId, 'wall');
    },
    [setSelectedElement]
  );

  const handleTableDragMove = useCallback(
    (tableId: string, e: Konva.KonvaEventObject<DragEvent>) => {
      if (!venue.snapToGuides) return;
      const node = e.target;
      const table = venue.tables.find((t) => t.id === tableId);
      if (!table) return;

      const rawX = node.x();
      const rawY = node.y();
      const draggingBounds = getBoundsFromPosition(tableId, rawX, rawY, table.width, table.height);
      const otherBounds = [
        ...venue.tables.filter((t) => t.id !== tableId).map(getObjectBounds),
        ...venue.fixtures.map(getObjectBounds),
      ];

      const result = computeAlignmentSnap(draggingBounds, otherBounds, allRoomBounds, SNAP_THRESHOLD, venue.guides);
      const lock = snapLockRef.current;
      const escapeThreshold = SNAP_THRESHOLD * ESCAPE_MULTIPLIER;

      // X axis: hysteresis -- if locked, only release when raw pos pulls far enough away
      let useSnapX = result.didSnapX;
      if (lock.x !== null) {
        const pullDistance = Math.abs(rawX - lock.x);
        if (pullDistance > escapeThreshold) {
          lock.x = null; // break free
          useSnapX = false;
        } else {
          useSnapX = true; // stay locked even if alignment engine says no snap
        }
      }
      if (useSnapX && result.didSnapX) {
        lock.x = result.snappedPosition.x;
      }

      // Y axis: same logic
      let useSnapY = result.didSnapY;
      if (lock.y !== null) {
        const pullDistance = Math.abs(rawY - lock.y);
        if (pullDistance > escapeThreshold) {
          lock.y = null;
          useSnapY = false;
        } else {
          useSnapY = true;
        }
      }
      if (useSnapY && result.didSnapY) {
        lock.y = result.snappedPosition.y;
      }

      if (useSnapX || useSnapY) {
        node.position({
          x: useSnapX ? (lock.x ?? result.snappedPosition.x) : rawX,
          y: useSnapY ? (lock.y ?? result.snappedPosition.y) : rawY,
        });
        setActiveGuides(result.guides.filter((g) =>
          (g.orientation === 'vertical' && useSnapX) ||
          (g.orientation === 'horizontal' && useSnapY)
        ));
      } else {
        setActiveGuides([]);
      }
    },
    [venue.snapToGuides, venue.tables, venue.fixtures, venue.guides, allRoomBounds, SNAP_THRESHOLD, ESCAPE_MULTIPLIER]
  );

  const handleTableDragEnd = useCallback(
    (tableId: string, e: Konva.KonvaEventObject<DragEvent>) => {
      setActiveGuides([]);
      snapLockRef.current = { x: null, y: null };
      const node = e.target;
      // If guide snap already positioned the node, use that; otherwise fall back to grid snap
      const pos = venue.snapToGrid
        ? snapPosition(node.x(), node.y())
        : { x: node.x(), y: node.y() };
      node.position(pos);
      updateTable(tableId, { position: pos });
    },
    [snapPosition, updateTable, venue.snapToGrid]
  );

  const handleFixtureDragMove = useCallback(
    (fixtureId: string, e: Konva.KonvaEventObject<DragEvent>) => {
      if (!venue.snapToGuides) return;
      const node = e.target;
      const fixture = venue.fixtures.find((f) => f.id === fixtureId);
      if (!fixture) return;

      const rawX = node.x();
      const rawY = node.y();
      const draggingBounds = getBoundsFromPosition(fixtureId, rawX, rawY, fixture.width, fixture.height);
      const otherBounds = [
        ...venue.tables.map(getObjectBounds),
        ...venue.fixtures.filter((f) => f.id !== fixtureId).map(getObjectBounds),
      ];

      const result = computeAlignmentSnap(draggingBounds, otherBounds, allRoomBounds, SNAP_THRESHOLD, venue.guides);
      const lock = snapLockRef.current;
      const escapeThreshold = SNAP_THRESHOLD * ESCAPE_MULTIPLIER;

      let useSnapX = result.didSnapX;
      if (lock.x !== null) {
        if (Math.abs(rawX - lock.x) > escapeThreshold) {
          lock.x = null;
          useSnapX = false;
        } else {
          useSnapX = true;
        }
      }
      if (useSnapX && result.didSnapX) lock.x = result.snappedPosition.x;

      let useSnapY = result.didSnapY;
      if (lock.y !== null) {
        if (Math.abs(rawY - lock.y) > escapeThreshold) {
          lock.y = null;
          useSnapY = false;
        } else {
          useSnapY = true;
        }
      }
      if (useSnapY && result.didSnapY) lock.y = result.snappedPosition.y;

      if (useSnapX || useSnapY) {
        node.position({
          x: useSnapX ? (lock.x ?? result.snappedPosition.x) : rawX,
          y: useSnapY ? (lock.y ?? result.snappedPosition.y) : rawY,
        });
        setActiveGuides(result.guides.filter((g) =>
          (g.orientation === 'vertical' && useSnapX) ||
          (g.orientation === 'horizontal' && useSnapY)
        ));
      } else {
        setActiveGuides([]);
      }
    },
    [venue.snapToGuides, venue.tables, venue.fixtures, venue.guides, allRoomBounds, SNAP_THRESHOLD, ESCAPE_MULTIPLIER]
  );

  const handleFixtureDragEnd = useCallback(
    (fixtureId: string, e: Konva.KonvaEventObject<DragEvent>) => {
      setActiveGuides([]);
      snapLockRef.current = { x: null, y: null };
      const node = e.target;
      const pos = venue.snapToGrid
        ? snapPosition(node.x(), node.y())
        : { x: node.x(), y: node.y() };
      node.position(pos);
      updateFixture(fixtureId, { position: pos });
    },
    [snapPosition, updateFixture, venue.snapToGrid]
  );

  const handleWallDragEnd = useCallback(
    (wallId: string, e: Konva.KonvaEventObject<DragEvent>) => {
      const node = e.target;
      const wall = venue.walls.find((w) => w.id === wallId);
      if (!wall) return;
      const dx = node.x();
      const dy = node.y();
      const snappedStart = snapPosition(wall.start.x + dx, wall.start.y + dy);
      const snappedEnd = snapPosition(wall.end.x + dx, wall.end.y + dy);
      // Reset node position since we store absolute coords
      node.position({ x: 0, y: 0 });
      updateWall(wallId, { start: snappedStart, end: snappedEnd });
    },
    [snapPosition, updateWall, venue.walls]
  );

  const handleTransformEnd = useCallback(
    (e: Konva.KonvaEventObject<Event>) => {
      const node = e.target;
      const id = node.id();
      if (!id) return;

      const scaleX = node.scaleX();
      const scaleY = node.scaleY();
      const rotation = node.rotation();

      // Reset scale
      node.scaleX(1);
      node.scaleY(1);

      const snapped = snapPosition(node.x(), node.y());
      node.position(snapped);

      // Determine element type
      const table = venue.tables.find((t) => t.id === id);
      if (table) {
        const newWidth = Math.max(20, Math.round(table.width * scaleX));
        const newHeight = Math.max(20, Math.round(table.height * scaleY));
        updateTable(id, { width: newWidth, height: newHeight, rotation, position: snapped });
        return;
      }

      const fixture = venue.fixtures.find((f) => f.id === id);
      if (fixture) {
        const newWidth = Math.max(20, Math.round(fixture.width * scaleX));
        const newHeight = Math.max(20, Math.round(fixture.height * scaleY));
        updateFixture(id, { width: newWidth, height: newHeight, rotation, position: snapped });
        return;
      }

      const wall = venue.walls.find((w) => w.id === id);
      if (wall) {
        updateWall(id, { rotation });
      }
    },
    [venue.tables, venue.fixtures, venue.walls, snapPosition, updateTable, updateFixture, updateWall]
  );

  // Inline label editing
  const handleTableDblClick = useCallback(
    (tableId: string) => {
      const table = venue.tables.find((t) => t.id === tableId);
      if (!table) return;
      setEditingTableId(tableId);
      setEditingValue(table.label);
    },
    [venue.tables]
  );

  const commitEdit = useCallback(() => {
    if (editingTableId && editingValue.trim()) {
      updateTable(editingTableId, { label: editingValue.trim() });
    }
    setEditingTableId(null);
  }, [editingTableId, editingValue, updateTable]);

  // Focus edit input when it appears
  useEffect(() => {
    if (editingTableId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingTableId]);

  // Compute edit input screen position
  const editInputStyle = useMemo(() => {
    if (!editingTableId) return null;
    const table = venue.tables.find((t) => t.id === editingTableId);
    if (!table) return null;
    const screenX = table.position.x * zoom + panOffset.x;
    const screenY = table.position.y * zoom + panOffset.y;
    const inputWidth = Math.max(80, table.width * zoom);
    return {
      position: 'absolute' as const,
      left: screenX - inputWidth / 2,
      top: screenY - 10 * zoom,
      width: inputWidth,
      fontSize: 11 * zoom,
      textAlign: 'center' as const,
      border: '1.5px solid #2563EB',
      borderRadius: 4,
      padding: '2px 4px',
      outline: 'none',
      background: 'white',
      zIndex: 10,
    };
  }, [editingTableId, venue.tables, zoom, panOffset]);

  const handleStageMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      // Wall drawing takes priority
      if (isDrawing && e.evt.button === 0) {
        const ptr = getStagePointer(e);
        if (ptr) handleWallMouseDown(ptr.x, ptr.y);
        return;
      }

      // If clicking on empty stage, deselect
      if (e.target === e.target.getStage()) {
        clearSelection();
      }

      handlePanMouseDown(e);
    },
    [isDrawing, getStagePointer, handleWallMouseDown, clearSelection, handlePanMouseDown]
  );

  const handleStageMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (isDrawing && drawingWall) {
        const ptr = getStagePointer(e);
        if (ptr) handleWallMouseMove(ptr.x, ptr.y);
        return;
      }
      handlePanMouseMove(e);
    },
    [isDrawing, drawingWall, getStagePointer, handleWallMouseMove, handlePanMouseMove]
  );

  const handleStageMouseUp = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (isDrawing) {
        handleWallMouseUp();
        return;
      }
      handlePanMouseUp();
    },
    [isDrawing, handleWallMouseUp, handlePanMouseUp]
  );

  // --- Touch handlers for wall drawing + pan fallback ---

  const handleStageTouchStart = useCallback(
    (e: Konva.KonvaEventObject<TouchEvent>) => {
      // Wall drawing on touch (single finger only)
      if (isDrawing && e.evt.touches.length === 1) {
        const ptr = getStagePointer(e);
        if (ptr) handleWallMouseDown(ptr.x, ptr.y);
        return;
      }

      // If tapping on empty stage, deselect
      if (e.target === e.target.getStage()) {
        clearSelection();
      }

      handlePanTouchStart(e);
    },
    [isDrawing, getStagePointer, handleWallMouseDown, clearSelection, handlePanTouchStart]
  );

  const handleStageTouchMove = useCallback(
    (e: Konva.KonvaEventObject<TouchEvent>) => {
      if (isDrawing && drawingWall && e.evt.touches.length === 1) {
        const ptr = getStagePointer(e);
        if (ptr) handleWallMouseMove(ptr.x, ptr.y);
        return;
      }
      handlePanTouchMove(e);
    },
    [isDrawing, drawingWall, getStagePointer, handleWallMouseMove, handlePanTouchMove]
  );

  const handleStageTouchEnd = useCallback(
    () => {
      if (isDrawing) {
        handleWallMouseUp();
        return;
      }
      handlePanTouchEnd();
    },
    [isDrawing, handleWallMouseUp, handlePanTouchEnd]
  );

  // Suppress unused var warnings for items used indirectly
  void selectedElementType;
  void canvasToolMode;
  void roomBounds;

  return (
    <div style={{ position: 'relative', width, height }}>
    <Stage
      ref={stageRef}
      width={width}
      height={height}
      scaleX={zoom}
      scaleY={zoom}
      x={panOffset.x}
      y={panOffset.y}
      onWheel={handleWheel}
      onMouseDown={handleStageMouseDown}
      onMouseMove={handleStageMouseMove}
      onMouseUp={handleStageMouseUp}
      onTouchStart={handleStageTouchStart}
      onTouchMove={handleStageTouchMove}
      onTouchEnd={handleStageTouchEnd}
      style={{ cursor: isDrawing ? 'crosshair' : 'default' }}
    >
      {/* Layer 1: Background -- multi-room fills + grids + boundaries + room center guides */}
      <Layer listening={false}>
        {/* Room backgrounds */}
        {roomRects.map((room) => (
          <Rect
            key={`bg-${room.id}`}
            x={room.x}
            y={room.y}
            width={room.width}
            height={room.height}
            fill={room.color ? room.color : (bp ? '#e8f0fe' : '#ffffff')}
            listening={false}
          />
        ))}

        {/* Grid lines (scoped per room) */}
        {gridLines.map((line) => (
          <Line
            key={line.key}
            points={line.points}
            stroke={bp ? (line.isMajor ? '#93b4e8' : '#b8cef4') : '#e2e8f0'}
            strokeWidth={line.isMajor ? 1 : 0.5}
            listening={false}
          />
        ))}

        {/* Room boundaries + labels */}
        {roomRects.map((room, idx) => {
          const isAdditional = idx > 0;
          const roomW = room.width / pixelsPerUnit;
          const roomH = room.height / pixelsPerUnit;
          return (
            <Group key={`boundary-${room.id}`}>
              <Rect
                x={room.x}
                y={room.y}
                width={room.width}
                height={room.height}
                stroke={bp ? '#1a56db' : (isAdditional ? '#64748b' : '#334155')}
                strokeWidth={2}
                fill="transparent"
                dash={isAdditional ? [8, 4] : undefined}
                listening={false}
              />
              {/* Room label at top-left */}
              {isAdditional && (
                <Text
                  x={room.x + 6}
                  y={room.y + 4}
                  text={room.label}
                  fontSize={10}
                  fontFamily="system-ui, sans-serif"
                  fill={bp ? '#1a56db' : '#64748b'}
                  listening={false}
                />
              )}
              {/* Blueprint dimension labels per room */}
              {bp && (
                <>
                  <Text
                    x={room.x + room.width / 2 - 40}
                    y={room.y + room.height + 8}
                    text={`${roomW} ${venue.unit}`}
                    fontSize={11}
                    fontFamily="system-ui, sans-serif"
                    fill="#1a56db"
                    listening={false}
                  />
                  <Text
                    x={room.x + room.width + 8}
                    y={room.y + room.height / 2 - 6}
                    text={`${roomH} ${venue.unit}`}
                    fontSize={11}
                    fontFamily="system-ui, sans-serif"
                    fill="#1a56db"
                    rotation={90}
                    listening={false}
                  />
                </>
              )}
            </Group>
          );
        })}

        {/* Room center guides for each room */}
        {venue.showRoomCenter && roomRects.map((room) => (
          <RoomCenterGuides
            key={`center-${room.id}`}
            roomWidthPx={room.width}
            roomLengthPx={room.height}
            offsetX={room.x}
            offsetY={room.y}
          />
        ))}

        {/* User-placed guides */}
        {venue.guides.map((guide) => (
          <Line
            key={guide.id}
            points={
              guide.axis === 'horizontal'
                ? [0, guide.position, roomWidthPx, guide.position]
                : [guide.position, 0, guide.position, roomLengthPx]
            }
            stroke="#10B981"
            strokeWidth={0.75}
            dash={[6, 4]}
            opacity={0.7}
            listening={false}
          />
        ))}

        {/* Room too small warning */}
        {roomTooSmall && (
          <Group listening={false}>
            <Rect
              x={Math.max(roomWidthPx / 2 - 130, -130)}
              y={Math.max(roomLengthPx / 2 - 28, -28)}
              width={260}
              height={56}
              cornerRadius={8}
              fill="white"
              stroke="#D97706"
              strokeWidth={1.5}
              opacity={0.95}
              listening={false}
            />
            <Text
              x={Math.max(roomWidthPx / 2 - 118, -118)}
              y={Math.max(roomLengthPx / 2 - 16, -16)}
              text="Warning"
              fontSize={16}
              listening={false}
            />
            <Text
              x={Math.max(roomWidthPx / 2 - 96, -96)}
              y={Math.max(roomLengthPx / 2 - 18, -18)}
              text={`Room must be at least\n${minSizeMetres}x${minSizeMetres}m (${minSizeFt}x${minSizeFt}ft)`}
              fontSize={12}
              fontFamily="system-ui, sans-serif"
              fontStyle="500"
              fill="#92400E"
              lineHeight={1.4}
              listening={false}
            />
          </Group>
        )}
      </Layer>

      {/* Layer 2: Walls */}
      <Layer>
        {venue.walls.map((wall) => (
          <MemoWallShape
            key={wall.id}
            wall={wall}
            isSelected={wall.id === selectedElementId}
            onSelect={handleSelectWall}
            onDragEnd={handleWallDragEnd}
            blueprint={bp}
          />
        ))}
      </Layer>

      {/* Layer 3: Fixtures */}
      <Layer>
        {venue.fixtures.map((fixture) => (
          <MemoFixtureShape
            key={fixture.id}
            fixture={fixture}
            isSelected={fixture.id === selectedElementId}
            onSelect={handleSelectFixture}
            onDragMove={handleFixtureDragMove}
            onDragEnd={handleFixtureDragEnd}
            blueprint={bp}
          />
        ))}
      </Layer>

      {/* Layer 4: Tables */}
      <Layer>
        {venue.tables.map((table) => (
          <MemoTableGroup
            key={table.id}
            table={table}
            isSelected={table.id === selectedElementId}
            onSelect={handleSelectTable}
            onDragMove={handleTableDragMove}
            onDragEnd={handleTableDragEnd}
            onDblClick={handleTableDblClick}
            blueprint={bp}
            roomWidthPx={roomWidthPx}
            roomLengthPx={roomLengthPx}
            isEditing={editingTableId === table.id}
          />
        ))}
      </Layer>

      {/* Layer 5: Overlay -- Alignment guides + Transformer + wall drawing preview */}
      <Layer>
        {activeGuides.length > 0 && <AlignmentGuideLines guides={activeGuides} />}
        {selectionGlow && (
          <Rect
            x={selectionGlow.x}
            y={selectionGlow.y}
            width={selectionGlow.width}
            height={selectionGlow.height}
            fill="rgba(37, 99, 235, 0.08)"
            stroke="rgba(37, 99, 235, 0.25)"
            strokeWidth={1}
            cornerRadius={4}
            rotation={selectionGlow.rotation}
            offsetX={selectionGlow.x - selectionGlow.originX}
            offsetY={selectionGlow.y - selectionGlow.originY}
            listening={false}
          />
        )}
        <Transformer
          ref={transformerRef}
          borderStroke="#2563EB"
          borderStrokeWidth={1.5}
          anchorStroke="#2563EB"
          anchorFill="#ffffff"
          anchorSize={10}
          anchorCornerRadius={2}
          rotateAnchorOffset={20}
          enabledAnchors={['top-left', 'top-center', 'top-right', 'middle-left', 'middle-right', 'bottom-left', 'bottom-center', 'bottom-right']}
          boundBoxFunc={(_oldBox, newBox) => {
            if (newBox.width < 20 || newBox.height < 20) return _oldBox;
            return newBox;
          }}
          onTransformEnd={handleTransformEnd}
        />

        {/* Wall drawing preview */}
        {drawingWall && (
          <>
            <Line
              points={[drawingWall.start.x, drawingWall.start.y, drawingWall.currentEnd.x, drawingWall.currentEnd.y]}
              stroke="#2563EB"
              strokeWidth={8}
              dash={[8, 4]}
              opacity={0.6}
              listening={false}
            />
            {/* Length label */}
            {(() => {
              const dx = drawingWall.currentEnd.x - drawingWall.start.x;
              const dy = drawingWall.currentEnd.y - drawingWall.start.y;
              const length = Math.sqrt(dx * dx + dy * dy);
              const midX = (drawingWall.start.x + drawingWall.currentEnd.x) / 2;
              const midY = (drawingWall.start.y + drawingWall.currentEnd.y) / 2;
              const lengthInUnits = (length / pixelsPerUnit).toFixed(1);
              return (
                <Text
                  x={midX}
                  y={midY - 16}
                  text={`${lengthInUnits} ${venue.unit}`}
                  fontSize={11}
                  fontFamily="system-ui, sans-serif"
                  fill="#2563EB"
                  listening={false}
                />
              );
            })()}
          </>
        )}
      </Layer>
    </Stage>

    {/* Inline label edit overlay */}
    {editingTableId && editInputStyle && (
      <input
        ref={editInputRef}
        value={editingValue}
        onChange={(e) => setEditingValue(e.target.value)}
        onBlur={commitEdit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commitEdit();
          if (e.key === 'Escape') setEditingTableId(null);
        }}
        style={editInputStyle}
      />
    )}
    </div>
  );
}

// --- Table rendering ---

function isTableOutOfBounds(table: Table, roomW: number, roomL: number): boolean {
  const hw = table.width / 2;
  const hh = table.height / 2;
  // Use axis-aligned bounding box (ignoring rotation for simplicity -- catches most cases)
  const left = table.position.x - hw;
  const right = table.position.x + hw;
  const top = table.position.y - hh;
  const bottom = table.position.y + hh;
  return left < 0 || top < 0 || right > roomW || bottom > roomL;
}

interface TableGroupProps {
  table: Table;
  isSelected: boolean;
  onSelect: (tableId: string) => void;
  onDragMove: (tableId: string, e: Konva.KonvaEventObject<DragEvent>) => void;
  onDragEnd: (tableId: string, e: Konva.KonvaEventObject<DragEvent>) => void;
  onDblClick: (tableId: string) => void;
  blueprint: boolean;
  roomWidthPx: number;
  roomLengthPx: number;
  isEditing: boolean;
}

function TableGroup({
  table,
  isSelected,
  onSelect,
  onDragMove,
  onDragEnd,
  onDblClick,
  blueprint,
  roomWidthPx,
  roomLengthPx,
  isEditing,
}: TableGroupProps) {
  const outOfBounds = useMemo(
    () => isTableOutOfBounds(table, roomWidthPx, roomLengthPx),
    [table, roomWidthPx, roomLengthPx]
  );

  const handleClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true;
    onSelect(table.id);
  }, [onSelect, table.id]);

  const handleTap = useCallback((e: Konva.KonvaEventObject<Event>) => {
    e.cancelBubble = true;
    onSelect(table.id);
  }, [onSelect, table.id]);

  const handleDblClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true;
    onDblClick(table.id);
  }, [onDblClick, table.id]);

  const handleDragMove = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    onDragMove(table.id, e);
  }, [onDragMove, table.id]);

  const handleDragEnd = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    onDragEnd(table.id, e);
  }, [onDragEnd, table.id]);

  return (
    <Group
      id={table.id}
      x={table.position.x}
      y={table.position.y}
      rotation={table.rotation}
      draggable
      onClick={handleClick}
      onTap={handleTap}
      onDblClick={handleDblClick}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
    >
      <MemoTableShapeRenderer
        shape={table.shape}
        width={table.width}
        height={table.height}
        blueprint={blueprint}
        outOfBounds={outOfBounds}
      />

      {/* Seat position circles */}
      {table.capacity > 0 &&
        getSeatPositions(table.shape, table.capacity, table.width, table.height, table.seatingSide, table.endSeats).map((seat, i) => (
          <Circle
            key={i}
            x={seat.x}
            y={seat.y}
            radius={10}
            fill="#e2e8f0"
            stroke="#94a3b8"
            strokeWidth={1}
            listening={false}
          />
        ))
      }

      {/* Seat capacity count */}
      <Text
        text={String(table.capacity)}
        fontSize={14}
        fontStyle="600"
        fontFamily="system-ui, sans-serif"
        fill={outOfBounds ? '#DC2626' : (blueprint ? '#1a56db' : '#64748b')}
        align="center"
        verticalAlign="middle"
        width={table.width}
        height={table.height}
        offsetX={table.width / 2}
        offsetY={table.height / 2}
        listening={false}
      />

      {/* Table label (hidden when inline editing) */}
      {!isEditing && (
        <Text
          text={table.label}
          fontSize={10}
          fontFamily="system-ui, sans-serif"
          fill={outOfBounds ? '#DC2626' : (blueprint ? '#1a56db' : '#334155')}
          align="center"
          offsetX={table.width / 2}
          y={table.height / 2 + 4}
          width={table.width}
          listening={false}
        />
      )}
    </Group>
  );
}

const MemoTableGroup = memo(TableGroup, (prev, next) =>
  prev.table.id === next.table.id &&
  prev.table.position.x === next.table.position.x &&
  prev.table.position.y === next.table.position.y &&
  prev.table.width === next.table.width &&
  prev.table.height === next.table.height &&
  prev.table.rotation === next.table.rotation &&
  prev.table.shape === next.table.shape &&
  prev.table.label === next.table.label &&
  prev.table.capacity === next.table.capacity &&
  prev.table.seatingSide === next.table.seatingSide &&
  prev.table.endSeats === next.table.endSeats &&
  prev.table.assignedGuestIds === next.table.assignedGuestIds &&
  prev.isSelected === next.isSelected &&
  prev.isEditing === next.isEditing &&
  prev.blueprint === next.blueprint &&
  prev.roomWidthPx === next.roomWidthPx &&
  prev.roomLengthPx === next.roomLengthPx &&
  prev.onSelect === next.onSelect &&
  prev.onDragMove === next.onDragMove &&
  prev.onDragEnd === next.onDragEnd &&
  prev.onDblClick === next.onDblClick
);

interface TableShapeRendererProps {
  shape: TableShape;
  width: number;
  height: number;
  blueprint: boolean;
  outOfBounds: boolean;
}

function TableShapeRenderer({
  shape,
  width,
  height,
  blueprint,
  outOfBounds,
}: TableShapeRendererProps) {
  const fill = outOfBounds ? '#FEE2E2' : (blueprint ? 'transparent' : '#f8fafc');
  const stroke = outOfBounds ? '#DC2626' : (blueprint ? '#1a56db' : '#94a3b8');

  switch (shape) {
    case 'round':
    case 'cocktail':
      return (
        <Circle x={0} y={0} radius={width / 2} fill={fill} stroke={stroke} strokeWidth={1.5} />
      );
    case 'rectangular':
      return (
        <Rect x={-width / 2} y={-height / 2} width={width} height={height} fill={fill} stroke={stroke} strokeWidth={1.5} cornerRadius={4} />
      );
    case 'square':
      return (
        <Rect x={-width / 2} y={-width / 2} width={width} height={width} fill={fill} stroke={stroke} strokeWidth={1.5} cornerRadius={4} />
      );
    case 'head':
      return (
        <Rect x={-width / 2} y={-height / 2} width={width} height={height} fill={fill} stroke={stroke} strokeWidth={1.5} cornerRadius={4} />
      );
    case 'sweetheart':
      return (
        <Rect x={-width / 2} y={-height / 2} width={width} height={height} fill={fill} stroke={stroke} strokeWidth={1.5} cornerRadius={8} />
      );
    default:
      return (
        <Circle x={0} y={0} radius={width / 2} fill={fill} stroke={stroke} strokeWidth={1.5} />
      );
  }
}

const MemoTableShapeRenderer = memo(TableShapeRenderer, (prev, next) =>
  prev.shape === next.shape &&
  prev.width === next.width &&
  prev.height === next.height &&
  prev.blueprint === next.blueprint &&
  prev.outOfBounds === next.outOfBounds
);

// --- Fixture rendering ---

const FIXTURE_LABELS: Record<string, string> = {
  stage: 'Stage',
  'dance-floor': 'Dance Floor',
  bar: 'Bar',
  buffet: 'Buffet',
  'dj-booth': 'DJ Booth',
  'photo-booth': 'Photo Booth',
  entrance: 'Entrance',
  exit: 'Exit',
  restroom: 'Restroom',
  pillar: 'Pillar',
  door: 'Door',
  window: 'Window',
  'av-sound-room': 'AV Room',
  kitchen: 'Kitchen',
  'coat-check': 'Coat Check',
};

function DoorStyleIndicator({
  doorStyle,
  width,
  height,
  stroke,
}: {
  doorStyle: string | undefined;
  width: number;
  height: number;
  stroke: string;
}) {
  const hw = width / 2;
  const hh = height / 2;

  switch (doorStyle) {
    case 'swing-out':
      // Arc swinging outward (below the door)
      return (
        <Arc
          x={-hw}
          y={hh}
          innerRadius={0}
          outerRadius={width * 0.7}
          angle={90}
          rotation={-90}
          fill="transparent"
          stroke={stroke}
          strokeWidth={1}
          dash={[4, 3]}
          listening={false}
        />
      );
    case 'swing-in':
      // Arc swinging inward (above the door)
      return (
        <Arc
          x={-hw}
          y={-hh}
          innerRadius={0}
          outerRadius={width * 0.7}
          angle={90}
          rotation={0}
          fill="transparent"
          stroke={stroke}
          strokeWidth={1}
          dash={[4, 3]}
          listening={false}
        />
      );
    case 'sliding':
      // Parallel arrow lines showing slide direction
      return (
        <>
          <Line
            points={[-hw + 4, 0, hw - 4, 0]}
            stroke={stroke}
            strokeWidth={1}
            dash={[6, 3]}
            listening={false}
          />
          <Line
            points={[hw - 10, -3, hw - 4, 0, hw - 10, 3]}
            stroke={stroke}
            strokeWidth={1}
            listening={false}
          />
        </>
      );
    case 'double':
      // Two arcs, one on each side
      return (
        <>
          <Arc
            x={0}
            y={-hh}
            innerRadius={0}
            outerRadius={hw * 0.7}
            angle={90}
            rotation={0}
            fill="transparent"
            stroke={stroke}
            strokeWidth={1}
            dash={[4, 3]}
            listening={false}
          />
          <Arc
            x={0}
            y={-hh}
            innerRadius={0}
            outerRadius={hw * 0.7}
            angle={90}
            rotation={-90}
            fill="transparent"
            stroke={stroke}
            strokeWidth={1}
            dash={[4, 3]}
            listening={false}
          />
          {/* Center divider line */}
          <Line
            points={[0, -hh, 0, hh]}
            stroke={stroke}
            strokeWidth={1}
            listening={false}
          />
        </>
      );
    default:
      return null;
  }
}

interface FixtureShapeProps {
  fixture: Fixture;
  isSelected: boolean;
  onSelect: (fixtureId: string) => void;
  onDragMove: (fixtureId: string, e: Konva.KonvaEventObject<DragEvent>) => void;
  onDragEnd: (fixtureId: string, e: Konva.KonvaEventObject<DragEvent>) => void;
  blueprint: boolean;
}

function FixtureShape({
  fixture,
  isSelected,
  onSelect,
  onDragMove,
  onDragEnd,
  blueprint,
}: FixtureShapeProps) {
  const fill = blueprint ? 'transparent' : '#f1f5f9';
  const stroke = blueprint ? '#1a56db' : '#94a3b8';
  const isDoorType = fixture.type === 'door' || fixture.type === 'entrance' || fixture.type === 'exit';

  const handleClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true;
    onSelect(fixture.id);
  }, [onSelect, fixture.id]);

  const handleTap = useCallback((e: Konva.KonvaEventObject<Event>) => {
    e.cancelBubble = true;
    onSelect(fixture.id);
  }, [onSelect, fixture.id]);

  const handleDragMove = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    onDragMove(fixture.id, e);
  }, [onDragMove, fixture.id]);

  const handleDragEnd = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    onDragEnd(fixture.id, e);
  }, [onDragEnd, fixture.id]);

  return (
    <Group
      id={fixture.id}
      x={fixture.position.x}
      y={fixture.position.y}
      rotation={fixture.rotation}
      draggable
      onClick={handleClick}
      onTap={handleTap}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
    >
      {isDoorType ? (
        <>
          <Rect
            x={-fixture.width / 2}
            y={-fixture.height / 2}
            width={fixture.width}
            height={fixture.height}
            fill={fill}
            stroke={stroke}
            strokeWidth={1}
            cornerRadius={2}
          />
          <DoorStyleIndicator
            doorStyle={fixture.doorStyle}
            width={fixture.width}
            height={fixture.height}
            stroke={stroke}
          />
        </>
      ) : fixture.type === 'window' ? (
        <>
          <Rect
            x={-fixture.width / 2}
            y={-fixture.height / 2}
            width={fixture.width}
            height={fixture.height}
            fill="transparent"
            stroke={blueprint ? '#1a56db' : '#60a5fa'}
            strokeWidth={1.5}
            dash={[6, 3]}
          />
          <Line
            points={[0, -fixture.height / 2, 0, fixture.height / 2]}
            stroke={blueprint ? '#1a56db' : '#60a5fa'}
            strokeWidth={1}
            listening={false}
          />
        </>
      ) : (
        <Rect
          x={-fixture.width / 2}
          y={-fixture.height / 2}
          width={fixture.width}
          height={fixture.height}
          fill={fill}
          stroke={stroke}
          strokeWidth={1}
          cornerRadius={4}
        />
      )}
      <Text
        text={FIXTURE_LABELS[fixture.type] ?? fixture.label}
        fontSize={10}
        fontFamily="system-ui, sans-serif"
        fill={blueprint ? '#1a56db' : '#64748b'}
        align="center"
        verticalAlign="middle"
        width={fixture.width}
        height={fixture.height}
        offsetX={fixture.width / 2}
        offsetY={fixture.height / 2}
        listening={false}
      />
    </Group>
  );
}

const MemoFixtureShape = memo(FixtureShape, (prev, next) =>
  prev.fixture.id === next.fixture.id &&
  prev.fixture.position.x === next.fixture.position.x &&
  prev.fixture.position.y === next.fixture.position.y &&
  prev.fixture.width === next.fixture.width &&
  prev.fixture.height === next.fixture.height &&
  prev.fixture.rotation === next.fixture.rotation &&
  prev.fixture.type === next.fixture.type &&
  prev.fixture.label === next.fixture.label &&
  prev.fixture.doorStyle === next.fixture.doorStyle &&
  prev.isSelected === next.isSelected &&
  prev.blueprint === next.blueprint &&
  prev.onSelect === next.onSelect &&
  prev.onDragMove === next.onDragMove &&
  prev.onDragEnd === next.onDragEnd
);

// --- Wall rendering ---

interface WallShapeProps {
  wall: Wall;
  isSelected: boolean;
  onSelect: (wallId: string) => void;
  onDragEnd: (wallId: string, e: Konva.KonvaEventObject<DragEvent>) => void;
  blueprint: boolean;
}

function WallShape({
  wall,
  isSelected,
  onSelect,
  onDragEnd,
  blueprint,
}: WallShapeProps) {
  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  const midX = (wall.start.x + wall.end.x) / 2;
  const midY = (wall.start.y + wall.end.y) / 2;
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

  const isPartition = wall.style === 'partition';
  const stroke = blueprint ? '#1a56db' : '#475569';
  const fill = blueprint ? '#1a56db' : (isPartition ? '#94a3b8' : '#475569');

  const handleClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true;
    onSelect(wall.id);
  }, [onSelect, wall.id]);

  const handleTap = useCallback((e: Konva.KonvaEventObject<Event>) => {
    e.cancelBubble = true;
    onSelect(wall.id);
  }, [onSelect, wall.id]);

  const handleDragEnd = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    onDragEnd(wall.id, e);
  }, [onDragEnd, wall.id]);

  // Suppress unused var warning
  void isSelected;

  return (
    <Group
      id={wall.id}
      x={0}
      y={0}
      draggable
      onClick={handleClick}
      onTap={handleTap}
      onDragEnd={handleDragEnd}
    >
      <Rect
        x={midX - length / 2}
        y={midY - wall.thickness / 2}
        width={length}
        height={wall.thickness}
        fill={fill}
        stroke={stroke}
        strokeWidth={1}
        rotation={angle}
        offsetX={0}
        offsetY={0}
        dash={isPartition ? [8, 4] : undefined}
      />
      {/* Dimension label above wall */}
      <Text
        x={midX - 20}
        y={midY - wall.thickness / 2 - 14}
        text={wall.label}
        fontSize={9}
        fontFamily="system-ui, sans-serif"
        fill={blueprint ? '#1a56db' : '#64748b'}
        listening={false}
      />
    </Group>
  );
}

const MemoWallShape = memo(WallShape, (prev, next) =>
  prev.wall.id === next.wall.id &&
  prev.wall.start.x === next.wall.start.x &&
  prev.wall.start.y === next.wall.start.y &&
  prev.wall.end.x === next.wall.end.x &&
  prev.wall.end.y === next.wall.end.y &&
  prev.wall.thickness === next.wall.thickness &&
  prev.wall.style === next.wall.style &&
  prev.wall.label === next.wall.label &&
  prev.wall.rotation === next.wall.rotation &&
  prev.isSelected === next.isSelected &&
  prev.blueprint === next.blueprint &&
  prev.onSelect === next.onSelect &&
  prev.onDragEnd === next.onDragEnd
);
