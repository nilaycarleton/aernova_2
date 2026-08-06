/**
 * Shared parsing for the AI features that ask the model for raw JSON and
 * nothing else — capture and scope-draft both carry the identical
 * `system` instruction ("respond with only a JSON object, no prose, no
 * markdown fences"), and the model almost always complies. "Almost always"
 * isn't good enough to throw a contractor's draft away over: this strips
 * the one wrapping shape that occasionally slips through (a ```json fence)
 * before parsing, rather than failing a genuinely well-formed response on
 * cosmetic wrapping.
 */
export function parseJsonObject(rawText: string): Record<string, unknown> | null {
  const stripped = rawText
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripped);
  } catch {
    return null;
  }
  // `typeof [] === "object"` in JS, so the array case needs its own check —
  // without it, a malformed array response would silently fall through to
  // every field's default rather than failing loudly.
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return null;
  }
  return parsed as Record<string, unknown>;
}
