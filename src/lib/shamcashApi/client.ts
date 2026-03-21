type ShamCashClientConfig = {
  baseUrl: string;
  loginPath: string;
  withdrawPath: string;
  username: string;
  password: string;
  apiKey: string;
  apiKeyHeader: string;
  authHeader: string;
  authScheme: string;
  timeoutMs: number;
  sessionTtlMs: number;
  loginUsernameField: string;
  loginPasswordField: string;
  withdrawWalletField: string;
  withdrawAmountField: string;
  withdrawNoteField: string;
  withdrawReferenceField: string;
  withdrawCurrencyField: string;
};

type SessionCache = {
  token: string;
  expiresAt: number;
};

export type CreateShamCashWithdrawalInput = {
  walletCode: string;
  amount: number;
  note?: string;
  reference?: string;
  currency?: string;
};

export type CreateShamCashWithdrawalResult = {
  transactionId: string;
  rawResponse: unknown;
};

const DEFAULT_TIMEOUT_MS = 20_000;
const DEFAULT_SESSION_TTL_MS = 25 * 60_000;

let cachedSession: SessionCache | null = null;

const readEnv = (key: string): string => String(process.env[key] || "").trim();

const readRequiredEnv = (key: string): string => {
  const value = readEnv(key);
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

const readPositiveIntEnv = (key: string, fallback: number): number => {
  const raw = readEnv(key);
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return Math.floor(value);
};

const toAbsoluteUrl = (baseUrl: string, pathOrUrl: string): string => {
  if (/^https?:\/\//i.test(pathOrUrl)) {
    return pathOrUrl;
  }

  const normalizedBase = baseUrl.replace(/\/$/, "");
  const normalizedPath = pathOrUrl.startsWith("/")
    ? pathOrUrl
    : `/${pathOrUrl}`;
  return `${normalizedBase}${normalizedPath}`;
};

const getConfig = (): ShamCashClientConfig => {
  return {
    baseUrl: readRequiredEnv("SHAMCASH_API_BASE_URL"),
    loginPath: readEnv("SHAMCASH_API_LOGIN_PATH") || "/auth/login",
    withdrawPath: readEnv("SHAMCASH_API_WITHDRAW_PATH") || "/wallet/withdraw",
    username: readRequiredEnv("SHAMCASH_API_USERNAME"),
    password: readRequiredEnv("SHAMCASH_API_PASSWORD"),
    apiKey: readEnv("SHAMCASH_API_KEY"),
    apiKeyHeader: readEnv("SHAMCASH_API_KEY_HEADER") || "x-api-key",
    authHeader: readEnv("SHAMCASH_API_AUTH_HEADER") || "Authorization",
    authScheme: readEnv("SHAMCASH_API_AUTH_SCHEME") || "Bearer",
    timeoutMs: readPositiveIntEnv(
      "SHAMCASH_API_TIMEOUT_MS",
      DEFAULT_TIMEOUT_MS,
    ),
    sessionTtlMs: readPositiveIntEnv(
      "SHAMCASH_API_SESSION_TTL_MS",
      DEFAULT_SESSION_TTL_MS,
    ),
    loginUsernameField:
      readEnv("SHAMCASH_API_LOGIN_USERNAME_FIELD") || "username",
    loginPasswordField:
      readEnv("SHAMCASH_API_LOGIN_PASSWORD_FIELD") || "password",
    withdrawWalletField:
      readEnv("SHAMCASH_API_WITHDRAW_WALLET_FIELD") || "walletCode",
    withdrawAmountField:
      readEnv("SHAMCASH_API_WITHDRAW_AMOUNT_FIELD") || "amount",
    withdrawNoteField: readEnv("SHAMCASH_API_WITHDRAW_NOTE_FIELD") || "note",
    withdrawReferenceField:
      readEnv("SHAMCASH_API_WITHDRAW_REFERENCE_FIELD") || "reference",
    withdrawCurrencyField:
      readEnv("SHAMCASH_API_WITHDRAW_CURRENCY_FIELD") || "currency",
  };
};

const getErrorMessageFromPayload = (
  payload: unknown,
  fallback: string,
): string => {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  const map = payload as Record<string, unknown>;
  const candidate =
    map.message ||
    map.error ||
    map.reason ||
    map.detail ||
    map.error_description;

  return typeof candidate === "string" && candidate.trim()
    ? candidate
    : fallback;
};

const parseJsonSafely = (raw: string): unknown => {
  if (!raw.trim()) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const requestJson = async (
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<unknown> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
    });

    const raw = await response.text();
    const payload = parseJsonSafely(raw);

    if (!response.ok) {
      const fallback = `ShamCash API request failed with status ${response.status}`;
      throw new Error(getErrorMessageFromPayload(payload, fallback));
    }

    return payload;
  } finally {
    clearTimeout(timeout);
  }
};

const extractToken = (payload: unknown): string | null => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const map = payload as Record<string, unknown>;
  const directCandidates = [
    map.token,
    map.access_token,
    map.accessToken,
    map.session_token,
    map.sessionToken,
  ];

  for (const candidate of directCandidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate;
    }
  }

  const data = map.data;
  if (data && typeof data === "object") {
    return extractToken(data);
  }

  return null;
};

