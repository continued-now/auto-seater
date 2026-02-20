'use client';

import { useCallback, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Loader2, Ruler, Camera, Upload } from 'lucide-react';
import { usePhotoToRoom } from '@/hooks/usePhotoToRoom';
import { useSeatingStore } from '@/stores/useSeatingStore';
import PhotoUploadGrid, { RoomPhotoGrid } from './PhotoUploadGrid';
import MeasurementForm, { ReferenceMeasureForm } from './MeasurementForm';
import RoomPreview from './RoomPreview';
import CameraCapture from './CameraCapture';
import type { CaptureMode } from '@/types/photo-to-room';

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
    captureMode,
    referencePhoto,
    referenceDimension,
    roomPhotos,
    roomPhotoCount,
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
  } = usePhotoToRoom();

  const applyPhotoLayout = useSeatingStore((s) => s.applyPhotoLayout);
  const [showUploadFallback, setShowUploadFallback] = useState(false);

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (isOpen && step === 'idle') {
        openWizard();
      }
      if (!isOpen) {
        reset();
        setShowUploadFallback(false);
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
      detectedRoom.objects.splice(idx, 1);
    },
    [detectedRoom]
  );

  const handleStartOver = useCallback(() => {
    reset();
    setShowUploadFallback(false);
    openWizard();
  }, [reset, openWizard]);

  const handleSwitchToUpload = useCallback(() => {
    setShowUploadFallback(true);
    goToUpload();
  }, [goToUpload]);

  const isPreview = step === 'preview';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        title="Photo to Room"
        description="Capture or upload room photos and AI will generate a floor plan"
        className={isPreview ? 'max-w-4xl' : 'max-w-2xl'}
      >
        {/* Step 1: Mode selection */}
        {step === 'mode-select' && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">How would you like to capture your room?</p>

            <div className="grid grid-cols-2 gap-3">
              <ModeCard
                icon={<Ruler size={20} />}
                title="I can measure something"
                description="Higher accuracy (~85-90%)"
                onClick={() => selectMode('reference')}
              />
              <ModeCard
                icon={<Camera size={20} />}
                title="AI estimate only"
                description="Quick & easy (~60-75%)"
                onClick={() => selectMode('no-reference')}
              />
            </div>

            <button
              onClick={handleSwitchToUpload}
              className="w-full text-xs text-slate-400 hover:text-slate-600 transition-colors py-1"
            >
              <Upload size={12} className="inline mr-1" />
              Upload from gallery instead
            </button>
          </div>
        )}

        {/* Step 2a: Reference capture */}
        {step === 'reference-capture' && (
          <div className="space-y-3">
            <CameraCapture
              onCapture={setReferencePhoto}
              instruction="Point at a door, table, or any object you can measure"
              allowLensSwitch={false}
            />
            <div className="flex justify-start">
              <Button variant="secondary" size="sm" onClick={goToModeSelect}>
                Back
              </Button>
            </div>
          </div>
        )}

        {/* Step 2b: Reference measurement */}
        {step === 'reference-measure' && referencePhoto && (
          <ReferenceMeasureForm
            referencePhoto={referencePhoto}
            unit={measurements.unit}
            onBack={() => selectMode('reference')}
            onNext={setReferenceDimension}
          />
        )}

        {/* Step 3: Room capture */}
        {step === 'room-capture' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600">
                Capture your room ({roomPhotoCount}/4 photos)
              </p>
              {captureMode === 'reference' && (
                <span className="text-[10px] font-medium bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                  Reference calibrated
                </span>
              )}
            </div>

            <CameraCapture
              onCapture={addRoomPhoto}
              instruction={
                roomPhotoCount === 0
                  ? 'Take a photo from the first corner of the room'
                  : `Photo ${roomPhotoCount + 1} — capture from a different angle`
              }
              allowLensSwitch
            />

            {/* Captured thumbnails */}
            {roomPhotoCount > 0 && (
              <div className="space-y-2">
                <RoomPhotoGrid photos={roomPhotos} onRemove={removeRoomPhoto} />
                <p className="text-[10px] text-slate-400">
                  Tip: Use ultrawide for large rooms, regular for detail
                </p>
              </div>
            )}

            <div className="flex justify-between pt-1">
              <Button variant="secondary" size="sm" onClick={goToModeSelect}>
                Back
              </Button>
              <Button
                variant="primary"
                disabled={roomPhotoCount === 0}
                onClick={startProcessing}
              >
                Analyze {roomPhotoCount > 0 ? `(${roomPhotoCount} photo${roomPhotoCount > 1 ? 's' : ''})` : ''}
              </Button>
            </div>
          </div>
        )}

        {/* Legacy upload step */}
        {step === 'upload' && (
          <div className="space-y-4">
            <PhotoUploadGrid photos={photos} onAddPhoto={addPhoto} onRemovePhoto={removePhoto} />
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex justify-between">
              {showUploadFallback && (
                <Button variant="secondary" onClick={goToModeSelect}>
                  Back
                </Button>
              )}
              <div className="ml-auto">
                <Button
                  variant="primary"
                  disabled={photoCount === 0}
                  onClick={goToMeasurements}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Measurements step (legacy upload flow) */}
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
            {detectedRoom.accuracyEstimate && (
              <div className={`text-xs font-medium px-3 py-1.5 rounded-md inline-block ${
                captureMode === 'reference'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-amber-50 text-amber-700'
              }`}>
                Accuracy: {detectedRoom.accuracyEstimate}
                {captureMode === 'no-reference' && ' (estimated)'}
              </div>
            )}
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

function ModeCard({
  icon,
  title,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-slate-200 hover:border-slate-400 hover:bg-slate-50 transition-colors text-center"
    >
      <div className="text-slate-600">{icon}</div>
      <p className="text-sm font-medium text-slate-700">{title}</p>
      <p className="text-xs text-slate-500">{description}</p>
    </button>
  );
}
