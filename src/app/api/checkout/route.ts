import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function POST(request: Request) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
  }

  const stripe = new Stripe(stripeKey);

  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL
    || (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : null);
  if (!origin) {
    return NextResponse.json({ error: 'App URL not configured' }, { status: 500 });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: body.email || undefined,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'AutoSeater Pro',
              description: 'Unlimited guests, multi-room layouts, AI features, premium exports',
            },
            unit_amount: 1499, // $14.99
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}?purchase_success={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}?purchase_cancelled=true`,
      metadata: {
        product: 'autoseater-pro',
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Checkout failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
