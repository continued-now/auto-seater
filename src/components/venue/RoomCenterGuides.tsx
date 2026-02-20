import { Line } from 'react-konva';

interface RoomCenterGuidesProps {
  roomWidthPx: number;
  roomLengthPx: number;
  offsetX?: number;
  offsetY?: number;
}

export function RoomCenterGuides({ roomWidthPx, roomLengthPx, offsetX = 0, offsetY = 0 }: RoomCenterGuidesProps) {
  const centerX = offsetX + roomWidthPx / 2;
  const centerY = offsetY + roomLengthPx / 2;

  return (
    <>
      {/* Vertical center line */}
      <Line
        points={[centerX, offsetY, centerX, offsetY + roomLengthPx]}
        stroke="#F97316"
        strokeWidth={0.5}
        dash={[8, 6]}
        opacity={0.5}
        listening={false}
      />
      {/* Horizontal center line */}
      <Line
        points={[offsetX, centerY, offsetX + roomWidthPx, centerY]}
        stroke="#F97316"
        strokeWidth={0.5}
        dash={[8, 6]}
        opacity={0.5}
        listening={false}
      />
    </>
  );
}
