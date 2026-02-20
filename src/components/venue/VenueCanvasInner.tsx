'use client';

import { useCallback, useMemo, useEffect, useRef } from 'react';
import { Stage, Layer, Rect, Circle, Group, Line, Text, Arc, Transformer } from 'react-konva';
import type Konva from 'konva';
import { useSeatingStore } from '@/stores/useSeatingStore';
import { useCanvasInteraction } from '@/hooks/useCanvasInteraction';
import { useGridSnap } from '@/hooks/useGridSnap';
import { useWallDrawing } from '@/hooks/useWallDrawing';
import { getSeatPositions, SEAT_RENDER_RADIUS } from '@/lib/table-geometry';
import type { Table, Fixture, Wall, TableShape } from '@/types/venue';

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

  const { zoom, panOffset, handleWheel, handleMouseDown: handlePanMouseDown, handleMouseMove: handlePanMouseMove, handleMouseUp: handlePanMouseUp } =
    useCanvasInteraction();
  const { snapPosition, gridPixels, pixelsPerUnit } = useGridSnap();
  const { drawingWall, isDrawing, handleMouseDown: handleWallMouseDown, handleMouseMove: handleWallMouseMove, handleMouseUp: handleWallMouseUp } =
    useWallDrawing();

  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);

  const roomWidthPx = venue.roomWidth * pixelsPerUnit;
  const roomHeightPx = venue.roomHeight * pixelsPerUnit;

  const bp = venue.blueprintMode;

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

  const gridLines = useMemo(() => {
    if (!venue.showGrid) return [];
    const lines: { points: number[]; key: string; isMajor: boolean }[] = [];
    for (let x = 0; x <= roomWidthPx; x += gridPixels) {
      const gridIndex = Math.round(x / gridPixels);
      lines.push({ points: [x, 0, x, roomHeightPx], key: `v-${x}`, isMajor: bp && gridIndex % 5 === 0 });
    }
    for (let y = 0; y <= roomHeightPx; y += gridPixels) {
      const gridIndex = Math.round(y / gridPixels);
      lines.push({ points: [0, y, roomWidthPx, y], key: `h-${y}`, isMajor: bp && gridIndex % 5 === 0 });
    }
    return lines;
  }, [venue.showGrid, roomWidthPx, roomHeightPx, gridPixels, bp]);

  const getStagePointer = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>): { x: number; y: number } | null => {
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

  const handleTableDragEnd = useCallback(
    (tableId: string, e: Konva.KonvaEventObject<DragEvent>) => {
      const node = e.target;
      const snapped = snapPosition(node.x(), node.y());
      node.position(snapped);
      updateTable(tableId, { position: snapped });
    },
    [snapPosition, updateTable]
  );

  const handleFixtureDragEnd = useCallback(
    (fixtureId: string, e: Konva.KonvaEventObject<DragEvent>) => {
      const node = e.target;
      const snapped = snapPosition(node.x(), node.y());
      node.position(snapped);
      updateFixture(fixtureId, { position: snapped });
    },
    [snapPosition, updateFixture]
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

  return (
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
      style={{ cursor: isDrawing ? 'crosshair' : 'default' }}
    >
      {/* Layer 1: Background — grid + room boundary */}
      <Layer listening={false}>
        {/* Room background */}
        <Rect
          x={0}
          y={0}
          width={roomWidthPx}
          height={roomHeightPx}
          fill={bp ? '#e8f0fe' : '#ffffff'}
          listening={false}
        />

        {gridLines.map((line) => (
          <Line
            key={line.key}
            points={line.points}
            stroke={bp ? (line.isMajor ? '#93b4e8' : '#b8cef4') : '#e2e8f0'}
            strokeWidth={line.isMajor ? 1 : 0.5}
            listening={false}
          />
        ))}

        {/* Room boundary */}
        <Rect
          x={0}
          y={0}
          width={roomWidthPx}
          height={roomHeightPx}
          stroke={bp ? '#1a56db' : '#334155'}
          strokeWidth={2}
          fill="transparent"
          listening={false}
        />

        {/* Blueprint dimension labels */}
        {bp && (
          <>
            <Text
              x={roomWidthPx / 2 - 40}
              y={roomHeightPx + 8}
              text={`${venue.roomWidth} ${venue.unit}`}
              fontSize={11}
              fontFamily="system-ui, sans-serif"
              fill="#1a56db"
              listening={false}
            />
            <Text
              x={roomWidthPx + 8}
              y={roomHeightPx / 2 - 6}
              text={`${venue.roomHeight} ${venue.unit}`}
              fontSize={11}
              fontFamily="system-ui, sans-serif"
              fill="#1a56db"
              rotation={90}
              listening={false}
            />
          </>
        )}
      </Layer>

      {/* Layer 2: Walls */}
      <Layer>
        {venue.walls.map((wall) => (
          <WallShape
            key={wall.id}
            wall={wall}
            isSelected={wall.id === selectedElementId}
            onSelect={() => setSelectedElement(wall.id, 'wall')}
            onDragEnd={handleWallDragEnd}
            blueprint={bp}
          />
        ))}
      </Layer>

      {/* Layer 3: Fixtures */}
      <Layer>
        {venue.fixtures.map((fixture) => (
          <FixtureShape
            key={fixture.id}
            fixture={fixture}
            isSelected={fixture.id === selectedElementId}
            onSelect={() => setSelectedElement(fixture.id, 'fixture')}
            onDragEnd={handleFixtureDragEnd}
            blueprint={bp}
          />
        ))}
      </Layer>

      {/* Layer 4: Tables */}
      <Layer>
        {venue.tables.map((table) => (
          <TableGroup
            key={table.id}
            table={table}
            isSelected={table.id === selectedElementId}
            onSelect={() => setSelectedElement(table.id, 'table')}
            onDragEnd={handleTableDragEnd}
            blueprint={bp}
          />
        ))}
      </Layer>

      {/* Layer 5: Overlay — Transformer + wall drawing preview */}
      <Layer>
        <Transformer
          ref={transformerRef}
          borderStroke="#2563EB"
          borderStrokeWidth={1.5}
          anchorStroke="#2563EB"
          anchorFill="#ffffff"
          anchorSize={8}
          anchorCornerRadius={2}
          rotateAnchorOffset={20}
          enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
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
  );
}

// --- Table rendering ---

function TableGroup({
  table,
  isSelected,
  onSelect,
  onDragEnd,
  blueprint,
}: {
  table: Table;
  isSelected: boolean;
  onSelect: () => void;
  onDragEnd: (tableId: string, e: Konva.KonvaEventObject<DragEvent>) => void;
  blueprint: boolean;
}) {
  const seatPositions = useMemo(
    () => getSeatPositions(table.shape, table.capacity, table.width, table.height),
    [table.shape, table.capacity, table.width, table.height]
  );

  return (
    <Group
      id={table.id}
      x={table.position.x}
      y={table.position.y}
      rotation={table.rotation}
      draggable
      onClick={(e) => {
        e.cancelBubble = true;
        onSelect();
      }}
      onTap={(e) => {
        e.cancelBubble = true;
        onSelect();
      }}
      onDragEnd={(e) => onDragEnd(table.id, e)}
    >
      <TableShapeRenderer shape={table.shape} width={table.width} height={table.height} blueprint={blueprint} />

      {seatPositions.map((seat, i) => (
        <Circle
          key={i}
          x={seat.x}
          y={seat.y}
          radius={SEAT_RENDER_RADIUS}
          fill={blueprint ? 'transparent' : 'white'}
          stroke={blueprint ? '#1a56db' : '#cbd5e1'}
          strokeWidth={1}
          listening={false}
        />
      ))}

      <Text
        text={table.label}
        fontSize={11}
        fontFamily="system-ui, sans-serif"
        fill={blueprint ? '#1a56db' : '#334155'}
        align="center"
        verticalAlign="middle"
        offsetX={table.width / 2}
        offsetY={6}
        width={table.width}
        listening={false}
      />
    </Group>
  );
}

function TableShapeRenderer({
  shape,
  width,
  height,
  blueprint,
}: {
  shape: TableShape;
  width: number;
  height: number;
  blueprint: boolean;
}) {
  const fill = blueprint ? 'transparent' : '#f8fafc';
  const stroke = blueprint ? '#1a56db' : '#94a3b8';

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

function FixtureShape({
  fixture,
  isSelected,
  onSelect,
  onDragEnd,
  blueprint,
}: {
  fixture: Fixture;
  isSelected: boolean;
  onSelect: () => void;
  onDragEnd: (fixtureId: string, e: Konva.KonvaEventObject<DragEvent>) => void;
  blueprint: boolean;
}) {
  const fill = blueprint ? 'transparent' : '#f1f5f9';
  const stroke = blueprint ? '#1a56db' : '#94a3b8';

  return (
    <Group
      id={fixture.id}
      x={fixture.position.x}
      y={fixture.position.y}
      rotation={fixture.rotation}
      draggable
      onClick={(e) => {
        e.cancelBubble = true;
        onSelect();
      }}
      onTap={(e) => {
        e.cancelBubble = true;
        onSelect();
      }}
      onDragEnd={(e) => onDragEnd(fixture.id, e)}
    >
      {/* Door variant: rect frame + arc swing indicator */}
      {fixture.type === 'door' ? (
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
          <Arc
            x={-fixture.width / 2}
            y={fixture.height / 2}
            innerRadius={0}
            outerRadius={fixture.width * 0.8}
            angle={90}
            rotation={-90}
            fill="transparent"
            stroke={stroke}
            strokeWidth={1}
            dash={[4, 3]}
            listening={false}
          />
        </>
      ) : fixture.type === 'window' ? (
        /* Window variant: dashed blue rect + center line */
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
        /* Default fixture rectangle */
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

// --- Wall rendering ---

function WallShape({
  wall,
  isSelected,
  onSelect,
  onDragEnd,
  blueprint,
}: {
  wall: Wall;
  isSelected: boolean;
  onSelect: () => void;
  onDragEnd: (wallId: string, e: Konva.KonvaEventObject<DragEvent>) => void;
  blueprint: boolean;
}) {
  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  const midX = (wall.start.x + wall.end.x) / 2;
  const midY = (wall.start.y + wall.end.y) / 2;
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

  const isPartition = wall.style === 'partition';
  const stroke = blueprint ? '#1a56db' : '#475569';
  const fill = blueprint ? '#1a56db' : (isPartition ? '#94a3b8' : '#475569');

  return (
    <Group
      id={wall.id}
      x={0}
      y={0}
      draggable
      onClick={(e) => {
        e.cancelBubble = true;
        onSelect();
      }}
      onTap={(e) => {
        e.cancelBubble = true;
        onSelect();
      }}
      onDragEnd={(e) => onDragEnd(wall.id, e)}
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
