/**
 * The deterministic half of item 50's scope-of-work drafting, split out for
 * the same reason `capture-response.ts` is: testable without `@prisma/client`
 * or a network call in the loop.
 */
export type ScopeDraft = { introTitle: string; introBody: string };

export function parseScopeDraft(rawText: string): ScopeDraft {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText.trim());
  } catch {
    throw new Error("Couldn't read the assistant's response.");
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Couldn't read the assistant's response.");
  }
  const raw = parsed as Record<string, unknown>;
  return {
    introTitle: typeof raw.introTitle === "string" ? raw.introTitle.trim() : "",
    introBody: typeof raw.introBody === "string" ? raw.introBody.trim() : "",
  };
}
