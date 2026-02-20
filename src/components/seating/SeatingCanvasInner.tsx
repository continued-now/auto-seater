'use client';

import { useMemo, useCallback, useState, useRef, useImperativeHandle, forwardRef } from 'react';
import { Stage, Layer, Rect, Circle, Group, Line, Text } from 'react-konva';
import { useSeatingStore } from '@/stores/useSeatingStore';
import { useCanvasInteraction } from '@/hooks/useCanvasInteraction';
import { getSeatPositions, getSuggestedCapacity, SEAT_RENDER_RADIUS } from '@/lib/table-geometry';
import { validateConstraints } from '@/lib/constraint-validator';
import type { Table } from '@/types/venue';
import type { Guest } from '@/types/guest';
import { getAllRoomRects, getVenueBoundingBox } from '@/lib/room-geometry';
import type { SeatPosition } from '@/types/seating';
import type Konva from 'konva';

export interface SeatingCanvasInnerHandle {
  getStageNode: () => Konva.Stage | null;
}

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
  seatDragSource: { fill: '#FEF3C7', stroke: '#D97706' },
  seatSwapTarget: { fill: '#E0E7FF', stroke: '#4F46E5' },
  tableFill: '#f8fafc',
  tableStroke: '#94a3b8',
  constraintTogether: '#16A34A',
  constraintApart: '#DC2626',
  roomBg: '#f1f5f9',
  gridLine: '#e2e8f0',
  warningBg: '#FEF3C7',
  warningStroke: '#D97706',
  ghostFill: '#DBEAFE',
  ghostStroke: '#2563EB',
} as const;

interface SeatDragState {
  guestId: string;
  guestName: string;
  sourceTableId: string;
  sourceSeatIdx: number;
  canvasX: number;
  canvasY: number;
}

