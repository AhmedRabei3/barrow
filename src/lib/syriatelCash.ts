type SyriatelCashPayload = Record<string, unknown>;

export type SyriatelCashVerificationResult = {
  verified: boolean;
  transactionId: string;
  actualAmount: number | null;
  providerMessage: string;
  providerStatusCode: number;
  providerPayload: SyriatelCashPayload | null;
};

const toNumber = (value: unknown): number | null => {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return null;
  }

  return Number(num.toFixed(2));
};

const toRecord = (value: unknown): SyriatelCashPayload | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as SyriatelCashPayload;
};

const asString = (value: unknown): string => {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value).trim();
  }

  return "";
};

const asBoolean = (value: unknown): boolean => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value === 1;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return ["1", "true", "ok", "paid", "success", "completed"].includes(
      normalized,
    );
  }

  return false;
};

const isValidUrl = (value: string) => {
  try {
    const parsed = new URL(value);
    return ["http:", "https:"].includes(parsed.protocol);
  } catch {
    return false;
  }
};

export const normalizeSyriatelReferenceNumber = (value: string) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ");

export const isValidSyriatelReferenceNumber = (value: string) => {
  const normalized = normalizeSyriatelReferenceNumber(value);
  return /^[A-Za-z0-9#_\-/]{4,64}$/.test(normalized);
};

const resolveVerificationUrl = () => {
  const candidate = String(process.env.SYRIATEL_CASH_VERIFY_URL || "").trim();
  if (!candidate || !isValidUrl(candidate)) {
    return "";
  }

  return candidate;
};

const resolveTimeoutMs = () => {
  const raw = Number(process.env.SYRIATEL_CASH_TIMEOUT_MS || 12000);
  if (!Number.isFinite(raw) || raw < 1000) {
    return 12000;
  }
  return Math.floor(raw);
};

export const verifySyriatelCashPayment = async (input: {
  referenceNumber: string;
  expectedAmount: number;
  currency?: string;
  userId?: string;
  email?: string;
}): Promise<SyriatelCashVerificationResult> => {
  const verifyUrl = resolveVerificationUrl();
  if (!verifyUrl) {
    throw new Error(
      "Syriatel Cash is not configured. Missing SYRIATEL_CASH_VERIFY_URL",
    );
  }

  const referenceNumber = normalizeSyriatelReferenceNumber(
    input.referenceNumber,
  );
  if (!isValidSyriatelReferenceNumber(referenceNumber)) {
    throw new Error("Invalid Syriatel reference number");
  }

  const expectedAmount = Number(input.expectedAmount || 0);
  if (!Number.isFinite(expectedAmount) || expectedAmount <= 0) {
    throw new Error("Invalid Syriatel expected amount");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), resolveTimeoutMs());

  try {
    const apiKey = String(process.env.SYRIATEL_CASH_API_KEY || "").trim();
    const apiKeyHeader =
      String(process.env.SYRIATEL_CASH_API_KEY_HEADER || "x-api-key").trim() ||
      "x-api-key";
    const bearerToken = String(
      process.env.SYRIATEL_CASH_BEARER_TOKEN || "",
    ).trim();

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    if (apiKey) {
      headers[apiKeyHeader] = apiKey;
    }

    if (bearerToken) {
      headers.Authorization = `Bearer ${bearerToken}`;
    }

    const response = await fetch(verifyUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        referenceNumber,
        amount: Number(expectedAmount.toFixed(2)),
        currency: String(input.currency || "USD").trim() || "USD",
        userId: String(input.userId || "").trim(),
        email: String(input.email || "").trim(),
      }),
      cache: "no-store",
      signal: controller.signal,
    });

    const rawText = await response.text();
    let json: SyriatelCashPayload | null = null;
    try {
      json = toRecord(rawText ? JSON.parse(rawText) : null);
    } catch {
      json = null;
    }

    const payload = json || {};
    const paidFlag =
      asBoolean(payload.paid) ||
      asBoolean(payload.success) ||
      asBoolean(payload.ok) ||
      asBoolean(payload.verified) ||
      asBoolean(payload.status);

    const statusText = asString(payload.status).toLowerCase();
    const statusApproved = ["paid", "success", "ok", "completed"].includes(
      statusText,
    );

    const amount =
      toNumber(payload.amount) ??
      toNumber(payload.paidAmount) ??
      toNumber(payload.value) ??
      null;

    const transactionId =
      asString(payload.transactionId) ||
      asString(payload.txId) ||
      asString(payload.referenceNumber) ||
      asString(payload.reference) ||
      "";

    const providerMessage =
      asString(payload.message) ||
      asString(payload.error) ||
      (response.ok
        ? "Syriatel verification completed"
        : "Syriatel verification failed");

    return {
      verified: response.ok && (paidFlag || statusApproved),
      transactionId,
      actualAmount: amount,
      providerMessage,
      providerStatusCode: response.status,
      providerPayload: json,
    };
  } finally {
    clearTimeout(timeout);
  }
};
