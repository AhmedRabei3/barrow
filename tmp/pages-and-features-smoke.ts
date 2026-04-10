const BASE_URL = process.env.PAGES_SMOKE_BASE_URL || "http://localhost:3000";
const REQUEST_TIMEOUT_MS = Number(process.env.PAGES_SMOKE_TIMEOUT_MS || 60000);

const ADMIN = { email: "ahmed@mail.com", password: "12345678" };
const USER = { email: "ali@mail.com", password: "12345678" };

type CookieHeaders = { getSetCookie?: () => string[] };

type CheckResult = {
  key: string;
  status: number;
  ok: boolean;
  note?: string;
};

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

async function asJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { raw: text };
  }
}

async function fetchWithTimeout(
  input: string,
  init: RequestInit = {},
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function login(email: string, password: string) {
  let cookieJar = "";

  const csrfRes = await fetchWithTimeout(`${BASE_URL}/api/auth/csrf`);
  cookieJar = mergeCookieJar(cookieJar, extractSetCookies(csrfRes));
  const csrfJson = (await asJson(csrfRes)) as { csrfToken?: string };

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

  const loginRes = await fetchWithTimeout(
    `${BASE_URL}/api/auth/callback/credentials`,
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

  const sessionRes = await fetchWithTimeout(`${BASE_URL}/api/profile`, {
    headers: { Cookie: cookieJar },
  });

  if (sessionRes.status !== 200) {
    throw new Error(
      `${email} login failed, /api/profile status=${sessionRes.status}`,
    );
  }

  return { cookieJar, loginStatus: loginRes.status };
}

async function check(
  key: string,
  path: string,
  init: RequestInit,
  validate: (status: number) => boolean,
): Promise<CheckResult> {
  const res = await fetchWithTimeout(`${BASE_URL}${path}`, {
    redirect: "manual",
    ...init,
  });

  return {
    key,
    status: res.status,
    ok: validate(res.status),
  };
}

async function run() {
  const results: CheckResult[] = [];
  const errors: string[] = [];

  const admin = await login(ADMIN.email, ADMIN.password);
  const user = await login(USER.email, USER.password);

  const publicChecks: Array<Promise<CheckResult>> = [
    check("page:/", "/", {}, (s) => s === 200),
    check(
      "page:/verify-email",
      "/verify-email",
      {},
      (s) => s === 200 || s === 307 || s === 308,
    ),
    check("api:/api/items", "/api/items", {}, (s) => s === 200),
    check("api:/api/categories", "/api/categories", {}, (s) => s === 200),
  ];

  results.push(...(await Promise.all(publicChecks)));

  const itemRes = await fetchWithTimeout(`${BASE_URL}/api/items`);
  if (itemRes.ok) {
    const payload = (await asJson(itemRes)) as {
      data?: Array<{ id?: string }>;
      items?: Array<{ id?: string }>;
    };

    const itemId = payload.data?.[0]?.id || payload.items?.[0]?.id;
    if (itemId) {
      results.push(
        await check(
          "page:/items/details/[id]",
          `/items/details/${itemId}`,
          {},
          (s) => s === 200,
        ),
      );
      results.push(
        await check(
          "api:/api/items/details/[id]",
          `/api/items/details/${itemId}`,
          {},
          (s) => s === 200,
        ),
      );
    } else {
      results.push({
        key: "dynamic:item-id",
        status: 204,
        ok: true,
        note: "No items found to test dynamic details route",
      });
    }
  } else {
    results.push({
      key: "dynamic:item-id",
      status: itemRes.status,
      ok: false,
      note: "Failed to fetch /api/items for dynamic route tests",
    });
  }

  const adminChecks: Array<Promise<CheckResult>> = [
    check(
      "admin-page:/admin",
      "/admin",
      { headers: { Cookie: admin.cookieJar } },
      (s) => s === 200,
    ),
    check(
      "admin-page:/admin/purchase-request",
      "/admin/purchase-request",
      { headers: { Cookie: admin.cookieJar } },
      (s) => s === 200,
    ),
    check(
      "admin-api:/api/admin/dashboard",
      "/api/admin/dashboard",
      { headers: { Cookie: admin.cookieJar } },
      (s) => s === 200,
    ),
    check(
      "admin-api:/api/admin/purchase-req/unassigned",
      "/api/admin/purchase-req/unassigned",
      { headers: { Cookie: admin.cookieJar } },
      (s) => s === 200,
    ),
    check(
      "admin-api:/api/profile",
      "/api/profile",
      { headers: { Cookie: admin.cookieJar } },
      (s) => s === 200,
    ),
  ];

  results.push(...(await Promise.all(adminChecks)));

  const userChecks: Array<Promise<CheckResult>> = [
    check(
      "user-page:/profile",
      "/profile",
      { headers: { Cookie: user.cookieJar } },
      (s) => s === 200 || s === 307 || s === 308,
    ),
    check(
      "user-api:/api/profile",
      "/api/profile",
      { headers: { Cookie: user.cookieJar } },
      (s) => s === 200,
    ),
    check(
      "user-api:/api/notifications/unread-count",
      "/api/notifications/unread-count",
      { headers: { Cookie: user.cookieJar } },
      (s) => s === 200,
    ),
    check(
      "user-forbidden:/api/admin/dashboard",
      "/api/admin/dashboard",
      { headers: { Cookie: user.cookieJar } },
      (s) => s === 401 || s === 403,
    ),
    check(
      "user-forbidden:/api/admin/purchase-req/unassigned",
      "/api/admin/purchase-req/unassigned",
      { headers: { Cookie: user.cookieJar } },
      (s) => s === 401 || s === 403,
    ),
  ];

  results.push(...(await Promise.all(userChecks)));

  for (const result of results) {
    if (!result.ok) {
      errors.push(`${result.key} => status ${result.status}`);
    }
  }

  console.table(results);

  if (errors.length) {
    throw new Error(errors.join(" | "));
  }

  console.log("Pages & features smoke: PASS");
}

run().catch((error) => {
  console.error("Pages & features smoke: FAIL", error);
  process.exit(1);
});
