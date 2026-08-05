/**
 * The email a quote goes out in — the first send, and every follow-up after
 * it (item 43). Plain, unhurried, states what's known. Inline styles and
 * literal hex only: an inbox never loads the app's stylesheet, so `oklch()`
 * and CSS custom properties have nothing to resolve against here — the same
 * reasoning `lib/invoice/email-templates.ts` documents for the invoice side.
 *
 * One template rather than two, same doctrine as that file: a follow-up is
 * not a different document, it is the same quote with a different opening
 * sentence. Two copies of this HTML would be two chances for the button, the
 * link fallback, or the styling to drift apart the day only one gets edited.
 * This used to live inline in `send-actions.ts` as `quoteEmailHtml`/
 * `quoteEmailText`, private to `sendQuoteEmailAction` alone — pulled out here
 * so `app/api/cron/quote-reminders/route.ts` can share it rather than
 * growing its own copy.
 */
export type QuoteEmailFields = {
  clientName: string;
  url: string;
  /** The one sentence that differs between a first send and a follow-up. */
  intro: string;
};

export function quoteEmailHtml({ clientName, url, intro }: QuoteEmailFields): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:32px 16px;background:#f4f4f5;font-family:ui-sans-serif,system-ui,sans-serif;">
    <table role="presentation" width="100%" style="max-width:480px;margin:0 auto;">
      <tr>
        <td style="background:#ffffff;border-radius:16px;padding:32px;">
          <p style="margin:0 0 16px;font-size:15px;line-height:1.5;color:#111827;">
            Hi ${escapeHtml(clientName)},
          </p>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.5;color:#111827;">
            ${escapeHtml(intro)} Tap below to have a look — no account or sign-up needed.
          </p>
          <a href="${url}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:12px;">
            View your quote
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

export function quoteEmailText({ clientName, url, intro }: QuoteEmailFields): string {
  return `Hi ${clientName},\n\n${intro}\n${url}\n\nNo account or sign-up needed.`;
}

/** The first send's own opening line — unchanged from before this file was shared. */
export function firstSendIntro({ companyName }: { companyName: string }): string {
  return `${companyName} has a quote ready for you.`;
}

/**
 * A follow-up's opening line — leads with how long it's been, not with a
 * repeat of the price. Item 42's `reminderIntro` on the invoice side leads
 * with lateness because an invoice has a due date to be late against; a
 * quote has no such deadline, so this leads with elapsed time instead, the
 * honest equivalent for something that's simply gone quiet.
 */
export function followUpIntro({
  companyName,
  daysSinceSent,
}: {
  companyName: string;
  daysSinceSent: number;
}): string {
  const since = daysSinceSent <= 1 ? "yesterday" : `${daysSinceSent} days ago`;
  return `Just checking in — ${companyName} sent you a quote ${since}, and we haven't heard back yet.`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
