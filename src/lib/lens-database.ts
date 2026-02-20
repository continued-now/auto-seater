/**
 * Known focal lengths for common smartphone camera lenses.
 * Used when capturing in-app — we know the lens type from user selection,
 * so we can derive the 35mm equivalent focal length without EXIF.
 */

export type LensType = 'ultrawide' | 'regular';

/** 35mm equivalent focal lengths by lens type */
const LENS_FOCAL_LENGTHS: Record<LensType, number> = {
  ultrawide: 13,  // ~13mm equiv, ~120° FOV
  regular: 24,    // ~24mm equiv, ~78° FOV
} as const;

/** Get the 35mm equivalent focal length for a given lens type */
export function getFocalLength(lensType: LensType): number {
  return LENS_FOCAL_LENGTHS[lensType];
}

/** Calculate horizontal field of view (degrees) from 35mm equivalent focal length */
export function getFieldOfView(focalLength35mm: number): number {
  // 36mm is the width of a full-frame (35mm) sensor
  return 2 * Math.atan(36 / (2 * focalLength35mm)) * (180 / Math.PI);
}

/** Derive lens type from a 35mm equivalent focal length */
export function deriveLensType(focalLength35mm: number): LensType {
  return focalLength35mm < 18 ? 'ultrawide' : 'regular';
}
