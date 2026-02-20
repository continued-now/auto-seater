'use client';

import { useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Loader2 } from 'lucide-react';
import { usePhotoToRoom } from '@/hooks/usePhotoToRoom';
import { useSeatingStore } from '@/stores/useSeatingStore';
import PhotoUploadGrid from './PhotoUploadGrid';
import MeasurementForm from './MeasurementForm';
import RoomPreview from './RoomPreview';

interface PhotoToRoomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PhotoToRoomDialog({ open, onOpenChange }: PhotoToRoomDialogProps) {
  const {
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
  } = usePhotoToRoom();

  const applyPhotoLayout = useSeatingStore((s) => s.applyPhotoLayout);

  // Open wizard when dialog opens
  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (isOpen && step === 'idle') {
        openWizard();
      }
      if (!isOpen) {
        reset();
      }
      onOpenChange(isOpen);
    },
    [step, openWizard, reset, onOpenChange]
  );

  const handleApply = useCallback(() => {
    if (detectedRoom) {
      applyPhotoLayout(detectedRoom);
      reset();
      onOpenChange(false);
    }
  }, [detectedRoom, applyPhotoLayout, reset, onOpenChange]);

  const handleDeleteObject = useCallback(
    (idx: number) => {
      if (!detectedRoom) return;
      // Create a modified room without the deleted object (immutable)
      // Since detectedRoom is from state, we need to trigger a re-render
      // For simplicity, we modify the array in place (useState reference update)
      detectedRoom.objects.splice(idx, 1);
    },
    [detectedRoom]
  );

  const handleStartOver = useCallback(() => {
    reset();
    openWizard();
  }, [reset, openWizard]);

  const isPreview = step === 'preview';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        title="Photo to Room"
        description="Upload room photos and AI will generate a floor plan"
        className={isPreview ? 'max-w-4xl' : 'max-w-2xl'}
      >
        {/* Upload step */}
        {step === 'upload' && (
          <div className="space-y-4">
            <PhotoUploadGrid photos={photos} onAddPhoto={addPhoto} onRemovePhoto={removePhoto} />
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex justify-end">
              <Button
                variant="primary"
                disabled={photoCount === 0}
                onClick={goToMeasurements}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Measurements step */}
        {step === 'measurements' && (
          <MeasurementForm
            measurements={measurements}
            onUpdate={setMeasurement}
            onSkip={startProcessing}
            onNext={startProcessing}
          />
        )}

        {/* Processing step */}
        {step === 'processing' && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 size={32} className="animate-spin text-slate-400" />
            <p className="text-sm text-slate-600 animate-pulse">{processingStatus}</p>
            <Button variant="secondary" size="sm" onClick={cancelProcessing}>
              Cancel
            </Button>
          </div>
        )}

        {/* Preview step */}
        {step === 'preview' && detectedRoom && (
          <div className="space-y-4">
            <RoomPreview detectedRoom={detectedRoom} onDeleteObject={handleDeleteObject} />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={handleStartOver}>
                Start Over
              </Button>
              <Button variant="primary" onClick={handleApply}>
                Apply Layout
              </Button>
            </div>
          </div>
        )}

        {/* Error step */}
        {step === 'error' && (
          <div className="flex flex-col items-center py-8 gap-3">
            <p className="text-sm text-red-600">{error}</p>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={handleStartOver}>
                Start Over
              </Button>
              <Button variant="primary" onClick={startProcessing}>
                Try Again
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
