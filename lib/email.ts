/**
 * Sending an email, when there is a way to.
 *
 * The same shape as `lib/storage.ts`'s driver split: one thing this app might
 * not have configured, one function that tells the truth about that instead
 * of pretending. Without `RESEND_API_KEY` there is no driver at all — `send`
 * throws, and every caller is expected to check `isEmailConfigured()` first
 * and not offer the button rather than catch the throw. A quote panel that
 * shows "Email it to them" and then fails is worse than one that never showed
 * it — see `components/dashboard/quote-share-panel.tsx`.
 *
 * The SDK is imported lazily, inside `send()`, so a deploy with no Resend key
 * never pulls it into the bundle — the same reason `lib/storage.ts` only
 * imports `@aws-sdk/client-s3` when `STORAGE_DRIVER=s3` is actually chosen.
 */

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendEmail(message: EmailMessage): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("Email is not configured — set RESEND_API_KEY to send one.");
  }

  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);
  const from = process.env.RESEND_FROM_EMAIL || "quotes@example.com";

  const { error } = await resend.emails.send({
    from,
    to: message.to,
    subject: message.subject,
    html: message.html,
    text: message.text,
  });

  if (error) {
    throw new Error(error.message || "Resend rejected the email.");
  }
}
