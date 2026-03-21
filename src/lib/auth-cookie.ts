const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function isLocalHttpAuthUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" && LOCAL_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}

export function shouldUseSecureAuthCookie(): boolean {
  if (process.env.NODE_ENV !== "production") {
    return false;
  }

  const authUrl = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "";

  if (!authUrl) {
    // Keep secure-by-default in production when URL is not explicitly configured.
    return true;
  }

  return !isLocalHttpAuthUrl(authUrl);
}

export function getSessionCookieName(): string {
  return shouldUseSecureAuthCookie()
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";
}
