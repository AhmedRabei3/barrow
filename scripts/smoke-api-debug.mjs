const baseUrl = (process.env.SMOKE_BASE_URL || "http://localhost:3000").replace(
  /\/$/,
  "",
);

const checks = [
  {
    name: "items_default",
    path: "/api/items?page=1&limit=5",
    expected: [200],
  },
  {
    name: "items_new_car",
    path: "/api/items?page=1&limit=5&type=NEW_CAR",
    expected: [200],
  },
  {
    name: "items_used_car",
    path: "/api/items?page=1&limit=5&type=USED_CAR",
    expected: [200],
  },
  {
    name: "notifications_unread_auth_guard",
    path: "/api/notifications/unread-count",
    expected: [401, 403],
  },
  {
    name: "chat_unread_auth_guard",
    path: "/api/chat/unread-count",
    expected: [401, 403],
  },
];

const withTimeout = async (url, timeoutMs = 15000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: {
        "x-lang": "en",
      },
      cache: "no-store",
    });

    return {
      ok: true,
      status: response.status,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timer);
  }
};

let failed = 0;

for (const check of checks) {
  const url = `${baseUrl}${check.path}`;
  const result = await withTimeout(url);

  if (!result.ok) {
    failed += 1;
    process.stderr.write(`FAIL ${check.name} -> request_error: ${result.error}`);
    continue;
  }

  if (!check.expected.includes(result.status)) {
    failed += 1;
    process.stderr.write(
      `FAIL ${check.name} -> status ${result.status}, expected ${check.expected.join(",")}`,
    );
    continue;
  }

  process.stdout.write(`OK   ${check.name} -> ${result.status}`);
}

if (failed > 0) {
  process.stderr.write(`\nSmoke API failed: ${failed} check(s) failed.`);
  process.exit(1);
}

process.stdout.write("\nSmoke API passed.");
