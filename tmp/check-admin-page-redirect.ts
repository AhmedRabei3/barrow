const BASE_URL = "http://localhost:3000";

const ADMIN = { email: "ahmed@mail.com", password: "12345678" };

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

async function login(email: string, password: string) {
  let cookieJar = "";

  const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`);
  cookieJar = mergeCookieJar(cookieJar, extractSetCookies(csrfRes));
  const csrfJson = (await csrfRes.json()) as { csrfToken?: string };

  if (!csrfJson.csrfToken) {
    throw new Error(`Failed to get csrf token for ${email}`);
  }

  const body = new URLSearchParams({
    email,
    password,
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
  return cookieJar;
}

(async () => {
  const cookieJar = await login(ADMIN.email, ADMIN.password);

  for (const path of ["/admin", "/admin/purchase-request"]) {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { Cookie: cookieJar },
      redirect: "manual",
    });

    console.log(
      `${path} -> status=${res.status}, location=${res.headers.get("location") ?? "-"}`,
    );
  }
})();
