import { loadEnvConfig } from "@next/env";
import {
  chromium,
  type Browser,
  type BrowserContext,
  type Locator,
  type Page,
} from "playwright";
import path from "node:path";
import { promises as fs } from "node:fs";

loadEnvConfig(process.cwd());

type CandidateMap = {
  key: string;
  selectors: string[];
};

type Suggestion = {
  key: string;
  selector: string;
  count: number;
};

const readEnv = (key: string) => String(process.env[key] || "").trim();

const readEnvAny = (keys: string[]) => {
  for (const key of keys) {
    const value = readEnv(key);
    if (value) return value;
  }
  return "";
};

const parseBoolean = (value: string, fallback: boolean) => {
  if (!value) return fallback;
  const normalized = value.toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
};

const parseTimeout = (value: string, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const getLocatorAcrossFrames = async (
  page: Page,
  selector: string,
): Promise<Locator | null> => {
  for (const frame of page.frames()) {
    try {
      const locator = frame.locator(selector);
      if ((await locator.count()) > 0) {
        return locator.first();
      }
    } catch {
      // Ignore invalid selector on individual frames.
    }
  }
  return null;
};

const safeCount = async (page: Page, selector: string) => {
  let total = 0;
  for (const frame of page.frames()) {
    try {
      total += await frame.locator(selector).count();
    } catch {
      // Ignore invalid selector on an individual frame.
    }
  }
  return total;
};

const pickBestSelector = async (
  page: Page,
  key: string,
  selectors: string[],
): Promise<Suggestion | null> => {
  for (const selector of selectors) {
    const count = await safeCount(page, selector);
    if (count > 0) {
      return { key, selector, count };
    }
  }

  return null;
};

const loginCandidates: CandidateMap[] = [
  {
    key: "SHAMCASH_WEB_USERNAME_SELECTOR",
    selectors: [
      'input[autocomplete="username"]',
      'input[type="email"]',
      'input[name*="user" i]',
      'input[name*="email" i]',
      'input[placeholder*="email" i]',
      'input[placeholder*="user" i]',
      'input[placeholder*="البريد" i]',
      'input[placeholder*="مستخدم" i]',
    ],
  },
  {
    key: "SHAMCASH_WEB_PASSWORD_SELECTOR",
    selectors: [
      'input[type="password"]',
      'input[name*="pass" i]',
      'input[autocomplete="current-password"]',
      'input[placeholder*="password" i]',
      'input[placeholder*="كلمة" i]',
    ],
  },
  {
    key: "SHAMCASH_WEB_LOGIN_SUBMIT_SELECTOR",
    selectors: [
      'button[type="submit"]',
      'input[type="submit"]',
      'button:has-text("تسجيل الدخول")',
      'button:has-text("دخول")',
      'button:has-text("Login")',
      'button:has-text("Sign in")',
    ],
  },
];

const payoutCandidates: CandidateMap[] = [
  {
    key: "SHAMCASH_ADD_RECIPIENT_TRIGGER_SELECTOR",
    selectors: [
      'button:has-text("إرسال")',
      'button:has-text("ارسال")',
      'button:has-text("تحويل")',
      'button:has-text("Transfer")',
      'button:has-text("Send")',
      "button.mb-2.hover\\:text-primary",
      "nav div.cursor-pointer.rounded-full:has(> svg)",
    ],
  },
  {
    key: "SHAMCASH_RECIPIENT_MODAL_SELECTOR",
    selectors: [
      'div[role="dialog"][data-state="open"]',
      'div[role="alertdialog"][data-state="open"]',
      '[role="dialog"]',
      '[role="alertdialog"]',
    ],
  },
  {
    key: "SHAMCASH_RECIPIENT_CODE_INPUT_SELECTOR",
    selectors: [
      'div[role="tabpanel"][id$="content-address"] textarea',
      'div[role="tabpanel"][id$="content-address"] input[type="text"]',
      '[role="dialog"] textarea',
      '[role="dialog"] input[type="text"]',
    ],
  },
  {
    key: "SHAMCASH_RECIPIENT_QR_TAB_SELECTOR",
    selectors: [
      '[role="tab"]:has-text("QR")',
      '[role="tab"]:has-text("رمز")',
      'button:has-text("QR")',
      'button:has-text("رمز")',
      'button:has-text("صورة")',
      '[id$="trigger-image"]',
      '[id*="trigger-qr"]',
    ],
  },
  {
    key: "SHAMCASH_RECIPIENT_QR_UPLOAD_INPUT_SELECTOR",
    selectors: [
      'div[role="dialog"] input[type="file"][accept*="image"]',
      'div[role="alertdialog"] input[type="file"][accept*="image"]',
      'input[type="file"][accept*="image"]',
      'input[type="file"]',
    ],
  },
  {
    key: "SHAMCASH_RECIPIENT_SAVE_SELECTOR",
    selectors: [
      '[role="alertdialog"] button:has-text("تحويل")',
      '[role="dialog"] button:has-text("تحويل")',
      'button:has-text("إرسال")',
      'button:has-text("ارسال")',
      'button:has-text("Transfer")',
      'button:has-text("Send")',
    ],
  },
  {
    key: "SHAMCASH_WEB_PAYOUT_WALLET_SELECTOR",
    selectors: [
      'input[name*="wallet" i]',
      'textarea[name*="wallet" i]',
      'input[placeholder*="wallet" i]',
      'textarea[placeholder*="wallet" i]',
      'input[placeholder*="محفظ" i]',
      'textarea[placeholder*="محفظ" i]',
    ],
  },
  {
    key: "SHAMCASH_WEB_PAYOUT_AMOUNT_SELECTOR",
    selectors: [
      'input[name*="amount" i]',
      'input[inputmode="decimal"]',
      'input[type="number"]',
      'input[placeholder*="amount" i]',
      'input[placeholder*="المبلغ" i]',
    ],
  },
  {
    key: "SHAMCASH_WEB_PAYOUT_NOTE_SELECTOR",
    selectors: [
      'textarea[name*="note" i]',
      'textarea[placeholder*="note" i]',
      'textarea[placeholder*="ملاح" i]',
      'input[name*="note" i]',
      'input[placeholder*="ملاح" i]',
    ],
  },
  {
    key: "SHAMCASH_WEB_PAYOUT_CURRENCY_SELECTOR",
    selectors: [
      '[role="combobox"]',
      'select[name*="currency" i]',
      'input[name*="currency" i]',
      'button:has-text("USD")',
    ],
  },
  {
    key: "SHAMCASH_WEB_PAYOUT_REFERENCE_SELECTOR",
    selectors: [
      'input[name*="reference" i]',
      'input[name*="ref" i]',
      'input[placeholder*="reference" i]',
      'input[placeholder*="مرجع" i]',
    ],
  },
  {
    key: "SHAMCASH_WEB_PAYOUT_SUBMIT_SELECTOR",
    selectors: [
      '[role="alertdialog"] button:has-text("تحويل")',
      '[role="dialog"] button:has-text("تحويل")',
      'button:has-text("تحويل")',
      'button:has-text("إرسال")',
      'button:has-text("ارسال")',
      'button:has-text("سحب")',
      'button:has-text("Withdraw")',
      'button:has-text("Transfer")',
      'button:has-text("Send")',
    ],
  },
];

const parseArg = (name: string) => {
  const flag = `--${name}`;
  const index = process.argv.indexOf(flag);
  if (index === -1) return "";
  return String(process.argv[index + 1] || "").trim();
};

const printSuggestions = (title: string, suggestions: Suggestion[]) => {
  console.log(`\n=== ${title} ===`);
  if (!suggestions.length) {
    console.log("No selector candidates found.");
    return;
  }

  for (const item of suggestions) {
    console.log(`${item.key}="${item.selector}"  # matches: ${item.count}`);
  }
};

const printQrLoginGuidance = () => {
  console.log("\n=== QR login guidance ===");
  console.log(
    "Detected QR-based login page. Username/password selectors may not exist on this ShamCash flow.",
  );
  console.log(
    'Set SHAMCASH_WEB_ALLOW_SESSION_ONLY="true" and use a persistent profile via SHAMCASH_PROFILE_PATH.',
  );
  console.log(
    "Authenticate once manually in that profile, then rerun doctor/worker using the same profile path.",
  );
};

const printPageDiagnostics = async (page: Page, label: string) => {
  const title = await page.title().catch(() => "");
  console.log(`\n[${label}] URL: ${page.url()}`);
  console.log(`[${label}] title: ${title || "(empty)"}`);
  console.log(`[${label}] frame count: ${page.frames().length}`);
};

const printControlSamples = async (page: Page, label: string) => {
  console.log(`\n[${label}] control samples:`);

  let printedAny = false;

  for (let index = 0; index < page.frames().length; index += 1) {
    const frame = page.frames()[index];
    try {
      const controls = await frame.evaluate(() => {
        const nodes = Array.from(
          document.querySelectorAll(
            "input, textarea, button, select, a[role='button'], [role='button']",
          ),
        ).slice(0, 20);

        return nodes.map((node) => {
          const element = node as HTMLElement;
          const tag = element.tagName.toLowerCase();
          const type = (element as HTMLInputElement).type || "";
          const name = element.getAttribute("name") || "";
          const id = element.getAttribute("id") || "";
          const placeholder = element.getAttribute("placeholder") || "";
          const text = (element.textContent || "")
            .trim()
            .replace(/\s+/g, " ")
            .slice(0, 60);

          return { tag, type, name, id, placeholder, text };
        });
      });

      if (controls.length) {
        printedAny = true;
        console.log(`Frame #${index} (${frame.url()}):`);
        for (const control of controls) {
          console.log(
            `- <${control.tag}> type=${control.type || "-"} name=${control.name || "-"} id=${control.id || "-"} placeholder=${control.placeholder || "-"} text=${control.text || "-"}`,
          );
        }
      }
    } catch {
      // Ignore inaccessible cross-origin frames.
    }
  }

  if (!printedAny) {
    console.log("No readable controls were found in accessible frames.");
  }
};

const saveDebugArtifacts = async (page: Page, label: string) => {
  const outDir =
    readEnv("SHAMCASH_AUTOFIT_DEBUG_DIR") || "tmp/shamcash-autofit";
  const resolvedDir = path.resolve(process.cwd(), outDir);
  await fs.mkdir(resolvedDir, { recursive: true });

  const timestamp = Date.now();
  const htmlPath = path.join(resolvedDir, `${label}-${timestamp}.html`);
  const screenshotPath = path.join(resolvedDir, `${label}-${timestamp}.png`);

  const html = await page.content().catch(() => "");
  await fs.writeFile(htmlPath, html, "utf8");
  await page
    .screenshot({ path: screenshotPath, fullPage: true })
    .catch(() => null);

  console.log(`[${label}] debug html: ${htmlPath}`);
  console.log(`[${label}] debug screenshot: ${screenshotPath}`);
};

const attemptRevealLoginForm = async (page: Page, timeoutMs: number) => {
  const triggerSelectors = [
    'a:has-text("Login")',
    'a:has-text("Sign in")',
    'a:has-text("تسجيل الدخول")',
    'button:has-text("Login")',
    'button:has-text("Sign in")',
    'button:has-text("تسجيل الدخول")',
    'button:has-text("دخول")',
  ];

  for (const selector of triggerSelectors) {
    const trigger = await getLocatorAcrossFrames(page, selector);
    if (!trigger) continue;

    try {
      await trigger.click({ timeout: timeoutMs });
      await page.waitForTimeout(1000);
      await page
        .waitForLoadState("networkidle", { timeout: timeoutMs })
        .catch(() => null);
      return true;
    } catch {
      // Continue to next trigger.
    }
  }

  return false;
};

const attemptRevealPayoutFlow = async (page: Page, timeoutMs: number) => {
  const configuredTriggerSelector = readEnvAny([
    "SHAMCASH_ADD_RECIPIENT_TRIGGER_SELECTOR",
    "SHAMCASH_WEB_PAYOUT_TRIGGER_SELECTOR",
    "SHAMCASH_TRANSFER_TRIGGER_SELECTOR",
  ]);

  const triggerSelectors = [
    configuredTriggerSelector,
    'button:has-text("إرسال")',
    'button:has-text("ارسال")',
    'button:has-text("تحويل")',
    'button:has-text("Transfer")',
    'button:has-text("Send")',
    "button.mb-2.hover\\:text-primary",
    "nav div.cursor-pointer.rounded-full:has(> svg)",
  ].filter(Boolean);

  for (const selector of triggerSelectors) {
    for (const frame of page.frames()) {
      let triggerList: Locator;
      try {
        triggerList = frame.locator(selector);
      } catch {
        continue;
      }

      const triggerCount = await triggerList.count().catch(() => 0);
      if (!triggerCount) continue;

      for (let index = 0; index < Math.min(triggerCount, 6); index += 1) {
        try {
          await triggerList.nth(index).click({ timeout: timeoutMs });
          await page.waitForTimeout(900);
          await page
            .waitForLoadState("networkidle", { timeout: timeoutMs })
            .catch(() => null);
          return true;
        } catch {
          // Continue to next trigger candidate.
        }
      }
    }
  }

  return false;
};

const run = async () => {
  const loginUrlArg = parseArg("login-url");
  const payoutUrlArg = parseArg("payout-url");

  const loginUrl =
    loginUrlArg ||
    readEnvAny(["SHAMCASH_WEB_LOGIN_URL", "SHAMCASH_LOGIN_PAGE_URL"]);
  const payoutUrl =
    payoutUrlArg ||
    readEnvAny(["SHAMCASH_WEB_PAYOUT_URL", "SHAMCASH_TRANSFER_PAGE_URL"]);

  if (!loginUrl && !payoutUrl) {
    throw new Error(
      "Provide at least one URL via --login-url / --payout-url or env values.",
    );
  }

  const username = readEnvAny([
    "SHAMCASH_WEB_USERNAME",
    "SHAMCASH_USERNAME",
    "SHAMCASH_LOGIN_USERNAME",
  ]);
  const password = readEnvAny([
    "SHAMCASH_WEB_PASSWORD",
    "SHAMCASH_PASSWORD",
    "SHAMCASH_LOGIN_PASSWORD",
  ]);

  const headless = parseBoolean(
    readEnvAny(["SHAMCASH_WEB_HEADLESS", "SHAMCASH_HEADLESS"]),
    true,
  );
  const timeoutMs = parseTimeout(
    readEnvAny(["SHAMCASH_WEB_TIMEOUT_MS", "SHAMCASH_TIMEOUT_MS"]),
    45000,
  );

  const browserChannel = readEnv("SHAMCASH_BROWSER_CHANNEL") || undefined;
  const browserExecutablePath =
    readEnv("SHAMCASH_BROWSER_EXECUTABLE_PATH") || undefined;
  const profileDir =
    readEnvAny([
      "SHAMCASH_WEB_PROFILE_DIR",
      "SHAMCASH_PROFILE_PATH",
      "SHAMCASH_PLAYWRIGHT_PROFILE_DIR",
    ]) || undefined;

  let browser: Browser | null = null;
  let context: BrowserContext;

  if (profileDir) {
    context = await chromium.launchPersistentContext(profileDir, {
      headless,
      channel: browserChannel,
      executablePath: browserExecutablePath,
    });
  } else {
    browser = await chromium.launch({
      headless,
      channel: browserChannel,
      executablePath: browserExecutablePath,
    });
    context = await browser.newContext();
  }

  try {
    const page = await context.newPage();

    let loginSuggestions: Suggestion[] = [];
    let payoutSuggestions: Suggestion[] = [];

    if (loginUrl) {
      await page.goto(loginUrl, {
        waitUntil: "domcontentloaded",
        timeout: timeoutMs,
      });
      await page
        .waitForLoadState("networkidle", { timeout: timeoutMs })
        .catch(() => null);
      await printPageDiagnostics(page, "login");

      loginSuggestions = (
        await Promise.all(
          loginCandidates.map((candidate) =>
            pickBestSelector(page, candidate.key, candidate.selectors),
          ),
        )
      ).filter((item): item is Suggestion => Boolean(item));

      if (!loginSuggestions.length) {
        const revealed = await attemptRevealLoginForm(page, timeoutMs);
        if (revealed) {
          loginSuggestions = (
            await Promise.all(
              loginCandidates.map((candidate) =>
                pickBestSelector(page, candidate.key, candidate.selectors),
              ),
            )
          ).filter((item): item is Suggestion => Boolean(item));
        }
      }

      printSuggestions("Login selector suggestions", loginSuggestions);
      const qrLoginCount = await safeCount(
        page,
        "canvas#react-qrcode-logo, canvas[id*='qrcode' i]",
      );
      if (!loginSuggestions.length) {
        await printControlSamples(page, "login");
        await saveDebugArtifacts(page, "login");
        if (qrLoginCount > 0) {
          printQrLoginGuidance();
        }
      }

      const usernameSelector = loginSuggestions.find(
        (item) => item.key === "SHAMCASH_WEB_USERNAME_SELECTOR",
      )?.selector;
      const passwordSelector = loginSuggestions.find(
        (item) => item.key === "SHAMCASH_WEB_PASSWORD_SELECTOR",
      )?.selector;
      const loginSubmitSelector = loginSuggestions.find(
        (item) => item.key === "SHAMCASH_WEB_LOGIN_SUBMIT_SELECTOR",
      )?.selector;

      if (
        username &&
        password &&
        usernameSelector &&
        passwordSelector &&
        loginSubmitSelector
      ) {
        await page
          .locator(usernameSelector)
          .first()
          .fill(username, { timeout: timeoutMs });
        await page
          .locator(passwordSelector)
          .first()
          .fill(password, { timeout: timeoutMs });

        await Promise.all([
          page
            .waitForLoadState("networkidle", { timeout: timeoutMs })
            .catch(() => null),
          page
            .locator(loginSubmitSelector)
            .first()
            .click({ timeout: timeoutMs }),
        ]);

        console.log(
          "\nLogin step was attempted using auto-detected selectors.",
        );
      } else {
        console.log(
          "\nLogin step skipped (missing credentials or required selectors).",
        );
      }
    }

    if (payoutUrl) {
      const requestedPayoutUrl = payoutUrl;
      await page.goto(payoutUrl, {
        waitUntil: "domcontentloaded",
        timeout: timeoutMs,
      });
      await page
        .waitForLoadState("networkidle", { timeout: timeoutMs })
        .catch(() => null);
      await printPageDiagnostics(page, "payout");
      if (page.url() !== requestedPayoutUrl) {
        console.log(
          `[payout] redirected from ${requestedPayoutUrl} to ${page.url()} (likely unauthenticated session).`,
        );
      }

      payoutSuggestions = (
        await Promise.all(
          payoutCandidates.map((candidate) =>
            pickBestSelector(page, candidate.key, candidate.selectors),
          ),
        )
      ).filter((item): item is Suggestion => Boolean(item));

      const hasAmount = payoutSuggestions.some(
        (item) => item.key === "SHAMCASH_WEB_PAYOUT_AMOUNT_SELECTOR",
      );
      const hasSubmit = payoutSuggestions.some(
        (item) => item.key === "SHAMCASH_WEB_PAYOUT_SUBMIT_SELECTOR",
      );

      if (!hasAmount || !hasSubmit) {
        const revealed = await attemptRevealPayoutFlow(page, timeoutMs);
        if (revealed) {
          payoutSuggestions = (
            await Promise.all(
              payoutCandidates.map((candidate) =>
                pickBestSelector(page, candidate.key, candidate.selectors),
              ),
            )
          ).filter((item): item is Suggestion => Boolean(item));
        }
      }

      printSuggestions("Payout selector suggestions", payoutSuggestions);
      if (!payoutSuggestions.length) {
        await printControlSamples(page, "payout");
        await saveDebugArtifacts(page, "payout");
      }
    }

    console.log(
      "\nDone. Copy the suggested lines into your .env and rerun doctor.",
    );
  } finally {
    await context.close();
    if (browser) {
      await browser.close();
    }
  }
};

run().catch((error) => {
  console.error(
    "ShamCash selector auto-fit failed:",
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
});
