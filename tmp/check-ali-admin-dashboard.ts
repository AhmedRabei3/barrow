const BASE_URL = "http://localhost:3000";

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

async function asJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { raw: text };
  }
}

async function run() {
  let cookieJar = "";

  const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`);
  cookieJar = mergeCookieJar(cookieJar, extractSetCookies(csrfRes));
  const csrfJson = (await asJson(csrfRes)) as { csrfToken?: string };

  if (!csrfJson.csrfToken) throw new Error("Missing csrf token");

  const body = new URLSearchParams({
    email: "ali@mail.com",
    password: "12345678",
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
    body: body.toString(),
    redirect: "manual",
  });

  cookieJar = mergeCookieJar(cookieJar, extractSetCookies(loginRes));

  const profileRes = await fetch(`${BASE_URL}/api/profile`, {
    headers: { Cookie: cookieJar },
  });

  const dashboardRes = await fetch(`${BASE_URL}/api/admin/dashboard`, {
    headers: { Cookie: cookieJar },
    redirect: "manual",
  });

  console.log("login:", loginRes.status);
  console.log("profile:", profileRes.status);
  console.log("admin-dashboard:", dashboardRes.status);

  if (profileRes.status !== 200) {
    throw new Error(`profile status expected 200 got ${profileRes.status}`);
  }

  if (![401, 403].includes(dashboardRes.status)) {
    throw new Error(
      `admin dashboard should be forbidden for ali, got ${dashboardRes.status}`,
    );
  }

  console.log("Ali admin dashboard permission check: PASS");
}

run().catch((error) => {
  console.error("Ali admin dashboard permission check: FAIL", error);
  process.exit(1);
});
