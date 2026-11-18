import { ImageResponse } from "next/og";
import { BRAND } from "@/lib/brand";

// Preview card shown when the site is shared on WhatsApp, LinkedIn, X, etc.
export const alt = "BreatheWise — your daily air-pollution coach";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          color: "#eef1ff",
          background: "radial-gradient(circle at 78% 40%, #1f4fa8 0%, #0c1438 45%, #070c24 100%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <svg width="88" height="88" viewBox="0 0 48 48">
            <circle cx="24" cy="24" r="24" fill="#8cc7b1" />
            <path d={BRAND.stem} stroke="#0e1a15" strokeWidth="2.8" strokeLinecap="round" />
            <path d={BRAND.leftLeaf} fill="#0e1a15" />
            <path d={BRAND.rightLeaf} fill="#0e1a15" />
            <path d={BRAND.leftVein} stroke="#8cc7b1" strokeWidth="1.5" strokeLinecap="round" fill="none" />
            <path d={BRAND.rightVein} stroke="#8cc7b1" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          </svg>
          <div style={{ display: "flex", fontSize: 64, letterSpacing: -1 }}>
            <span>Breathe</span>
            <span style={{ color: "#8cc7b1" }}>Wise</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 76, lineHeight: 1.05, letterSpacing: -2, maxWidth: 900 }}>Don&apos;t just check the AQI. Know what to do today.</div>
          <div style={{ fontSize: 30, color: "#9aa5cf" }}>Live air quality · cleanest hours · an AI plan for your family · English & Hindi</div>
        </div>
      </div>
    ),
    size
  );
}
