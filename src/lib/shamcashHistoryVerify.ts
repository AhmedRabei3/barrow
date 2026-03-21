import {
  chromium,
  firefox,
  webkit,
  type Browser,
  type BrowserContext,
  type Locator,
  type Page,
} from "playwright";

type VerifyInput = {
  amount: number;
  requestedAt?: Date;
  expectedTransactionId?: string;
};

type VerifyIncomingInput = {
  amount: number;
  expectedEmail?: string;
  expectedNote?: string;
  requestedAt?: Date;
  expectedTransactionId?: string;
};

export type ShamCashHistoryVerifyResult = {
  matched: boolean;
  transactionId: string;
  rawText: string;
  recordedAt: string;
};

type ParsedHistoryRow = {
  rawText: string;
  transactionId: string;
  amountUsd: number | null;
  recordedAt: Date | null;
  counterpartyText: string;
  accountText: string;
  noteText: string;
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

const resolveBrowserEngine = () => {
  const raw = readEnvAny([
    "SHAMCASH_WEB_BROWSER",
    "SHAMCASH_BROWSER_NAME",
    "SHAMCASH_BROWSER",
  ])
    .toLowerCase()
    .trim();

  if (["firefox", "ff"].includes(raw)) return "firefox" as const;
  if (["webkit", "wk", "safari"].includes(raw)) return "webkit" as const;
  return "chromium" as const;
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
      // Ignore invalid selectors on specific frames.
    }
  }

  return null;
};

const tryGoto = async (page: Page, url: string, timeoutMs: number) => {
  const target = String(url || "").trim();
  if (!target) return false;

  try {
    await page.goto(target, {
      waitUntil: "domcontentloaded",
      timeout: timeoutMs,
    });
    await page
      .waitForLoadState("networkidle", { timeout: timeoutMs })
      .catch(() => null);
    return true;
  } catch {
    return false;
  }
};

