import { loadEnvConfig } from "@next/env";
import {
  chromium,
  type Browser,
  type BrowserContext,
  type Page,
} from "playwright";
import path from "node:path";
import { promises as fs } from "node:fs";

loadEnvConfig(process.cwd());

type CaptureEvent = {
  ts: number;
  eventType: "click" | "input" | "change";
  pageUrl: string;
  frameUrl: string;
  tag: string;
  name: string;
  id: string;
  className: string;
  roleAttr: string;
  typeAttr: string;
  inputMode: string;
  placeholder: string;
  text: string;
  value: string;
  dialogSelector: string;
  selector: string;
  candidateSelectors: string[];
};

type CaptureOutput = {
  captureStartedAt: string;
  captureEndedAt: string;
  captureMs: number;
  sourceUrl: string;
  events: CaptureEvent[];
  envSuggestions: string[];
  notes: string[];
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

const shorten = (value: string, maxLength = 120) => {
  const normalized = String(value || "")
    .replace(/\s+/g, " ")
    .trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 3)}...`;
};

const normalizeForCheck = (value: string) =>
  String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const includeTokens = [
  "تحويل",
  "ارسال",
  "إرسال",
  "transfer",
  "send",
  "withdraw",
];
const excludeTokens = [
  "remove",
  "delete",
  "إزالة",
  "ازالة",
  "حذف",
  "cancel",
  "إلغاء",
];

const includesAny = (value: string, tokens: string[]) => {
  const normalized = normalizeForCheck(value);
  return tokens.some((token) => normalized.includes(normalizeForCheck(token)));
};

const looksNumeric = (value: string) => {
  const normalized = String(value || "")
    .replace(/,/g, ".")
    .trim();
  if (!normalized) return false;
  const parsed = Number(normalized);
  return Number.isFinite(parsed);
};

const looksWalletCode = (value: string) => {
  const normalized = String(value || "").trim();
  return /^[a-f0-9]{20,}$/i.test(normalized);
};

const pickSelector = (event: CaptureEvent) => {
  const candidate = event.candidateSelectors.find(
    (item) => item && item.length <= 160,
  );
  return candidate || event.selector;
};

const withModalScope = (modalSelector: string, selector: string) => {
  if (!selector) return selector;
  if (!modalSelector) return selector;
  if (
    selector.includes("[role='dialog']") ||
    selector.includes("[role='alertdialog']")
  ) {
    return selector;
  }
  return `${modalSelector} ${selector}`;
};

const dedupeEvents = (events: CaptureEvent[]) => {
  const output: CaptureEvent[] = [];

  for (const event of events) {
    const prev = output[output.length - 1];
    if (
      prev &&
      prev.eventType === event.eventType &&
      prev.selector === event.selector &&
      prev.value === event.value &&
      prev.dialogSelector === event.dialogSelector
    ) {
      continue;
    }
    output.push(event);
  }

  return output;
};

const findLast = (
  events: CaptureEvent[],
  predicate: (event: CaptureEvent) => boolean,
) => {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    if (predicate(events[index])) return events[index];
  }
  return null;
};

const deriveSuggestions = (events: CaptureEvent[]) => {
  const notes: string[] = [];
  const envSuggestions: string[] = [];

  const cleaned = dedupeEvents(events);
  const modalEvents = cleaned.filter((event) => event.dialogSelector);

  const submitEvent = findLast(modalEvents, (event) => {
    if (event.eventType !== "click") return false;
    const text = `${event.text} ${event.selector}`;
    return (
      includesAny(text, includeTokens) && !includesAny(text, excludeTokens)
    );
  });

  const transferModalSelector =
    submitEvent?.dialogSelector ||
    findLast(modalEvents, (event) =>
      /dialog|alertdialog/i.test(event.dialogSelector || ""),
    )?.dialogSelector ||
    "";

  const inTransferModal = transferModalSelector
    ? modalEvents.filter(
        (event) => event.dialogSelector === transferModalSelector,
      )
    : modalEvents;

  const amountEvent = findLast(inTransferModal, (event) => {
    if (!["input", "change"].includes(event.eventType)) return false;
    const shape = `${event.name} ${event.placeholder} ${event.inputMode} ${event.typeAttr}`;
    if (/amount|المبلغ/i.test(shape)) return true;
    return looksNumeric(event.value) && Number(event.value) > 0;
  });

  const noteEvent = findLast(inTransferModal, (event) => {
    if (!["input", "change"].includes(event.eventType)) return false;
    const shape = `${event.tag} ${event.name} ${event.placeholder}`;
    if (/note|ملاحظ|ملاحظة/i.test(shape)) return true;

    const value = String(event.value || "").trim();
    if (!value || looksNumeric(value) || looksWalletCode(value)) return false;
    return /[a-zA-Z\u0600-\u06FF]/.test(value) && value.length >= 3;
  });

  const currencyEvent = findLast(inTransferModal, (event) => {
    const shape = `${event.tag} ${event.roleAttr} ${event.name} ${event.placeholder} ${event.text}`;
    if (/currency|عملة/i.test(shape)) return true;
    if (/combobox|select/.test(shape)) return true;
    if (/usd|دولار/i.test(`${event.text} ${event.value}`)) return true;
    return false;
  });

  const walletEvent = findLast(cleaned, (event) => {
    if (!["input", "change"].includes(event.eventType)) return false;
    const shape = `${event.name} ${event.placeholder}`;
    if (/wallet|محفظ/.test(shape.toLowerCase())) return true;
    return looksWalletCode(event.value);
  });

  if (transferModalSelector) {
    envSuggestions.push(
      `SHAMCASH_TRANSFER_DETAILS_MODAL_SELECTOR="${transferModalSelector}"`,
    );
  } else {
    notes.push("Could not infer transfer-details modal selector.");
  }

  if (walletEvent) {
    envSuggestions.push(
      `SHAMCASH_TRANSFER_WALLET_INPUT_SELECTOR="${withModalScope(transferModalSelector, pickSelector(walletEvent))}"`,
    );
  }

  if (amountEvent) {
    envSuggestions.push(
      `SHAMCASH_TRANSFER_AMOUNT_INPUT_SELECTOR="${withModalScope(transferModalSelector, pickSelector(amountEvent))}"`,
    );
  } else {
    notes.push("Could not infer amount field from your manual actions.");
  }

  if (noteEvent) {
    envSuggestions.push(
      `SHAMCASH_TRANSFER_NOTE_INPUT_SELECTOR="${withModalScope(transferModalSelector, pickSelector(noteEvent))}"`,
    );
  } else {
    notes.push("Could not infer note field from your manual actions.");
  }

  if (currencyEvent) {
    envSuggestions.push(
      `SHAMCASH_TRANSFER_CURRENCY_SELECTOR="${withModalScope(transferModalSelector, pickSelector(currencyEvent))}"`,
    );
  } else {
    notes.push("Could not infer currency control from your manual actions.");
  }

  if (submitEvent) {
    const submitText = shorten(submitEvent.text, 50);
    if (submitText) {
      envSuggestions.push(
        `SHAMCASH_TRANSFER_SUBMIT_SELECTOR="${withModalScope(
          transferModalSelector,
          `${submitEvent.tag}:has-text('${submitText.replace(/'/g, "\\'")}')`,
        )}"`,
      );
    } else {
      envSuggestions.push(
        `SHAMCASH_TRANSFER_SUBMIT_SELECTOR="${withModalScope(transferModalSelector, pickSelector(submitEvent))}"`,
      );
    }
  } else {
    notes.push("Could not infer final submit button click in transfer modal.");
  }

  envSuggestions.push(
    `SHAMCASH_TRANSFER_CURRENCY_USD_OPTION_SELECTOR="text=USD"`,
  );

  return { envSuggestions, notes, cleanedEvents: cleaned };
};

