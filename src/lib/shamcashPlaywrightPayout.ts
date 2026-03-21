import {
  chromium,
  firefox,
  webkit,
  type BrowserContext,
  type Locator,
  type Page,
} from "playwright";

export type ShamCashPlaywrightInput = {
  walletCode: string;
  amount: number;
  note?: string;
  reference?: string;
  currency?: string;
};

export type ShamCashPlaywrightResult = {
  transactionId: string;
  rawResponse: Record<string, string>;
};

const readEnv = (key: string) => String(process.env[key] || "").trim();

const readEnvAny = (keys: string[]) => {
  for (const key of keys) {
    const value = readEnv(key);
    if (value) return value;
  }
  return "";
};

const readRequiredEnvAny = (keys: string[]) => {
  const value = readEnvAny(keys);
  if (!value) {
    throw new Error(
      `Missing required environment variable. Provide one of: ${keys.join(", ")}`,
    );
  }
  return value;
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
      // Ignore invalid selectors in specific frames and continue.
    }
  }

  return null;
};

const waitForLocatorAcrossFrames = async (
  page: Page,
  selector: string,
  timeoutMs: number,
  label: string,
) => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const locator = await getLocatorAcrossFrames(page, selector);
    if (locator) return locator;
    await page.waitForTimeout(200);
  }

  throw new Error(`Could not find ${label} with selector: ${selector}`);
};

const clickLocatorIfPresent = async (
  page: Page,
  selector: string,
  timeoutMs: number,
) => {
  const locator = await getLocatorAcrossFrames(page, selector);
  if (!locator) return false;

  try {
    await locator.click({ timeout: timeoutMs });
    return true;
  } catch {
    return false;
  }
};

