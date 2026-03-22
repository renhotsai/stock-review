import { auth } from '@/auth';
import { sql } from '@/lib/db';
import PricingView from '@/components/PricingView';

export const revalidate = 0;

export default async function PricingPage() {
  const session = await auth();
  let subscriptionStatus = 'free';
  let hasCustomer = false;

  if (session?.user?.id) {
    const userId = Number(session.user.id);
    const [user] = await sql`
      SELECT subscription_status, stripe_customer_id
      FROM users WHERE id = ${userId}
    `;
    subscriptionStatus = (user?.subscription_status as string) ?? 'free';
    hasCustomer = !!user?.stripe_customer_id;
  }

  return (
    <PricingView
      subscriptionStatus={subscriptionStatus}
      hasCustomer={hasCustomer}
      isLoggedIn={!!session?.user?.id}
    />
  );
}
