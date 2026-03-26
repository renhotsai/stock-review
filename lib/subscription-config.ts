export const FREE_STOCK_LIMIT = 3;
export const PRO_STOCK_LIMIT = 10;

export function getStockLimit(subscriptionStatus: string | null | undefined): number {
  // canceling status retains Pro limit until the billing period ends
  return (subscriptionStatus === 'active' || subscriptionStatus === 'canceling')
    ? PRO_STOCK_LIMIT
    : FREE_STOCK_LIMIT;
}
