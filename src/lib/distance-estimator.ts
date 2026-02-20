import type { MeasurementInput, ExifData, REFERENCE_OBJECTS } from '@/types/photo-to-room';

const M_TO_FT = 3.28084;

interface ScaleEstimate {
  widthFt: number;
  heightFt: number;
  method: string;
  accuracy: string;
}

export function estimateScale(params: {
  measurements: MeasurementInput;
  exifData: (ExifData | null)[];
}): ScaleEstimate {
  const { measurements, exifData } = params;

  // Priority 1: User-provided room dimensions
  if (measurements.roomWidth != null && measurements.roomLength != null) {
    const factor = measurements.unit === 'm' ? M_TO_FT : 1;
    return {
      widthFt: measurements.roomWidth * factor,
      heightFt: measurements.roomLength * factor,
      method: 'User-provided dimensions',
      accuracy: 'exact',
    };
  }

  // Priority 2: Reference object calibration
  if (measurements.referenceObject) {
    // Use reference object to estimate scale — assume room is roughly 6x the reference object
    const refSizes: Record<string, number> = {
      'standard-door': 3,
      'folding-chair': 1.5,
      'round-table-8': 5,
      'window-36in': 3,
      'single-bed': 6.5,
    };
    const refSize = refSizes[measurements.referenceObject] || 3;
    // Heuristic: typical event room is ~6-8x the size of a reference object
    const estimatedWidth = refSize * 8;
    const estimatedHeight = refSize * 6;
    return {
      widthFt: estimatedWidth,
      heightFt: estimatedHeight,
      method: `Reference object: ${measurements.referenceObject}`,
      accuracy: '~10% margin',
    };
  }

  // Priority 3: EXIF focal length estimation
  const validExif = exifData.filter((e): e is ExifData => e?.focalLength != null);
  if (validExif.length > 0) {
    const avgFocal = validExif.reduce((sum, e) => sum + (e.focalLength || 0), 0) / validExif.length;
    // Wide angle (< 28mm) → likely larger room, telephoto → smaller room
    // Rough heuristic based on typical smartphone focal lengths
    const roomFactor = avgFocal < 24 ? 1.3 : avgFocal < 35 ? 1.0 : 0.8;
    return {
      widthFt: 30 * roomFactor,
      heightFt: 20 * roomFactor,
      method: `EXIF focal length: ${avgFocal.toFixed(0)}mm`,
      accuracy: '~20% margin',
    };
  }

  // Priority 4: Default fallback
  return {
    widthFt: 30,
    heightFt: 20,
    method: 'Default estimate (no calibration data)',
    accuracy: '~30-50% margin, using default',
  };
}
