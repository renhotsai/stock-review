import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { sql } from '@/lib/db';
import type Stripe from 'stripe';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const rawBody = await request.text();
  const sig = request.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // If cancel_at_period_end is set, the user has cancelled but still has access until period end
        const isCanceling = subscription.cancel_at_period_end === true;
        const status = isCanceling
          ? 'canceling'
          : (subscription.status === 'active' ? 'active' : subscription.status);

        // current_period_end field (present in webhook payload regardless of API version)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rawSub = subscription as any;
        const periodEndTs: number | undefined = rawSub.current_period_end ?? rawSub.billing_cycle_anchor;
        const periodEnd = periodEndTs ? new Date(periodEndTs * 1000).toISOString() : null;

        await sql`
          UPDATE users
          SET subscription_status = ${status},
              stripe_subscription_id = ${subscription.id},
              subscription_period_end = ${periodEnd}
          WHERE stripe_customer_id = ${customerId}
        `;
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        await sql`
          UPDATE users
          SET subscription_status = 'free',
              stripe_subscription_id = NULL,
              subscription_period_end = NULL
          WHERE stripe_customer_id = ${customerId}
        `;
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        await sql`
          UPDATE users SET subscription_status = 'past_due'
          WHERE stripe_customer_id = ${customerId}
        `;
        break;
      }

      case 'checkout.session.completed': {
        // Subscriptions are handled by customer.subscription.created event
        // Donations don't need DB updates
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
