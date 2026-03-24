import Stripe from 'stripe';
export { FREE_STOCK_LIMIT, PRO_STOCK_LIMIT, getStockLimit } from './subscription-config';

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set');
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-03-31.basil' as Stripe.LatestApiVersion,
    });
  }
  return _stripe;
}

// Convenience proxy so existing code using `stripe.xxx` continues to work
export const stripe: Stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    const client = getStripe();
    const val = (client as unknown as Record<string | symbol, unknown>)[prop];
    if (typeof val === 'function') return (val as Function).bind(client);
    return val;
  },
});
