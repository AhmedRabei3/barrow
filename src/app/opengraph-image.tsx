import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Rent Anything";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        background: "linear-gradient(135deg, #0f172a, #2563eb)",
        color: "white",
        padding: 56,
      }}
    >
      <div style={{ fontSize: 36, opacity: 0.9 }}>Rent Anything</div>
      <div style={{ fontSize: 68, fontWeight: 700, marginTop: 12 }}>
        Smart Marketplace
      </div>
      <div style={{ fontSize: 30, marginTop: 16, opacity: 0.9 }}>
        Rent • Buy • Sell
      </div>
    </div>,
    {
      ...size,
    },
  );
}
