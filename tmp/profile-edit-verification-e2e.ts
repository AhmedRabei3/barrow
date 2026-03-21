import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";

const BASE_URL = "http://localhost:3000";
const EMAIL = "ahmed@mail.com";
const PASSWORD = "12345678";

type JsonObject = Record<string, unknown>;

function extractSetCookies(res: Response): string[] {
  const maybe = (
    res.headers as unknown as { getSetCookie?: () => string[] }
  ).getSetCookie?.();
  if (maybe && maybe.length) return maybe;

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

async function asJson(res: Response): Promise<JsonObject> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as JsonObject;
  } catch {
    return { raw: text };
  }
}

async function run() {
  let cookieJar = "";

  const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`, {
    method: "GET",
  });
  cookieJar = mergeCookieJar(cookieJar, extractSetCookies(csrfRes));
  const csrfJson = (await asJson(csrfRes)) as { csrfToken?: string };

  if (!csrfJson.csrfToken) {
    throw new Error("Failed to get csrfToken");
  }

  const loginBody = new URLSearchParams({
    email: EMAIL,
    password: PASSWORD,
    csrfToken: csrfJson.csrfToken,
    callbackUrl: BASE_URL,
    json: "true",
  });

  const loginRes = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookieJar,
    },
    body: loginBody.toString(),
    redirect: "manual",
  });

  cookieJar = mergeCookieJar(cookieJar, extractSetCookies(loginRes));

  const profileRes = await fetch(`${BASE_URL}/api/profile`, {
    headers: { Cookie: cookieJar },
  });
  const profileJson = await asJson(profileRes);

  if (
    !profileRes.ok ||
    !(profileJson.id || (profileJson.user as JsonObject)?.id)
  ) {
    throw new Error(`Login/session failed: ${JSON.stringify(profileJson)}`);
  }

  const userId = String(
    profileJson.id || (profileJson.user as JsonObject | undefined)?.id,
  );
  const userEmail = String(
    profileJson.email || (profileJson.user as JsonObject | undefined)?.email,
  );

  const blockedPatchRes = await fetch(`${BASE_URL}/api/profile`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieJar,
    },
    body: JSON.stringify({ name: "No Ticket" }),
  });

  const blockedPatchJson = await asJson(blockedPatchRes);
  console.log(
    "patch-without-ticket:",
    blockedPatchRes.status,
    blockedPatchJson,
  );

  await prisma.profileEditVerificationCode.updateMany({
    where: { userId, usedAt: null },
    data: { usedAt: new Date() },
  });

  const plainCode = "123456";
  const codeHash = await bcrypt.hash(plainCode, 10);

  await prisma.profileEditVerificationCode.create({
    data: {
      userId,
      email: userEmail,
      codeHash,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });

  const verifyRes = await fetch(
    `${BASE_URL}/api/profile/edit-verification/verify-code`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieJar,
      },
      body: JSON.stringify({ code: plainCode }),
    },
  );

  const verifyJson = (await asJson(verifyRes)) as {
    ticket?: string;
  } & JsonObject;
  console.log("verify-code:", verifyRes.status, verifyJson);

  if (!verifyRes.ok || !verifyJson.ticket) {
    throw new Error(`Failed to verify code: ${JSON.stringify(verifyJson)}`);
  }

  const patchRes = await fetch(`${BASE_URL}/api/profile`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieJar,
      "x-profile-edit-ticket": verifyJson.ticket,
    },
    body: JSON.stringify({ name: "Ahmed Verified" }),
  });

  const patchJson = await asJson(patchRes);
  console.log("patch-with-ticket:", patchRes.status, patchJson);

  if (!patchRes.ok) {
    throw new Error(`Patch failed with ticket: ${JSON.stringify(patchJson)}`);
  }

  console.log("E2E profile edit verification: PASS");
}

run()
  .catch((error) => {
    console.error("E2E profile edit verification: FAIL", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
