#!/usr/bin/env node

const baseUrl = process.env.SEO_BASE_URL || "http://localhost:3000";
const REQUEST_TIMEOUT_MS = Number(process.env.SEO_REQUEST_TIMEOUT_MS || 60000);

const checks = [];

const pushCheck = (name, ok, details) => {
  checks.push({ name, ok, details });
};

const fetchText = async (url) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        "user-agent": "seo-smoke-check/1.0",
      },
      signal: controller.signal,
    });

    const text = await response.text();
    return { response, text };
  } finally {
    clearTimeout(timeoutId);
  }
};

const run = async () => {
  const endpoints = [
    "/robots.txt",
    "/manifest.webmanifest",
    "/sitemap.xml",
    "/sitemap/0",
    "/opengraph-image",
    "/twitter-image",
  ];

  for (const endpoint of endpoints) {
    try {
      const { response } = await fetchText(`${baseUrl}${endpoint}`);
      pushCheck(
        `GET ${endpoint} is 200`,
        response.status === 200,
        `status=${response.status}`,
      );
    } catch (error) {
      pushCheck(`GET ${endpoint} is reachable`, false, String(error));
    }
  }

  try {
    const { text: homeHtml } = await fetchText(`${baseUrl}/`);
    pushCheck(
      "home has canonical",
      homeHtml.includes('rel="canonical"'),
      "rel=canonical",
    );
    pushCheck(
      "home has og:image",
      homeHtml.includes('property="og:image"'),
      "property=og:image",
    );
    pushCheck(
      "home has twitter:image",
      homeHtml.includes('name="twitter:image"'),
      "name=twitter:image",
    );
    pushCheck(
      "home has structured data",
      homeHtml.includes("CollectionPage") &&
        homeHtml.includes('"@type":"WebPage"'),
      "CollectionPage + WebPage",
    );
  } catch (error) {
    pushCheck("home HTML check", false, String(error));
  }

  let sampleItemId = null;
  try {
    const { text } = await fetchText(`${baseUrl}/api/items?page=1&limit=1`);
    const data = JSON.parse(text);
    sampleItemId = data?.items?.[0]?.id ?? null;
  } catch {
    sampleItemId = null;
  }

  if (sampleItemId) {
    try {
      const { response: itemOg } = await fetchText(
        `${baseUrl}/items/details/${sampleItemId}/opengraph-image`,
      );
      const { response: itemTw } = await fetchText(
        `${baseUrl}/items/details/${sampleItemId}/twitter-image`,
      );
      const { text: itemHtml } = await fetchText(
        `${baseUrl}/items/details/${sampleItemId}`,
      );

      pushCheck(
        "item og image is 200",
        itemOg.status === 200,
        `status=${itemOg.status}`,
      );
      pushCheck(
        "item twitter image is 200",
        itemTw.status === 200,
        `status=${itemTw.status}`,
      );
      pushCheck(
        "item page uses dynamic og image",
        itemHtml.includes(`/items/details/${sampleItemId}/opengraph-image`),
        sampleItemId,
      );
      pushCheck(
        "item page uses dynamic twitter image",
        itemHtml.includes(`/items/details/${sampleItemId}/twitter-image`),
        sampleItemId,
      );
      pushCheck(
        "item has Product schema",
        itemHtml.includes('"@type":"Product"'),
        sampleItemId,
      );
      pushCheck(
        "item has Breadcrumb schema",
        itemHtml.includes("BreadcrumbList"),
        sampleItemId,
      );
    } catch (error) {
      pushCheck("item detail SEO checks", false, String(error));
    }
  } else {
    pushCheck(
      "sample item for detail checks",
      true,
      "skipped (no items available)",
    );
  }

  const failed = checks.filter((check) => !check.ok);

  for (const check of checks) {
    const icon = check.ok ? "✅" : "❌";
    console.log(`${icon} ${check.name} (${check.details})`);
  }

  if (failed.length > 0) {
    console.error(`\nSEO smoke failed: ${failed.length} check(s).`);
    process.exit(1);
  }

  console.log("\nSEO smoke passed.");
};

run().catch((error) => {
  console.error("SEO smoke crashed:", error);
  process.exit(1);
});
