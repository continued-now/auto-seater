import { NextResponse } from 'next/server';
import { verifyPurchaseWithEmail } from '@/lib/verify-purchase-server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('session_id');

  if (!sessionId) {
    return NextResponse.json({ error: 'Missing session_id' }, { status: 400 });
  }

  const result = await verifyPurchaseWithEmail(sessionId);

  if (!result.verified && !process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
  }

  return NextResponse.json(result);
}
