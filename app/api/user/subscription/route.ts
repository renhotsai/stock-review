import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { sql } from '@/lib/db';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const [user] = await sql`
      SELECT subscription_status, subscription_period_end, stripe_customer_id
      FROM users WHERE id = ${userId}
    `;

    return NextResponse.json({
      status: (user?.subscription_status ?? 'free') as string,
      periodEnd: user?.subscription_period_end ?? null,
      hasCustomer: !!user?.stripe_customer_id,
    });
  } catch (error) {
    console.error('GET /api/user/subscription error:', error);
    return NextResponse.json({ error: 'Failed to fetch subscription' }, { status: 500 });
  }
}