const installCaptureHooks = async (
  context: BrowserContext,
  events: CaptureEvent[],
) => {
  await context.exposeBinding(
    "shamcashRecordEvent",
    (_source, payload: CaptureEvent) => {
      events.push(payload);
    },
  );

  await context.addInitScript(() => {
    const w = window as unknown as {
      shamcashRecordEvent?: (payload: unknown) => void;
      __shamcashCaptureInstalled?: boolean;
    };

    if (w.__shamcashCaptureInstalled) return;
    w.__shamcashCaptureInstalled = true;

    const safe = (value: string) =>
      String(value || "")
        .replace(/\s+/g, " ")
        .trim();

    const cssEscape = (value: string) => {
      try {
        return CSS.escape(String(value || ""));
      } catch {
        return String(value || "").replace(/[^a-zA-Z0-9_-]/g, "");
      }
    };

    const selectorFor = (element: HTMLElement) => {
      const tag = (element.tagName || "").toLowerCase();
      const id = safe(element.id || "");
      const name = safe(element.getAttribute("name") || "");
      const role = safe(element.getAttribute("role") || "");
      const placeholder = safe(element.getAttribute("placeholder") || "");

      if (id) return `${tag}#${cssEscape(id)}`;
      if (name) return `${tag}[name='${name.replace(/'/g, "\\'")}']`;
      if (role) return `${tag}[role='${role.replace(/'/g, "\\'")}']`;
      if (placeholder) {
        return `${tag}[placeholder*='${placeholder.slice(0, 20).replace(/'/g, "\\'")}']`;
      }

      const classes = Array.from(element.classList || []).slice(0, 2);
      if (classes.length) {
        return `${tag}.${classes.map((item) => cssEscape(item)).join(".")}`;
      }

      return tag || "*";
    };

    const dialogSelectorFor = (element: HTMLElement) => {
      const dialog = element.closest(
        "[role='dialog'], [role='alertdialog']",
      ) as HTMLElement | null;
      if (!dialog) return "";

      const role = safe(dialog.getAttribute("role") || "dialog");
      const state = safe(dialog.getAttribute("data-state") || "");
      const id = safe(dialog.id || "");

      if (id) return `[role='${role}']#${cssEscape(id)}`;
      if (state) return `[role='${role}'][data-state='${state}']`;
      return `[role='${role}']`;
    };

    const candidateSelectorsFor = (element: HTMLElement, text: string) => {
      const tag = (element.tagName || "").toLowerCase();
      const name = safe(element.getAttribute("name") || "");
      const role = safe(element.getAttribute("role") || "");
      const placeholder = safe(element.getAttribute("placeholder") || "");

      const candidates: string[] = [];
      const primary = selectorFor(element);
      if (primary) candidates.push(primary);
      if (name) candidates.push(`${tag}[name='${name.replace(/'/g, "\\'")}']`);
      if (role) candidates.push(`${tag}[role='${role.replace(/'/g, "\\'")}']`);
      if (placeholder) {
        candidates.push(
          `${tag}[placeholder*='${placeholder.slice(0, 20).replace(/'/g, "\\'")}']`,
        );
      }

      if (text && text.length <= 50) {
        candidates.push(`${tag}:has-text('${text.replace(/'/g, "\\'")}')`);
      }

      return Array.from(new Set(candidates.filter(Boolean)));
    };

    const textOf = (element: HTMLElement) =>
      safe((element.textContent || "").replace(/\s+/g, " ")).slice(0, 80);

    const isClickable = (element: HTMLElement) => {
      const tag = (element.tagName || "").toLowerCase();
      const role = safe(element.getAttribute("role") || "").toLowerCase();
      if (["button", "a"].includes(tag)) return true;
      if (["button", "tab", "menuitem", "option", "combobox"].includes(role))
        return true;
      if (tag === "input") {
        const type = safe(
          (element as HTMLInputElement).type || "",
        ).toLowerCase();
        return ["button", "submit", "radio", "checkbox"].includes(type);
      }
      return false;
    };

    const emit = (
      eventType: "click" | "input" | "change",
      target: EventTarget | null,
    ) => {
      if (!target || !(target instanceof HTMLElement)) return;
      if (eventType === "click" && !isClickable(target)) return;

      const inputTarget = target as HTMLInputElement;
      const value =
        "value" in inputTarget ? safe(String(inputTarget.value || "")) : "";
      const text = textOf(target);
      const selector = selectorFor(target);
      const payload = {
        ts: Date.now(),
        eventType,
        pageUrl: safe(window.location.href),
        frameUrl: safe(window.location.href),
        tag: safe(target.tagName || "").toLowerCase(),
        name: safe(target.getAttribute("name") || ""),
        id: safe(target.id || ""),
        className: safe(target.className || ""),
        roleAttr: safe(target.getAttribute("role") || ""),
        typeAttr: safe((inputTarget.type || "") as string),
        inputMode: safe(target.getAttribute("inputmode") || ""),
        placeholder: safe(target.getAttribute("placeholder") || ""),
        text,
        value,
        dialogSelector: dialogSelectorFor(target),
        selector,
        candidateSelectors: candidateSelectorsFor(target, text),
      };

      if (typeof w.shamcashRecordEvent === "function") {
        w.shamcashRecordEvent(payload);
      }
    };

    document.addEventListener(
      "click",
      (event) => emit("click", event.target),
      true,
    );
    document.addEventListener(
      "input",
      (event) => emit("input", event.target),
      true,
    );
    document.addEventListener(
      "change",
      (event) => emit("change", event.target),
      true,
    );
  });
};

