import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { buildPhotoToRoomPrompt } from '@/lib/ai-prompt-builder';
import { parseAIRoomResponse } from '@/lib/ai-room-parser';
import type { ExifData, MeasurementInput } from '@/types/photo-to-room';

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

  if (photos.length === 0 || photos.length > 6) {
    return NextResponse.json({ error: 'Please provide 1-6 photos' }, { status: 400 });
  }

  // Extract metadata
  let metadata: { cornerLabels: string[]; measurements: MeasurementInput; exifData: (ExifData | null)[] };
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
  for (const photo of photos) {
    const buffer = await photo.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    imageBlocks.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: 'image/jpeg',
        data: base64,
      },
    });
  }

  // Build prompt
  const { system, user } = buildPhotoToRoomPrompt({
    photoCount: photos.length,
    cornerLabels: metadata.cornerLabels,
    measurements: metadata.measurements,
    exifData: metadata.exifData,
  });

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
