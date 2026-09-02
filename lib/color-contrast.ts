/**
 * OKLCH -> relative luminance -> WCAG contrast ratio. Small and pure on
 * purpose — this exists so `tests/design-tokens.test.ts` can verify the
 * Precision Workshop palette's documented pairs stay above their AA
 * threshold as real math, not eyeballed OKLCH values, without pulling in a
 * color library for one function's worth of need. Not imported by any
 * component; app/globals.css remains the actual source of truth for what
 * ships. If a value here and globals.css ever disagree, globals.css wins —
 * update this file to match, not the other way around.
 */

export type Oklch = { l: number; c: number; h: number };

function oklchToOklab({ l, c, h }: Oklch): [number, number, number] {
  const hRad = (h * Math.PI) / 180;
  return [l / 100, c * Math.cos(hRad), c * Math.sin(hRad)];
}

function oklabToLinearSrgb(L: number, a: number, b: number): [number, number, number] {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

function relativeLuminance(linearRgb: [number, number, number]): number {
  const clamp = (x: number) => Math.min(1, Math.max(0, x));
  const [r, g, b] = linearRgb.map(clamp);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG relative luminance of an OKLCH color, 0 (black) to 1 (white). */
export function luminance(color: Oklch): number {
  const [L, a, b] = oklchToOklab(color);
  return relativeLuminance(oklabToLinearSrgb(L, a, b));
}

/** WCAG contrast ratio between two OKLCH colors, 1:1 (identical) to 21:1 (black/white). */
export function contrastRatio(a: Oklch, b: Oklch): number {
  const l1 = luminance(a);
  const l2 = luminance(b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}