const parseTransactionIdFromText = (text: string) => {
  const match = String(text || "").match(/#\s*([0-9]{4,})/);
  return match ? match[1] : "";
};

const parseUsdAmountFromText = (text: string): number | null => {
  const normalized = String(text || "");

  const signedMatch = normalized.match(
    /([+-])\s*([0-9]+(?:[\.,][0-9]+)?)\s*USD/i,
  );
  if (signedMatch) {
    const sign = signedMatch[1] === "-" ? -1 : 1;
    const numeric = Number(signedMatch[2].replace(",", "."));
    if (!Number.isFinite(numeric)) return null;
    return Number((sign * numeric).toFixed(2));
  }

  const amountNearCurrency =
    normalized.match(/(?:USD|\$)\s*([+-]?[0-9]+(?:[\.,][0-9]+)?)/i) ||
    normalized.match(/([+-]?[0-9]+(?:[\.,][0-9]+)?)\s*(?:USD|\$)/i);

  if (!amountNearCurrency) return null;

  const numeric = Number(amountNearCurrency[1].replace(",", "."));
  if (!Number.isFinite(numeric)) return null;

  return Number(numeric.toFixed(2));
};

const parseRecordedAtFromText = (text: string): Date | null => {
  const match = String(text || "").match(
    /(\d{4}-\d{2}-\d{2})\s*-\s*(\d{2}:\d{2}:\d{2})/,
  );
  if (!match) return null;

  const candidate = new Date(`${match[1]}T${match[2]}`);
  return Number.isNaN(candidate.getTime()) ? null : candidate;
};

const normalizeVisibleText = (value: string) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim();

const getLocatorText = async (locator: Locator) =>
  normalizeVisibleText(
    String((await locator.textContent().catch(() => "")) || ""),
  );

const buildParsedHistoryRow = (input: {
  rawText: string;
  transactionText?: string;
  amountText?: string;
  recordedText?: string;
  counterpartyText?: string;
  accountText?: string;
  noteText?: string;
}): ParsedHistoryRow | null => {
  const rawText = normalizeVisibleText(input.rawText);
  if (!rawText) return null;

  const transactionText = normalizeVisibleText(input.transactionText || "");
  const amountText = normalizeVisibleText(input.amountText || "");
  const recordedText = normalizeVisibleText(input.recordedText || "");

  return {
    rawText,
    transactionId:
      parseTransactionIdFromText(transactionText) ||
      parseTransactionIdFromText(rawText),
    amountUsd:
      parseUsdAmountFromText(amountText) ?? parseUsdAmountFromText(rawText),
    recordedAt:
      parseRecordedAtFromText(recordedText) ?? parseRecordedAtFromText(rawText),
    counterpartyText: normalizeVisibleText(input.counterpartyText || ""),
    accountText: normalizeVisibleText(input.accountText || ""),
    noteText: normalizeVisibleText(input.noteText || ""),
  };
};

const pushParsedHistoryRow = (input: {
  rows: ParsedHistoryRow[];
  seen: Set<string>;
  row: ParsedHistoryRow | null;
}) => {
  const { rows, seen, row } = input;
  if (!row) return;

  const key = row.transactionId || row.rawText;
  if (!key || seen.has(key)) return;

  seen.add(key);
  rows.push(row);
};

const parseTableHistoryRow = async (row: Locator) => {
  const rawText = normalizeVisibleText(
    String((await row.textContent().catch(() => "")) || ""),
  );
  if (!rawText) return null;

  const cells = row.locator("td");
  const cellCount = await cells.count().catch(() => 0);
  if (cellCount < 4) {
    return buildParsedHistoryRow({ rawText });
  }

  const counterpartyCell = cells.nth(0);
  const counterpartySpans = counterpartyCell.locator("span");

  const counterpartyText =
    (await getLocatorText(counterpartySpans.first())) ||
    (await getLocatorText(counterpartyCell));
  const accountText = await getLocatorText(counterpartySpans.nth(1));

  return buildParsedHistoryRow({
    rawText,
    counterpartyText,
    accountText,
    transactionText: await getLocatorText(cells.nth(1)),
    recordedText: await getLocatorText(cells.nth(2)),
    amountText: await getLocatorText(cells.nth(3)),
    noteText: cellCount >= 5 ? await getLocatorText(cells.nth(4)) : "",
  });
};

const parseCardHistoryRow = async (card: Locator) => {
  const rawText = normalizeVisibleText(
    String((await card.textContent().catch(() => "")) || ""),
  );
  if (!rawText) return null;

  return buildParsedHistoryRow({
    rawText,
    counterpartyText: await getLocatorText(
      card.locator("span.font-semibold").first(),
    ),
    transactionText: await getLocatorText(
      card.locator("span.text-xs.text-gray-500").first(),
    ),
    recordedText: await getLocatorText(
      card.locator("span.text-xs.text-application-login_text").first(),
    ),
    amountText: await getLocatorText(
      card.locator('span[dir="ltr"].text-sm.font-bold').first(),
    ),
    noteText: await getLocatorText(
      card.locator("div.flex.text-start.border-t span").last(),
    ),
  });
};

const collectParsedHistoryRows = async (input: {
  page: Page;
  rowSelector: string;
  cardSelector: string;
  maxRows: number;
}) => {
  const { page, rowSelector, cardSelector, maxRows } = input;

  const rows: ParsedHistoryRow[] = [];
  const seen = new Set<string>();

  for (const frame of page.frames()) {
    let locator: Locator;
    try {
      locator = frame.locator(rowSelector);
    } catch {
      continue;
    }

    const count = await locator.count().catch(() => 0);
    if (!count) continue;

    for (let index = 0; index < Math.min(count, maxRows); index += 1) {
      const row = await parseTableHistoryRow(locator.nth(index));
      pushParsedHistoryRow({ rows, seen, row });
    }

    if (!cardSelector) continue;

    let cardLocator: Locator;
    try {
      cardLocator = frame.locator(cardSelector);
    } catch {
      continue;
    }

    const cardCount = await cardLocator.count().catch(() => 0);
    if (!cardCount) continue;

    for (let index = 0; index < Math.min(cardCount, maxRows); index += 1) {
      const row = await parseCardHistoryRow(cardLocator.nth(index));
      pushParsedHistoryRow({ rows, seen, row });
    }
  }

  return rows;
};

const normalizeAmount = (amount: number) => Number(amount.toFixed(2));

const normalizeSearchText = (value: string) =>
  String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const buildHistorySearchText = (row: ParsedHistoryRow) =>
  normalizeSearchText(
    [row.counterpartyText, row.accountText, row.noteText, row.rawText]
      .filter(Boolean)
      .join(" "),
  );

const toHistoryVerifyResult = (
  row: ParsedHistoryRow,
): ShamCashHistoryVerifyResult => ({
  matched: true,
  transactionId: row.transactionId,
  rawText: row.rawText,
  recordedAt: row.recordedAt ? row.recordedAt.toISOString() : "",
});

export const verifyShamCashOutgoingTransferInHistory = async (
  input: VerifyInput,
): Promise<ShamCashHistoryVerifyResult | null> => {
  const amount = Number(input.amount || 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Invalid amount for ShamCash history verification");
  }

  const loginUrl =
    readEnvAny(["SHAMCASH_WEB_LOGIN_URL", "SHAMCASH_LOGIN_PAGE_URL"]) || "";
  const payoutUrl =
    readEnvAny(["SHAMCASH_WEB_PAYOUT_URL", "SHAMCASH_TRANSFER_PAGE_URL"]) ||
    loginUrl;

  if (!loginUrl && !payoutUrl) {
    throw new Error(
      "Missing ShamCash login/payout URL for history verification",
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

  const historyRowSelector = combineSelectors(
    readEnvAny(["SHAMCASH_WEB_TX_ROW_SELECTOR", "SHAMCASH_ROW_SELECTOR"]),
    "tbody tr",
  );
  const historyCardSelector = combineSelectors(
    readEnvAny(["SHAMCASH_WEB_TX_CARD_SELECTOR", "SHAMCASH_CARD_SELECTOR"]),
    "div.flex.flex-col.border-gradient-custom",
  );

  const timeoutMs = parseTimeout(
    readEnvAny(["SHAMCASH_WEB_TIMEOUT_MS", "SHAMCASH_TIMEOUT_MS"]),
    30_000,
  );
  const verifyTimeoutMs = parseTimeout(
    readEnvAny(["SHAMCASH_WEB_HISTORY_VERIFY_TIMEOUT_MS"]),
    75_000,
  );
  const headless = parseBoolean(
    readEnvAny(["SHAMCASH_WEB_HEADLESS", "SHAMCASH_HEADLESS"]),
    true,
  );
  const allowSessionOnly = parseBoolean(
    readEnvAny([
      "SHAMCASH_WEB_ALLOW_SESSION_ONLY",
      "SHAMCASH_ALLOW_SESSION_ONLY",
    ]),
    true,
  );

  const browserChannel = readEnv("SHAMCASH_BROWSER_CHANNEL") || undefined;
  const browserExecutablePath =
    readEnv("SHAMCASH_BROWSER_EXECUTABLE_PATH") || undefined;
  const browserEngine = resolveBrowserEngine();
  const profileDir =
    readEnvAny([
      "SHAMCASH_WEB_PROFILE_DIR",
      "SHAMCASH_PROFILE_PATH",
      "SHAMCASH_PLAYWRIGHT_PROFILE_DIR",
    ]) || undefined;

  const browserType =
    browserEngine === "firefox"
      ? firefox
      : browserEngine === "webkit"
        ? webkit
        : chromium;

  const launchChannel =
    browserEngine === "chromium" ? browserChannel : undefined;
  const launchExecutablePath =
    browserEngine === "chromium" ? browserExecutablePath : undefined;

  let browser: Browser | null = null;
  let context: BrowserContext;

  const launchContext = async (launchHeadless: boolean) => {
    if (profileDir) {
      return browserType.launchPersistentContext(profileDir, {
        headless: launchHeadless,
        channel: launchChannel,
        executablePath: launchExecutablePath,
      });
    }

    browser = await browserType.launch({
      headless: launchHeadless,
      channel: launchChannel,
      executablePath: launchExecutablePath,
    });
    return browser.newContext();
  };

  try {
    context = await launchContext(headless);
  } catch (launchError) {
    if (headless) throw launchError;
    context = await launchContext(true);
  }

  try {
    const page = await context.newPage();
    const entryUrl = payoutUrl || loginUrl;
    await tryGoto(page, entryUrl, timeoutMs);

    const usernameField = await getLocatorAcrossFrames(page, usernameSelector);
    const passwordField = await getLocatorAcrossFrames(page, passwordSelector);
    const loginSubmitButton = await getLocatorAcrossFrames(
      page,
      loginSubmitSelector,
    );

    if (
      usernameField &&
      passwordField &&
      loginSubmitButton &&
      username &&
      password
    ) {
      await usernameField.fill(username, { timeout: timeoutMs });
      await passwordField.fill(password, { timeout: timeoutMs });

      await Promise.all([
        page
          .waitForLoadState("networkidle", { timeout: timeoutMs })
          .catch(() => null),
        loginSubmitButton.click({ timeout: timeoutMs }),
      ]);
    } else if (!allowSessionOnly) {
      throw new Error(
        "Could not access ShamCash authenticated session for history verification",
      );
    }

    const historyCandidates = Array.from(
      new Set(
        [
          readEnvAny(["SHAMCASH_TRANSACTIONS_PAGE_URL"]),
          payoutUrl,
          loginUrl.includes("/auth/login")
            ? loginUrl.replace("/auth/login", "/application/home")
            : "",
          loginUrl.includes("/auth/login")
            ? loginUrl.replace("/auth/login", "/application/transaction")
            : "",
        ]
          .map((url) => String(url || "").trim())
          .filter(Boolean),
      ),
    );

    const expectedAmount = normalizeAmount(amount);
    const expectedTransactionId = String(
      input.expectedTransactionId || "",
    ).trim();
    const requestedAtMs = input.requestedAt
      ? new Date(input.requestedAt).getTime()
      : NaN;

    const startedAt = Date.now();

    while (Date.now() - startedAt < verifyTimeoutMs) {
      for (const route of historyCandidates) {
        await tryGoto(page, route, timeoutMs);

        const rows = await collectParsedHistoryRows({
          page,
          rowSelector: historyRowSelector,
          cardSelector: historyCardSelector,
          maxRows: 30,
        });

        for (const row of rows) {
          const byTransactionId =
            expectedTransactionId &&
            row.transactionId === expectedTransactionId;
          const byAmount =
            row.amountUsd !== null &&
            row.amountUsd < 0 &&
            Math.abs(Math.abs(row.amountUsd) - expectedAmount) < 0.01;

          const passesTimeGate =
            Number.isNaN(requestedAtMs) ||
            !row.recordedAt ||
            row.recordedAt.getTime() >= requestedAtMs - 5 * 60 * 1000;

          if ((byTransactionId || byAmount) && passesTimeGate) {
            return toHistoryVerifyResult(row);
          }
        }
      }

      await page.waitForTimeout(2000);
    }

    return null;
  } finally {
    await context.close();
    if (browser) {
      await browser.close();
    }
  }
};

export const verifyShamCashIncomingTransferInHistory = async (
  input: VerifyIncomingInput,
): Promise<ShamCashHistoryVerifyResult | null> => {
  const amount = Number(input.amount || 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Invalid amount for ShamCash incoming verification");
  }

  const loginUrl =
    readEnvAny(["SHAMCASH_WEB_LOGIN_URL", "SHAMCASH_LOGIN_PAGE_URL"]) || "";
  const payoutUrl =
    readEnvAny(["SHAMCASH_WEB_PAYOUT_URL", "SHAMCASH_TRANSFER_PAGE_URL"]) ||
    loginUrl;

  if (!loginUrl && !payoutUrl) {
    throw new Error(
      "Missing ShamCash login/payout URL for incoming history verification",
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

  const historyRowSelector = combineSelectors(
    readEnvAny(["SHAMCASH_WEB_TX_ROW_SELECTOR", "SHAMCASH_ROW_SELECTOR"]),
    "tbody tr",
  );
  const historyCardSelector = combineSelectors(
    readEnvAny(["SHAMCASH_WEB_TX_CARD_SELECTOR", "SHAMCASH_CARD_SELECTOR"]),
    "div.flex.flex-col.border-gradient-custom",
  );

  const timeoutMs = parseTimeout(
    readEnvAny(["SHAMCASH_WEB_TIMEOUT_MS", "SHAMCASH_TIMEOUT_MS"]),
    30_000,
  );
  const verifyTimeoutMs = parseTimeout(
    readEnvAny(["SHAMCASH_WEB_HISTORY_VERIFY_TIMEOUT_MS"]),
    75_000,
  );
  const headless = parseBoolean(
    readEnvAny(["SHAMCASH_WEB_HEADLESS", "SHAMCASH_HEADLESS"]),
    true,
  );
  const allowSessionOnly = parseBoolean(
    readEnvAny([
      "SHAMCASH_WEB_ALLOW_SESSION_ONLY",
      "SHAMCASH_ALLOW_SESSION_ONLY",
    ]),
    true,
  );

  const browserChannel = readEnv("SHAMCASH_BROWSER_CHANNEL") || undefined;
  const browserExecutablePath =
    readEnv("SHAMCASH_BROWSER_EXECUTABLE_PATH") || undefined;
  const browserEngine = resolveBrowserEngine();
  const profileDir =
    readEnvAny([
      "SHAMCASH_WEB_PROFILE_DIR",
      "SHAMCASH_PROFILE_PATH",
      "SHAMCASH_PLAYWRIGHT_PROFILE_DIR",
    ]) || undefined;

  const browserType =
    browserEngine === "firefox"
      ? firefox
      : browserEngine === "webkit"
        ? webkit
        : chromium;

  const launchChannel =
    browserEngine === "chromium" ? browserChannel : undefined;
  const launchExecutablePath =
    browserEngine === "chromium" ? browserExecutablePath : undefined;

  let browser: Browser | null = null;
  let context: BrowserContext;

  const launchContext = async (launchHeadless: boolean) => {
    if (profileDir) {
      return browserType.launchPersistentContext(profileDir, {
        headless: launchHeadless,
        channel: launchChannel,
        executablePath: launchExecutablePath,
      });
    }

    browser = await browserType.launch({
      headless: launchHeadless,
      channel: launchChannel,
      executablePath: launchExecutablePath,
    });
    return browser.newContext();
  };

  try {
    context = await launchContext(headless);
  } catch (launchError) {
    if (headless) throw launchError;
    context = await launchContext(true);
  }

  try {
    const page = await context.newPage();
    const entryUrl = payoutUrl || loginUrl;
    await tryGoto(page, entryUrl, timeoutMs);

    const usernameField = await getLocatorAcrossFrames(page, usernameSelector);
    const passwordField = await getLocatorAcrossFrames(page, passwordSelector);
    const loginSubmitButton = await getLocatorAcrossFrames(
      page,
      loginSubmitSelector,
    );

    if (
      usernameField &&
      passwordField &&
      loginSubmitButton &&
      username &&
      password
    ) {
      await usernameField.fill(username, { timeout: timeoutMs });
      await passwordField.fill(password, { timeout: timeoutMs });

      await Promise.all([
        page
          .waitForLoadState("networkidle", { timeout: timeoutMs })
          .catch(() => null),
        loginSubmitButton.click({ timeout: timeoutMs }),
      ]);
    } else if (!allowSessionOnly) {
      throw new Error(
        "Could not access ShamCash authenticated session for incoming verification",
      );
    }

    const historyCandidates = Array.from(
      new Set(
        [
          readEnvAny(["SHAMCASH_TRANSACTIONS_PAGE_URL"]),
          payoutUrl,
          loginUrl.includes("/auth/login")
            ? loginUrl.replace("/auth/login", "/application/home")
            : "",
          loginUrl.includes("/auth/login")
            ? loginUrl.replace("/auth/login", "/application/transaction")
            : "",
        ]
          .map((url) => String(url || "").trim())
          .filter(Boolean),
      ),
    );

    const expectedAmount = normalizeAmount(amount);
    const expectedTransactionId = String(
      input.expectedTransactionId || "",
    ).trim();
    const expectedEmail = normalizeSearchText(input.expectedEmail || "");
    const expectedNote = normalizeSearchText(
      input.expectedNote || expectedEmail,
    );
    const requestedAtMs = input.requestedAt
      ? new Date(input.requestedAt).getTime()
      : NaN;

    const startedAt = Date.now();

    while (Date.now() - startedAt < verifyTimeoutMs) {
      const candidateMatches = new Map<
        string,
        {
          row: ParsedHistoryRow;
          hintScore: number;
          timeDistanceMs: number;
        }
      >();

      for (const route of historyCandidates) {
        await tryGoto(page, route, timeoutMs);

        const rows = await collectParsedHistoryRows({
          page,
          rowSelector: historyRowSelector,
          cardSelector: historyCardSelector,
          maxRows: 30,
        });

        for (const row of rows) {
          const searchableText = buildHistorySearchText(row);
          const noteSearchText = normalizeSearchText(
            [row.noteText, row.rawText].filter(Boolean).join(" "),
          );

          const byTransactionId =
            expectedTransactionId &&
            row.transactionId === expectedTransactionId;
          const byAmount =
            row.amountUsd !== null &&
            row.amountUsd > 0 &&
            Math.abs(row.amountUsd - expectedAmount) < 0.01;

          const emailMatches =
            !expectedEmail || searchableText.includes(expectedEmail);
          const noteMatches =
            !expectedNote || noteSearchText.includes(expectedNote);

          const passesTimeGate =
            Number.isNaN(requestedAtMs) ||
            !row.recordedAt ||
            row.recordedAt.getTime() >= requestedAtMs - 5 * 60 * 1000;

          if (!passesTimeGate || !(byTransactionId || byAmount)) {
            continue;
          }

          if (byTransactionId || (byAmount && emailMatches && noteMatches)) {
            return toHistoryVerifyResult(row);
          }

          if (!byAmount) continue;

          const key = row.transactionId || row.rawText;
          const hintScore = Number(emailMatches) + Number(noteMatches);
          const timeDistanceMs =
            Number.isNaN(requestedAtMs) || !row.recordedAt
              ? Number.MAX_SAFE_INTEGER
              : Math.abs(row.recordedAt.getTime() - requestedAtMs);
          const existing = candidateMatches.get(key);

          if (
            !existing ||
            hintScore > existing.hintScore ||
            (hintScore === existing.hintScore &&
              timeDistanceMs < existing.timeDistanceMs)
          ) {
            candidateMatches.set(key, {
              row,
              hintScore,
              timeDistanceMs,
            });
          }
        }
      }

      const rankedCandidates = Array.from(candidateMatches.values()).sort(
        (left, right) =>
          right.hintScore - left.hintScore ||
          left.timeDistanceMs - right.timeDistanceMs ||
          (right.row.recordedAt?.getTime() || 0) -
            (left.row.recordedAt?.getTime() || 0),
      );

      const bestCandidate = rankedCandidates[0];
      const secondCandidate = rankedCandidates[1];
      const bestCandidateIsDistinct =
        !!bestCandidate &&
        (!secondCandidate ||
          bestCandidate.hintScore > secondCandidate.hintScore ||
          bestCandidate.timeDistanceMs + 60_000 <
            secondCandidate.timeDistanceMs);

      if (bestCandidate) {
        if (bestCandidate.hintScore > 0 && bestCandidateIsDistinct) {
          return toHistoryVerifyResult(bestCandidate.row);
        }

        if (!bestCandidate.hintScore && rankedCandidates.length === 1) {
          return toHistoryVerifyResult(bestCandidate.row);
        }
      }

      await page.waitForTimeout(2000);
    }

    return null;
  } finally {
    await context.close();
    if (browser) {
      await browser.close();
    }
  }
};
