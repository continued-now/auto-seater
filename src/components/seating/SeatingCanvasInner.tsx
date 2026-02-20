'use client';

import { useMemo, useCallback, useState } from 'react';
import { Stage, Layer, Rect, Circle, Group, Line, Text } from 'react-konva';
import { useSeatingStore } from '@/stores/useSeatingStore';
import { useCanvasInteraction } from '@/hooks/useCanvasInteraction';
import { getSeatPositions, SEAT_RENDER_RADIUS } from '@/lib/table-geometry';
import { validateConstraints } from '@/lib/constraint-validator';
import type { Table } from '@/types/venue';
import type { Guest } from '@/types/guest';
import type { SeatPosition } from '@/types/seating';
import type Konva from 'konva';

interface SeatingCanvasInnerProps {
  showConstraints: boolean;
  draggedGuestId: string | null;
}

// Colour constants
const COLOURS = {
  seatEmpty: { fill: '#ffffff', stroke: '#cbd5e1' },
  seatOccupied: { fill: '#DBEAFE', stroke: '#2563EB' },
  seatDropValid: { fill: '#DCFCE7', stroke: '#16A34A' },
  seatDropInvalid: { fill: '#FEE2E2', stroke: '#DC2626' },
  tableFill: '#f8fafc',
  tableStroke: '#94a3b8',
  constraintTogether: '#16A34A',
  constraintApart: '#DC2626',
  roomBg: '#f1f5f9',
  gridLine: '#e2e8f0',
  warningBg: '#FEF3C7',
  warningStroke: '#D97706',
} as const;

