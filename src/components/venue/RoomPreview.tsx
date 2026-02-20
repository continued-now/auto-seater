'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import type { DetectedRoom, DetectedObject } from '@/types/photo-to-room';

interface RoomPreviewProps {
  detectedRoom: DetectedRoom;
  onDeleteObject: (index: number) => void;
}

const CONFIDENCE_COLOR = (c: number) =>
  c >= 0.8 ? 'border-emerald-400 bg-emerald-50' :
  c >= 0.5 ? 'border-amber-400 bg-amber-50' :
  'border-red-400 bg-red-50';

const CONFIDENCE_DOT = (c: number) =>
  c >= 0.8 ? 'bg-emerald-500' :
  c >= 0.5 ? 'bg-amber-500' :
  'bg-red-500';

const PREVIEW_WIDTH = 400;
const PREVIEW_HEIGHT = 280;

export default function RoomPreview({ detectedRoom, onDeleteObject }: RoomPreviewProps) {
  const [highlightedIdx, setHighlightedIdx] = useState<number | null>(null);

  const scaleX = PREVIEW_WIDTH / (detectedRoom.width || 1);
  const scaleY = PREVIEW_HEIGHT / (detectedRoom.height || 1);
  const scale = Math.min(scaleX, scaleY) * 0.85;
  const offsetX = (PREVIEW_WIDTH - detectedRoom.width * scale) / 2;
  const offsetY = (PREVIEW_HEIGHT - detectedRoom.height * scale) / 2;

  return (
    <div className="flex gap-4">
      {/* Canvas preview */}
      <div className="flex-1 min-w-0">
        <div
          className="bg-slate-50 border border-slate-200 rounded-lg overflow-hidden relative"
          style={{ width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT }}
        >
          {/* Room boundary */}
          <div
            className="absolute border-2 border-slate-300 bg-white"
            style={{
              left: offsetX,
              top: offsetY,
              width: detectedRoom.width * scale,
              height: detectedRoom.height * scale,
            }}
          />

          {/* Detected objects */}
          {detectedRoom.objects.map((obj, idx) => {
            const x = offsetX + obj.position.x * detectedRoom.width * scale;
            const y = offsetY + obj.position.y * detectedRoom.height * scale;
            const w = obj.width * scale;
            const h = obj.height * scale;
            const isHighlighted = highlightedIdx === idx;

            const borderColor =
              obj.confidence >= 0.8 ? 'border-emerald-500' :
              obj.confidence >= 0.5 ? 'border-amber-500' :
              'border-red-500';

            const bgColor =
              obj.confidence >= 0.8 ? 'bg-emerald-100/60' :
              obj.confidence >= 0.5 ? 'bg-amber-100/60' :
              'bg-red-100/60';

            return (
              <div
                key={idx}
                className={`absolute border-2 ${borderColor} ${bgColor} ${
                  isHighlighted ? 'ring-2 ring-slate-500' : ''
                } ${obj.type === 'table' && obj.subType === 'round' ? 'rounded-full' : 'rounded-sm'}`}
                style={{
                  left: x - w / 2,
                  top: y - h / 2,
                  width: w,
                  height: h,
                  transform: `rotate(${obj.rotation}deg)`,
                }}
                onMouseEnter={() => setHighlightedIdx(idx)}
                onMouseLeave={() => setHighlightedIdx(null)}
              >
                <span className="absolute inset-0 flex items-center justify-center text-[8px] font-medium text-slate-600 truncate px-0.5">
                  {obj.label.length > 8 ? obj.label.slice(0, 8) + '...' : obj.label}
                </span>
              </div>
            );
          })}

          {/* Walls */}
          {detectedRoom.walls.map((wall, idx) => {
            const x1 = offsetX + wall.start.x * detectedRoom.width * scale;
            const y1 = offsetY + wall.start.y * detectedRoom.height * scale;
            const x2 = offsetX + wall.end.x * detectedRoom.width * scale;
            const y2 = offsetY + wall.end.y * detectedRoom.height * scale;
            const length = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
            const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);

            return (
              <div
                key={`wall-${idx}`}
                className={`absolute ${wall.style === 'solid' ? 'bg-slate-600' : 'bg-slate-400'}`}
                style={{
                  left: x1,
                  top: y1 - 2,
                  width: length,
                  height: wall.style === 'solid' ? 4 : 2,
                  transform: `rotate(${angle}deg)`,
                  transformOrigin: '0 50%',
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Object list */}
      <div className="w-48 shrink-0">
        <h4 className="text-xs font-semibold text-slate-700 mb-2">
          Detected ({detectedRoom.objects.length})
        </h4>
        <div className="space-y-1 max-h-52 overflow-y-auto">
          {detectedRoom.objects.map((obj, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs cursor-pointer transition-colors ${
                highlightedIdx === idx ? 'bg-slate-100' : 'hover:bg-slate-50'
              }`}
              onMouseEnter={() => setHighlightedIdx(idx)}
              onMouseLeave={() => setHighlightedIdx(null)}
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${CONFIDENCE_DOT(obj.confidence)}`} />
              <span className="truncate flex-1 text-slate-700">{obj.label}</span>
              <span className="text-slate-400 shrink-0">{Math.round(obj.confidence * 100)}%</span>
              <button
                onClick={(e) => { e.stopPropagation(); onDeleteObject(idx); }}
                className="text-slate-300 hover:text-red-500 shrink-0"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          {detectedRoom.objects.length === 0 && (
            <p className="text-xs text-slate-400 py-2">No objects detected</p>
          )}
        </div>
      </div>

      {/* Disclaimer */}
      <p className="absolute bottom-3 left-4 right-4 text-[10px] text-slate-400 text-center">
        Dimensions are estimates. Provide measurements for better accuracy.
      </p>
    </div>
  );
}
