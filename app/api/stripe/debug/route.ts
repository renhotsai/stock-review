import { NextResponse } from 'next/server';
import { auth } from '@/auth';

// Diagnostic endpoint — returns step-by-step status to identify where hang occurs
// GET /api/stripe/debug
export async function GET() {
  const results: Record<string, unknown> = {};

  // Step 1: env vars
  results.env = {
    DATABASE_URL: !!process.env.DATABASE_URL,
    STRIPE_SECRET_KEY: !!process.env.STRIPE_SECRET_KEY,
    STRIPE_SUBSCRIPTION_PRICE_ID: !!process.env.STRIPE_SUBSCRIPTION_PRICE_ID,
    STRIPE_DONATION_PRICE_ID: !!process.env.STRIPE_DONATION_PRICE_ID,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? '(not set)',
  };

  // Step 2: auth
  try {
    const session = await auth();
    results.auth = { ok: true, loggedIn: !!session?.user?.id, userId: session?.user?.id ?? null };
  } catch (e) {
    results.auth = { ok: false, error: String(e) };
    return NextResponse.json(results);
  }

  // Step 3: DB
  try {
    const { sql } = await import('@/lib/db');
    const rows = await Promise.race([
      sql`SELECT 1 AS ok`,
      new Promise((_, reject) => setTimeout(() => reject(new Error('DB timeout after 5s')), 5000)),
    ]);
    results.db = { ok: true, rows };
  } catch (e) {
    results.db = { ok: false, error: String(e) };
    return NextResponse.json(results);
  }

  // Step 4: Stripe
  try {
    const { getStripe } = await import('@/lib/stripe');
    const stripe = getStripe();
    results.stripe_init = { ok: true };

    // Quick Stripe API test — list 1 product (read-only, doesn't create anything)
    await Promise.race([
      stripe.products.list({ limit: 1 }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Stripe API timeout after 5s')), 5000)),
    ]);
    results.stripe_api = { ok: true };
  } catch (e) {
    results.stripe_api = { ok: false, error: String(e) };
  }

  return NextResponse.json(results);
}
