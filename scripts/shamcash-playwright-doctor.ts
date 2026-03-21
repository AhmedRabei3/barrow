import { loadEnvConfig } from "@next/env";
import {
  chromium,
  type Browser,
  type BrowserContext,
  type Locator,
  type Page,
} from "playwright";

loadEnvConfig(process.cwd());

type ProbeItem = {
  key: string;
  selector: string;
  found: boolean;
  count: number;
};

type DoctorSummary = {
  ok: boolean;
  loginAttempted: boolean;
  loginPassed: boolean;
  qrLoginDetected: boolean;
  payoutPageChecked: boolean;
  requiredMissing: string[];
  details: {
    loginUrl: string;
    payoutUrl: string;
    probes: ProbeItem[];
    notes: string[];
  };
};

const readEnv = (key: string) => String(process.env[key] || "").trim();

const readEnvAny = (keys: string[]) => {
  for (const key of keys) {
    const value = readEnv(key);
    if (value) return value;
  }
  return "";
};

const parseTimeout = (value: string, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const parseBoolean = (value: string, fallback: boolean) => {
  if (!value) return fallback;
  const normalized = value.toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
};

const combineSelectors = (...selectors: string[]) =>
  selectors
    .map((selector) => String(selector || "").trim())
    .filter(Boolean)
    .join(", ");

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
      // Ignore selector parsing errors on individual frames.
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
      // Ignore invalid selector on specific frames.
    }
  }
  return total;
};

const probeSelector = async (
  page: Page,
  key: string,
  selector: string,
): Promise<ProbeItem> => {
  const count = await safeCount(page, selector);
  return {
    key,
    selector,
    found: count > 0,
    count,
  };
};

const printSummary = (summary: DoctorSummary) => {
  console.log("\n=== ShamCash Playwright Doctor ===");
  console.log(`Overall: ${summary.ok ? "PASS" : "FAIL"}`);
  console.log(`Login attempted: ${summary.loginAttempted}`);
  console.log(`Login passed: ${summary.loginPassed}`);
  console.log(`QR login detected: ${summary.qrLoginDetected}`);
  console.log(`Payout page checked: ${summary.payoutPageChecked}`);

  if (summary.requiredMissing.length) {
    console.log("Missing required env:");
    for (const key of summary.requiredMissing) {
      console.log(`- ${key}`);
    }
  }

  console.log(`Login URL: ${summary.details.loginUrl || "(empty)"}`);
  console.log(`Payout URL: ${summary.details.payoutUrl || "(empty)"}`);

  console.log("\nSelector probes:");
  for (const probe of summary.details.probes) {
    console.log(
      `- ${probe.key}: ${probe.found ? "FOUND" : "MISSING"} (count=${probe.count}) :: ${probe.selector}`,
    );
  }

  if (summary.details.notes.length) {
    console.log("\nNotes:");
    for (const note of summary.details.notes) {
      console.log(`- ${note}`);
    }
  }
};

