/**
 * The email an invoice goes out in — the first send, and every overdue
 * reminder after it. Plain, unhurried, states what's known. Inline styles and
 * literal hex only: an inbox never loads the app's stylesheet, so `oklch()`
 * and CSS custom properties have nothing to resolve against here, the same
 * reasoning `quoteEmailHtml` documents.
 *
 * One template rather than two, because a reminder is not a different
 * document — it is the same invoice with a different opening sentence. Two
 * copies of this HTML would be two chances for the button, the link fallback
 * or the styling to drift apart the day only one of them gets edited.
 */
export type InvoiceEmailFields = {
  clientName: string;
  url: string;
  /** The one sentence that differs between a first send and a reminder. */
  intro: string;
};

export function invoiceEmailHtml({ clientName, url, intro }: InvoiceEmailFields): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:32px 16px;background:#f4f4f5;font-family:ui-sans-serif,system-ui,sans-serif;">
    <table role="presentation" width="100%" style="max-width:480px;margin:0 auto;">
      <tr>
        <td style="background:#ffffff;border-radius:16px;padding:32px;">
          <p style="margin:0 0 16px;font-size:15px;line-height:1.5;color:#111827;">
            Hi ${escapeHtml(clientName)},
          </p>
          <p style="margin:0 0 8px;font-size:15px;line-height:1.5;color:#111827;">
            ${escapeHtml(intro)}
          </p>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.5;color:#111827;">
            You can see the full breakdown below — no account or sign-up needed.
          </p>
          <a href="${url}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:12px;">
            View your invoice
          </a>
          <p style="margin:24px 0 0;font-size:13px;line-height:1.5;color:#6b7280;">
            Or paste this link into your browser: ${url}
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function invoiceEmailText({ clientName, url, intro }: InvoiceEmailFields): string {
  return `Hi ${clientName},\n\n${intro}\n${url}\n\nNo account or sign-up needed.`;
}

/** The first send's own opening line — unchanged from before this file was shared. */
export function firstSendIntro({
  companyName,
  balance,
  due,
}: {
  companyName: string;
  balance: string;
  due: string | null;
}): string {
  return `Here's your invoice from ${companyName} for ${balance}${due ? `, due ${due}` : ""}.`;
}

/** A reminder's opening line — leads with how late it is, not with the amount. */
export function reminderIntro({
  companyName,
  balance,
  overdueDays,
}: {
  companyName: string;
  balance: string;
  overdueDays: number;
}): string {
  const late = overdueDays === 1 ? "1 day" : `${overdueDays} days`;
  return `This invoice from ${companyName} is ${late} past due — ${balance} is still owing.`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
