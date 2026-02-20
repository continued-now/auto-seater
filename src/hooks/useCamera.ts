'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { LensType } from '@/lib/lens-database';
import { getFocalLength } from '@/lib/lens-database';
import type { CapturedPhoto } from '@/types/photo-to-room';

const MAX_CAPTURE_DIMENSION = 1536;
const JPEG_QUALITY = 0.85;

interface CameraDevice {
  deviceId: string;
  label: string;
  lensType: LensType;
}

interface UseCameraReturn {
  devices: CameraDevice[];
  selectedLens: LensType;
  stream: MediaStream | null;
  isActive: boolean;
  error: string | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  initCamera: () => Promise<void>;
  selectLens: (type: LensType) => Promise<void>;
  capturePhoto: () => Promise<CapturedPhoto | null>;
  stopCamera: () => void;
}

/** Guess lens type from device label */
function guessLensType(label: string): LensType {
  const lower = label.toLowerCase();
  if (lower.includes('ultra wide') || lower.includes('ultrawide') || lower.includes('wide angle')) {
    return 'ultrawide';
  }
  return 'regular';
}

export function useCamera(): UseCameraReturn {
  const [devices, setDevices] = useState<CameraDevice[]>([]);
  const [selectedLens, setSelectedLens] = useState<LensType>('regular');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setStream(null);
    setIsActive(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const startStream = useCallback(async (deviceId?: string) => {
    // Stop existing stream first
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }

    const constraints: MediaStreamConstraints = {
      video: {
        facingMode: deviceId ? undefined : { ideal: 'environment' },
        deviceId: deviceId ? { exact: deviceId } : undefined,
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
      audio: false,
    };

    const newStream = await navigator.mediaDevices.getUserMedia(constraints);
    streamRef.current = newStream;
    setStream(newStream);
    setIsActive(true);

    // Attach to video element
    if (videoRef.current) {
      videoRef.current.srcObject = newStream;
    }

    return newStream;
  }, []);

  const initCamera = useCallback(async () => {
    setError(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera not supported in this browser.');
      return;
    }

    try {
      // Request initial stream to trigger permission prompt
      await startStream();

      // Enumerate devices after permission is granted
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = allDevices.filter((d) => d.kind === 'videoinput');

      // Try to identify back cameras by label
      const backCameras = videoDevices.filter((d) => {
        const label = d.label.toLowerCase();
        return label.includes('back') || label.includes('rear') || label.includes('environment');
      });

      const cameraDevices: CameraDevice[] = (backCameras.length > 0 ? backCameras : videoDevices).map((d) => ({
        deviceId: d.deviceId,
        label: d.label || `Camera ${d.deviceId.slice(0, 4)}`,
        lensType: guessLensType(d.label),
      }));

      setDevices(cameraDevices);
      setSelectedLens('regular');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to access camera';
      if (msg.includes('NotAllowedError') || msg.includes('Permission')) {
        setError('Camera access denied. Please allow camera permissions.');
      } else {
        setError(msg);
      }
    }
  }, [startStream]);

  const selectLens = useCallback(async (type: LensType) => {
    setSelectedLens(type);

    // Find a device that matches the requested lens type
    const match = devices.find((d) => d.lensType === type);
    if (match) {
      try {
        await startStream(match.deviceId);
      } catch {
        // If switching fails, stay on current stream
      }
    }
  }, [devices, startStream]);

  const capturePhoto = useCallback(async (): Promise<CapturedPhoto | null> => {
    const video = videoRef.current;
    if (!video || !streamRef.current) return null;

    const { videoWidth, videoHeight } = video;
    if (videoWidth === 0 || videoHeight === 0) return null;

    // Scale down if needed
    let targetW = videoWidth;
    let targetH = videoHeight;
    if (targetW > MAX_CAPTURE_DIMENSION || targetH > MAX_CAPTURE_DIMENSION) {
      if (targetW > targetH) {
        targetH = Math.round((targetH / targetW) * MAX_CAPTURE_DIMENSION);
        targetW = MAX_CAPTURE_DIMENSION;
      } else {
        targetW = Math.round((targetW / targetH) * MAX_CAPTURE_DIMENSION);
        targetH = MAX_CAPTURE_DIMENSION;
      }
    }

    const canvas = new OffscreenCanvas(targetW, targetH);
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, targetW, targetH);
    const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: JPEG_QUALITY });

    const focalLength35mm = getFocalLength(selectedLens);

    return {
      blob,
      preview: URL.createObjectURL(blob),
      source: 'camera',
      lensType: selectedLens,
      focalLength35mm,
      resolution: { width: targetW, height: targetH },
    };
  }, [selectedLens]);

  return {
    devices,
    selectedLens,
    stream,
    isActive,
    error,
    videoRef,
    initCamera,
    selectLens,
    capturePhoto,
    stopCamera,
  };
}
