import { GoogleGenAI } from "@google/genai";

// Lazily constructed so importing this module never throws when
// GEMINI_API_KEY is unset (e.g. during `next build`, or before the key is
// configured). The client is created on first real use; callers should guard
// with `isAiConfigured()` and surface a friendly error.
let client: GoogleGenAI | null = null;

export function isAiConfigured(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

export function getGemini(): GoogleGenAI {
  if (!client) client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
}

// Model routing per the AI cost plan — match model to task difficulty (the
// single biggest cost lever). Only `chat` is wired up today; the others are
// here so features 20-23 route consistently. Stable (non-preview) Gemini
// models only — this app is production, not a place to ride preview models.
//   chat/reasoning over the roof numbers -> Gemini 2.5 Flash (workhorse)
//   trivial rewrites ("make professional", "shorter") -> Gemini 2.5 Flash-Lite
//   insurance-grade scope where accuracy justifies the cost -> Gemini 2.5 Pro
export const AI_MODELS = {
  chat: "gemini-2.5-flash",
  edit: "gemini-2.5-flash-lite",
  insurance: "gemini-2.5-pro",
} as const;
