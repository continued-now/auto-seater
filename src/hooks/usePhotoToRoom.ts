'use client';

import { useState, useCallback, useRef } from 'react';
import type { PhotoSlot, PhotoSlotId, PhotoToRoomStep, MeasurementInput, DetectedRoom, ExifData } from '@/types/photo-to-room';
import { extractExif } from '@/lib/exif-parser';
import { validatePhotoFile, compressPhoto } from '@/lib/photo-processor';
import { useSeatingStore } from '@/stores/useSeatingStore';

const SLOT_IDS: PhotoSlotId[] = ['corner-1', 'corner-2', 'corner-3', 'corner-4', 'detail-1', 'detail-2'];

const CORNER_LABELS: Record<PhotoSlotId, string> = {
  'corner-1': 'Corner 1 (NW)',
  'corner-2': 'Corner 2 (NE)',
  'corner-3': 'Corner 3 (SW)',
  'corner-4': 'Corner 4 (SE)',
  'detail-1': 'Detail shot 1',
  'detail-2': 'Detail shot 2',
};

const STATUS_MESSAGES = [
  'Analyzing photos...',
  'Detecting walls...',
  'Identifying furniture...',
  'Estimating dimensions...',
];

function createEmptySlots(): PhotoSlot[] {
  return SLOT_IDS.map((id) => ({ id, file: null, preview: null, exif: null }));
}

export function usePhotoToRoom() {
  const [step, setStep] = useState<PhotoToRoomStep>('idle');
  const [photos, setPhotos] = useState<PhotoSlot[]>(createEmptySlots());
  const [measurements, setMeasurementsState] = useState<MeasurementInput>({
    roomWidth: null,
    roomLength: null,
    unit: 'ft',
    referenceObject: null,
  });
  const [detectedRoom, setDetectedRoom] = useState<DetectedRoom | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  const statusIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const venueUnit = useSeatingStore((s) => s.venue.unit);

  const openWizard = useCallback(() => {
    setStep('upload');
    setMeasurementsState((prev) => ({ ...prev, unit: venueUnit }));
  }, [venueUnit]);

  const addPhoto = useCallback(async (slotId: PhotoSlotId, file: File) => {
    const validationError = validatePhotoFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);

    const preview = URL.createObjectURL(file);
    const exif = await extractExif(file);

    setPhotos((prev) =>
      prev.map((slot) =>
        slot.id === slotId ? { ...slot, file, preview, exif } : slot
      )
    );
  }, []);

  const removePhoto = useCallback((slotId: PhotoSlotId) => {
    setPhotos((prev) =>
      prev.map((slot) => {
        if (slot.id !== slotId) return slot;
        if (slot.preview) URL.revokeObjectURL(slot.preview);
        return { ...slot, file: null, preview: null, exif: null };
      })
    );
  }, []);

  const setMeasurement = useCallback((field: string, value: unknown) => {
    setMeasurementsState((prev) => ({ ...prev, [field]: value }));
  }, []);

  const goToMeasurements = useCallback(() => setStep('measurements'), []);
  const goToUpload = useCallback(() => setStep('upload'), []);

  const startProcessing = useCallback(async () => {
    setStep('processing');
    setError(null);

    // Start cycling status messages
    let statusIdx = 0;
    setProcessingStatus(STATUS_MESSAGES[0]);
    statusIntervalRef.current = setInterval(() => {
      statusIdx = (statusIdx + 1) % STATUS_MESSAGES.length;
      setProcessingStatus(STATUS_MESSAGES[statusIdx]);
    }, 2000);

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const filledPhotos = photos.filter((s) => s.file != null);
      const formData = new FormData();

      // Compress and add photos
      for (const slot of filledPhotos) {
        const compressed = await compressPhoto(slot.file!);
        formData.append('photos', compressed, `${slot.id}.jpg`);
      }

      // Build metadata
      const cornerLabels = filledPhotos.map((s) => CORNER_LABELS[s.id]);
      const exifData = filledPhotos.map((s) => s.exif);
      formData.append('metadata', JSON.stringify({ cornerLabels, measurements, exifData }));

      const response = await fetch('/api/photo-to-room', {
        method: 'POST',
        body: formData,
        signal: abort.signal,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Processing failed');
      }

      setDetectedRoom(data.room);
      setStep('preview');
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        setStep('upload');
      } else {
        setError(err instanceof Error ? err.message : 'Processing failed');
        setStep('error');
      }
    } finally {
      if (statusIntervalRef.current) {
        clearInterval(statusIntervalRef.current);
        statusIntervalRef.current = null;
      }
      abortRef.current = null;
    }
  }, [photos, measurements]);

  const cancelProcessing = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const reset = useCallback(() => {
    // Revoke all object URLs
    for (const slot of photos) {
      if (slot.preview) URL.revokeObjectURL(slot.preview);
    }
    setStep('idle');
    setPhotos(createEmptySlots());
    setMeasurementsState({ roomWidth: null, roomLength: null, unit: venueUnit, referenceObject: null });
    setDetectedRoom(null);
    setError(null);
    setProcessingStatus('');
    if (statusIntervalRef.current) clearInterval(statusIntervalRef.current);
    abortRef.current?.abort();
  }, [photos, venueUnit]);

  const photoCount = photos.filter((s) => s.file != null).length;

  return {
    step,
    photos,
    measurements,
    detectedRoom,
    error,
    processingStatus,
    photoCount,
    openWizard,
    addPhoto,
    removePhoto,
    setMeasurement,
    goToMeasurements,
    goToUpload,
    startProcessing,
    cancelProcessing,
    reset,
  };
}
