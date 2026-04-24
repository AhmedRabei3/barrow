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

export default async function TwitterImage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let title = `Listing on ${SITE_NAME}`;

  try {
    const item = await getListingDetailsById(id);

    if (item) {
      title = item.title;
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
        justifyContent: "center",
        alignItems: "center",
        background: "linear-gradient(135deg, #1e293b, #0ea5e9)",
        color: "white",
        padding: 56,
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 28, opacity: 0.9 }}>{SITE_NAME}</div>
      <div
        style={{
          fontSize: 56,
          fontWeight: 700,
          marginTop: 18,
          maxWidth: 1000,
          lineHeight: 1.15,
        }}
      >
        {title}
      </div>
    </div>,
    {
      ...size,
    },
  );
}
