import exifr from 'exifr';
import type { ExifData } from '@/types/photo-to-room';

export async function extractExif(file: File): Promise<ExifData> {
  try {
    const data = await exifr.parse(file, {
      pick: ['FocalLength', 'Model', 'ImageWidth', 'ImageHeight', 'ExifImageWidth', 'ExifImageHeight'],
    });

    if (!data) {
      return { focalLength: null, cameraModel: null, imageWidth: null, imageHeight: null };
    }

    return {
      focalLength: data.FocalLength ?? null,
      cameraModel: data.Model ?? null,
      imageWidth: data.ExifImageWidth ?? data.ImageWidth ?? null,
      imageHeight: data.ExifImageHeight ?? data.ImageHeight ?? null,
    };
  } catch {
    return { focalLength: null, cameraModel: null, imageWidth: null, imageHeight: null };
  }
}
