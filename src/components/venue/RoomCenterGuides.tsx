import { Line } from 'react-konva';

interface RoomCenterGuidesProps {
  roomWidthPx: number;
  roomHeightPx: number;
}

export function RoomCenterGuides({ roomWidthPx, roomHeightPx }: RoomCenterGuidesProps) {
  const centerX = roomWidthPx / 2;
  const centerY = roomHeightPx / 2;

  return (
    <>
      {/* Vertical center line */}
      <Line
        points={[centerX, 0, centerX, roomHeightPx]}
        stroke="#F97316"
        strokeWidth={0.5}
        dash={[8, 6]}
        opacity={0.5}
        listening={false}
      />
      {/* Horizontal center line */}
      <Line
        points={[0, centerY, roomWidthPx, centerY]}
        stroke="#F97316"
        strokeWidth={0.5}
        dash={[8, 6]}
        opacity={0.5}
        listening={false}
      />
    </>
  );
}
