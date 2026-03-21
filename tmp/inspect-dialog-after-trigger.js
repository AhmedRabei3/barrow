const { loadEnvConfig } = require("@next/env");
const { chromium } = require("playwright");
loadEnvConfig(process.cwd());

const read = (k) => String(process.env[k] || "").trim();
const readAny = (keys) => keys.map(read).find(Boolean) || "";

(async () => {
  const payoutUrl = readAny([
    "SHAMCASH_WEB_PAYOUT_URL",
    "SHAMCASH_TRANSFER_PAGE_URL",
  ]);
  const profileDir = readAny([
    "SHAMCASH_WEB_PROFILE_DIR",
    "SHAMCASH_PROFILE_PATH",
    "SHAMCASH_PLAYWRIGHT_PROFILE_DIR",
  ]);
  const channel = read("SHAMCASH_BROWSER_CHANNEL") || undefined;
  const executablePath = read("SHAMCASH_BROWSER_EXECUTABLE_PATH") || undefined;
  const triggerSel =
    readAny(["SHAMCASH_ADD_RECIPIENT_TRIGGER_SELECTOR"]) ||
    "nav div.cursor-pointer.rounded-full:has(> svg)";

  const context = await chromium.launchPersistentContext(profileDir, {
    headless: false,
    channel,
    executablePath,
  });
  const page = await context.newPage();
  await page.goto(payoutUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page
    .waitForLoadState("networkidle", { timeout: 60000 })
    .catch(() => null);

  const count = await page
    .locator(triggerSel)
    .count()
    .catch(() => 0);
  console.log("TRIGGER_COUNT", count);
  if (!count) {
    await context.close();
    return;
  }

  await page
    .locator(triggerSel)
    .first()
    .click({ timeout: 10000 })
    .catch(() => null);
  await page.waitForTimeout(1000);

  const dialogs = await page.evaluate(() => {
    const clean = (s) => (s || "").replace(/\s+/g, " ").trim();
    return Array.from(
      document.querySelectorAll('[role="dialog"], [role="alertdialog"]'),
    ).map((dlg, i) => {
      const attrs = {
        role: dlg.getAttribute("role") || "",
        id: dlg.getAttribute("id") || "",
        cls: (dlg.getAttribute("class") || "").slice(0, 200),
        dataState: dlg.getAttribute("data-state") || "",
      };
      const text = clean(dlg.textContent || "").slice(0, 600);
      const inputs = Array.from(
        dlg.querySelectorAll(
          'input,textarea,select,[contenteditable="true"],[role="textbox"]',
        ),
      ).map((el) => ({
        tag: el.tagName.toLowerCase(),
        type: el.getAttribute("type") || "",
        name: el.getAttribute("name") || "",
        id: el.getAttribute("id") || "",
        placeholder: el.getAttribute("placeholder") || "",
        role: el.getAttribute("role") || "",
        contenteditable: el.getAttribute("contenteditable") || "",
      }));
      const buttons = Array.from(
        dlg.querySelectorAll('button,[role="button"]'),
      ).map((el) => clean(el.textContent || "").slice(0, 80));
      return { index: i, attrs, text, inputs, buttons };
    });
  });

  console.log("DIALOG_COUNT", dialogs.length);
  for (const d of dialogs) {
    console.log("DIALOG", JSON.stringify(d));
  }

  await context.close();
})().catch((e) => {
  console.error("DIALOG_ERR", e && e.message ? e.message : e);
  process.exit(1);
});
