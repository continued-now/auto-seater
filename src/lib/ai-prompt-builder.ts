import type { ExifData, MeasurementInput, REFERENCE_OBJECTS } from '@/types/photo-to-room';

export function buildPhotoToRoomPrompt(params: {
  photoCount: number;
  cornerLabels: string[];
  measurements: MeasurementInput;
  exifData: (ExifData | null)[];
}): { system: string; user: string } {
  const system = `You are an expert architectural analyst. You analyze photos of rooms and produce structured floor plans as JSON.

Your output MUST be valid JSON matching this exact schema:
{
  "width": number,       // room width in ${params.measurements.unit}
  "height": number,      // room height/length in ${params.measurements.unit}
  "unit": "${params.measurements.unit}",
  "objects": [
    {
      "type": "table" | "fixture",
      "subType": string,  // For tables: "round" | "rectangular" | "square" | "head" | "sweetheart" | "cocktail"
                          // For fixtures: "stage" | "dance-floor" | "bar" | "buffet" | "dj-booth" | "photo-booth" | "entrance" | "exit" | "restroom" | "pillar" | "door" | "window" | "av-sound-room" | "kitchen" | "coat-check"
      "label": string,    // descriptive label like "Round Table 1" or "Main Bar"
      "position": { "x": number, "y": number },  // 0-1 fraction of room dimensions
      "width": number,    // real units (${params.measurements.unit})
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

  const exifEntries = params.exifData.filter((e): e is ExifData => e != null);
  if (exifEntries.length > 0) {
    const exifInfo = exifEntries
      .map((e, i) => {
        const parts: string[] = [];
        if (e.focalLength) parts.push(`focal length: ${e.focalLength}mm`);
        if (e.cameraModel) parts.push(`camera: ${e.cameraModel}`);
        if (e.imageWidth && e.imageHeight) parts.push(`resolution: ${e.imageWidth}x${e.imageHeight}`);
        return parts.length > 0 ? `Photo ${i + 1}: ${parts.join(', ')}` : null;
      })
      .filter(Boolean);
    if (exifInfo.length > 0) {
      userParts.push(`\nCamera metadata:\n${exifInfo.join('\n')}`);
    }
  }

  return { system, user: userParts.join('') };
}
