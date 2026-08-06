/**
 * The deterministic half of item 50's scope-of-work drafting, split out for
 * the same reason `capture-response.ts` is: testable without `@prisma/client`
 * or a network call in the loop.
 */
import { parseJsonObject } from "./json-response.ts";

export type ScopeDraft = { introTitle: string; introBody: string };

export function parseScopeDraft(rawText: string): ScopeDraft {
  const raw = parseJsonObject(rawText);
  if (!raw) throw new Error("Couldn't read the assistant's response.");
  return {
    introTitle: typeof raw.introTitle === "string" ? raw.introTitle.trim() : "",
    introBody: typeof raw.introBody === "string" ? raw.introBody.trim() : "",
  };
}
