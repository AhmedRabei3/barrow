import { logger } from "./logger";

// Sentry integration is optional
// Install with: npm install @sentry/nextjs
interface SentryClient {
  init(options: Record<string, unknown>): void;
  captureException(error: unknown, context?: Record<string, unknown>): void;
  captureMessage(message: string, level?: string): void;
  setUser(user: Record<string, unknown> | null): void;
}

let Sentry: SentryClient | null = null;

// Try to load Sentry dynamically
async function loadSentry() {
  if (Sentry !== null) return Sentry;
  try {
    // @ts-expect-error Sentry is optional dependency
    Sentry = await import("@sentry/nextjs");
  } catch {
    // Sentry not installed
  }
  return Sentry;
}

export async function initSentry() {
  const sentry = await loadSentry();
  if (!sentry) {
    logger.info("Sentry not installed - error monitoring disabled");
    return;
  }

  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    logger.info("Sentry DSN not configured, error monitoring disabled");
    return;
  }

  sentry.init({
    dsn,
    environment: process.env.NODE_ENV || "development",
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    debug: process.env.NODE_ENV !== "production",
  });

  logger.info("Sentry initialized for error monitoring");
}

export async function captureException(error: unknown, context?: Record<string, unknown>) {
  const sentry = await loadSentry();
  if (!sentry) return;
  sentry.captureException(error, {
    contexts: context ? { custom: context } : undefined,
  });
  logger.error("Error captured by Sentry", error, context);
}

export async function captureMessage(message: string, level: "info" | "warning" | "error" = "info") {
  const sentry = await loadSentry();
  if (!sentry) return;
  sentry.captureMessage(message, level);
}

export async function setUser(userId: string, userData?: Record<string, unknown>) {
  const sentry = await loadSentry();
  if (!sentry) return;
  sentry.setUser({ id: userId, ...userData });
}

export async function clearUser() {
  const sentry = await loadSentry();
  if (!sentry) return;
  sentry.setUser(null);
}
