const BASE_URL = "http://localhost:3000";

const ACCOUNTS = [
  { email: "ahmed@mail.com", password: "12345678", expectAdmin: true },
  { email: "ali@mail.com", password: "12345678", expectAdmin: false },
] as const;

type CookieHeaders = { getSetCookie?: () => string[] };

type AuthResult = {
  email: string;
  loginStatus: number;
  profileStatus: number;
  profileIsAdmin: boolean | null;
  adminApiStatus: number;
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

async function loginAndCheck(
  email: string,
  password: string,
): Promise<AuthResult> {
  let cookieJar = "";

  const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`);
  cookieJar = mergeCookieJar(cookieJar, extractSetCookies(csrfRes));
  const csrfJson = (await asJson(csrfRes)) as { csrfToken?: string };

  if (!csrfJson.csrfToken) {
    throw new Error(`Failed to get csrfToken for ${email}`);
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

  const profileRes = await fetch(`${BASE_URL}/api/profile`, {
    headers: { Cookie: cookieJar },
  });
  const profileJson = await asJson(profileRes);

  const user = (profileJson.user ?? profileJson) as Record<string, unknown>;
  const profileIsAdmin =
    typeof user.isAdmin === "boolean" ? (user.isAdmin as boolean) : null;

  const adminRes = await fetch(
    `${BASE_URL}/api/admin/purchase-req/unassigned`,
    {
      headers: { Cookie: cookieJar },
    },
  );

  return {
    email,
    loginStatus: loginRes.status,
    profileStatus: profileRes.status,
    profileIsAdmin,
    adminApiStatus: adminRes.status,
  };
}

async function run() {
  const results: AuthResult[] = [];
  const errors: string[] = [];

  for (const account of ACCOUNTS) {
    const res = await loginAndCheck(account.email, account.password);
    results.push(res);

    if (res.profileStatus !== 200) {
      errors.push(`${account.email}: profile status ${res.profileStatus}`);
      continue;
    }

    if (res.profileIsAdmin !== account.expectAdmin) {
      errors.push(
        `${account.email}: expected isAdmin=${account.expectAdmin} got ${res.profileIsAdmin}`,
      );
      continue;
    }

    const adminOk = account.expectAdmin
      ? res.adminApiStatus === 200
      : res.adminApiStatus === 401 || res.adminApiStatus === 403;

    if (!adminOk) {
      errors.push(
        `${account.email}: unexpected admin api status ${res.adminApiStatus}`,
      );
    }
  }

  console.table(results);

  if (errors.length) {
    throw new Error(errors.join(" | "));
  }

  console.log("Account role smoke check: PASS");
}

run().catch((error) => {
  console.error("Account role smoke check: FAIL", error);
  process.exit(1);
});
