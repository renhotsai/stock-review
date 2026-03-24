import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { stripe } from '@/lib/stripe';
import { sql } from '@/lib/db';

function getAppUrl(request: Request): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  // Auto-detect from request headers (works on Vercel)
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? 'localhost:3000';
  const proto = request.headers.get('x-forwarded-proto') ?? 'https';
  return `${proto}://${host}`;
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const { type } = await request.json() as { type: 'subscription' | 'donation' };

    if (type === 'subscription' && !process.env.STRIPE_SUBSCRIPTION_PRICE_ID) {
      return NextResponse.json({ error: 'Subscription not configured (STRIPE_SUBSCRIPTION_PRICE_ID missing)' }, { status: 503 });
    }
    if (type === 'donation' && !process.env.STRIPE_DONATION_PRICE_ID) {
      return NextResponse.json({ error: 'Donation not configured (STRIPE_DONATION_PRICE_ID missing)' }, { status: 503 });
    }

    // Get or create Stripe customer
    const [user] = await sql`SELECT email, stripe_customer_id FROM users WHERE id = ${userId}`;
    let customerId = user?.stripe_customer_id as string | null;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email as string,
        metadata: { userId: String(userId) },
      });
      customerId = customer.id;
      await sql`UPDATE users SET stripe_customer_id = ${customerId} WHERE id = ${userId}`;
    }

    const appUrl = getAppUrl(request);

    if (type === 'subscription') {
      const checkoutSession = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        currency: 'cad',
        line_items: [{ price: process.env.STRIPE_SUBSCRIPTION_PRICE_ID!, quantity: 1 }],
        success_url: `${appUrl}/?subscribed=1`,
        cancel_url: `${appUrl}/pricing`,
        metadata: { userId: String(userId) },
      });
      return NextResponse.json({ url: checkoutSession.url });
    }

    if (type === 'donation') {
      const checkoutSession = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'payment',
        currency: 'cad',
        line_items: [{ price: process.env.STRIPE_DONATION_PRICE_ID!, quantity: 1 }],
        success_url: `${appUrl}/?donated=1`,
        cancel_url: `${appUrl}/pricing`,
        metadata: { userId: String(userId) },
      });
      return NextResponse.json({ url: checkoutSession.url });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error) {
    console.error('POST /api/stripe/create-checkout error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create checkout session';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
