export const FREE_STOCK_LIMIT = 3;
export const PRO_STOCK_LIMIT = 10;

export function getStockLimit(subscriptionStatus: string | null | undefined): number {
  return subscriptionStatus === 'active' ? PRO_STOCK_LIMIT : FREE_STOCK_LIMIT;
}
