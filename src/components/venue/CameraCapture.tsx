'use client';

import { useEffect } from 'react';
import { Camera, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useCamera } from '@/hooks/useCamera';
import type { CapturedPhoto, LensType } from '@/types/photo-to-room';

interface CameraCaptureProps {
  onCapture: (photo: CapturedPhoto) => void;
  instruction: string;
  allowLensSwitch?: boolean;
}

export default function CameraCapture({ onCapture, instruction, allowLensSwitch = true }: CameraCaptureProps) {
  const {
    devices,
    selectedLens,
    isActive,
    error,
    videoRef,
    initCamera,
    selectLens,
    capturePhoto,
    stopCamera,
  } = useCamera();

  useEffect(() => {
    initCamera();
    return () => stopCamera();
  }, [initCamera, stopCamera]);

  const handleCapture = async () => {
    const photo = await capturePhoto();
    if (photo) {
      onCapture(photo);
    }
  };

  const hasMultipleLenses = devices.length > 1;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-3 bg-slate-50 rounded-lg border border-slate-200">
        <AlertCircle size={24} className="text-red-500" />
        <p className="text-sm text-red-600 text-center max-w-xs">{error}</p>
        <Button variant="secondary" size="sm" onClick={initCamera}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Lens toggle */}
      {allowLensSwitch && hasMultipleLenses && (
        <div className="flex gap-1.5 justify-center">
          {(['ultrawide', 'regular'] as LensType[]).map((lens) => (
            <button
              key={lens}
              onClick={() => selectLens(lens)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                selectedLens === lens
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
              }`}
            >
              {lens === 'ultrawide' ? 'Ultrawide' : 'Regular'}
            </button>
          ))}
        </div>
      )}

      {/* Viewfinder */}
      <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        {!isActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/60">
            <Camera size={32} className="text-white/50 animate-pulse" />
          </div>
        )}
      </div>

      {/* Capture button */}
      <div className="flex justify-center">
        <button
          onClick={handleCapture}
          disabled={!isActive}
          className="w-14 h-14 rounded-full border-4 border-slate-300 bg-white hover:bg-slate-100 active:bg-slate-200 transition-colors disabled:opacity-40 flex items-center justify-center"
          aria-label="Capture photo"
        >
          <div className="w-10 h-10 rounded-full bg-slate-800" />
        </button>
      </div>

      {/* Instruction */}
      <p className="text-xs text-slate-500 text-center">{instruction}</p>
    </div>
  );
}