const normalizeButtonText = (value: string) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const toShortText = (value: string, maxLength = 120) => {
  const normalized = String(value || "")
    .replace(/\s+/g, " ")
    .trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 3)}...`;
};

const describeLocator = async (label: string, locator: Locator | null) => {
  if (!locator) return `${label}=missing`;

  const tag =
    (await locator.evaluate((node) => node.tagName).catch(() => "")) || "";
  const name = (await locator.getAttribute("name").catch(() => "")) || "";
  const type = (await locator.getAttribute("type").catch(() => "")) || "";
  const placeholder =
    (await locator.getAttribute("placeholder").catch(() => "")) || "";
  const role = (await locator.getAttribute("role").catch(() => "")) || "";
  const text =
    (await locator
      .innerText()
      .catch(() => locator.textContent().catch(() => ""))) || "";

  return `${label}={tag:${String(tag || "").toLowerCase()},name:${toShortText(
    name,
    40,
  )},type:${toShortText(type, 24)},role:${toShortText(
    role,
    24,
  )},placeholder:${toShortText(placeholder, 40)},text:${toShortText(text, 70)}}`;
};

const includesAnyToken = (text: string, tokens: string[]) => {
  if (!tokens.length) return false;
  const normalized = normalizeButtonText(text);
  return tokens.some((token) =>
    normalized.includes(normalizeButtonText(token)),
  );
};

const EXACT_TRANSFER_TEXTS = new Set(
  ["تحويل", "ارسال", "إرسال", "transfer", "send", "withdraw"].map(
    normalizeButtonText,
  ),
);

const DEFAULT_TRANSFER_INCLUDE_TOKENS = [
  "تحويل",
  "ارسال",
  "إرسال",
  "transfer",
  "send",
  "withdraw",
];

const DEFAULT_RECIPIENT_CONFIRM_INCLUDE_TOKENS = [
  ...DEFAULT_TRANSFER_INCLUDE_TOKENS,
  "إضافة",
  "اضافة",
  "add",
];

const DEFAULT_TRANSFER_EXCLUDE_TOKENS = [
  "إزالة",
  "ازالة",
  "remove",
  "delete",
  "حذف",
  "cancel",
  "إلغاء",
  "التحويلات",
  "transactions",
];

const scoreActionButton = async (input: {
  candidate: Locator;
  includeTextTokens: string[];
  excludeTextTokens: string[];
}) => {
  const { candidate, includeTextTokens, excludeTextTokens } = input;

  const visible = await candidate.isVisible().catch(() => false);
  if (!visible) return { score: -1, text: "" };

  const text = normalizeButtonText(
    String(
      (await candidate.innerText().catch(() => "")) ||
        (await candidate.textContent().catch(() => "")) ||
        (await candidate.getAttribute("aria-label").catch(() => "")) ||
        (await candidate.getAttribute("title").catch(() => "")) ||
        (await candidate.getAttribute("value").catch(() => "")) ||
        "",
    ),
  );

  if (includesAnyToken(text, excludeTextTokens)) {
    return { score: -1, text };
  }

  const typeAttr = normalizeButtonText(
    String((await candidate.getAttribute("type").catch(() => "")) || ""),
  );

  let score = 0;
  const hasIncludeToken = includesAnyToken(text, includeTextTokens);
  const isExactTransfer = EXACT_TRANSFER_TEXTS.has(text);

  // Never allow unlabeled/ambiguous submit buttons in transfer steps.
  if (!hasIncludeToken && !isExactTransfer) {
    return { score: -1, text };
  }

  if (isExactTransfer) score += 100;
  if (hasIncludeToken) score += 30;
  if (typeAttr === "submit") score += 15;

  return { score, text };
};

const waitForTransferDetailsStepAfterRecipientSave = async (input: {
  page: Page;
  amountSelector: string;
  currencySelector: string;
  payoutSubmitSelector: string;
  timeoutMs: number;
}) => {
  const {
    page,
    amountSelector,
    currencySelector,
    payoutSubmitSelector,
    timeoutMs,
  } = input;

  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const amountField = await getLocatorAcrossFrames(page, amountSelector);
    if (amountField) {
      const modalScope = amountField.locator(
        "xpath=ancestor::*[@role='dialog' or @role='alertdialog'][1]",
      );

      const scopedSubmit = await findPreferredSubmitButtonNearAmountField({
        amountField,
        includeTextTokens: DEFAULT_TRANSFER_INCLUDE_TOKENS,
        excludeTextTokens: DEFAULT_TRANSFER_EXCLUDE_TOKENS,
      });

      const fallbackSubmit = scopedSubmit
        ? scopedSubmit
        : await findPreferredActionButtonAcrossFrames({
            page,
            selector: payoutSubmitSelector,
            includeTextTokens: DEFAULT_TRANSFER_INCLUDE_TOKENS,
            excludeTextTokens: DEFAULT_TRANSFER_EXCLUDE_TOKENS,
          });

      const currencyField = await getLocatorAcrossFrames(
        page,
        currencySelector,
      );
      const modalText = normalizeButtonText(
        String(
          (await modalScope
            .first()
            .innerText()
            .catch(() => "")) || "",
        ),
      );
      const hasCurrencyTextSignal = /(usd|دولار|currency|عملة)/i.test(
        modalText,
      );
      const hasCurrencySignal = Boolean(currencyField || hasCurrencyTextSignal);

      if (fallbackSubmit && hasCurrencySignal) {
        return true;
      }
    }

    await page.waitForTimeout(250);
  }

  return false;
};

const findPreferredActionButtonAcrossFrames = async (input: {
  page: Page;
  selector: string;
  includeTextTokens: string[];
  excludeTextTokens: string[];
}) => {
  const { page, selector, includeTextTokens, excludeTextTokens } = input;

  let best: {
    locator: Locator;
    score: number;
  } | null = null;

  for (const frame of page.frames()) {
    let list: Locator;
    try {
      list = frame.locator(selector);
    } catch {
      continue;
    }

    const count = await list.count().catch(() => 0);
    if (!count) continue;

    for (let index = 0; index < count; index += 1) {
      const candidate = list.nth(index);
      const { score } = await scoreActionButton({
        candidate,
        includeTextTokens,
        excludeTextTokens,
      });

      if (score <= 0) continue;
      if (!best || score > best.score) {
        best = { locator: candidate, score };
      }
    }
  }

  return best?.locator || null;
};

const findPreferredActionButtonInScope = async (input: {
  scope: Locator;
  selector: string;
  includeTextTokens: string[];
  excludeTextTokens: string[];
}) => {
  const { scope, selector, includeTextTokens, excludeTextTokens } = input;

  let list: Locator;
  try {
    list = scope.locator(selector);
  } catch {
    return null;
  }

  const count = await list.count().catch(() => 0);
  if (!count) return null;

  let best: { locator: Locator; score: number } | null = null;

  for (let index = 0; index < count; index += 1) {
    const candidate = list.nth(index);
    const { score } = await scoreActionButton({
      candidate,
      includeTextTokens,
      excludeTextTokens,
    });

    if (score <= 0) continue;
    if (!best || score > best.score) {
      best = { locator: candidate, score };
    }
  }

  return best?.locator || null;
};

const getVisibleLocatorInScope = async (input: {
  scope: Locator;
  selector: string;
}) => {
  const { scope, selector } = input;

  let list: Locator;
  try {
    list = scope.locator(selector);
  } catch {
    return null;
  }

  const count = await list.count().catch(() => 0);
  if (!count) return null;

  for (let index = 0; index < count; index += 1) {
    const candidate = list.nth(index);
    const visible = await candidate.isVisible().catch(() => false);
    if (visible) return candidate;
  }

  return list.first();
};

const getFieldPreferScope = async (input: {
  page: Page;
  scope: Locator | null;
  selector: string;
}) => {
  const { page, scope, selector } = input;

  if (scope) {
    const scoped = await getVisibleLocatorInScope({ scope, selector });
    if (scoped) return scoped;
  }

  return getLocatorAcrossFrames(page, selector);
};

const findPreferredSubmitButtonNearAmountField = async (input: {
  amountField: Locator;
  includeTextTokens: string[];
  excludeTextTokens: string[];
}) => {
  const { amountField, includeTextTokens, excludeTextTokens } = input;

  const modalScope = amountField.locator(
    "xpath=ancestor::*[@role='dialog' or @role='alertdialog'][1]",
  );
  const modalExists = (await modalScope.count().catch(() => 0)) > 0;
  if (!modalExists) {
    return null;
  }

  return findPreferredActionButtonInScope({
    scope: modalScope.first(),
    selector: "button, [role='button'], input[type='submit']",
    includeTextTokens,
    excludeTextTokens,
  });
};

const selectCurrencyInTransferStep = async (input: {
  page: Page;
  scope: Locator | null;
  currencySelector: string;
  currencyOptionSelector: string;
  currency: string;
  timeoutMs: number;
}) => {
  const {
    page,
    scope,
    currencySelector,
    currencyOptionSelector,
    currency,
    timeoutMs,
  } = input;

  const normalizedCurrency = String(currency || "").trim();
  if (!normalizedCurrency) return false;

  const currencyField = await getFieldPreferScope({
    page,
    scope,
    selector: currencySelector,
  });
  if (!currencyField) return false;

  await currencyField.click({ timeout: timeoutMs }).catch(() => null);

  try {
    await currencyField.selectOption(
      { label: normalizedCurrency },
      { timeout: Math.min(timeoutMs, 5_000) },
    );
    return true;
  } catch {
    // Not a native select.
  }

  const readOnly = String(
    (await currencyField.getAttribute("readonly").catch(() => "")) || "",
  )
    .trim()
    .toLowerCase();
  const disabled =
    String((await currencyField.getAttribute("disabled").catch(() => "")) || "")
      .trim()
      .toLowerCase() !== "";

  if (!disabled && readOnly !== "true") {
    try {
      await currencyField.fill(normalizedCurrency, { timeout: timeoutMs });
      await page.keyboard.press("Enter").catch(() => null);
      return true;
    } catch {
      // Continue to option click flow.
    }
  }

  const escapedCurrency = normalizedCurrency.replace(/"/g, '\\"');
  const optionSelectors = Array.from(
    new Set(
      [
        currencyOptionSelector,
        `[role='option']:has-text("${escapedCurrency}")`,
        `li:has-text("${escapedCurrency}")`,
        `button:has-text("${escapedCurrency}")`,
        `text=${normalizedCurrency}`,
        normalizedCurrency.toUpperCase() === "USD"
          ? "[role='option']:has-text('دولار')"
          : "",
        normalizedCurrency.toUpperCase() === "USD"
          ? "li:has-text('دولار')"
          : "",
      ].filter(Boolean),
    ),
  );

  for (const selector of optionSelectors) {
    const option = await getFieldPreferScope({
      page,
      scope,
      selector,
    });
    if (!option) continue;
    try {
      await option.click({ timeout: Math.min(timeoutMs, 5_000) });
      return true;
    } catch {
      // Continue trying other option selectors.
    }
  }

  return false;
};

const waitForPreferredActionButtonAcrossFrames = async (input: {
  page: Page;
  selector: string;
  includeTextTokens: string[];
  excludeTextTokens: string[];
  timeoutMs: number;
  label: string;
}) => {
  const {
    page,
    selector,
    includeTextTokens,
    excludeTextTokens,
    timeoutMs,
    label,
  } = input;

  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const locator = await findPreferredActionButtonAcrossFrames({
      page,
      selector,
      includeTextTokens,
      excludeTextTokens,
    });
    if (locator) return locator;
    await page.waitForTimeout(200);
  }

  throw new Error(`Could not find ${label} with selector: ${selector}`);
};

const setFileToInputIfPresent = async (
  page: Page,
  selector: string,
  filePath: string,
  timeoutMs: number,
) => {
  if (!filePath) return false;

  const locator = await getLocatorAcrossFrames(page, selector);
  if (!locator) return false;

  try {
    await locator.setInputFiles(filePath, { timeout: timeoutMs });
    return true;
  } catch {
    return false;
  }
};

// ...existing code...

// ...existing code...

const clickWithOverlayRecovery = async (input: {
  page: Page;
  button: Locator;
  timeoutMs: number;
  blockingModalSelector: string;
}) => {
  const { page, button, timeoutMs, blockingModalSelector } = input;

  const buttonText = normalizeButtonText(
    String(
      (await button.innerText().catch(() => "")) ||
        (await button.textContent().catch(() => "")) ||
        "",
    ),
  );
  if (includesAnyToken(buttonText, DEFAULT_TRANSFER_EXCLUDE_TOKENS)) {
    throw new Error(
      `Resolved submit action appears unsafe (remove/delete): ${buttonText}`,
    );
  }

  try {
    await button.click({ timeout: timeoutMs });
    return;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const overlayBlocked =
      /intercepts pointer events|element is not stable/i.test(message);
    if (!overlayBlocked) throw error;
  }

  // Attempt to dismiss lingering modal overlays before retrying submit.
  const blockingModal = await getLocatorAcrossFrames(
    page,
    blockingModalSelector,
  );
  if (blockingModal) {
    await page.keyboard.press("Escape").catch(() => null);
    await page.waitForTimeout(400);
  }

  await button.click({ timeout: timeoutMs, force: true });
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

const gotoFirstReachable = async (
  page: Page,
  candidates: string[],
  timeoutMs: number,
) => {
  const uniqueCandidates = Array.from(
    new Set(candidates.map((candidate) => String(candidate || "").trim())),
  ).filter(Boolean);

  for (const candidate of uniqueCandidates) {
    if (await tryGoto(page, candidate, timeoutMs)) {
      return candidate;
    }
  }

  throw new Error(
    `Could not reach any ShamCash entry URL: ${uniqueCandidates.join(", ")}`,
  );
};

type ParsedHistoryRow = {
  key: string;
  transactionId: string;
  amountUsd: number | null;
  recordedAt: Date | null;
  rawText: string;
};

const parseTransactionIdFromText = (text: string) => {
  const match = String(text || "").match(/#\s*([0-9]{4,})/);
  return match ? match[1] : "";
};

const parseUsdAmountFromText = (text: string): number | null => {
  const match = String(text || "").match(
    /([+-])\s*([0-9]+(?:[\.,][0-9]+)?)\s*USD/i,
  );
  if (!match) return null;

  const sign = match[1] === "-" ? -1 : 1;
  const numeric = Number(match[2].replace(",", "."));
  if (!Number.isFinite(numeric)) return null;
  return Number((sign * numeric).toFixed(2));
};

const parseRecordedAtFromText = (text: string): Date | null => {
  const match = String(text || "").match(
    /(\d{4}-\d{2}-\d{2})\s*-\s*(\d{2}:\d{2}:\d{2})/,
  );
  if (!match) return null;

  const candidate = new Date(`${match[1]}T${match[2]}`);
  return Number.isNaN(candidate.getTime()) ? null : candidate;
};

const collectParsedHistoryRows = async (input: {
  page: Page;
  rowSelector: string;
  maxRows: number;
}) => {
  const { page, rowSelector, maxRows } = input;

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
      const rawText = String(
        (await locator
          .nth(index)
          .textContent()
          .catch(() => "")) || "",
      )
        .replace(/\s+/g, " ")
        .trim();
      if (!rawText) continue;

      const transactionId = parseTransactionIdFromText(rawText);
      const key = transactionId || rawText;
      if (!key || seen.has(key)) continue;
      seen.add(key);

      rows.push({
        key,
        transactionId,
        amountUsd: parseUsdAmountFromText(rawText),
        recordedAt: parseRecordedAtFromText(rawText),
        rawText,
      });
    }
  }

  return rows;
};

const collectVisiblePageTextAcrossFrames = async (page: Page) => {
  const chunks: string[] = [];

  for (const frame of page.frames()) {
    const text = await frame
      .evaluate(() => {
        const bodyText = document.body?.innerText || "";
        const rootText = document.documentElement?.innerText || "";
        return String(bodyText || rootText || "")
          .replace(/\s+/g, " ")
          .trim();
      })
      .catch(() => "");

    if (text) chunks.push(text);
  }

  return chunks.join(" \n ");
};

const findShamCashSecurityHoldNotice = async (page: Page) => {
  const text = await collectVisiblePageTextAcrossFrames(page);
  if (!text) return "";

  const normalized = normalizeButtonText(text);

  const has24HourWindow =
    /24\s*(?:h|hour|hours|ساعة|ساع)/i.test(normalized) ||
    /\b(?:يوم|day)\b/i.test(normalized);
  const hasTransferBlockMessage =
    /(محظور|حظر|ممنوع|blocked|suspend|suspended)/i.test(normalized) &&
    /(تحويل|ارسال|إرسال|transfer|send)/i.test(normalized);
  const hasOperationsBlockMessage =
    /(محظور|حظر|ممنوع|blocked|suspend|suspended)/i.test(normalized) &&
    /(العمليات|operation|operations|transaction|transactions)/i.test(
      normalized,
    );
  const hasNewDeviceSecurityHint =
    /(جهاز جديد|new device|security|أمان)/i.test(normalized) &&
    /(تحويل|transfer|send)/i.test(normalized);

  if (
    !(
      has24HourWindow &&
      (hasTransferBlockMessage ||
        hasOperationsBlockMessage ||
        hasNewDeviceSecurityHint)
    )
  ) {
    return "";
  }

  const line = text
    .split(/\n|\.|\||!/)
    .map((item) => item.trim())
    .find(
      (item) =>
        /24\s*(?:h|hour|hours|ساعة|ساع)|(?:جهاز جديد|new device)|(?:محظور|blocked)/i.test(
          item,
        ) &&
        /(?:تحويل|transfer|send|إرسال|ارسال|العمليات|operation|operations|transaction|transactions)/i.test(
          item,
        ),
    );

  return toShortText(line || text, 220);
};

const waitForConfirmedOutgoingTransfer = async (input: {
  page: Page;
  amount: number;
  baselineHistoryKeys: Set<string>;
  rowSelector: string;
  historyUrls: string[];
  verifyTimeoutMs: number;
  timeoutMs: number;
  maxHistoryAgeMs: number;
}) => {
  const {
    page,
    amount,
    baselineHistoryKeys,
    rowSelector,
    historyUrls,
    verifyTimeoutMs,
    timeoutMs,
    maxHistoryAgeMs,
  } = input;

  const expectedAmount = normalizeAmount(amount);
  const startedAt = Date.now();

  while (Date.now() - startedAt < verifyTimeoutMs) {
    for (const route of historyUrls) {
      const target = String(route || "").trim();
      if (!target) continue;
      await tryGoto(page, target, timeoutMs);

      const rows = await collectParsedHistoryRows({
        page,
        rowSelector,
        maxRows: 20,
      });

      for (const row of rows) {
        const isNew = !baselineHistoryKeys.has(row.key);
        const isOutgoing =
          row.amountUsd !== null &&
          row.amountUsd < 0 &&
          Math.abs(Math.abs(row.amountUsd) - expectedAmount) < 0.01;
        const isFresh =
          !row.recordedAt ||
          Math.abs(Date.now() - row.recordedAt.getTime()) <= maxHistoryAgeMs;

        if (isNew && isOutgoing && isFresh) {
          return row;
        }
      }
    }

    await page.waitForTimeout(2000);
  }

  throw new Error(
    `Payout submit did not produce a confirmed outgoing ${expectedAmount.toFixed(2)} USD transaction in ShamCash history within ${verifyTimeoutMs}ms.`,
  );
};

const ensurePayoutFlowVisible = async (input: {
  page: Page;
  timeoutMs: number;
  payoutUrl: string;
  amountSelector: string;
  currencySelector: string;
  payoutSubmitSelector: string;
  recipientTriggerSelector: string;
  recipientModalSelector: string;
  recipientQrTabSelector: string;
  recipientQrUploadSelector: string;
  recipientQrImagePath: string;
  recipientSaveSelector: string;
  fallbackPayoutUrls: string[];
}) => {
  const {
    page,
    timeoutMs,
    payoutUrl,
    amountSelector,
    currencySelector,
    payoutSubmitSelector,
    recipientTriggerSelector,
    recipientModalSelector,
    recipientQrTabSelector,
    recipientQrUploadSelector,
    recipientQrImagePath,
    recipientSaveSelector,
    fallbackPayoutUrls,
  } = input;

  const routeCandidates = [payoutUrl, ...fallbackPayoutUrls].filter(Boolean);

  for (const route of routeCandidates) {
    if (route && page.url() !== route) {
      await page.goto(route, {
        waitUntil: "domcontentloaded",
        timeout: timeoutMs,
      });
      await page
        .waitForLoadState("networkidle", { timeout: timeoutMs })
        .catch(() => null);
    }

    const directAmount = await getLocatorAcrossFrames(page, amountSelector);
    const directSubmit = await getLocatorAcrossFrames(
      page,
      payoutSubmitSelector,
    );
    const directCurrency = await getLocatorAcrossFrames(page, currencySelector);
    const directModalText = directAmount
      ? normalizeButtonText(
          String(
            (await directAmount
              .locator(
                "xpath=ancestor::*[@role='dialog' or @role='alertdialog'][1]",
              )
              .first()
              .innerText()
              .catch(() => "")) || "",
          ),
        )
      : "";
    const directHasCurrencySignal = Boolean(
      directCurrency || /(usd|دولار|currency|عملة)/i.test(directModalText),
    );

    if (directAmount && directSubmit && directHasCurrencySignal) {
      return;
    }

    let revealResolved = false;
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
          await trigger.click({ timeout: Math.min(timeoutMs, 8_000) });
        } catch {
          continue;
        }

        await page.waitForTimeout(500);
        await page
          .waitForLoadState("networkidle", { timeout: timeoutMs })
          .catch(() => null);

        const recipientModal = await getLocatorAcrossFrames(
          page,
          recipientModalSelector,
        );
        if (recipientModal) {
          let recipientPrepared = false;

          await clickLocatorIfPresent(
            page,
            recipientQrTabSelector,
            Math.min(timeoutMs, 5_000),
          );
          await page.waitForTimeout(300);
          recipientPrepared = await setFileToInputIfPresent(
            page,
            recipientQrUploadSelector,
            recipientQrImagePath,
            Math.min(timeoutMs, 8_000),
          );

          if (recipientPrepared) {
            const recipientSaveButton = await findPreferredActionButtonInScope({
              scope: recipientModal,
              selector: recipientSaveSelector,
              includeTextTokens: DEFAULT_RECIPIENT_CONFIRM_INCLUDE_TOKENS,
              excludeTextTokens: DEFAULT_TRANSFER_EXCLUDE_TOKENS,
            });

            if (recipientSaveButton) {
              await clickWithOverlayRecovery({
                page,
                button: recipientSaveButton,
                timeoutMs: Math.min(timeoutMs, 8_000),
                blockingModalSelector: recipientModalSelector,
              });

              const secondStepAppeared =
                await waitForTransferDetailsStepAfterRecipientSave({
                  page,
                  amountSelector,
                  currencySelector,
                  payoutSubmitSelector,
                  timeoutMs: Math.min(timeoutMs, 8_000),
                });

              if (secondStepAppeared) {
                revealResolved = true;
                break;
              }
            }
          }
        }

        await page.waitForTimeout(700);
        await page
          .waitForLoadState("networkidle", { timeout: timeoutMs })
          .catch(() => null);

        const amountAfterReveal = await getLocatorAcrossFrames(
          page,
          amountSelector,
        );
        const submitAfterReveal = await getLocatorAcrossFrames(
          page,
          payoutSubmitSelector,
        );
        const currencyAfterReveal = await getLocatorAcrossFrames(
          page,
          currencySelector,
        );
        const revealModalText = amountAfterReveal
          ? normalizeButtonText(
              String(
                (await amountAfterReveal
                  .locator(
                    "xpath=ancestor::*[@role='dialog' or @role='alertdialog'][1]",
                  )
                  .first()
                  .innerText()
                  .catch(() => "")) || "",
              ),
            )
          : "";
        const revealHasCurrencySignal = Boolean(
          currencyAfterReveal ||
          /(usd|دولار|currency|عملة)/i.test(revealModalText),
        );

        if (amountAfterReveal && submitAfterReveal && revealHasCurrencySignal) {
          revealResolved = true;
          break;
        }

        await page.keyboard.press("Escape").catch(() => null);
      }

      if (revealResolved) {
        break;
      }
    }

    if (revealResolved) {
      return;
    }
  }

  throw new Error(
    "Could not reach ShamCash transfer details modal with amount/currency/send controls.",
  );
};

const normalizeAmount = (amount: number) => Number(amount.toFixed(2));

export const runShamCashPlaywrightPayout = async (
  input: ShamCashPlaywrightInput,
): Promise<ShamCashPlaywrightResult> => {
  const diagnostics: string[] = [];
  const walletCode = String(input.walletCode || "").trim();
  const amount = Number(input.amount || 0);

  const securityHoldUntilRaw = readEnvAny([
    "SHAMCASH_TRANSFER_BLOCKED_UNTIL",
    "SHAMCASH_SECURITY_HOLD_UNTIL",
  ]);
  if (securityHoldUntilRaw) {
    const holdUntil = new Date(securityHoldUntilRaw);
    const holdUntilMs = holdUntil.getTime();

    if (!Number.isNaN(holdUntilMs) && Date.now() < holdUntilMs) {
      throw new Error(
        `ShamCash security hold is active until ${holdUntil.toISOString()}. New devices may be blocked from transfers for 24 hours after login.`,
      );
    }
  }

  if (!walletCode) {
    throw new Error("ShamCash wallet code is required");
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Withdrawal amount must be greater than 0");
  }

  const loginUrl = readRequiredEnvAny([
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
  const currencyUsdOptionSelector =
    readEnvAny([
      "SHAMCASH_TRANSFER_CURRENCY_USD_OPTION_SELECTOR",
      "SHAMCASH_WEB_PAYOUT_CURRENCY_USD_OPTION_SELECTOR",
    ]) || "text=USD";
  const referenceSelector =
    readEnvAny([
      "SHAMCASH_WEB_PAYOUT_REFERENCE_SELECTOR",
      "SHAMCASH_TRANSFER_REFERENCE_SELECTOR",
    ]) || 'input[name="reference"]';
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
      "SHAMCASH_TRANSFER_WALLET_INPUT_SELECTOR",
    ]),
    'div[role="tabpanel"] textarea, div[role="tabpanel"] input[type="text"], [role="dialog"] textarea, [role="dialog"] input[type="text"], [role="alertdialog"] textarea, [role="alertdialog"] input[type="text"], input[name*="wallet" i], textarea[name*="wallet" i]',
  );
  // ...existing code...
  const recipientQrUploadSelector = combineSelectors(
    readEnvAny([
      "SHAMCASH_RECIPIENT_QR_UPLOAD_INPUT_SELECTOR",
      "SHAMCASH_WEB_RECIPIENT_QR_UPLOAD_SELECTOR",
      "SHAMCASH_WEB_RECIPIENT_QR_UPLOAD_INPUT_SELECTOR",
    ]),
    'div[role="dialog"] input[type="file"], div[role="alertdialog"] input[type="file"], input[type="file"][accept*="image"], input[type="file"]',
  );
  const recipientQrTabSelector = combineSelectors(
    readEnvAny([
      "SHAMCASH_RECIPIENT_QR_TAB_SELECTOR",
      "SHAMCASH_WEB_RECIPIENT_QR_TAB_SELECTOR",
    ]),
    '[role="tab"]:has-text("QR"), [role="tab"]:has-text("رمز"), button:has-text("QR"), button:has-text("رمز"), button:has-text("صورة"), [id$="trigger-image"], [id*="trigger-qr"]',
  );
  const recipientQrImagePath = readEnvAny([
    "SHAMCASH_RECIPIENT_QR_IMAGE_PATH",
    "SHAMCASH_WEB_RECIPIENT_QR_IMAGE_PATH",
  ]);
  const recipientSaveSelector = combineSelectors(
    readEnvAny([
      "SHAMCASH_RECIPIENT_SAVE_SELECTOR",
      "SHAMCASH_WEB_RECIPIENT_SAVE_SELECTOR",
    ]),
    '[role="alertdialog"] button:has-text("تحويل"), [role="dialog"] button:has-text("تحويل"), [role="alertdialog"] button:has-text("إضافة"), [role="dialog"] button:has-text("إضافة"), button:has-text("إرسال"), button:has-text("ارسال"), button:has-text("إضافة"), button:has-text("اضافة"), button:has-text("Transfer"), button:has-text("Send"), button:has-text("Add")',
  );
  const payoutConfirmSelector = readEnvAny([
    "SHAMCASH_TRANSFER_CONFIRM_SELECTOR",
    "SHAMCASH_WEB_PAYOUT_CONFIRM_SELECTOR",
  ]);
  const transferDetailsModalSelector = combineSelectors(
    readEnvAny([
      "SHAMCASH_TRANSFER_DETAILS_MODAL_SELECTOR",
      "SHAMCASH_SECOND_MODAL_SELECTOR",
    ]),
    "",
  );
  const historyRowSelector = combineSelectors(
    readEnvAny(["SHAMCASH_WEB_TX_ROW_SELECTOR", "SHAMCASH_ROW_SELECTOR"]),
    "tbody tr",
  );
  const successSelector = readEnvAny([
    "SHAMCASH_WEB_SUCCESS_SELECTOR",
    "SHAMCASH_TRANSFER_SUCCESS_SELECTOR",
  ]);
  const transactionSelector = readEnvAny([
    "SHAMCASH_WEB_TRANSACTION_ID_SELECTOR",
    "SHAMCASH_TX_ID_SELECTOR",
  ]);

  const timeoutMs = parseTimeout(
    readEnvAny(["SHAMCASH_WEB_TIMEOUT_MS", "SHAMCASH_TIMEOUT_MS"]),
    30_000,
  );
  const historyVerifyTimeoutMs = parseTimeout(
    readEnvAny(["SHAMCASH_WEB_HISTORY_VERIFY_TIMEOUT_MS"]),
    75_000,
  );
  const historyMaxAgeMs = parseTimeout(
    readEnvAny(["SHAMCASH_WEB_HISTORY_MAX_AGE_MS"]),
    20 * 60 * 1000,
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

  // Only Chromium supports channel and common Chrome executable paths.
  const launchChannel =
    browserEngine === "chromium" ? browserChannel : undefined;
  const launchExecutablePath =
    browserEngine === "chromium" ? browserExecutablePath : undefined;

  let context: BrowserContext;

  const launchContext = async (launchHeadless: boolean) => {
    if (profileDir) {
      return browserType.launchPersistentContext(profileDir, {
        headless: launchHeadless,
        channel: launchChannel,
        executablePath: launchExecutablePath,
      });
    }

    return (
      await browserType.launch({
        headless: launchHeadless,
        channel: launchChannel,
        executablePath: launchExecutablePath,
      })
    ).newContext();
  };

  try {
    context = await launchContext(headless);
  } catch (primaryLaunchError) {
    // Some Windows Chrome profile states fail in headed mode; retrying headless is often stable.
    if (headless) throw primaryLaunchError;

    context = await launchContext(true).catch((fallbackError) => {
      throw new Error(
        `${String(primaryLaunchError)}\nFallback headless launch also failed: ${String(
          fallbackError,
        )}`,
      );
    });
  }

  try {
    const page = await context.newPage();

    const loginFallbackUrls = [
      readEnvAny(["SHAMCASH_BASE_URL", "SHAMCASH_WEB_BASE_URL"]),
      readEnvAny(["SHAMCASH_TRANSACTIONS_PAGE_URL"]),
      payoutUrl,
      loginUrl.includes("/auth/login")
        ? loginUrl.replace("/auth/login", "/application/home")
        : "",
      loginUrl.includes("/auth/login")
        ? loginUrl.replace("/auth/login", "/application/favorite")
        : "",
    ];

    await gotoFirstReachable(page, [loginUrl, ...loginFallbackUrls], timeoutMs);

    const usernameField = await getLocatorAcrossFrames(page, usernameSelector);
    const passwordField = await getLocatorAcrossFrames(page, passwordSelector);
    const loginSubmitButton = await getLocatorAcrossFrames(
      page,
      loginSubmitSelector,
    );
    const qrLoginMarker = await getLocatorAcrossFrames(
      page,
      "canvas#react-qrcode-logo, canvas[id*='qrcode' i]",
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
      if (qrLoginMarker) {
        throw new Error(
          "ShamCash login page uses QR login. Enable SHAMCASH_WEB_ALLOW_SESSION_ONLY=true and use a persistent profile (SHAMCASH_PROFILE_PATH) that is already authenticated.",
        );
      }

      if (!username || !password) {
        throw new Error(
          "Missing ShamCash username/password in env and session-only mode is disabled.",
        );
      }

      throw new Error(
        "Could not locate login form controls. Set correct selectors or enable session-only mode with an authenticated persistent profile.",
      );
    }

    if (payoutUrl !== loginUrl) {
      await tryGoto(page, payoutUrl, timeoutMs);
    }

    const fallbackPayoutUrls = [
      readEnvAny(["SHAMCASH_TRANSACTIONS_PAGE_URL"]),
      loginUrl.includes("/auth/login")
        ? loginUrl.replace("/auth/login", "/application/home")
        : "",
      loginUrl.includes("/auth/login")
        ? loginUrl.replace("/auth/login", "/application/favorite")
        : "",
    ].filter(Boolean);

    await ensurePayoutFlowVisible({
      page,
      timeoutMs,
      payoutUrl,
      amountSelector,
      currencySelector,
      payoutSubmitSelector,
      recipientTriggerSelector,
      recipientModalSelector,
      // ...existing code...
      recipientQrTabSelector,
      recipientQrUploadSelector,
      recipientQrImagePath,
      recipientSaveSelector,
      fallbackPayoutUrls,
    });

    const baselineHistoryRows = await collectParsedHistoryRows({
      page,
      rowSelector: historyRowSelector,
      maxRows: 20,
    });
    const baselineHistoryKeys = new Set(
      baselineHistoryRows.map((row) => row.key),
    );

    const amountField = await waitForLocatorAcrossFrames(
      page,
      amountSelector,
      timeoutMs,
      "amount field",
    );
    const fallbackTransferStepScope =
      (await amountField
        .locator("xpath=ancestor::*[@role='dialog' or @role='alertdialog'][1]")
        .count()
        .catch(() => 0)) > 0
        ? amountField
            .locator(
              "xpath=ancestor::*[@role='dialog' or @role='alertdialog'][1]",
            )
            .first()
        : null;
    const transferStepScope =
      (transferDetailsModalSelector
        ? await getLocatorAcrossFrames(page, transferDetailsModalSelector)
        : null) || fallbackTransferStepScope;
    diagnostics.push(
      `transferScope=${transferStepScope ? "found" : "missing"}`,
      `transferModalSelector=${transferDetailsModalSelector || "(auto)"}`,
    );

    const payoutSubmitButton =
      (await findPreferredSubmitButtonNearAmountField({
        amountField,
        includeTextTokens: DEFAULT_TRANSFER_INCLUDE_TOKENS,
        excludeTextTokens: DEFAULT_TRANSFER_EXCLUDE_TOKENS,
      })) ||
      (await waitForPreferredActionButtonAcrossFrames({
        page,
        selector: payoutSubmitSelector,
        includeTextTokens: DEFAULT_TRANSFER_INCLUDE_TOKENS,
        excludeTextTokens: DEFAULT_TRANSFER_EXCLUDE_TOKENS,
        timeoutMs,
        label: "payout submit button",
      }));
    diagnostics.push(
      await describeLocator("amountField", amountField),
      await describeLocator("payoutSubmitButton", payoutSubmitButton),
    );

    const walletField = await getFieldPreferScope({
      page,
      scope: transferStepScope,
      selector: walletSelector,
    });
    diagnostics.push(await describeLocator("walletField", walletField));
    if (walletField) {
      await walletField.fill(walletCode, { timeout: timeoutMs });
    } else {
      const recipientCodeField = await getFieldPreferScope({
        page,
        scope: transferStepScope,
        selector: recipientCodeSelector,
      });
      diagnostics.push(
        await describeLocator("recipientCodeFieldFallback", recipientCodeField),
      );
      if (recipientCodeField) {
        await recipientCodeField.fill(walletCode, { timeout: timeoutMs });
      }
    }

    await amountField.fill(String(normalizeAmount(amount)), {
      timeout: timeoutMs,
    });

    const note = String(input.note || "").trim();
    if (note) {
      const noteField = await getFieldPreferScope({
        page,
        scope: transferStepScope,
        selector: noteSelector,
      });
      diagnostics.push(await describeLocator("noteField", noteField));
      if (noteField) {
        await noteField.fill(note, { timeout: timeoutMs });
      }
    }

    const currency = String(input.currency || "USD").trim();
    if (currency) {
      const currencySelected = await selectCurrencyInTransferStep({
        page,
        scope: transferStepScope,
        currencySelector,
        currencyOptionSelector: currencyUsdOptionSelector,
        currency,
        timeoutMs,
      });
      diagnostics.push(`currencySelected=${currencySelected}`);
    }

    const reference = String(input.reference || "").trim();
    if (reference) {
      const referenceField = await getFieldPreferScope({
        page,
        scope: transferStepScope,
        selector: referenceSelector,
      });
      diagnostics.push(await describeLocator("referenceField", referenceField));
      if (referenceField) {
        await referenceField.fill(reference, { timeout: timeoutMs });
      }
    }

    await Promise.all([
      page
        .waitForLoadState("networkidle", { timeout: timeoutMs })
        .catch(() => null),
      clickWithOverlayRecovery({
        page,
        button: payoutSubmitButton,
        timeoutMs,
        blockingModalSelector: recipientModalSelector,
      }),
    ]);

    const securityHoldAfterSubmit = await findShamCashSecurityHoldNotice(page);
    if (securityHoldAfterSubmit) {
      throw new Error(
        `ShamCash security hold detected (new-device 24h rule): ${securityHoldAfterSubmit}`,
      );
    }

    if (payoutConfirmSelector) {
      const payoutConfirmButton = await getLocatorAcrossFrames(
        page,
        payoutConfirmSelector,
      );
      if (payoutConfirmButton) {
        await Promise.all([
          page
            .waitForLoadState("networkidle", { timeout: timeoutMs })
            .catch(() => null),
          payoutConfirmButton.click({ timeout: timeoutMs }),
        ]);

        const securityHoldAfterConfirm =
          await findShamCashSecurityHoldNotice(page);
        if (securityHoldAfterConfirm) {
          throw new Error(
            `ShamCash security hold detected (new-device 24h rule): ${securityHoldAfterConfirm}`,
          );
        }
      }
    }

    if (successSelector) {
      const successNode = await waitForLocatorAcrossFrames(
        page,
        successSelector,
        timeoutMs,
        "success indicator",
      );
      await successNode.waitFor({ timeout: timeoutMs });
    }

    const historyCandidates = Array.from(
      new Set(
        [
          readEnvAny(["SHAMCASH_TRANSACTIONS_PAGE_URL"]),
          payoutUrl,
          loginUrl.includes("/auth/login")
            ? loginUrl.replace("/auth/login", "/application/transaction")
            : "",
          loginUrl.includes("/auth/login")
            ? loginUrl.replace("/auth/login", "/application/home")
            : "",
        ]
          .map((url) => String(url || "").trim())
          .filter(Boolean),
      ),
    );

    const confirmedOutgoingRow = await waitForConfirmedOutgoingTransfer({
      page,
      amount,
      baselineHistoryKeys,
      rowSelector: historyRowSelector,
      historyUrls: historyCandidates,
      verifyTimeoutMs: historyVerifyTimeoutMs,
      timeoutMs,
      maxHistoryAgeMs: historyMaxAgeMs,
    }).catch((error) => {
      const baseMessage =
        error instanceof Error ? error.message : String(error);
      const diagMessage = diagnostics.length
        ? ` Diagnostics: ${diagnostics.join(" | ")}`
        : "";
      throw new Error(`${baseMessage}${diagMessage}`);
    });

    let transactionId = "";
    if (transactionSelector) {
      const transactionField = await getLocatorAcrossFrames(
        page,
        transactionSelector,
      );
      const value = transactionField
        ? await transactionField.textContent()
        : "";
      transactionId = parseTransactionIdFromText(String(value || "").trim());
    }

    if (!transactionId) {
      transactionId = confirmedOutgoingRow.transactionId;
    }

    if (!transactionId) {
      throw new Error(
        `Outgoing transaction was found in history but transaction ID could not be parsed. Row: ${confirmedOutgoingRow.rawText}`,
      );
    }

    return {
      transactionId,
      rawResponse: {
        mode: "PLAYWRIGHT",
        browser: browserEngine,
        completedAt: new Date().toISOString(),
        confirmedHistoryRow: confirmedOutgoingRow.rawText,
      },
    };
  } finally {
    const browserToClose = context.browser();
    await context.close();
    if (browserToClose) {
      await browserToClose.close().catch(() => null);
    }
  }
};
