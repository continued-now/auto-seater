'use client';

import { useCallback, useRef } from 'react';
import { Camera, X, Plus } from 'lucide-react';
import type { PhotoSlot, PhotoSlotId } from '@/types/photo-to-room';

interface PhotoUploadGridProps {
  photos: PhotoSlot[];
  onAddPhoto: (slotId: PhotoSlotId, file: File) => void;
  onRemovePhoto: (slotId: PhotoSlotId) => void;
}

const CORNER_LABELS: Record<string, string> = {
  'corner-1': 'Corner 1 (NW)',
  'corner-2': 'Corner 2 (NE)',
  'corner-3': 'Corner 3 (SW)',
  'corner-4': 'Corner 4 (SE)',
  'detail-1': 'Detail 1',
  'detail-2': 'Detail 2',
};

function PhotoSlotCard({
  slot,
  onAdd,
  onRemove,
}: {
  slot: PhotoSlot;
  onAdd: (file: File) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) onAdd(file);
    },
    [onAdd]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onAdd(file);
      e.target.value = '';
    },
    [onAdd]
  );

  if (slot.preview) {
    return (
      <div className="relative group">
        <img
          src={slot.preview}
          alt={CORNER_LABELS[slot.id]}
          className="w-full h-24 object-cover rounded-lg border border-slate-200"
        />
        <button
          onClick={onRemove}
          className="absolute top-1 right-1 p-0.5 rounded-full bg-slate-800/70 text-white opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X size={14} />
        </button>
        <span className="absolute bottom-1 left-1 text-[10px] font-medium bg-slate-800/70 text-white px-1.5 py-0.5 rounded">
          {CORNER_LABELS[slot.id]}
        </span>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="w-full h-24 flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-slate-300 hover:border-slate-400 hover:bg-slate-50 transition-colors cursor-pointer"
      >
        <Plus size={16} className="text-slate-400" />
        <span className="text-[10px] text-slate-500 font-medium">{CORNER_LABELS[slot.id]}</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/heic"
        onChange={handleChange}
        className="hidden"
      />
    </div>
  );
}

export default function PhotoUploadGrid({ photos, onAddPhoto, onRemovePhoto }: PhotoUploadGridProps) {
  const corners = photos.filter((s) => s.id.startsWith('corner'));
  const details = photos.filter((s) => s.id.startsWith('detail'));

  return (
    <div className="space-y-4">
      {/* Bird's eye room diagram with corner slots */}
      <div className="relative">
        <div className="grid grid-cols-2 gap-3">
          {corners.map((slot) => (
            <PhotoSlotCard
              key={slot.id}
              slot={slot}
              onAdd={(file) => onAddPhoto(slot.id, file)}
              onRemove={() => onRemovePhoto(slot.id)}
            />
          ))}
        </div>

        {/* Center room diagram overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-20 h-14 border-2 border-slate-300 rounded bg-white/80 flex items-center justify-center">
            <Camera size={16} className="text-slate-400" />
          </div>
        </div>
      </div>

      {/* Detail shots */}
      <div>
        <p className="text-xs text-slate-500 mb-2">Optional detail shots</p>
        <div className="grid grid-cols-2 gap-3">
          {details.map((slot) => (
            <PhotoSlotCard
              key={slot.id}
              slot={slot}
              onAdd={(file) => onAddPhoto(slot.id, file)}
              onRemove={() => onRemovePhoto(slot.id)}
            />
          ))}
        </div>
      </div>

      <p className="text-xs text-slate-400 text-center">
        Upload 1-6 photos. 4 corner photos give the best results.
      </p>
    </div>
  );
}
