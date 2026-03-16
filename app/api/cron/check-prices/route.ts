import { NextResponse } from 'next/server';
import { sql, Stock } from '@/lib/db';
import { getStockPrices, isMarketOpen } from '@/lib/yahoo-finance';
import { sendPriceAlert } from '@/lib/resend';

export const maxDuration = 60;

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only run during market hours (skip for manual triggers without ?force=1)
  const url = new URL(request.url);
  const force = url.searchParams.get('force') === '1';

  if (!force && !isMarketOpen()) {
    return NextResponse.json({ message: 'Market is closed, skipping check' });
  }

  try {
    const stocks = (await sql`SELECT * FROM stocks WHERE entry_price IS NOT NULL`) as Stock[];

    if (stocks.length === 0) {
      return NextResponse.json({ message: 'No stocks to check' });
    }

    const symbols = stocks.map((s) => s.symbol);
    const prices = await getStockPrices(symbols);

    const alerts: string[] = [];
    const skipped: string[] = [];
    const errors: string[] = [];

    for (const priceResult of prices) {
      const stock = stocks.find((s) => s.symbol === priceResult.symbol);
      if (!stock || !stock.entry_price) continue;

      if (priceResult.price === null) {
        errors.push(priceResult.symbol);
        continue;
      }

      // Check if current price is at or below entry price
      if (priceResult.price <= stock.entry_price) {
        // Check if we already sent a notification today for this symbol
        const [existing] = await sql`
          SELECT id FROM notifications
          WHERE symbol = ${stock.symbol}
            AND sent_at >= NOW() - INTERVAL '24 hours'
          LIMIT 1
        `;

        if (existing) {
          skipped.push(stock.symbol);
          continue;
        }

        // Send email notification
        await sendPriceAlert({
          symbol: stock.symbol,
          name: priceResult.name ?? stock.name,
          currentPrice: priceResult.price,
          entryPrice: stock.entry_price,
          reviewPrice: stock.review_price,
          type: stock.type,
        });

        // Log the notification
        await sql`
          INSERT INTO notifications (symbol, current_price, entry_price)
          VALUES (${stock.symbol}, ${priceResult.price}, ${stock.entry_price})
        `;

        alerts.push(stock.symbol);
      }
    }

    return NextResponse.json({
      checked: symbols.length,
      alerts,
      skipped,
      errors,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Cron check-prices error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