const run = async () => {
  const loginUrl = readEnvAny([
    "SHAMCASH_WEB_LOGIN_URL",
    "SHAMCASH_LOGIN_PAGE_URL",
  ]);
  const payoutUrl =
    readEnvAny(["SHAMCASH_WEB_PAYOUT_URL", "SHAMCASH_TRANSFER_PAGE_URL"]) ||
    loginUrl;

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

  const usernameSelector =
    readEnvAny([
      "SHAMCASH_WEB_USERNAME_SELECTOR",
      "SHAMCASH_LOGIN_USERNAME_SELECTOR",
    ]) ||
    'input[name="username"], input[type="email"], input[autocomplete="username"]';
  const passwordSelector =
    readEnvAny([
      "SHAMCASH_WEB_PASSWORD_SELECTOR",
      "SHAMCASH_LOGIN_PASSWORD_SELECTOR",
    ]) || 'input[name="password"], input[type="password"]';
  const loginSubmitSelector =
    readEnvAny([
      "SHAMCASH_WEB_LOGIN_SUBMIT_SELECTOR",
      "SHAMCASH_LOGIN_SUBMIT_SELECTOR",
    ]) ||
    'button[type="submit"], button:has-text("تسجيل الدخول"), button:has-text("Login")';

  const walletSelector = combineSelectors(
    readEnvAny([
      "SHAMCASH_WEB_PAYOUT_WALLET_SELECTOR",
      "SHAMCASH_TRANSFER_WALLET_INPUT_SELECTOR",
    ]),
    'input[name="walletCode"], input[name*="wallet" i], textarea[name*="wallet" i], input[name*="account" i], textarea[name*="account" i], input[placeholder*="wallet" i], textarea[placeholder*="wallet" i], input[placeholder*="محفظ" i], textarea[placeholder*="محفظ" i], input[placeholder*="الحساب" i], textarea[placeholder*="الحساب" i], input[placeholder*="رقم" i], textarea[placeholder*="رقم" i]',
  );
  const amountSelector = combineSelectors(
    readEnvAny([
      "SHAMCASH_WEB_PAYOUT_AMOUNT_SELECTOR",
      "SHAMCASH_TRANSFER_AMOUNT_INPUT_SELECTOR",
    ]),
    'input[name="amount"], input[name*="amount" i], input[inputmode="decimal"], input[type="number"], input[placeholder*="amount" i], input[placeholder*="المبلغ" i], input[placeholder*="ادخل" i], input[aria-label*="المبلغ" i], textarea[placeholder*="المبلغ" i]',
  );
  const noteSelector = combineSelectors(
    readEnvAny([
      "SHAMCASH_WEB_PAYOUT_NOTE_SELECTOR",
      "SHAMCASH_TRANSFER_NOTE_INPUT_SELECTOR",
    ]),
    'textarea[name="note"], textarea[name*="note" i], input[name="note"], input[name*="note" i], textarea[placeholder*="ملاحظة" i], input[placeholder*="ملاحظة" i], textarea[placeholder*="note" i], input[placeholder*="note" i], textarea[aria-label*="ملاحظة" i], input[aria-label*="ملاحظة" i], textarea',
  );
  const currencySelector = combineSelectors(
    readEnvAny([
      "SHAMCASH_WEB_PAYOUT_CURRENCY_SELECTOR",
      "SHAMCASH_TRANSFER_CURRENCY_SELECTOR",
    ]),
    'input[name="currency"], input[name*="currency" i], [role="dialog"] [role="combobox"], [role="alertdialog"] [role="combobox"], [role="dialog"] button[aria-haspopup="listbox"], [role="alertdialog"] button[aria-haspopup="listbox"], button:has-text("USD"), button:has-text("العملة"), [role="combobox"]:has-text("USD"), [role="combobox"]:has-text("العملة")',
  );
  const historyRowSelector = combineSelectors(
    readEnvAny(["SHAMCASH_WEB_TX_ROW_SELECTOR", "SHAMCASH_ROW_SELECTOR"]),
    "tbody tr",
  );
  const historyCardSelector = combineSelectors(
    readEnvAny(["SHAMCASH_WEB_TX_CARD_SELECTOR", "SHAMCASH_CARD_SELECTOR"]),
    "div.flex.flex-col.border-gradient-custom",
  );
  const historyAmountSelector = combineSelectors(
    readEnvAny([
      "SHAMCASH_WEB_TX_AMOUNT_SELECTOR",
      "SHAMCASH_TX_AMOUNT_SELECTOR",
    ]),
    'tbody td:nth-child(4), span[dir="ltr"].text-sm.font-bold',
  );
  const historyNoteSelector = combineSelectors(
    readEnvAny(["SHAMCASH_WEB_TX_NOTE_SELECTOR", "SHAMCASH_TX_NOTE_SELECTOR"]),
    "tbody td:nth-child(5), div.flex.text-start.border-t span:last-child",
  );
  const payoutSubmitSelector = combineSelectors(
    readEnvAny([
      "SHAMCASH_WEB_PAYOUT_SUBMIT_SELECTOR",
      "SHAMCASH_TRANSFER_SUBMIT_SELECTOR",
    ]),
    'div[role="alertdialog"] button:has-text("تحويل"), [role="dialog"] button:has-text("تحويل"), button:has-text("إرسال"), button:has-text("ارسال"), button:has-text("Withdraw"), button:has-text("Transfer"), button:has-text("Send")',
  );
  const recipientTriggerSelector = combineSelectors(
    readEnvAny([
      "SHAMCASH_ADD_RECIPIENT_TRIGGER_SELECTOR",
      "SHAMCASH_WEB_PAYOUT_TRIGGER_SELECTOR",
      "SHAMCASH_TRANSFER_TRIGGER_SELECTOR",
    ]),
    'button:has-text("إرسال"), button:has-text("ارسال"), button:has-text("تحويل"), button:has-text("Transfer"), button:has-text("Send"), button.mb-2.hover\\:text-primary, nav div.cursor-pointer.rounded-full:has(> svg)',
  );
  const recipientModalSelector = combineSelectors(
    readEnvAny([
      "SHAMCASH_RECIPIENT_MODAL_SELECTOR",
      "SHAMCASH_WEB_RECIPIENT_MODAL_SELECTOR",
    ]),
    'div[role="dialog"][data-state="open"], div[role="alertdialog"][data-state="open"], [role="dialog"], [role="alertdialog"]',
  );
  const recipientCodeSelector = combineSelectors(
    readEnvAny([
      "SHAMCASH_RECIPIENT_CODE_INPUT_SELECTOR",
      "SHAMCASH_WEB_RECIPIENT_CODE_INPUT_SELECTOR",
    ]),
    'div[role="tabpanel"] textarea, div[role="tabpanel"] input[type="text"], [role="dialog"] textarea, [role="dialog"] input[type="text"], [role="alertdialog"] textarea, [role="alertdialog"] input[type="text"], input[name*="wallet" i], textarea[name*="wallet" i]',
  );
  const recipientAddressTabSelector = combineSelectors(
    readEnvAny([
      "SHAMCASH_RECIPIENT_ADDRESS_TAB_SELECTOR",
      "SHAMCASH_WEB_RECIPIENT_ADDRESS_TAB_SELECTOR",
    ]),
    '[role="tab"]:has-text("عنوان"), button:has-text("عنوان"), [role="dialog"] button:has-text("عنوان"), [role="alertdialog"] button:has-text("عنوان")',
  );
  const recipientPasteSelector = combineSelectors(
    readEnvAny([
      "SHAMCASH_RECIPIENT_PASTE_SELECTOR",
      "SHAMCASH_WEB_RECIPIENT_PASTE_SELECTOR",
    ]),
    'button:has-text("لصق العنوان"), [role="dialog"] button:has-text("لصق"), [role="alertdialog"] button:has-text("لصق"), button:has-text("Paste")',
  );
  const recipientQrTabSelector = combineSelectors(
    readEnvAny([
      "SHAMCASH_RECIPIENT_QR_TAB_SELECTOR",
      "SHAMCASH_WEB_RECIPIENT_QR_TAB_SELECTOR",
    ]),
    '[role="tab"]:has-text("QR"), [role="tab"]:has-text("رمز"), button:has-text("QR"), button:has-text("رمز"), button:has-text("صورة"), [id$="trigger-image"], [id*="trigger-qr"]',
  );
  const recipientQrUploadSelector = combineSelectors(
    readEnvAny([
      "SHAMCASH_RECIPIENT_QR_UPLOAD_INPUT_SELECTOR",
      "SHAMCASH_WEB_RECIPIENT_QR_UPLOAD_SELECTOR",
      "SHAMCASH_WEB_RECIPIENT_QR_UPLOAD_INPUT_SELECTOR",
    ]),
    'div[role="dialog"] input[type="file"], div[role="alertdialog"] input[type="file"], input[type="file"][accept*="image"], input[type="file"]',
  );
  const recipientSaveSelector = combineSelectors(
    readEnvAny([
      "SHAMCASH_RECIPIENT_SAVE_SELECTOR",
      "SHAMCASH_WEB_RECIPIENT_SAVE_SELECTOR",
    ]),
    '[role="alertdialog"] button:has-text("تحويل"), [role="dialog"] button:has-text("تحويل"), [role="alertdialog"] button:has-text("إضافة"), [role="dialog"] button:has-text("إضافة"), button:has-text("إرسال"), button:has-text("ارسال"), button:has-text("إضافة"), button:has-text("اضافة"), button:has-text("Transfer"), button:has-text("Send"), button:has-text("Add")',
  );

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
  const profileDir = readEnvAny([
    "SHAMCASH_WEB_PROFILE_DIR",
    "SHAMCASH_PROFILE_PATH",
    "SHAMCASH_PLAYWRIGHT_PROFILE_DIR",
  ]);
  const allowSessionOnly = parseBoolean(
    readEnvAny([
      "SHAMCASH_WEB_ALLOW_SESSION_ONLY",
      "SHAMCASH_ALLOW_SESSION_ONLY",
    ]),
    true,
  );
  const keepOpenForQr = parseBoolean(
    readEnvAny(["SHAMCASH_BOOTSTRAP_KEEP_OPEN", "SHAMCASH_DOCTOR_WAIT_FOR_QR"]),
    false,
  );
  const keepOpenMs = parseTimeout(
    readEnvAny([
      "SHAMCASH_BOOTSTRAP_KEEP_OPEN_MS",
      "SHAMCASH_DOCTOR_WAIT_FOR_QR_MS",
    ]),
    120000,
  );

  const requiredMissing: string[] = [];
  if (!loginUrl)
    requiredMissing.push("SHAMCASH_WEB_LOGIN_URL or SHAMCASH_LOGIN_PAGE_URL");

  const probes: ProbeItem[] = [];
  const notes: string[] = [];

  let loginAttempted = false;
  let loginPassed = false;
  let qrLoginDetected = false;
  let payoutPageChecked = false;

  if (requiredMissing.length) {
    const summary: DoctorSummary = {
      ok: false,
      loginAttempted,
      loginPassed,
      qrLoginDetected,
      payoutPageChecked,
      requiredMissing,
      details: {
        loginUrl,
        payoutUrl,
        probes,
        notes,
      },
    };

    printSummary(summary);
    process.exit(1);
  }

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

    await page.goto(loginUrl, {
      waitUntil: "domcontentloaded",
      timeout: timeoutMs,
    });
    await page
      .waitForLoadState("networkidle", { timeout: timeoutMs })
      .catch(() => null);
    await page.waitForTimeout(1000);

    if (keepOpenForQr) {
      console.log(
        `Manual login window opened. Waiting ${keepOpenMs}ms before selector probing...`,
      );
      await page.waitForTimeout(keepOpenMs);
      await page
        .waitForLoadState("networkidle", { timeout: timeoutMs })
        .catch(() => null);
    }

    probes.push(await probeSelector(page, "login.username", usernameSelector));
    probes.push(await probeSelector(page, "login.password", passwordSelector));
    probes.push(await probeSelector(page, "login.submit", loginSubmitSelector));
    probes.push(
      await probeSelector(
        page,
        "login.qr",
        "canvas#react-qrcode-logo, canvas[id='react-qrcode-logo'], canvas[id*='qrcode' i]",
      ),
    );

    qrLoginDetected = probes.some(
      (probe) => probe.key === "login.qr" && probe.found,
    );

    const loginSelectorsReady = probes
      .filter((probe) => probe.key.startsWith("login."))
      .every((probe) => probe.found);

    if (!loginSelectorsReady) {
      notes.push("One or more login selectors are missing on login page.");
      if (qrLoginDetected) {
        notes.push(
          "QR login detected. ShamCash may require scanning QR from mobile app instead of username/password form.",
        );
        if (!profileDir) {
          notes.push(
            "Set SHAMCASH_PROFILE_PATH (or SHAMCASH_WEB_PROFILE_DIR) and authenticate once manually, then run in session-only mode.",
          );
        }
      }
    }

    if (username && password && loginSelectorsReady) {
      loginAttempted = true;

      const usernameField = await getLocatorAcrossFrames(
        page,
        usernameSelector,
      );
      const passwordField = await getLocatorAcrossFrames(
        page,
        passwordSelector,
      );
      const submitButton = await getLocatorAcrossFrames(
        page,
        loginSubmitSelector,
      );

      if (!usernameField || !passwordField || !submitButton) {
        notes.push(
          "Login skipped: one or more login controls became unavailable.",
        );
      } else {
        await usernameField.fill(username, { timeout: timeoutMs });
        await passwordField.fill(password, { timeout: timeoutMs });

        await Promise.all([
          page
            .waitForLoadState("networkidle", { timeout: timeoutMs })
            .catch(() => null),
          submitButton.click({ timeout: timeoutMs }),
        ]);

        const stillOnLoginForm =
          (await safeCount(page, usernameSelector)) > 0 &&
          (await safeCount(page, passwordSelector)) > 0;

        loginPassed = !stillOnLoginForm;
        if (!loginPassed) {
          notes.push(
            "Login might have failed: username/password fields are still present after submit.",
          );
        }
      }
    } else if (!username || !password) {
      notes.push(
        "Login credentials are missing in env; login submit was skipped (selector probes still valid).",
      );
    } else if (qrLoginDetected && allowSessionOnly) {
      notes.push(
        "Session-only mode is enabled; login form interaction skipped due to QR login page.",
      );
    }

    if (payoutUrl) {
      await page.goto(payoutUrl, {
        waitUntil: "domcontentloaded",
        timeout: timeoutMs,
      });
      await page
        .waitForLoadState("networkidle", { timeout: timeoutMs })
        .catch(() => null);
      payoutPageChecked = true;

      const requested = payoutUrl;
      const actual = page.url();
      if (actual && requested && actual !== requested) {
        notes.push(
          `Payout URL redirected: requested=${requested} actual=${actual}`,
        );
      }

      probes.push(await probeSelector(page, "payout.wallet", walletSelector));
      probes.push(await probeSelector(page, "payout.amount", amountSelector));
      probes.push(await probeSelector(page, "payout.note", noteSelector));
      probes.push(
        await probeSelector(page, "payout.currency", currencySelector),
      );
      probes.push(
        await probeSelector(page, "payout.submit", payoutSubmitSelector),
      );
      probes.push(
        await probeSelector(page, "payout.trigger", recipientTriggerSelector),
      );
      probes.push(
        await probeSelector(page, "history.rows", historyRowSelector),
      );
      probes.push(
        await probeSelector(page, "history.cards", historyCardSelector),
      );
      probes.push(
        await probeSelector(page, "history.amount", historyAmountSelector),
      );
      probes.push(
        await probeSelector(page, "history.note", historyNoteSelector),
      );

      const directPayoutReady =
        probes.find((probe) => probe.key === "payout.amount")?.found &&
        probes.find((probe) => probe.key === "payout.submit")?.found;

      if (!directPayoutReady) {
        let revealAttempted = false;

        for (const frame of page.frames()) {
          let triggerList: Locator;
          try {
            triggerList = frame.locator(recipientTriggerSelector);
          } catch {
            continue;
          }

          const triggerCount = await triggerList.count().catch(() => 0);
          if (!triggerCount) continue;

          for (let index = 0; index < Math.min(triggerCount, 6); index += 1) {
            const trigger = triggerList.nth(index);
            try {
              await trigger.click({ timeout: Math.min(timeoutMs, 8000) });
              revealAttempted = true;

              await page.waitForTimeout(600);
              await page
                .waitForLoadState("networkidle", { timeout: timeoutMs })
                .catch(() => null);

              probes.push(
                await probeSelector(
                  page,
                  "payout.modal",
                  recipientModalSelector,
                ),
              );
              probes.push(
                await probeSelector(
                  page,
                  "payout.recipientCode",
                  recipientCodeSelector,
                ),
              );
              probes.push(
                await probeSelector(
                  page,
                  "payout.recipientAddressTab",
                  recipientAddressTabSelector,
                ),
              );
              probes.push(
                await probeSelector(
                  page,
                  "payout.recipientPaste",
                  recipientPasteSelector,
                ),
              );
              probes.push(
                await probeSelector(
                  page,
                  "payout.recipientQrTab",
                  recipientQrTabSelector,
                ),
              );
              probes.push(
                await probeSelector(
                  page,
                  "payout.recipientQrUpload",
                  recipientQrUploadSelector,
                ),
              );

              const recipientQrTab = await getLocatorAcrossFrames(
                page,
                recipientQrTabSelector,
              );
              if (recipientQrTab) {
                await recipientQrTab
                  .click({ timeout: Math.min(timeoutMs, 5000) })
                  .catch(() => null);
                await page.waitForTimeout(500);
                probes.push(
                  await probeSelector(
                    page,
                    "payout.recipientQrUpload.afterQrTab",
                    recipientQrUploadSelector,
                  ),
                );
              }

              const recipientCodeField = await getLocatorAcrossFrames(
                page,
                recipientCodeSelector,
              );
              if (recipientCodeField) {
                await recipientCodeField.fill("TEST-WALLET-CODE", {
                  timeout: Math.min(timeoutMs, 5000),
                });
                const recipientSaveButton = await getLocatorAcrossFrames(
                  page,
                  recipientSaveSelector,
                );
                if (recipientSaveButton) {
                  await recipientSaveButton.click({
                    timeout: Math.min(timeoutMs, 5000),
                  });
                  await page.waitForTimeout(700);
                  await page
                    .waitForLoadState("networkidle", { timeout: timeoutMs })
                    .catch(() => null);
                }
              }

              probes.push(
                await probeSelector(
                  page,
                  "payout.amount.afterTrigger",
                  amountSelector,
                ),
              );
              probes.push(
                await probeSelector(
                  page,
                  "payout.currency.afterTrigger",
                  currencySelector,
                ),
              );
              probes.push(
                await probeSelector(
                  page,
                  "payout.submit.afterTrigger",
                  payoutSubmitSelector,
                ),
              );
              probes.push(
                await probeSelector(
                  page,
                  "history.rows.afterTrigger",
                  historyRowSelector,
                ),
              );
              probes.push(
                await probeSelector(
                  page,
                  "history.cards.afterTrigger",
                  historyCardSelector,
                ),
              );

              const amountAfterTrigger = probes.find(
                (probe) => probe.key === "payout.amount.afterTrigger",
              )?.found;
              const submitAfterTrigger = probes.find(
                (probe) => probe.key === "payout.submit.afterTrigger",
              )?.found;
              if (amountAfterTrigger && submitAfterTrigger) {
                break;
              }

              await page.keyboard.press("Escape").catch(() => null);
            } catch {
              // Continue to next trigger candidate.
            }
          }

          const amountAfterTrigger = probes.find(
            (probe) => probe.key === "payout.amount.afterTrigger",
          )?.found;
          const submitAfterTrigger = probes.find(
            (probe) => probe.key === "payout.submit.afterTrigger",
          )?.found;
          if (amountAfterTrigger && submitAfterTrigger) {
            break;
          }
        }

        if (revealAttempted) {
          notes.push(
            "Doctor attempted trigger-based payout reveal to validate modal/amount flow.",
          );
        }

        const amountReadySoFar = probes.some(
          (probe) => probe.key.startsWith("payout.amount") && probe.found,
        );
        const submitReadySoFar = probes.some(
          (probe) => probe.key.startsWith("payout.submit") && probe.found,
        );

        if (!amountReadySoFar || !submitReadySoFar) {
          const fallbackRoutes = [
            readEnvAny(["SHAMCASH_TRANSACTIONS_PAGE_URL"]),
            loginUrl.includes("/auth/login")
              ? loginUrl.replace("/auth/login", "/application/home")
              : "",
            loginUrl.includes("/auth/login")
              ? loginUrl.replace("/auth/login", "/application/favorite")
              : "",
          ]
            .filter(Boolean)
            .filter((route) => route !== requested);

          for (const route of fallbackRoutes) {
            await page.goto(route, {
              waitUntil: "domcontentloaded",
              timeout: timeoutMs,
            });
            await page
              .waitForLoadState("networkidle", { timeout: timeoutMs })
              .catch(() => null);

            probes.push(
              await probeSelector(
                page,
                "payout.amount.fallback",
                amountSelector,
              ),
            );
            probes.push(
              await probeSelector(
                page,
                "payout.currency.fallback",
                currencySelector,
              ),
            );
            probes.push(
              await probeSelector(
                page,
                "payout.submit.fallback",
                payoutSubmitSelector,
              ),
            );
            probes.push(
              await probeSelector(
                page,
                "payout.trigger.fallback",
                recipientTriggerSelector,
              ),
            );
            probes.push(
              await probeSelector(
                page,
                "history.rows.fallback",
                historyRowSelector,
              ),
            );
            probes.push(
              await probeSelector(
                page,
                "history.cards.fallback",
                historyCardSelector,
              ),
            );

            for (const frame of page.frames()) {
              let triggerList: Locator;
              try {
                triggerList = frame.locator(recipientTriggerSelector);
              } catch {
                continue;
              }

              const triggerCount = await triggerList.count().catch(() => 0);
              if (!triggerCount) continue;

              for (
                let index = 0;
                index < Math.min(triggerCount, 6);
                index += 1
              ) {
                const trigger = triggerList.nth(index);
                try {
                  await trigger.click({ timeout: Math.min(timeoutMs, 8000) });
                  await page.waitForTimeout(600);
                  await page
                    .waitForLoadState("networkidle", { timeout: timeoutMs })
                    .catch(() => null);

                  probes.push(
                    await probeSelector(
                      page,
                      "payout.recipientAddressTab.fallback",
                      recipientAddressTabSelector,
                    ),
                  );
                  probes.push(
                    await probeSelector(
                      page,
                      "payout.recipientPaste.fallback",
                      recipientPasteSelector,
                    ),
                  );
                  probes.push(
                    await probeSelector(
                      page,
                      "payout.recipientQrTab.fallback",
                      recipientQrTabSelector,
                    ),
                  );
                  const recipientQrTab = await getLocatorAcrossFrames(
                    page,
                    recipientQrTabSelector,
                  );
                  if (recipientQrTab) {
                    await recipientQrTab
                      .click({ timeout: Math.min(timeoutMs, 5000) })
                      .catch(() => null);
                    await page.waitForTimeout(500);
                    probes.push(
                      await probeSelector(
                        page,
                        "payout.recipientQrUpload.fallback.afterQrTab",
                        recipientQrUploadSelector,
                      ),
                    );
                  }

                  probes.push(
                    await probeSelector(
                      page,
                      "payout.amount.fallback.afterTrigger",
                      amountSelector,
                    ),
                  );
                  probes.push(
                    await probeSelector(
                      page,
                      "payout.currency.fallback.afterTrigger",
                      currencySelector,
                    ),
                  );
                  probes.push(
                    await probeSelector(
                      page,
                      "payout.submit.fallback.afterTrigger",
                      payoutSubmitSelector,
                    ),
                  );
                  probes.push(
                    await probeSelector(
                      page,
                      "history.rows.fallback.afterTrigger",
                      historyRowSelector,
                    ),
                  );

                  const amountAfterTrigger = probes.some(
                    (probe) =>
                      probe.key.startsWith("payout.amount") && probe.found,
                  );
                  const submitAfterTrigger = probes.some(
                    (probe) =>
                      probe.key.startsWith("payout.submit") && probe.found,
                  );
                  if (amountAfterTrigger && submitAfterTrigger) {
                    break;
                  }

                  await page.keyboard.press("Escape").catch(() => null);
                } catch {
                  // Continue scanning trigger candidates.
                }
              }

              const amountAfterTrigger = probes.some(
                (probe) => probe.key.startsWith("payout.amount") && probe.found,
              );
              const submitAfterTrigger = probes.some(
                (probe) => probe.key.startsWith("payout.submit") && probe.found,
              );
              if (amountAfterTrigger && submitAfterTrigger) {
                break;
              }
            }

            const fallbackAmountReady = probes.some(
              (probe) => probe.key.startsWith("payout.amount") && probe.found,
            );
            const fallbackSubmitReady = probes.some(
              (probe) => probe.key.startsWith("payout.submit") && probe.found,
            );
            if (fallbackAmountReady && fallbackSubmitReady) {
              notes.push(
                `Doctor found payout controls on fallback route: ${route}`,
              );
              break;
            }
          }
        }
      }
    }
  } finally {
    await context.close();
    if (browser) {
      await browser.close();
    }
  }

  const payoutAmountReady = probes.some(
    (probe) => probe.key.startsWith("payout.amount") && probe.found,
  );
  const payoutSubmitReady = probes.some(
    (probe) => probe.key.startsWith("payout.submit") && probe.found,
  );

  const missingCriticalSelectors = !(payoutAmountReady && payoutSubmitReady);

  const missingLoginSelectors = probes.some(
    (probe) =>
      ["login.username", "login.password", "login.submit"].includes(
        probe.key,
      ) && !probe.found,
  );

  const loginRequirementFailed =
    !allowSessionOnly && !qrLoginDetected && missingLoginSelectors;

  const ok =
    !missingCriticalSelectors &&
    !loginRequirementFailed &&
    (!loginAttempted || loginPassed);

  const summary: DoctorSummary = {
    ok,
    loginAttempted,
    loginPassed,
    qrLoginDetected,
    payoutPageChecked,
    requiredMissing,
    details: {
      loginUrl,
      payoutUrl,
      probes,
      notes,
    },
  };

  printSummary(summary);

  if (!ok) {
    process.exit(1);
  }
};

run().catch((error) => {
  console.error(
    "ShamCash doctor failed:",
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
});
