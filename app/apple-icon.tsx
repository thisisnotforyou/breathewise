import { ImageResponse } from "next/og";
import { BRAND } from "@/lib/brand";

// iPhone / iPad home-screen icon.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: BRAND.green }}>
        <svg width="150" height="150" viewBox="0 0 48 48">
          <path d={BRAND.stem} stroke={BRAND.cream} strokeWidth="2.8" strokeLinecap="round" />
          <path d={BRAND.leftLeaf} fill={BRAND.cream} />
          <path d={BRAND.rightLeaf} fill={BRAND.cream} />
          <path d={BRAND.leftVein} stroke={BRAND.green} strokeWidth="1.5" strokeLinecap="round" fill="none" />
          <path d={BRAND.rightVein} stroke={BRAND.green} strokeWidth="1.5" strokeLinecap="round" fill="none" />
        </svg>
      </div>
    ),
    size
  );
}