const run = async () => {
  const captureMs = parseTimeout(readEnvAny(["SHAMCASH_CAPTURE_MS"]), 180000);
  const timeoutMs = parseTimeout(
    readEnvAny(["SHAMCASH_TIMEOUT_MS", "SHAMCASH_WEB_TIMEOUT_MS"]),
    45000,
  );

  const headless = parseBoolean(
    readEnvAny([
      "SHAMCASH_CAPTURE_HEADLESS",
      "SHAMCASH_WEB_HEADLESS",
      "SHAMCASH_HEADLESS",
    ]),
    false,
  );

  const loginUrl = readEnvAny([
    "SHAMCASH_WEB_LOGIN_URL",
    "SHAMCASH_LOGIN_PAGE_URL",
  ]);
  const payoutUrl =
    readEnvAny(["SHAMCASH_WEB_PAYOUT_URL", "SHAMCASH_TRANSFER_PAGE_URL"]) ||
    loginUrl;

  if (!payoutUrl && !loginUrl) {
    throw new Error(
      "Missing payout/login URL. Set SHAMCASH_TRANSFER_PAGE_URL or SHAMCASH_LOGIN_PAGE_URL.",
    );
  }

  const browserChannel = readEnv("SHAMCASH_BROWSER_CHANNEL") || undefined;
  const browserExecutablePath =
    readEnv("SHAMCASH_BROWSER_EXECUTABLE_PATH") || undefined;
  const profileDir =
    readEnvAny([
      "SHAMCASH_WEB_PROFILE_DIR",
      "SHAMCASH_PROFILE_PATH",
      "SHAMCASH_PLAYWRIGHT_PROFILE_DIR",
    ]) || undefined;

  const events: CaptureEvent[] = [];

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

  await installCaptureHooks(context, events);

  const startedAt = new Date();

  try {
    const page: Page = await context.newPage();

    const targetUrl = payoutUrl || loginUrl;
    await page.goto(targetUrl, {
      waitUntil: "domcontentloaded",
      timeout: timeoutMs,
    });
    await page
      .waitForLoadState("networkidle", { timeout: timeoutMs })
      .catch(() => null);

    console.log("=== ShamCash manual capture ===");
    console.log(`URL: ${targetUrl}`);
    console.log(`Headless: ${headless}`);
    console.log(`Capture duration: ${captureMs}ms`);
    console.log("Now perform transfer manually in this browser window.");
    console.log(
      "Capture will stop automatically and generate selector suggestions.",
    );

    await page.waitForTimeout(captureMs);

    const endedAt = new Date();
    const { envSuggestions, notes, cleanedEvents } = deriveSuggestions(events);

    const output: CaptureOutput = {
      captureStartedAt: startedAt.toISOString(),
      captureEndedAt: endedAt.toISOString(),
      captureMs,
      sourceUrl: targetUrl,
      events: cleanedEvents,
      envSuggestions,
      notes,
    };

    const outDir = path.resolve(process.cwd(), "tmp");
    await fs.mkdir(outDir, { recursive: true });

    const stamp = Date.now();
    const jsonPath = path.join(outDir, `shamcash-manual-capture-${stamp}.json`);
    const envPath = path.join(outDir, `shamcash-manual-selectors-${stamp}.env`);

    await fs.writeFile(jsonPath, JSON.stringify(output, null, 2), "utf8");
    await fs.writeFile(envPath, `${envSuggestions.join("\n")}\n`, "utf8");

    console.log("\n=== Suggestions ===");
    if (envSuggestions.length) {
      for (const line of envSuggestions) console.log(line);
    } else {
      console.log(
        "No selector suggestions inferred. Re-run capture and include full second-modal flow.",
      );
    }

    if (notes.length) {
      console.log("\n=== Notes ===");
      for (const note of notes) console.log(`- ${note}`);
    }

    console.log(`\nCapture file: ${jsonPath}`);
    console.log(`Env suggestions: ${envPath}`);
  } finally {
    await context.close();
    if (browser) await browser.close();
  }
};

run().catch((error) => {
  console.error(
    "ShamCash manual capture failed:",
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
});
