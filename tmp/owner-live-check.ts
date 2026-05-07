import WebSocket from "ws";
import { NotificationType } from "@prisma/client";
import { prisma } from "../src/lib/prisma";

const WS_BASE_URL = process.env.WS_SMOKE_BASE_URL || "ws://localhost:3000";
const HTTP_BASE_URL =
  process.env.SMOKE_BASE_URL ||
  WS_BASE_URL.replace(/^ws:\/\//, "http://").replace(/^wss:\/\//, "https://");
const OWNER_EMAIL = process.env.WS_OWNER_EMAIL || "ahmed@mail.com";
const OWNER_PASSWORD = process.env.WS_OWNER_PASSWORD || "12345678";
const marker = `OWNER_RT_${Date.now()}`;

type CookieHeaders = { getSetCookie?: () => string[] };

function extractSetCookies(res: Response): string[] {
  const maybe = (res.headers as unknown as CookieHeaders).getSetCookie?.();
  if (maybe?.length) return maybe;
  const single = res.headers.get("set-cookie");
  return single ? [single] : [];
}

function mergeCookieJar(current: string, setCookies: string[]): string {
  const map = new Map<string, string>();

  if (current) {
    current.split("; ").forEach((pair) => {
      const [name, ...rest] = pair.split("=");
      if (!name || rest.length === 0) return;
      map.set(name, `${name}=${rest.join("=")}`);
    });
  }

  setCookies.forEach((cookie) => {
    const first = cookie.split(";")[0];
    const [name, ...rest] = first.split("=");
    if (!name || rest.length === 0) return;
    map.set(name, `${name}=${rest.join("=")}`);
  });

  return Array.from(map.values()).join("; ");
}

async function loginCookie(email: string, password: string): Promise<string> {
  let cookieJar = "";

  const csrfRes = await fetch(`${HTTP_BASE_URL}/api/auth/csrf`);
  cookieJar = mergeCookieJar(cookieJar, extractSetCookies(csrfRes));
  const csrfJson = (await csrfRes.json()) as { csrfToken?: string };

  if (!csrfJson.csrfToken) {
    throw new Error("Missing csrf token");
  }

  const body = new URLSearchParams({
    email,
    password,
    csrfToken: csrfJson.csrfToken,
    callbackUrl: HTTP_BASE_URL,
    json: "true",
  });

  const loginRes = await fetch(
    `${HTTP_BASE_URL}/api/auth/callback/credentials`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: cookieJar,
      },
      body: body.toString(),
      redirect: "manual",
    },
  );

  cookieJar = mergeCookieJar(cookieJar, extractSetCookies(loginRes));
  return cookieJar;
}

async function run() {
  const owner = await prisma.user.findUnique({
    where: { email: OWNER_EMAIL },
    select: { id: true },
  });

  if (!owner?.id) {
    console.log("OWNER_USER_NOT_FOUND", OWNER_EMAIL);
    await prisma.$disconnect();
    process.exit(1);
  }

  const cookieJar = await loginCookie(OWNER_EMAIL, OWNER_PASSWORD);
  const ws = new WebSocket(
    `${WS_BASE_URL}/ws?userId=${encodeURIComponent(owner.id)}`,
    {
      headers: {
        Cookie: cookieJar,
      },
    },
  );

  const timeout = setTimeout(async () => {
    console.log("TIMEOUT");
    await prisma.$disconnect();
    process.exit(1);
  }, 12000);

  ws.on("open", () => {
    console.log("WS_OPEN");
  });

  ws.on("message", async (raw) => {
    try {
      const msg = JSON.parse(raw.toString());

      if (msg.type === "connected") {
        console.log("WS_CONNECTED_ACK");
        await prisma.notification.create({
          data: {
            userId: owner.id,
            title: marker,
            message: "owner realtime check",
            type: NotificationType.INFO,
          },
        });
        return;
      }

      if (msg.type === "notification" && msg.data?.title === marker) {
        clearTimeout(timeout);
        console.log("OWNER_NOTIFICATION_RECEIVED");
        ws.close();
        await prisma.$disconnect();
        process.exit(0);
      }
    } catch {
      // ignore frames
    }
  });

  ws.on("error", async (error) => {
    clearTimeout(timeout);
    console.log("WS_ERROR", error.message);
    await prisma.$disconnect();
    process.exit(1);
  });
}

run().catch(async (error) => {
  console.error("OWNER_WS_TEST_ERROR", error);
  await prisma.$disconnect();
  process.exit(1);
});
