import exifr from 'exifr';
import type { ExifData } from '@/types/photo-to-room';
import { deriveLensType } from '@/lib/lens-database';

export async function extractExif(file: File): Promise<ExifData> {
  try {
    const data = await exifr.parse(file, {
      pick: [
        'FocalLength',
        'FocalLengthIn35mmFormat',
        'Model',
        'ImageWidth',
        'ImageHeight',
        'ExifImageWidth',
        'ExifImageHeight',
      ],
    });

    if (!data) {
      return { focalLength: null, focalLength35mm: null, cameraModel: null, imageWidth: null, imageHeight: null, lensType: null };
    }

    const focalLength: number | null = data.FocalLength ?? null;
    const focalLength35mm: number | null = data.FocalLengthIn35mmFormat ?? null;
    const lensType = focalLength35mm != null ? deriveLensType(focalLength35mm) : null;

    return {
      focalLength,
      focalLength35mm,
      cameraModel: data.Model ?? null,
      imageWidth: data.ExifImageWidth ?? data.ImageWidth ?? null,
      imageHeight: data.ExifImageHeight ?? data.ImageHeight ?? null,
      lensType,
    };
  } catch {
    return { focalLength: null, focalLength35mm: null, cameraModel: null, imageWidth: null, imageHeight: null, lensType: null };
  }
}

/** Check whether a file has usable camera metadata (focal length) */
export async function hasValidCameraMetadata(file: File): Promise<boolean> {
  const exif = await extractExif(file);
  return exif.focalLength != null || exif.focalLength35mm != null;
}
