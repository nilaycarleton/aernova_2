import { ImageResponse } from "next/og";

/**
 * Shared by app/opengraph-image.tsx and app/twitter-image.tsx via re-export —
 * one flat, on-brand share card (DESIGN.md's Ink Navy / Instrument Cyan,
 * no shadow, no gradient) instead of two copies that drift apart.
 */
export const alt = "Aernova — jobs, quotes and clients for trades contractors";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const GROUND = "#01051a";
const CYAN = "#00d3f2";
const INK_SECONDARY = "#c7d0e6";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background: GROUND,
          padding: "0 96px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 128,
              height: 128,
              borderRadius: 24,
              background: "rgba(216, 227, 255, 0.07)",
              border: "1px solid rgba(216, 227, 255, 0.14)",
              fontSize: 76,
              fontWeight: 700,
              color: CYAN,
            }}
          >
            A
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 96,
              fontWeight: 600,
              color: "#ffffff",
              letterSpacing: "-0.02em",
            }}
          >
            Aernova
          </div>
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 40,
            fontSize: 34,
            color: INK_SECONDARY,
          }}
        >
          Jobs, quotes and clients for trades contractors
        </div>
      </div>
    ),
    { ...size }
  );
}
