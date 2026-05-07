import WebSocket from "ws";
import { prisma } from "../src/lib/prisma";

const WS_BASE_URL = process.env.WS_SMOKE_BASE_URL || "ws://localhost:3000";
const HTTP_BASE_URL =
  process.env.SMOKE_BASE_URL ||
  WS_BASE_URL.replace(/^ws:\/\//, "http://").replace(/^wss:\/\//, "https://");
const USER_EMAIL = process.env.WS_SMOKE_USER_EMAIL || "ali@mail.com";
const USER_PASSWORD = process.env.WS_SMOKE_USER_PASSWORD || "12345678";

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
  let connected = false;
  let pongReceived = false;
  let ws: WebSocket | null = null;

  const timeout = setTimeout(() => {
    console.log("WS_TEST_TIMEOUT", { connected, pongReceived });
    try {
      ws?.close();
    } catch {
      // ignore close race
    }
    void prisma.$disconnect();
    process.exit(1);
  }, 12000);

  const user = await prisma.user.findUnique({
    where: { email: USER_EMAIL },
    select: { id: true },
  });

  if (!user?.id) {
    console.log("WS_TEST_USER_NOT_FOUND", USER_EMAIL);
    clearTimeout(timeout);
    await prisma.$disconnect();
    process.exit(1);
  }

  const cookieJar = await loginCookie(USER_EMAIL, USER_PASSWORD);

  ws = new WebSocket(
    `${WS_BASE_URL}/ws?userId=${encodeURIComponent(user.id)}`,
    {
      headers: {
        Cookie: cookieJar,
      },
    },
  );

  ws.on("open", () => {
    console.log("WS_OPEN");
  });

  ws.on("message", async (raw) => {
    try {
      const msg = JSON.parse(raw.toString());

      if (msg.type === "connected") {
        connected = true;
        console.log("WS_CONNECTED_ACK");
        ws?.send(JSON.stringify({ type: "ping" }));
        return;
      }

      if (msg.type === "pong") {
        pongReceived = true;
        console.log("WS_PONG_RECEIVED");
        clearTimeout(timeout);
        ws?.close();
        await prisma.$disconnect();
        process.exit(0);
      }
    } catch {
      // ignore non-json frames
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
  console.error("WS_TEST_ERROR", error);
  await prisma.$disconnect();
  process.exit(1);
});
