import type { ExifData, MeasurementInput, CaptureMode, CapturedPhoto, ReferenceDimension } from '@/types/photo-to-room';
import { getFieldOfView } from '@/lib/lens-database';

/** Legacy prompt builder — used for backwards-compatible upload flow */
export function buildPhotoToRoomPrompt(params: {
  photoCount: number;
  cornerLabels: string[];
  measurements: MeasurementInput;
  exifData: (ExifData | null)[];
}): { system: string; user: string } {
  const system = buildSystemPrompt(params.measurements.unit);

  const userParts: string[] = [];

  userParts.push(`I have ${params.photoCount} photo(s) of a room. Please analyze them and produce a floor plan.`);

  if (params.cornerLabels.length > 0) {
    userParts.push(`\nPhotos are taken from these positions: ${params.cornerLabels.join(', ')}.`);
  }

  if (params.measurements.roomWidth != null && params.measurements.roomLength != null) {
    userParts.push(`\nKnown room dimensions: ${params.measurements.roomWidth}${params.measurements.unit} wide x ${params.measurements.roomLength}${params.measurements.unit} long.`);
  } else if (params.measurements.roomWidth != null) {
    userParts.push(`\nKnown room width: ${params.measurements.roomWidth}${params.measurements.unit}.`);
  } else if (params.measurements.roomLength != null) {
    userParts.push(`\nKnown room length: ${params.measurements.roomLength}${params.measurements.unit}.`);
  }

  if (params.measurements.referenceObject) {
    userParts.push(`\nReference object visible in photos: ${params.measurements.referenceObject}. Use this to calibrate dimensions.`);
  }

  userParts.push(buildExifSection(params.exifData));

  return { system, user: userParts.join('') };
}

/** New prompt builder for camera-capture flow with lens metadata */
export function buildCapturePrompt(params: {
  captureMode: CaptureMode;
  roomPhotos: CapturedPhoto[];
  referencePhoto: CapturedPhoto | null;
  referenceDimension: ReferenceDimension | null;
  unit: string;
}): { system: string; user: string } {
  const system = buildSystemPrompt(params.unit);

  const userParts: string[] = [];

  userParts.push(`I have ${params.roomPhotos.length} photo(s) of a room captured with a smartphone camera. Please analyze them and produce a floor plan.`);

  // Include lens data for each photo
  const lensInfo = params.roomPhotos
    .map((p, i) => {
      const parts: string[] = [];
      if (p.lensType) parts.push(`lens: ${p.lensType}`);
      if (p.focalLength35mm) {
        const fov = getFieldOfView(p.focalLength35mm);
        parts.push(`${p.focalLength35mm}mm (35mm equiv), ~${fov.toFixed(0)}° horizontal FOV`);
      }
      parts.push(`resolution: ${p.resolution.width}x${p.resolution.height}`);
      return `Photo ${i + 1}: ${parts.join(', ')}`;
    });

  if (lensInfo.length > 0) {
    userParts.push(`\n\nCamera metadata:\n${lensInfo.join('\n')}`);
  }

  // Reference calibration (Flow A)
  if (params.captureMode === 'reference' && params.referenceDimension) {
    const refLabel = params.referenceDimension.type === 'custom'
      ? 'a measured object'
      : params.referenceDimension.type.replace(/-/g, ' ');
    userParts.push(`\n\nREFERENCE CALIBRATION: The first attached image is a photo of ${refLabel} that measures ${params.referenceDimension.value}${params.referenceDimension.unit}. Use this reference object to calibrate all dimensions in the room. This should give you ~85-90% accuracy on room dimensions.`);
  }

  // AI-only estimation (Flow B)
  if (params.captureMode === 'no-reference') {
    userParts.push(`\n\nNo reference object was provided. Use common objects visible in the photos (doors are ~2m/6.5ft tall, standard chairs ~45cm/18in seat height, standard interior doors are ~80cm/32in wide) to estimate scale. Combine this with the lens FOV data to estimate room dimensions.`);
  }

  // Tip for ultrawide
  const hasUltrawide = params.roomPhotos.some((p) => p.lensType === 'ultrawide');
  if (hasUltrawide) {
    userParts.push(`\n\nNote: Some photos were taken with an ultrawide lens (~120° FOV). These capture more of the room but have barrel distortion at edges — objects near edges may appear larger than they are.`);
  }

  return { system, user: userParts.join('') };
}

function buildSystemPrompt(unit: string): string {
  return `You are an expert architectural analyst. You analyze photos of rooms and produce structured floor plans as JSON.

Your output MUST be valid JSON matching this exact schema:
{
  "width": number,       // room width in ${unit}
  "height": number,      // room height/length in ${unit}
  "unit": "${unit}",
  "objects": [
    {
      "type": "table" | "fixture",
      "subType": string,  // For tables: "round" | "rectangular" | "square" | "head" | "sweetheart" | "cocktail"
                          // For fixtures: "stage" | "dance-floor" | "bar" | "buffet" | "dj-booth" | "photo-booth" | "entrance" | "exit" | "restroom" | "pillar" | "door" | "window" | "av-sound-room" | "kitchen" | "coat-check"
      "label": string,    // descriptive label like "Round Table 1" or "Main Bar"
      "position": { "x": number, "y": number },  // 0-1 fraction of room dimensions
      "width": number,    // real units (${unit})
      "height": number,
      "rotation": number, // degrees
      "confidence": number // 0-1, how confident you are in this detection
    }
  ],
  "walls": [
    {
      "start": { "x": number, "y": number },  // 0-1 fraction
      "end": { "x": number, "y": number },
      "style": "solid" | "partition",
      "confidence": number
    }
  ]
}

Rules:
- Positions are 0-1 fractions of room width (x) and height (y). Top-left is (0,0), bottom-right is (1,1).
- Include ALL visible furniture, fixtures, doors, windows, and structural elements.
- Estimate dimensions based on typical furniture sizes if no measurements provided.
- Assign confidence scores honestly: 0.9+ for clearly visible objects, 0.5-0.8 for partially visible, <0.5 for guessed.
- Return ONLY the JSON object, no markdown fences or explanation.`;
}

function buildExifSection(exifData: (ExifData | null)[]): string {
  const exifEntries = exifData.filter((e): e is ExifData => e != null);
  if (exifEntries.length === 0) return '';

  const exifInfo = exifEntries
    .map((e, i) => {
      const parts: string[] = [];
      if (e.focalLength) parts.push(`focal length: ${e.focalLength}mm`);
      if (e.focalLength35mm) {
        const fov = getFieldOfView(e.focalLength35mm);
        parts.push(`35mm equiv: ${e.focalLength35mm}mm (~${fov.toFixed(0)}° FOV)`);
      }
      if (e.lensType) parts.push(`lens: ${e.lensType}`);
      if (e.cameraModel) parts.push(`camera: ${e.cameraModel}`);
      if (e.imageWidth && e.imageHeight) parts.push(`resolution: ${e.imageWidth}x${e.imageHeight}`);
      return parts.length > 0 ? `Photo ${i + 1}: ${parts.join(', ')}` : null;
    })
    .filter(Boolean);

  if (exifInfo.length === 0) return '';
  return `\nCamera metadata:\n${exifInfo.join('\n')}`;
}
