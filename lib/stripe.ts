import Stripe from 'stripe';
export { FREE_STOCK_LIMIT, PRO_STOCK_LIMIT, getStockLimit } from './subscription-config';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-03-31.basil' as Stripe.LatestApiVersion,
});
