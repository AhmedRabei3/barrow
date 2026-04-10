/* import { NextResponse } from "next/server";

interface WebVitalPayload {
  id?: string;
  name?: string;
  value?: number;
  rating?: "good" | "needs-improvement" | "poor";
  delta?: number;
  navigationType?: string;
  url?: string;
  timestamp?: number;
}

const ALLOWED_NAMES = new Set(["LCP", "INP", "CLS", "FCP", "TTFB"]);

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as WebVitalPayload;

    if (!payload?.name || !ALLOWED_NAMES.has(payload.name)) {
      return NextResponse.json(
        { error: "Invalid metric name" },
        { status: 400 },
      );
    }

    if (typeof payload.value !== "number") {
      return NextResponse.json(
        { error: "Invalid metric value" },
        { status: 400 },
      );
    }

    console.info("[web-vitals]", {
      id: payload.id,
      name: payload.name,
      value: payload.value,
      rating: payload.rating,
      delta: payload.delta,
      navigationType: payload.navigationType,
      url: payload.url,
      timestamp: payload.timestamp,
    });

    return NextResponse.json({ ok: true }, { status: 202 });
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}
 */
