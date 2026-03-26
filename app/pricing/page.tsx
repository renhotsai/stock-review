import { auth } from '@/auth';
import { sql, setupDatabase } from '@/lib/db';
import PricingView from '@/components/PricingView';

export const revalidate = 0;

export default async function PricingPage() {
  const session = await auth();
  let subscriptionStatus = 'free';
  let hasCustomer = false;
  let periodEnd: string | null = null;

  if (session?.user?.id) {
    const userId = Number(session.user.id);
    try {
      const [user] = await sql`
        SELECT subscription_status, stripe_customer_id, subscription_period_end
        FROM users WHERE id = ${userId}
      `;
      subscriptionStatus = (user?.subscription_status as string) ?? 'free';
      hasCustomer = !!user?.stripe_customer_id;
      periodEnd = (user?.subscription_period_end as string) ?? null;
    } catch {
      // Columns may not exist yet — run migrations and retry
      try {
        await setupDatabase();
        const [user] = await sql`
          SELECT subscription_status, stripe_customer_id, subscription_period_end
          FROM users WHERE id = ${userId}
        `;
        subscriptionStatus = (user?.subscription_status as string) ?? 'free';
        hasCustomer = !!user?.stripe_customer_id;
        periodEnd = (user?.subscription_period_end as string) ?? null;
      } catch (err) {
        console.error('Pricing page DB error:', err);
        // Fall back to free tier defaults
      }
    }
  }

  return (
    <PricingView
      subscriptionStatus={subscriptionStatus}
      hasCustomer={hasCustomer}
      isLoggedIn={!!session?.user?.id}
      periodEnd={periodEnd}
    />
  );
}
