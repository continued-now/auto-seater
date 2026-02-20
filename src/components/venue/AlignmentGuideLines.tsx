import { Line } from 'react-konva';
import type { AlignmentGuide } from '@/lib/alignment-engine';

interface AlignmentGuideLinesProps {
  guides: AlignmentGuide[];
}

export function AlignmentGuideLines({ guides }: AlignmentGuideLinesProps) {
  return (
    <>
      {guides.map((guide, i) => {
        const points =
          guide.orientation === 'vertical'
            ? [guide.position, guide.start, guide.position, guide.end]
            : [guide.start, guide.position, guide.end, guide.position];

        return (
          <Line
            key={`guide-${i}`}
            points={points}
            stroke="#F97316"
            strokeWidth={1}
            dash={[4, 4]}
            listening={false}
          />
        );
      })}
    </>
  );
}
