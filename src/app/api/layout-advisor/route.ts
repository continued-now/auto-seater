import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { serializeLayout } from '@/lib/layout-serializer';
import { parseLayoutAdvisorResponse } from '@/lib/layout-suggestion-parser';
import type { LayoutAdvisorRequest } from '@/types/layout-advisor';

const MODE_PROMPTS = {
  'fresh-arrange': `Generate a completely new layout using these objects. Optimize for:
- Traffic flow: clear paths from entrances to tables, tables to bar/buffet/restrooms
- Sightlines: tables with view of stage/dance floor/head table
- Spacing: minimum 5ft between table edges for chair pull-out and walking
- Capacity distribution: even spread across the room, no dead corners
- Fixture placement: bars/buffets accessible from multiple directions, not blocking exits

Return your response as JSON:
{
  "suggestedLayout": {
    "changes": [
      { "objectId": "id", "objectType": "table"|"fixture", "reason": "why moved", "newPosition": { "x": ft, "y": ft }, "newRotation": degrees }
    ],
    "summary": "brief description of changes"
  }
}

Positions are in the room's unit system (shown above). Return ONLY valid JSON, no markdown fences.`,

  'bottleneck-analysis': `Analyze this layout for issues. Check for:
- Traffic bottlenecks: narrow passages between tables (<4ft), blocked exit paths, choke points
- Dead zones: large empty areas with no tables/fixtures (wasted space)
- Crowding hotspots: tables clustered too closely, insufficient spacing
- Sightline issues: tables with obstructed view of stage/head table
- Accessibility concerns: no wheelchair-width path (3ft minimum) through the room
- Flow inefficiencies: bar too far from tables, paths crossing dance floor

Return your response as JSON:
{
  "issues": [
    {
      "id": "unique-id",
      "severity": "critical"|"warning"|"info",
      "title": "short title",
      "description": "detailed explanation with measurements",
      "affectedObjectIds": ["id1", "id2"],
      "zone": { "x": ft, "y": ft, "width": ft, "height": ft }
    }
  ]
}

Zone positions are in the room's unit system. Return ONLY valid JSON, no markdown fences.`,

  'hybrid-optimize': `First analyze this layout for issues (bottlenecks, spacing problems, flow issues, accessibility).
Then generate a minimally-modified version that fixes the issues while preserving the general arrangement intent — keep things roughly where they are but shift enough to resolve problems.

Return your response as JSON:
{
  "issues": [
    {
      "id": "unique-id",
      "severity": "critical"|"warning"|"info",
      "title": "short title",
      "description": "detailed explanation",
      "affectedObjectIds": ["id1"],
      "zone": { "x": ft, "y": ft, "width": ft, "height": ft }
    }
  ],
  "suggestedLayout": {
    "changes": [
      { "objectId": "id", "objectType": "table"|"fixture", "reason": "why moved", "newPosition": { "x": ft, "y": ft }, "newRotation": degrees }
    ],
    "summary": "brief description of changes made"
  }
}

Positions are in the room's unit system. Return ONLY valid JSON, no markdown fences.`,
};

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Server configuration error: missing API key' }, { status: 500 });
  }

  let body: LayoutAdvisorRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.mode || !body.venueConfig) {
    return NextResponse.json({ error: 'Missing required fields: mode, venueConfig' }, { status: 400 });
  }

  if (!MODE_PROMPTS[body.mode]) {
    return NextResponse.json({ error: `Invalid mode: ${body.mode}` }, { status: 400 });
  }

  const layoutDescription = serializeLayout(body.venueConfig);

  const contextParts: string[] = [layoutDescription];

  if (body.guestCount != null) {
    contextParts.push(`\nGuest count: ${body.guestCount}`);
  }
  if (body.eventType) {
    contextParts.push(`Event type: ${body.eventType}`);
  }
  if (body.lockedFixtureIds.length > 0) {
    // Find locked fixture labels
    const lockedLabels = body.lockedFixtureIds
      .map((id) => {
        const fixture = body.venueConfig.fixtures.find((f) => f.id === id);
        const table = body.venueConfig.tables.find((t) => t.id === id);
        return fixture?.label || table?.label || id;
      })
      .join(', ');
    contextParts.push(`Locked (immovable): ${lockedLabels}`);
  }

  const userPrompt = `${contextParts.join('\n')}\n\n${MODE_PROMPTS[body.mode]}`;

  const client = new Anthropic({ apiKey });

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const prompt = attempt === 0
        ? userPrompt
        : `${userPrompt}\n\nIMPORTANT: Your previous response was not valid JSON. Return ONLY valid JSON.`;

      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: 'You are an expert event planner and spatial layout optimizer. Analyze room layouts and provide actionable suggestions. Always respond with valid JSON only.',
        messages: [{ role: 'user', content: prompt }],
      });

      const textBlock = response.content.find((b) => b.type === 'text');
      if (!textBlock || textBlock.type !== 'text') {
        throw new Error('No text in AI response');
      }

      const result = parseLayoutAdvisorResponse(textBlock.text, body.mode, body.venueConfig.unit);
      return NextResponse.json(result);
    } catch (err) {
      if (attempt === 1) {
        const message = err instanceof Error ? err.message : 'AI analysis failed';
        return NextResponse.json({ error: message }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ error: 'AI analysis failed after retries' }, { status: 500 });
}