const extractExpiryMs = (payload: unknown, fallbackTtlMs: number): number => {
  if (!payload || typeof payload !== "object") {
    return Date.now() + fallbackTtlMs;
  }

  const map = payload as Record<string, unknown>;
  const raw =
    map.expires_in ||
    map.expiresIn ||
    map.token_expires_in ||
    map.tokenExpiresIn;

  const seconds = Number(raw);
  if (Number.isFinite(seconds) && seconds > 0) {
    const derivedMs = Math.floor(seconds * 1000);
    // Keep a small guard window to avoid using almost-expired tokens.
    return Date.now() + Math.max(30_000, derivedMs - 30_000);
  }

  return Date.now() + fallbackTtlMs;
};

const createLoginPayload = (
  config: ShamCashClientConfig,
): Record<string, string> => {
  const payload: Record<string, string> = {
    [config.loginUsernameField]: config.username,
    [config.loginPasswordField]: config.password,
  };

  if (!payload.username) {
    payload.username = config.username;
  }
  if (!payload.email) {
    payload.email = config.username;
  }
  if (!payload.login) {
    payload.login = config.username;
  }
  if (!payload.password) {
    payload.password = config.password;
  }

  return payload;
};

const createSessionToken = async (
  config: ShamCashClientConfig,
): Promise<string> => {
  const url = toAbsoluteUrl(config.baseUrl, config.loginPath);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  if (config.apiKey) {
    headers[config.apiKeyHeader] = config.apiKey;
  }

  const payload = await requestJson(
    url,
    {
      method: "POST",
      headers,
      body: JSON.stringify(createLoginPayload(config)),
    },
    config.timeoutMs,
  );

  const token = extractToken(payload);
  if (!token) {
    throw new Error("ShamCash session token was not found in login response");
  }

  cachedSession = {
    token,
    expiresAt: extractExpiryMs(payload, config.sessionTtlMs),
  };

  return token;
};

const getSessionToken = async (
  config: ShamCashClientConfig,
  forceRefresh = false,
): Promise<string> => {
  const now = Date.now();
  if (
    !forceRefresh &&
    cachedSession &&
    cachedSession.expiresAt > now &&
    cachedSession.token
  ) {
    return cachedSession.token;
  }

  return createSessionToken(config);
};

const buildWithdrawPayload = (
  config: ShamCashClientConfig,
  input: CreateShamCashWithdrawalInput,
): Record<string, unknown> => {
  const payload: Record<string, unknown> = {
    [config.withdrawWalletField]: input.walletCode,
    [config.withdrawAmountField]: Number(input.amount.toFixed(2)),
  };

  if (input.note && input.note.trim()) {
    payload[config.withdrawNoteField] = input.note.trim();
  }

  if (input.reference && input.reference.trim()) {
    payload[config.withdrawReferenceField] = input.reference.trim();
  }

  if (input.currency && input.currency.trim()) {
    payload[config.withdrawCurrencyField] = input.currency.trim();
  }

  return payload;
};

const extractTransactionId = (payload: unknown): string | null => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const map = payload as Record<string, unknown>;
  const candidates = [
    map.transactionId,
    map.transaction_id,
    map.txId,
    map.tx_id,
    map.reference,
    map.id,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate;
    }

    if (typeof candidate === "number" && Number.isFinite(candidate)) {
      return String(candidate);
    }
  }

  const data = map.data;
  if (data && typeof data === "object") {
    return extractTransactionId(data);
  }

  return null;
};

const sendWithdrawRequest = async (
  config: ShamCashClientConfig,
  input: CreateShamCashWithdrawalInput,
  token: string,
): Promise<unknown> => {
  const url = toAbsoluteUrl(config.baseUrl, config.withdrawPath);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    [config.authHeader]: `${config.authScheme} ${token}`,
  };

  if (config.apiKey) {
    headers[config.apiKeyHeader] = config.apiKey;
  }

  return requestJson(
    url,
    {
      method: "POST",
      headers,
      body: JSON.stringify(buildWithdrawPayload(config, input)),
    },
    config.timeoutMs,
  );
};

export const createShamCashWithdrawal = async (
  input: CreateShamCashWithdrawalInput,
): Promise<CreateShamCashWithdrawalResult> => {
  const walletCode = String(input.walletCode || "").trim();
  const amount = Number(input.amount || 0);

  if (!walletCode) {
    throw new Error("ShamCash wallet code is required");
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Withdrawal amount must be greater than 0");
  }

  const config = getConfig();
  let token = await getSessionToken(config, false);

  try {
    const responsePayload = await sendWithdrawRequest(config, input, token);
    const transactionId = extractTransactionId(responsePayload);

    if (!transactionId) {
      throw new Error(
        "ShamCash withdrawal succeeded but no transaction ID was returned",
      );
    }

    return {
      transactionId,
      rawResponse: responsePayload,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "ShamCash withdrawal failed";
    const looksLikeAuthError = /unauthorized|token|session|forbidden|401/i.test(
      message,
    );

    if (!looksLikeAuthError) {
      throw error;
    }

    token = await getSessionToken(config, true);
    const retryPayload = await sendWithdrawRequest(config, input, token);
    const retryTransactionId = extractTransactionId(retryPayload);

    if (!retryTransactionId) {
      throw new Error(
        "ShamCash withdrawal succeeded after token refresh but no transaction ID was returned",
      );
    }

    return {
      transactionId: retryTransactionId,
      rawResponse: retryPayload,
    };
  }
};
