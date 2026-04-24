import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/seo";
import { getListingDetailsById } from "@/server/services/listing-details.service";

export const runtime = "nodejs";
export const alt = "Listing preview";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

const trimText = (value: string, max: number) =>
  value.length > max ? `${value.slice(0, max - 1)}…` : value;

export default async function OpengraphImage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let title = `Listing on ${SITE_NAME}`;
  let subtitle = "Rent • Buy • Sell";
  let price = "";

  try {
    const item = await getListingDetailsById(id);

    if (item) {
      const itemLocation = [item.location?.city, item.location?.country]
        .filter(Boolean)
        .join(", ");

      title = item.title;
      subtitle = itemLocation || subtitle;
      price =
        typeof item.data.price === "number"
          ? `$${item.data.price.toFixed(0)}`
          : "";
    }
  } catch {
    // keep fallback text
  }

  return new ImageResponse(
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "linear-gradient(135deg, #0f172a, #1d4ed8)",
        color: "white",
        padding: 56,
      }}
    >
      <div
        style={{
          fontSize: 28,
          opacity: 0.9,
          letterSpacing: 0.4,
        }}
      >
        {SITE_NAME}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div
          style={{
            fontSize: 64,
            fontWeight: 700,
            lineHeight: 1.1,
          }}
        >
          {trimText(title, 58)}
        </div>
        <div style={{ fontSize: 30, opacity: 0.9 }}>
          {trimText(subtitle, 64)}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div style={{ fontSize: 26, opacity: 0.85 }}>Listing Preview</div>
        <div style={{ fontSize: 34, fontWeight: 700 }}>{price}</div>
      </div>
    </div>,
    {
      ...size,
    },
  );
}