export const SeatingCanvasInner = forwardRef<SeatingCanvasInnerHandle, SeatingCanvasInnerProps>(function SeatingCanvasInner({ showConstraints, draggedGuestId }, ref) {
  const guests = useSeatingStore((s) => s.guests);
  const venue = useSeatingStore((s) => s.venue);
  const constraints = useSeatingStore((s) => s.constraints);
  const assignGuestToTable = useSeatingStore((s) => s.assignGuestToTable);
  const swapGuests = useSeatingStore((s) => s.swapGuests);
  const unassignGuest = useSeatingStore((s) => s.unassignGuest);
  const updateTable = useSeatingStore((s) => s.updateTable);
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
  const [seatDrag, setSeatDrag] = useState<SeatDragState | null>(null);
  const seatDragRef = useRef<SeatDragState | null>(null);
  const didDragMove = useRef(false);

  // "Add Seats" popover for zero-capacity tables
  const [addSeatsPopover, setAddSeatsPopover] = useState<{
    tableId: string;
    x: number;
    y: number;
  } | null>(null);

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
    const rect = node.getBoundingClientRect();
    setStageSize({ width: rect.width, height: rect.height });
  }, []);

  const seatingPxPerUnit = venue.unit === 'ft' ? 15 : 30;
  const roomRects = useMemo(
    () => getAllRoomRects(venue, seatingPxPerUnit),
    [venue, seatingPxPerUnit]
  );

  // Draw grid lines for all rooms
  const gridLines = useMemo(() => {
    const lines: { points: number[]; key: string }[] = [];
    const gridPixels = venue.gridSize * seatingPxPerUnit;
    if (!venue.showGrid || gridPixels <= 0) return lines;

    for (const room of roomRects) {
      const rx = room.x;
      const ry = room.y;
      const rw = room.width;
      const rh = room.height;
      for (let x = 0; x <= rw; x += gridPixels) {
        lines.push({ points: [rx + x, ry, rx + x, ry + rh], key: `gv-${room.id}-${x}` });
      }
      for (let y = 0; y <= rh; y += gridPixels) {
        lines.push({ points: [rx, ry + y, rx + rw, ry + y], key: `gh-${room.id}-${y}` });
      }
    }
    return lines;
  }, [venue.showGrid, venue.gridSize, seatingPxPerUnit, roomRects]);

  const roomPixelWidth = venue.roomWidth * seatingPxPerUnit;
  const roomPixelLength = venue.roomLength * seatingPxPerUnit;

  // Pre-compute all seat positions in canvas (absolute) coords for drop target detection
  const allSeats = useMemo(() => {
    const result: {
      tableId: string;
      seatIdx: number;
      canvasX: number;
      canvasY: number;
      occupantId: string | null;
    }[] = [];
    for (const table of venue.tables) {
      const seats = getSeatPositions(table.shape, table.capacity, table.width, table.height, table.seatingSide, table.endSeats);
      const tableOcc = seatOccupants.get(table.id);
      for (let i = 0; i < seats.length; i++) {
        const occupant = tableOcc?.get(i);
        result.push({
          tableId: table.id,
          seatIdx: i,
          canvasX: table.position.x + seats[i].x,
          canvasY: table.position.y + seats[i].y,
          occupantId: occupant?.id ?? null,
        });
      }
    }
    return result;
  }, [venue.tables, seatOccupants]);

  // Find closest seat to a canvas position
  const findNearestSeat = useCallback(
    (cx: number, cy: number, excludeGuestId?: string) => {
      let bestDist = Infinity;
      let bestSeat: (typeof allSeats)[0] | null = null;
      for (const seat of allSeats) {
        const dist = Math.hypot(cx - seat.canvasX, cy - seat.canvasY);
        if (dist < bestDist) {
          bestDist = dist;
          bestSeat = seat;
        }
      }
      const maxDist = 60;
      if (bestSeat && bestDist < maxDist) return { seat: bestSeat, dist: bestDist };
      return null;
    },
    [allSeats]
  );

  // Nearest target seat during drag (for highlighting)
  const dragTargetSeat = useMemo(() => {
    if (!seatDrag) return null;
    return findNearestSeat(seatDrag.canvasX, seatDrag.canvasY, seatDrag.guestId);
  }, [seatDrag, findNearestSeat]);

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

      const seatsA = getSeatPositions(tableA.shape, tableA.capacity, tableA.width, tableA.height, tableA.seatingSide, tableA.endSeats);
      const seatsB = getSeatPositions(tableB.shape, tableB.capacity, tableB.width, tableB.height, tableB.seatingSide, tableB.endSeats);

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

  // --- Seat drag-and-drop handlers ---
  const handleSeatDragStart = useCallback(
    (guestId: string, guestName: string, tableId: string, seatIdx: number, e: Konva.KonvaEventObject<MouseEvent>) => {
      e.cancelBubble = true;
      const stage = e.target.getStage();
      if (!stage) return;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const canvasX = (pointer.x - panOffset.x) / zoom;
      const canvasY = (pointer.y - panOffset.y) / zoom;

      const state: SeatDragState = {
        guestId,
        guestName,
        sourceTableId: tableId,
        sourceSeatIdx: seatIdx,
        canvasX,
        canvasY,
      };
      seatDragRef.current = state;
      didDragMove.current = false;
      setSeatDrag(state);
      setContextMenu(null);
    },
    [panOffset, zoom]
  );

  const handleStageMoveForDrag = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (!seatDragRef.current) return;
      didDragMove.current = true;
      const stage = e.target.getStage();
      if (!stage) return;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const canvasX = (pointer.x - panOffset.x) / zoom;
      const canvasY = (pointer.y - panOffset.y) / zoom;

      const updated = { ...seatDragRef.current, canvasX, canvasY };
      seatDragRef.current = updated;
      setSeatDrag(updated);
    },
    [panOffset, zoom]
  );

  const handleStageUpForDrag = useCallback(() => {
    const drag = seatDragRef.current;
    if (!drag) return;

    const target = findNearestSeat(drag.canvasX, drag.canvasY, drag.guestId);

    if (target) {
      const { seat } = target;
      // Dropping on the same seat — do nothing
      if (seat.tableId === drag.sourceTableId && seat.seatIdx === drag.sourceSeatIdx) {
        // noop
      } else if (seat.occupantId && seat.occupantId !== drag.guestId) {
        // Occupied by someone else — swap
        swapGuests(drag.guestId, seat.occupantId);
      } else {
        // Empty seat — move guest there
        assignGuestToTable(drag.guestId, seat.tableId, seat.seatIdx);
      }
    }

    seatDragRef.current = null;
    setSeatDrag(null);
  }, [findNearestSeat, swapGuests, assignGuestToTable]);

  // Combined mouse handlers (seat drag takes priority over pan)
  const handleCombinedMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (seatDragRef.current) {
        handleStageMoveForDrag(e);
      } else {
        handleMouseMove(e);
      }
    },
    [handleStageMoveForDrag, handleMouseMove]
  );

  const handleCombinedMouseUp = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (seatDragRef.current) {
        handleStageUpForDrag();
      }
      handleMouseUp();
    },
    [handleStageUpForDrag, handleMouseUp]
  );

  // Handle click on occupied seat (context menu)
  const handleSeatClick = useCallback(
    (guestId: string, stageX: number, stageY: number) => {
      // Don't show menu if we were dragging
      if (seatDragRef.current || didDragMove.current) {
        didDragMove.current = false;
        return;
      }
      setContextMenu({ guestId, x: stageX, y: stageY });
    },
    []
  );

  const handleStageClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (contextMenu) {
        setContextMenu(null);
      }
      const target = e.target;
      if (target === e.currentTarget || target.getClassName() === 'Rect') {
        const name = target.name();
        if (name === 'room-bg' || name === 'stage-bg') {
          setSelectedTableId(null);
          setAddSeatsPopover(null);
        }
      }
    },
    [contextMenu, setSelectedTableId]
  );

  const renderTable = useCallback(
    (table: Table) => {
      const seats = getSeatPositions(table.shape, table.capacity, table.width, table.height, table.seatingSide, table.endSeats);
      const tableOccupants = seatOccupants.get(table.id);
      const isFull = (tableOccupants?.size ?? 0) >= table.capacity;
      const hasViolation = violatedTableIds.has(table.id);
      const isSelected = selectedTableId === table.id;
      const isDraggingFromList = !!draggedGuestId;
      const hasNoSeats = table.capacity === 0;

      return (
        <Group
          key={table.id}
          x={table.position.x}
          y={table.position.y}
          rotation={table.rotation}
          onClick={() => {
            setSelectedTableId(table.id);
            if (hasNoSeats) {
              setAddSeatsPopover({
                tableId: table.id,
                x: table.position.x,
                y: table.position.y,
              });
            } else {
              setAddSeatsPopover(null);
            }
          }}
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
            y={hasNoSeats ? -14 : -6}
            width={table.width}
            align="center"
            fontSize={11}
            fontStyle="600"
            fill="#475569"
          />

          {/* "Click to add seats" prompt for zero-capacity tables */}
          {hasNoSeats && (
            <Text
              text="Click to add seats"
              x={-table.width / 2}
              y={4}
              width={table.width}
              align="center"
              fontSize={9}
              fill="#94a3b8"
              listening={false}
            />
          )}

          {/* Seats */}
          {seats.map((seat, idx) => {
            const occupant = tableOccupants?.get(idx);
            const isSourceSeat =
              seatDrag?.sourceTableId === table.id && seatDrag?.sourceSeatIdx === idx;
            const isDropTarget =
              dragTargetSeat?.seat.tableId === table.id &&
              dragTargetSeat?.seat.seatIdx === idx &&
              !!seatDrag;

            let seatFill: string;
            let seatStroke: string;
            let strokeWidth = 1.5;

            if (isSourceSeat) {
              // The seat being dragged from — show as dimmed
              seatFill = COLOURS.seatDragSource.fill;
              seatStroke = COLOURS.seatDragSource.stroke;
              strokeWidth = 2;
            } else if (isDropTarget) {
              // Potential drop target
              if (occupant && occupant.id !== seatDrag?.guestId) {
                // Swap target
                seatFill = COLOURS.seatSwapTarget.fill;
                seatStroke = COLOURS.seatSwapTarget.stroke;
                strokeWidth = 2.5;
              } else {
                // Empty target
                seatFill = COLOURS.seatDropValid.fill;
                seatStroke = COLOURS.seatDropValid.stroke;
                strokeWidth = 2.5;
              }
            } else if (isDraggingFromList && !occupant && !isFull) {
              seatFill = COLOURS.seatDropValid.fill;
              seatStroke = COLOURS.seatDropValid.stroke;
            } else if (isDraggingFromList && isFull && !occupant) {
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
            if (occupant && selectedGuestIds.includes(occupant.id) && !isSourceSeat && !isDropTarget) {
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
                  strokeWidth={strokeWidth}
                  onMouseDown={(e) => {
                    if (occupant && e.evt.button === 0) {
                      handleSeatDragStart(
                        occupant.id,
                        occupant.name,
                        table.id,
                        idx,
                        e
                      );
                    }
                  }}
                  onClick={() => {
                    if (occupant && !seatDragRef.current) {
                      handleSeatClick(
                        occupant.id,
                        table.position.x + seat.x,
                        table.position.y + seat.y
                      );
                    }
                  }}
                  onMouseEnter={(e) => {
                    const container = e.target.getStage()?.container();
                    if (container) {
                      container.style.cursor = occupant ? 'grab' : 'default';
                    }
                  }}
                  onMouseLeave={(e) => {
                    const container = e.target.getStage()?.container();
                    if (container) container.style.cursor = 'default';
                  }}
                />
                {/* Guest name */}
                {occupant && !isSourceSeat && (
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
      handleSeatDragStart,
      seatDrag,
      dragTargetSeat,
      updateTable,
    ]
  );

  const stageRef = useRef<Konva.Stage>(null);

  useImperativeHandle(ref, () => ({
    getStageNode: () => stageRef.current,
  }), []);

  return (
    <div ref={containerRef} className="w-full h-full">
      <Stage
        ref={stageRef}
        width={stageSize.width}
        height={stageSize.height}
        scaleX={zoom}
        scaleY={zoom}
        x={panOffset.x}
        y={panOffset.y}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleCombinedMouseMove}
        onMouseUp={handleCombinedMouseUp}
        onClick={handleStageClick}
      >
        {/* Background layer */}
        <Layer>
          {/* Room backgrounds */}
          {roomRects.map((room, idx) => (
            <Rect
              key={`room-bg-${room.id}`}
              name={idx === 0 ? 'room-bg' : undefined}
              x={room.x}
              y={room.y}
              width={room.width}
              height={room.height}
              fill={room.color ?? COLOURS.roomBg}
              stroke="#cbd5e1"
              strokeWidth={1}
              dash={idx > 0 ? [8, 4] : undefined}
            />
          ))}

          {/* Room labels for additional rooms */}
          {roomRects.slice(1).map((room) => (
            <Text
              key={`label-${room.id}`}
              text={room.label}
              x={room.x + 6}
              y={room.y + 4}
              fontSize={10}
              fontFamily="system-ui, sans-serif"
              fill="#64748b"
              listening={false}
            />
          ))}

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

        {/* Drag ghost layer */}
        {seatDrag && (
          <Layer listening={false}>
            {/* Ghost circle following cursor */}
            <Circle
              x={seatDrag.canvasX}
              y={seatDrag.canvasY}
              radius={SEAT_RENDER_RADIUS + 2}
              fill={COLOURS.ghostFill}
              stroke={COLOURS.ghostStroke}
              strokeWidth={2}
              opacity={0.8}
              listening={false}
            />
            {/* Ghost name label */}
            <Text
              text={seatDrag.guestName.split(' ')[0]}
              x={seatDrag.canvasX - SEAT_RENDER_RADIUS - 4}
              y={seatDrag.canvasY - SEAT_RENDER_RADIUS - 14}
              width={(SEAT_RENDER_RADIUS + 4) * 2}
              align="center"
              fontSize={9}
              fontStyle="600"
              fill={COLOURS.ghostStroke}
              listening={false}
            />
            {/* Drop hint */}
            {dragTargetSeat && (
              <Group x={dragTargetSeat.seat.canvasX} y={dragTargetSeat.seat.canvasY}>
                <Circle
                  radius={SEAT_RENDER_RADIUS + 6}
                  fill="transparent"
                  stroke={dragTargetSeat.seat.occupantId ? COLOURS.seatSwapTarget.stroke : COLOURS.seatDropValid.stroke}
                  strokeWidth={2}
                  dash={[4, 3]}
                  listening={false}
                />
              </Group>
            )}
          </Layer>
        )}

        {/* Context menu layer */}
        {contextMenu && !seatDrag && (
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

        {/* Add Seats popover for zero-capacity tables */}
        {addSeatsPopover && !seatDrag && (() => {
          const table = venue.tables.find((t) => t.id === addSeatsPopover.tableId);
          if (!table || table.capacity > 0) return null;
          const suggested = getSuggestedCapacity(table.shape, table.width, table.height);
          const isRect = table.shape === 'rectangular' || table.shape === 'square';
          const popoverW = isRect ? 170 : 120;
          const popoverH = isRect ? 108 : 56;

          return (
            <Layer>
              <Group x={addSeatsPopover.x + table.width / 2 + 12} y={addSeatsPopover.y - popoverH / 2}>
                {/* Background */}
                <Rect
                  width={popoverW}
                  height={popoverH}
                  cornerRadius={8}
                  fill="white"
                  stroke="#e2e8f0"
                  strokeWidth={1}
                  shadowColor="rgba(0,0,0,0.12)"
                  shadowBlur={10}
                  shadowOffsetY={2}
                />

                {/* "Add Seats" button — applies suggested capacity */}
                <Group
                  onClick={() => {
                    updateTable(table.id, { capacity: suggested });
                    setAddSeatsPopover(null);
                  }}
                  onMouseEnter={(e) => {
                    const c = e.target.getStage()?.container();
                    if (c) c.style.cursor = 'pointer';
                  }}
                  onMouseLeave={(e) => {
                    const c = e.target.getStage()?.container();
                    if (c) c.style.cursor = 'default';
                  }}
                >
                  <Rect
                    x={8}
                    y={8}
                    width={popoverW - 16}
                    height={26}
                    cornerRadius={6}
                    fill="#1e293b"
                  />
                  <Text
                    text={`Add ${suggested} Seats`}
                    x={8}
                    y={14}
                    width={popoverW - 16}
                    align="center"
                    fontSize={11}
                    fontStyle="600"
                    fill="white"
                    listening={false}
                  />
                </Group>

                {/* Rectangular/square-specific options: one side, no ends */}
                {isRect && (
                  <>
                    {/* One side only option */}
                    <Group
                      onClick={() => {
                        const oneSideCap = getSuggestedCapacity(table.shape, table.width, table.height, 'top-only');
                        updateTable(table.id, { capacity: oneSideCap, seatingSide: 'top-only', endSeats: true });
                        setAddSeatsPopover(null);
                      }}
                      onMouseEnter={(e) => {
                        const c = e.target.getStage()?.container();
                        if (c) c.style.cursor = 'pointer';
                      }}
                      onMouseLeave={(e) => {
                        const c = e.target.getStage()?.container();
                        if (c) c.style.cursor = 'default';
                      }}
                    >
                      <Rect
                        x={8}
                        y={42}
                        width={popoverW - 16}
                        height={24}
                        cornerRadius={5}
                        fill="#f8fafc"
                        stroke="#e2e8f0"
                        strokeWidth={1}
                      />
                      <Text
                        text="One side only"
                        x={8}
                        y={48}
                        width={popoverW - 16}
                        align="center"
                        fontSize={10}
                        fill="#475569"
                        listening={false}
                      />
                    </Group>

                    {/* No end seats option */}
                    <Group
                      onClick={() => {
                        const noEndCap = getSuggestedCapacity(table.shape, table.width, table.height, 'both', false);
                        updateTable(table.id, { capacity: noEndCap, seatingSide: 'both', endSeats: false });
                        setAddSeatsPopover(null);
                      }}
                      onMouseEnter={(e) => {
                        const c = e.target.getStage()?.container();
                        if (c) c.style.cursor = 'pointer';
                      }}
                      onMouseLeave={(e) => {
                        const c = e.target.getStage()?.container();
                        if (c) c.style.cursor = 'default';
                      }}
                    >
                      <Rect
                        x={8}
                        y={74}
                        width={popoverW - 16}
                        height={24}
                        cornerRadius={5}
                        fill="#f8fafc"
                        stroke="#e2e8f0"
                        strokeWidth={1}
                      />
                      <Text
                        text="No end seats"
                        x={8}
                        y={80}
                        width={popoverW - 16}
                        align="center"
                        fontSize={10}
                        fill="#475569"
                        listening={false}
                      />
                    </Group>
                  </>
                )}
              </Group>
            </Layer>
          );
        })()}
      </Stage>
    </div>
  );
});
