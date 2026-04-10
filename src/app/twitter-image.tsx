import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/seo";

export const runtime = "edge";
export const alt = SITE_NAME;
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function TwitterImage() {
  return new ImageResponse(
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        background: "linear-gradient(135deg, #1e293b, #0284c7)",
        color: "white",
        padding: 56,
      }}
    >
      <div style={{ fontSize: 32, opacity: 0.9 }}>{SITE_NAME}</div>
      <div style={{ fontSize: 60, fontWeight: 700, marginTop: 12 }}>
        Find Your Next Deal
      </div>
    </div>,
    {
      ...size,
    },
  );
}
