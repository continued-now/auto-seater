'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  PhotoSlot,
  PhotoSlotId,
  PhotoToRoomStep,
  MeasurementInput,
  DetectedRoom,
  CaptureMode,
  CapturedPhoto,
  ReferenceDimension,
} from '@/types/photo-to-room';
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
  return SLOT_IDS.map((id) => ({ id, file: null, preview: null, exif: null, capturedPhoto: null }));
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

  // New camera capture state
  const [captureMode, setCaptureMode] = useState<CaptureMode | null>(null);
  const [referencePhoto, setReferencePhotoState] = useState<CapturedPhoto | null>(null);
  const [referenceDimension, setReferenceDimensionState] = useState<ReferenceDimension | null>(null);
  const [roomPhotos, setRoomPhotos] = useState<CapturedPhoto[]>([]);

  const venueUnit = useSeatingStore((s) => s.venue.unit);

  // Cleanup interval on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (statusIntervalRef.current) clearInterval(statusIntervalRef.current);
    };
  }, []);

  const openWizard = useCallback(() => {
    setStep('mode-select');
    setMeasurementsState((prev) => ({ ...prev, unit: venueUnit }));
  }, [venueUnit]);

  // --- Mode selection ---
  const selectMode = useCallback((mode: CaptureMode) => {
    setCaptureMode(mode);
    if (mode === 'reference') {
      setStep('reference-capture');
    } else {
      setStep('room-capture');
    }
  }, []);

  // --- Reference flow ---
  const setReferencePhoto = useCallback((photo: CapturedPhoto) => {
    setReferencePhotoState(photo);
    setStep('reference-measure');
  }, []);

  const setReferenceDimension = useCallback((dim: ReferenceDimension) => {
    setReferenceDimensionState(dim);
    setStep('room-capture');
  }, []);

  // --- Room capture (camera) ---
  const addRoomPhoto = useCallback((photo: CapturedPhoto) => {
    setRoomPhotos((prev) => {
      if (prev.length >= 4) return prev;
      return [...prev, photo];
    });
  }, []);

  const removeRoomPhoto = useCallback((index: number) => {
    setRoomPhotos((prev) => {
      const removed = prev[index];
      if (removed?.preview) URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  // --- Legacy upload flow ---
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
        slot.id === slotId ? { ...slot, file, preview, exif, capturedPhoto: null } : slot
      )
    );
  }, []);

  const removePhoto = useCallback((slotId: PhotoSlotId) => {
    setPhotos((prev) =>
      prev.map((slot) => {
        if (slot.id !== slotId) return slot;
        if (slot.preview) URL.revokeObjectURL(slot.preview);
        return { ...slot, file: null, preview: null, exif: null, capturedPhoto: null };
      })
    );
  }, []);

  const setMeasurement = useCallback((field: string, value: unknown) => {
    setMeasurementsState((prev) => ({ ...prev, [field]: value }));
  }, []);

  const goToMeasurements = useCallback(() => setStep('measurements'), []);
  const goToUpload = useCallback(() => setStep('upload'), []);
  const goToModeSelect = useCallback(() => setStep('mode-select'), []);

  // --- Processing ---
  const startProcessing = useCallback(async () => {
    setStep('processing');
    setError(null);

    let statusIdx = 0;
    setProcessingStatus(STATUS_MESSAGES[0]);
    statusIntervalRef.current = setInterval(() => {
      statusIdx = (statusIdx + 1) % STATUS_MESSAGES.length;
      setProcessingStatus(STATUS_MESSAGES[statusIdx]);
    }, 2000);

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const formData = new FormData();
      const isCapture = captureMode != null && roomPhotos.length > 0;

      if (isCapture) {
        // Camera capture flow
        for (let i = 0; i < roomPhotos.length; i++) {
          formData.append('photos', roomPhotos[i].blob, `room-${i + 1}.jpg`);
        }

        // Include reference photo as separate field if in reference mode
        if (captureMode === 'reference' && referencePhoto) {
          formData.append('referencePhoto', referencePhoto.blob, 'reference.jpg');
        }

        const captureMetadata = {
          captureMode,
          referenceDimension,
          roomPhotos: roomPhotos.map((p) => ({
            lensType: p.lensType,
            focalLength35mm: p.focalLength35mm,
            resolution: p.resolution,
            source: p.source,
          })),
          referencePhoto: referencePhoto ? {
            lensType: referencePhoto.lensType,
            focalLength35mm: referencePhoto.focalLength35mm,
            resolution: referencePhoto.resolution,
          } : null,
          unit: measurements.unit,
        };
        formData.append('metadata', JSON.stringify(captureMetadata));
      } else {
        // Legacy upload flow
        const filledPhotos = photos.filter((s) => s.file != null);
        for (const slot of filledPhotos) {
          const compressed = await compressPhoto(slot.file!);
          formData.append('photos', compressed, `${slot.id}.jpg`);
        }

        const cornerLabels = filledPhotos.map((s) => CORNER_LABELS[s.id]);
        const exifData = filledPhotos.map((s) => s.exif);
        formData.append('metadata', JSON.stringify({ cornerLabels, measurements, exifData }));
      }

      const response = await fetch('/api/photo-to-room', {
        method: 'POST',
        body: formData,
        signal: abort.signal,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Processing failed');
      }

      // Add accuracy estimate to room based on mode
      const room: DetectedRoom = data.room;
      if (isCapture) {
        room.accuracyEstimate = captureMode === 'reference' ? '~85-90%' : '~60-75%';
      }

      setDetectedRoom(room);
      setStep('preview');
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        setStep(captureMode != null ? 'room-capture' : 'upload');
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
  }, [photos, measurements, captureMode, roomPhotos, referencePhoto, referenceDimension]);

  const cancelProcessing = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const reset = useCallback(() => {
    // Revoke all object URLs
    for (const slot of photos) {
      if (slot.preview) URL.revokeObjectURL(slot.preview);
    }
    for (const p of roomPhotos) {
      if (p.preview) URL.revokeObjectURL(p.preview);
    }
    if (referencePhoto?.preview) URL.revokeObjectURL(referencePhoto.preview);

    setStep('idle');
    setPhotos(createEmptySlots());
    setMeasurementsState({ roomWidth: null, roomLength: null, unit: venueUnit, referenceObject: null });
    setDetectedRoom(null);
    setError(null);
    setProcessingStatus('');
    setCaptureMode(null);
    setReferencePhotoState(null);
    setReferenceDimensionState(null);
    setRoomPhotos([]);
    if (statusIntervalRef.current) clearInterval(statusIntervalRef.current);
    abortRef.current?.abort();
  }, [photos, roomPhotos, referencePhoto, venueUnit]);

  const photoCount = photos.filter((s) => s.file != null).length;
  const roomPhotoCount = roomPhotos.length;

  return {
    step,
    photos,
    measurements,
    detectedRoom,
    error,
    processingStatus,
    photoCount,
    // New camera capture state
    captureMode,
    referencePhoto,
    referenceDimension,
    roomPhotos,
    roomPhotoCount,
    // Actions
    openWizard,
    selectMode,
    setReferencePhoto,
    setReferenceDimension,
    addRoomPhoto,
    removeRoomPhoto,
    addPhoto,
    removePhoto,
    setMeasurement,
    goToMeasurements,
    goToUpload,
    goToModeSelect,
    startProcessing,
    cancelProcessing,
    reset,
  };
}
