import { Resend } from 'resend';

function getResend() {
  return new Resend(process.env.RESEND_API_KEY ?? 'placeholder');
}

export type AlertPayload = {
  symbol: string;
  name: string | null;
  currentPrice: number;
  entryPrice: number;
  reviewPrice: number | null;
  type: string | null;
};

export async function sendPriceAlert(payload: AlertPayload) {
  const { symbol, name, currentPrice, entryPrice, reviewPrice, type } = payload;
  const to = process.env.NOTIFICATION_EMAIL;

  if (!to) throw new Error('NOTIFICATION_EMAIL is not set');

  const discount = (((entryPrice - currentPrice) / entryPrice) * 100).toFixed(1);
  const displayName = name ? `${name} (${symbol})` : symbol;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #16a34a;">📉 ${displayName} 已達合理買入價</h2>
      <table style="width:100%; border-collapse:collapse; margin-top:16px;">
        <tr style="background:#f0fdf4;">
          <td style="padding:8px 12px; font-weight:bold;">現在股價</td>
          <td style="padding:8px 12px; color:#16a34a; font-size:1.2em; font-weight:bold;">$${currentPrice.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px; font-weight:bold;">合理買入價 (Entry)</td>
          <td style="padding:8px 12px;">$${entryPrice.toFixed(2)}</td>
        </tr>
        ${reviewPrice ? `
        <tr style="background:#f9fafb;">
          <td style="padding:8px 12px; font-weight:bold;">重新估值 (Review)</td>
          <td style="padding:8px 12px;">$${reviewPrice.toFixed(2)}</td>
        </tr>` : ''}
        ${type ? `
        <tr>
          <td style="padding:8px 12px; font-weight:bold;">股票類型</td>
          <td style="padding:8px 12px;">${type}</td>
        </tr>` : ''}
        <tr style="background:#fef9c3;">
          <td style="padding:8px 12px; font-weight:bold;">低於合理價</td>
          <td style="padding:8px 12px; color:#ca8a04; font-weight:bold;">${discount}%</td>
        </tr>
      </table>
      <p style="color:#6b7280; font-size:0.85em; margin-top:24px;">
        此通知由 Stock Review 系統自動發送。股價資訊可能有延遲，請自行確認後再做投資決定。
      </p>
    </div>
  `;

  const resend = getResend();
  return resend.emails.send({
    from: 'Stock Review <onboarding@resend.dev>',
    to,
    subject: `📉 ${symbol} 已達合理買入價 $${currentPrice.toFixed(2)}`,
    html,
  });
}