export function SeatingCanvasInner({ showConstraints, draggedGuestId }: SeatingCanvasInnerProps) {
  const guests = useSeatingStore((s) => s.guests);
  const venue = useSeatingStore((s) => s.venue);
  const constraints = useSeatingStore((s) => s.constraints);
  const unassignGuest = useSeatingStore((s) => s.unassignGuest);
  const selectedGuestIds = useSeatingStore((s) => s.selectedGuestIds);
  const setSelectedGuestIds = useSeatingStore((s) => s.setSelectedGuestIds);
  const selectedTableId = useSeatingStore((s) => s.selectedTableId);
  const setSelectedTableId = useSeatingStore((s) => s.setSelectedTableId);

  const { zoom, panOffset, handleWheel, handleMouseDown, handleMouseMove, handleMouseUp } =
    useCanvasInteraction();

  const [contextMenu, setContextMenu] = useState<{
    guestId: string;
    x: number;
    y: number;
  } | null>(null);

  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });

  // Build guest lookup map
  const guestMap = useMemo(() => {
    const map = new Map<string, Guest>();
    for (const g of guests) map.set(g.id, g);
    return map;
  }, [guests]);

  // Build seat-occupant lookup: tableId -> seatIndex -> Guest
  const seatOccupants = useMemo(() => {
    const map = new Map<string, Map<number, Guest>>();
    for (const guest of guests) {
      if (guest.tableId && guest.seatIndex !== null) {
        if (!map.has(guest.tableId)) map.set(guest.tableId, new Map());
        map.get(guest.tableId)!.set(guest.seatIndex, guest);
      }
    }
    return map;
  }, [guests]);

  // Compute violations
  const violations = useMemo(
    () => validateConstraints(constraints, guests, venue.tables),
    [constraints, guests, venue.tables]
  );

  const violatedTableIds = useMemo(() => {
    const s = new Set<string>();
    for (const v of violations) s.add(v.tableId);
    return s;
  }, [violations]);

  // Stage container ref callback for measuring size
  const containerRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setStageSize({ width, height });
      }
    });
    ro.observe(node);
    // Set initial size
    const rect = node.getBoundingClientRect();
    setStageSize({ width: rect.width, height: rect.height });
  }, []);

  // Draw grid lines
  const gridLines = useMemo(() => {
    const lines: { points: number[]; key: string }[] = [];
    const gridPixels = venue.gridSize * (venue.unit === 'ft' ? 15 : 30);
    if (!venue.showGrid || gridPixels <= 0) return lines;

    const rw = venue.roomWidth * (venue.unit === 'ft' ? 15 : 30);
    const rh = venue.roomHeight * (venue.unit === 'ft' ? 15 : 30);

    for (let x = 0; x <= rw; x += gridPixels) {
      lines.push({ points: [x, 0, x, rh], key: `gv-${x}` });
    }
    for (let y = 0; y <= rh; y += gridPixels) {
      lines.push({ points: [0, y, rw, y], key: `gh-${y}` });
    }
    return lines;
  }, [venue.showGrid, venue.gridSize, venue.unit, venue.roomWidth, venue.roomHeight]);

  const roomPixelWidth = venue.roomWidth * (venue.unit === 'ft' ? 15 : 30);
  const roomPixelHeight = venue.roomHeight * (venue.unit === 'ft' ? 15 : 30);

  // Constraint lines between guest pairs
  const constraintLines = useMemo(() => {
    if (!showConstraints) return [];

    const lines: {
      key: string;
      points: number[];
      color: string;
      type: string;
    }[] = [];

    for (const constraint of constraints) {
      const [aId, bId] = constraint.guestIds;
      const guestA = guestMap.get(aId);
      const guestB = guestMap.get(bId);

      if (!guestA?.tableId || guestA.seatIndex === null) continue;
      if (!guestB?.tableId || guestB.seatIndex === null) continue;

      const tableA = venue.tables.find((t) => t.id === guestA.tableId);
      const tableB = venue.tables.find((t) => t.id === guestB.tableId);
      if (!tableA || !tableB) continue;

      const seatsA = getSeatPositions(tableA.shape, tableA.capacity, tableA.width, tableA.height);
      const seatsB = getSeatPositions(tableB.shape, tableB.capacity, tableB.width, tableB.height);

      const seatA = seatsA[guestA.seatIndex];
      const seatB = seatsB[guestB.seatIndex];
      if (!seatA || !seatB) continue;

      const ax = tableA.position.x + seatA.x;
      const ay = tableA.position.y + seatA.y;
      const bx = tableB.position.x + seatB.x;
      const by = tableB.position.y + seatB.y;

      lines.push({
        key: `cl-${constraint.id}`,
        points: [ax, ay, bx, by],
        color:
          constraint.type === 'must-sit-together'
            ? COLOURS.constraintTogether
            : COLOURS.constraintApart,
        type: constraint.type,
      });
    }
    return lines;
  }, [showConstraints, constraints, guestMap, venue.tables]);

  // Handle click on occupied seat
  const handleSeatClick = useCallback(
    (guestId: string, stageX: number, stageY: number) => {
      setContextMenu({ guestId, x: stageX, y: stageY });
    },
    []
  );

  const handleStageClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      // Close context menu when clicking empty space
      if (contextMenu) {
        setContextMenu(null);
      }
      // Deselect table when clicking empty space
      const target = e.target;
      if (target === e.currentTarget || target.getClassName() === 'Rect') {
        // Check if target is the room bg or stage
        const name = target.name();
        if (name === 'room-bg' || name === 'stage-bg') {
          setSelectedTableId(null);
        }
      }
    },
    [contextMenu, setSelectedTableId]
  );

  const renderTable = useCallback(
    (table: Table) => {
      const seats = getSeatPositions(table.shape, table.capacity, table.width, table.height);
      const tableOccupants = seatOccupants.get(table.id);
      const isFull = (tableOccupants?.size ?? 0) >= table.capacity;
      const hasViolation = violatedTableIds.has(table.id);
      const isSelected = selectedTableId === table.id;
      const isDragging = !!draggedGuestId;

      return (
        <Group
          key={table.id}
          x={table.position.x}
          y={table.position.y}
          rotation={table.rotation}
          onClick={() => setSelectedTableId(table.id)}
        >
          {/* Table shape */}
          {table.shape === 'round' || table.shape === 'cocktail' ? (
            <Circle
              radius={table.width / 2}
              fill={COLOURS.tableFill}
              stroke={isSelected ? '#2563EB' : COLOURS.tableStroke}
              strokeWidth={isSelected ? 2 : 1}
            />
          ) : (
            <Rect
              x={-table.width / 2}
              y={-table.height / 2}
              width={table.width}
              height={table.height}
              cornerRadius={4}
              fill={COLOURS.tableFill}
              stroke={isSelected ? '#2563EB' : COLOURS.tableStroke}
              strokeWidth={isSelected ? 2 : 1}
            />
          )}

          {/* Table label */}
          <Text
            text={table.label}
            x={-table.width / 2}
            y={-6}
            width={table.width}
            align="center"
            fontSize={11}
            fontStyle="600"
            fill="#475569"
          />

          {/* Seats */}
          {seats.map((seat, idx) => {
            const occupant = tableOccupants?.get(idx);
            let seatFill: string;
            let seatStroke: string;

            if (isDragging && !occupant && !isFull) {
              seatFill = COLOURS.seatDropValid.fill;
              seatStroke = COLOURS.seatDropValid.stroke;
            } else if (isDragging && isFull && !occupant) {
              seatFill = COLOURS.seatDropInvalid.fill;
              seatStroke = COLOURS.seatDropInvalid.stroke;
            } else if (occupant) {
              seatFill = COLOURS.seatOccupied.fill;
              seatStroke = COLOURS.seatOccupied.stroke;
            } else {
              seatFill = COLOURS.seatEmpty.fill;
              seatStroke = COLOURS.seatEmpty.stroke;
            }

            // Highlight if guest is selected
            if (occupant && selectedGuestIds.includes(occupant.id)) {
              seatStroke = '#2563EB';
            }

            const firstName = occupant?.name.split(' ')[0] ?? '';

            return (
              <Group key={`seat-${idx}`} x={seat.x} y={seat.y}>
                {/* Seat circle */}
                <Circle
                  radius={SEAT_RENDER_RADIUS}
                  fill={seatFill}
                  stroke={seatStroke}
                  strokeWidth={occupant && selectedGuestIds.includes(occupant.id) ? 2 : 1.5}
                  onClick={() => {
                    if (occupant) {
                      handleSeatClick(
                        occupant.id,
                        table.position.x + seat.x,
                        table.position.y + seat.y
                      );
                    }
                  }}
                  onMouseEnter={(e) => {
                    const container = e.target.getStage()?.container();
                    if (container) container.style.cursor = occupant ? 'pointer' : 'default';
                  }}
                  onMouseLeave={(e) => {
                    const container = e.target.getStage()?.container();
                    if (container) container.style.cursor = 'default';
                  }}
                />
                {/* Guest name */}
                {occupant && (
                  <Text
                    text={firstName}
                    x={-SEAT_RENDER_RADIUS}
                    y={SEAT_RENDER_RADIUS + 2}
                    width={SEAT_RENDER_RADIUS * 2}
                    align="center"
                    fontSize={8}
                    fill="#334155"
                    listening={false}
                  />
                )}
              </Group>
            );
          })}

          {/* Violation warning badge */}
          {hasViolation && (
            <Group x={table.width / 2 - 8} y={-table.height / 2 - 8}>
              <Circle radius={8} fill={COLOURS.warningBg} stroke={COLOURS.warningStroke} strokeWidth={1.5} />
              <Text
                text="!"
                x={-4}
                y={-5}
                width={8}
                align="center"
                fontSize={10}
                fontStyle="bold"
                fill={COLOURS.warningStroke}
                listening={false}
              />
            </Group>
          )}
        </Group>
      );
    },
    [
      seatOccupants,
      violatedTableIds,
      selectedTableId,
      draggedGuestId,
      selectedGuestIds,
      setSelectedTableId,
      handleSeatClick,
    ]
  );

  return (
    <div ref={containerRef} className="w-full h-full">
      <Stage
        width={stageSize.width}
        height={stageSize.height}
        scaleX={zoom}
        scaleY={zoom}
        x={panOffset.x}
        y={panOffset.y}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={handleStageClick}
      >
        {/* Background layer */}
        <Layer>
          {/* Room boundary */}
          <Rect
            name="room-bg"
            x={0}
            y={0}
            width={roomPixelWidth}
            height={roomPixelHeight}
            fill={COLOURS.roomBg}
            stroke="#cbd5e1"
            strokeWidth={1}
          />

          {/* Grid */}
          {gridLines.map((line) => (
            <Line
              key={line.key}
              points={line.points}
              stroke={COLOURS.gridLine}
              strokeWidth={0.5}
              listening={false}
            />
          ))}
        </Layer>

        {/* Tables layer */}
        <Layer>
          {venue.tables.map(renderTable)}
        </Layer>

        {/* Constraint lines layer */}
        {showConstraints && constraintLines.length > 0 && (
          <Layer listening={false}>
            {constraintLines.map((line) => (
              <Line
                key={line.key}
                points={line.points}
                stroke={line.color}
                strokeWidth={1.5}
                dash={[6, 4]}
                opacity={0.7}
                listening={false}
              />
            ))}
          </Layer>
        )}

        {/* Context menu layer */}
        {contextMenu && (
          <Layer>
            <Group x={contextMenu.x + 16} y={contextMenu.y - 16}>
              {/* Menu background */}
              <Rect
                width={100}
                height={30}
                cornerRadius={6}
                fill="white"
                stroke="#e2e8f0"
                strokeWidth={1}
                shadowColor="rgba(0,0,0,0.1)"
                shadowBlur={8}
                shadowOffsetY={2}
              />
              {/* Unassign option */}
              <Group
                onClick={() => {
                  unassignGuest(contextMenu.guestId);
                  setContextMenu(null);
                }}
                onMouseEnter={(e) => {
                  const container = e.target.getStage()?.container();
                  if (container) container.style.cursor = 'pointer';
                }}
                onMouseLeave={(e) => {
                  const container = e.target.getStage()?.container();
                  if (container) container.style.cursor = 'default';
                }}
              >
                <Rect
                  x={2}
                  y={2}
                  width={96}
                  height={26}
                  cornerRadius={4}
                  fill="transparent"
                />
                <Text
                  text="Unassign"
                  x={12}
                  y={8}
                  fontSize={11}
                  fill="#DC2626"
                />
              </Group>
            </Group>
          </Layer>
        )}
      </Stage>
    </div>
  );
}
