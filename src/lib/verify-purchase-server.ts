import Stripe from 'stripe';

// Single server-side in-memory cache for verified purchase tokens
const verifiedTokens = new Map<string, { verified: boolean; email: string }>();

export async function verifyPurchaseToken(token: string | null): Promise<boolean> {
  if (!token) return false;

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return false;

  // Check cache - only trust positive results
  const cached = verifiedTokens.get(token);
  if (cached?.verified) return true;

  const stripe = new Stripe(stripeKey);
  try {
    const session = await stripe.checkout.sessions.retrieve(token);
    const verified = session.payment_status === 'paid' && session.metadata?.product === 'autoseater-pro';
    if (verified) {
      verifiedTokens.set(token, { verified: true, email: session.customer_email || '' });
    }
    return verified;
  } catch {
    // Don't cache transient errors - allow retry on next request
    return false;
  }
}

export async function verifyPurchaseWithEmail(token: string): Promise<{ verified: boolean; email: string }> {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return { verified: false, email: '' };

  // Check cache
  const cached = verifiedTokens.get(token);
  if (cached?.verified) return cached;

  const stripe = new Stripe(stripeKey);
  try {
    const session = await stripe.checkout.sessions.retrieve(token);
    const verified = session.payment_status === 'paid' && session.metadata?.product === 'autoseater-pro';
    const result = { verified, email: session.customer_email || '' };
    if (verified) {
      verifiedTokens.set(token, result);
    }
    return result;
  } catch {
    return { verified: false, email: '' };
  }
}
