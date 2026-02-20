import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { buildPhotoToRoomPrompt, buildCapturePrompt } from '@/lib/ai-prompt-builder';
import { parseAIRoomResponse } from '@/lib/ai-room-parser';
import type { ExifData, MeasurementInput, CaptureMode, CapturedPhoto, ReferenceDimension } from '@/types/photo-to-room';

interface LegacyMetadata {
  cornerLabels: string[];
  measurements: MeasurementInput;
  exifData: (ExifData | null)[];
}

interface CaptureMetadata {
  captureMode: CaptureMode;
  referenceDimension: ReferenceDimension | null;
  roomPhotos: Array<{
    lensType: string | null;
    focalLength35mm: number | null;
    resolution: { width: number; height: number };
    source: string;
  }>;
  referencePhoto: {
    lensType: string | null;
    focalLength35mm: number | null;
    resolution: { width: number; height: number };
  } | null;
  unit: string;
}

function isCaptureMetadata(meta: unknown): meta is CaptureMetadata {
  return typeof meta === 'object' && meta !== null && 'captureMode' in meta;
}

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Server configuration error: missing API key' }, { status: 500 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid request: expected multipart/form-data' }, { status: 400 });
  }

  // Extract photos
  const photos: File[] = [];
  for (const [key, value] of formData.entries()) {
    if (key === 'photos' && value instanceof File) {
      photos.push(value);
    }
  }

  // Extract reference photo (camera capture flow)
  const referencePhotoFile = formData.get('referencePhoto');
  const hasReferencePhoto = referencePhotoFile instanceof File;

  if (photos.length === 0 || photos.length > 6) {
    return NextResponse.json({ error: 'Please provide 1-6 photos' }, { status: 400 });
  }

  // Extract metadata
  let metadata: LegacyMetadata | CaptureMetadata;
  try {
    const metadataRaw = formData.get('metadata');
    if (typeof metadataRaw !== 'string') {
      throw new Error('Missing metadata');
    }
    metadata = JSON.parse(metadataRaw);
  } catch {
    return NextResponse.json({ error: 'Invalid metadata JSON' }, { status: 400 });
  }

  // Convert photos to base64
  const imageBlocks: Anthropic.ImageBlockParam[] = [];

  // If reference mode, add reference photo first
  if (hasReferencePhoto) {
    const buffer = await (referencePhotoFile as File).arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    imageBlocks.push({
      type: 'image',
      source: { type: 'base64', media_type: 'image/jpeg', data: base64 },
    });
  }

  for (const photo of photos) {
    const buffer = await photo.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    imageBlocks.push({
      type: 'image',
      source: { type: 'base64', media_type: 'image/jpeg', data: base64 },
    });
  }

  // Build prompt based on metadata type
  let system: string;
  let user: string;

  if (isCaptureMetadata(metadata)) {
    // New camera-capture flow
    const roomPhotos: CapturedPhoto[] = metadata.roomPhotos.map((p) => ({
      blob: new Blob(), // not needed for prompt building
      preview: '',
      source: p.source as 'camera' | 'upload',
      lensType: p.lensType as 'ultrawide' | 'regular' | null,
      focalLength35mm: p.focalLength35mm,
      resolution: p.resolution,
    }));

    const referencePhoto: CapturedPhoto | null = metadata.referencePhoto
      ? {
          blob: new Blob(),
          preview: '',
          source: 'camera',
          lensType: metadata.referencePhoto.lensType as 'ultrawide' | 'regular' | null,
          focalLength35mm: metadata.referencePhoto.focalLength35mm,
          resolution: metadata.referencePhoto.resolution,
        }
      : null;

    const result = buildCapturePrompt({
      captureMode: metadata.captureMode,
      roomPhotos,
      referencePhoto,
      referenceDimension: metadata.referenceDimension,
      unit: metadata.unit,
    });
    system = result.system;
    user = result.user;
  } else {
    // Legacy upload flow
    const result = buildPhotoToRoomPrompt({
      photoCount: photos.length,
      cornerLabels: metadata.cornerLabels,
      measurements: metadata.measurements,
      exifData: metadata.exifData,
    });
    system = result.system;
    user = result.user;
  }

  const client = new Anthropic({ apiKey });

  // Try up to 2 times (initial + 1 retry on parse failure)
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const userContent: Anthropic.ContentBlockParam[] = [
        ...imageBlocks,
        {
          type: 'text',
          text: attempt === 0 ? user : `${user}\n\nIMPORTANT: Your previous response was not valid JSON. Please return ONLY a valid JSON object, no markdown fences or explanation.`,
        },
      ];

      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system,
        messages: [{ role: 'user', content: userContent }],
      });

      const textBlock = response.content.find((b) => b.type === 'text');
      if (!textBlock || textBlock.type !== 'text') {
        throw new Error('No text in AI response');
      }

      const room = parseAIRoomResponse(textBlock.text);
      return NextResponse.json({ room });
    } catch (err) {
      if (attempt === 1) {
        const message = err instanceof Error ? err.message : 'AI processing failed';
        return NextResponse.json({ error: message }, { status: 500 });
      }
      // First attempt failed, retry
    }
  }

  return NextResponse.json({ error: 'AI processing failed after retries' }, { status: 500 });
}
