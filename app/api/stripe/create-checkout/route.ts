import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { stripe } from '@/lib/stripe';
import { sql } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const { type } = await request.json() as { type: 'subscription' | 'donation' };

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

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

    if (type === 'subscription') {
      const checkoutSession = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        currency: 'cad',
        line_items: [
          {
            price: process.env.STRIPE_SUBSCRIPTION_PRICE_ID!,
            quantity: 1,
          },
        ],
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
        line_items: [
          {
            price: process.env.STRIPE_DONATION_PRICE_ID!,
            quantity: 1,
          },
        ],
        success_url: `${appUrl}/?donated=1`,
        cancel_url: `${appUrl}/pricing`,
        metadata: { userId: String(userId) },
      });
      return NextResponse.json({ url: checkoutSession.url });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error) {
    console.error('POST /api/stripe/create-checkout error:', error);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
