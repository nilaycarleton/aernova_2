import Anthropic from "@anthropic-ai/sdk";

// Lazily constructed so importing this module never throws when
// ANTHROPIC_API_KEY is unset (e.g. during `next build`, or before the key is
// configured). The client is created on first real use; callers should guard
// with `isAiConfigured()` and surface a friendly error.
let client: Anthropic | null = null;

export function isAiConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

export function getAnthropic(): Anthropic {
  if (!client) client = new Anthropic(); // reads ANTHROPIC_API_KEY from env
  return client;
}

// Model routing per the AI cost plan — match model to task difficulty (the
// single biggest cost lever). Only `chat` is wired up today; the others are
// here so features 20-23 route consistently.
//   chat/reasoning over the roof numbers -> Sonnet 5 (workhorse)
//   trivial rewrites ("make professional", "shorter") -> Haiku 4.5
//   insurance-grade scope where accuracy justifies the cost -> Opus 4.8
export const AI_MODELS = {
  chat: "claude-sonnet-5",
  edit: "claude-haiku-4-5",
  insurance: "claude-opus-4-8",
} as const;
