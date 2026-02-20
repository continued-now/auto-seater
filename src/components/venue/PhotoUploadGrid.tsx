'use client';

import { useCallback, useRef, useState } from 'react';
import { Camera, X, Plus, Upload, AlertCircle } from 'lucide-react';
import type { PhotoSlot, PhotoSlotId, CapturedPhoto, LensType } from '@/types/photo-to-room';
import { hasValidCameraMetadata } from '@/lib/exif-parser';

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
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) {
        const valid = await hasValidCameraMetadata(file);
        if (!valid) {
          setUploadError('No camera data. Use camera instead.');
          return;
        }
        setUploadError(null);
        onAdd(file);
      }
    },
    [onAdd]
  );

  const handleChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        const valid = await hasValidCameraMetadata(file);
        if (!valid) {
          setUploadError('No camera data. Use camera instead.');
          e.target.value = '';
          return;
        }
        setUploadError(null);
        onAdd(file);
      }
      e.target.value = '';
    },
    [onAdd]
  );

  if (slot.preview) {
    const lensType = slot.exif?.lensType ?? slot.capturedPhoto?.lensType;
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
        {lensType && (
          <span className="absolute top-1 left-1 text-[9px] font-bold bg-slate-800/70 text-white px-1 py-0.5 rounded">
            {lensType === 'ultrawide' ? 'UW' : 'W'}
          </span>
        )}
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
      {uploadError && (
        <div className="flex items-center gap-1 mt-1">
          <AlertCircle size={10} className="text-red-500 shrink-0" />
          <p className="text-[10px] text-red-500">{uploadError}</p>
        </div>
      )}
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
        Upload 1-6 photos with camera metadata. Screenshots without EXIF will be rejected.
      </p>
    </div>
  );
}

/** Compact room photo grid used in the camera-capture flow */
interface RoomPhotoGridProps {
  photos: CapturedPhoto[];
  onRemove: (index: number) => void;
  maxPhotos?: number;
}

export function RoomPhotoGrid({ photos, onRemove, maxPhotos = 4 }: RoomPhotoGridProps) {
  return (
    <div className="flex gap-2 flex-wrap">
      {photos.map((photo, idx) => (
        <div key={idx} className="relative group w-16 h-12 shrink-0">
          <img
            src={photo.preview}
            alt={`Room photo ${idx + 1}`}
            className="w-full h-full object-cover rounded-md border border-slate-200"
          />
          <button
            onClick={() => onRemove(idx)}
            className="absolute -top-1 -right-1 p-0.5 rounded-full bg-slate-800/70 text-white opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X size={10} />
          </button>
          {photo.lensType && (
            <span className="absolute bottom-0.5 left-0.5 text-[8px] font-bold bg-slate-800/70 text-white px-0.5 rounded">
              {photo.lensType === 'ultrawide' ? 'UW' : 'W'}
            </span>
          )}
        </div>
      ))}
      {photos.length < maxPhotos && (
        <div className="w-16 h-12 flex items-center justify-center rounded-md border-2 border-dashed border-slate-300 text-slate-400">
          <Plus size={14} />
        </div>
      )}
    </div>
  );
}
