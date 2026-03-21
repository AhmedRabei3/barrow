import crypto from "crypto";

const PROFILE_EDIT_TICKET_PURPOSE = "profile-edit";

function base64UrlEncode(value: string) {
  return Buffer.from(value).toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function getSigningSecret() {
  return (
    process.env.PROFILE_EDIT_VERIFICATION_SECRET || process.env.AUTH_SECRET
  );
}

function signPayload(payload: string) {
  const secret = getSigningSecret();
  if (!secret) {
    throw new Error("Missing signing secret for profile edit verification");
  }

  return crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");
}

export function generateVerificationCode(length = 6) {
  const min = 10 ** (length - 1);
  const max = 10 ** length - 1;
  return String(crypto.randomInt(min, max + 1));
}

export function createProfileEditTicket(params: {
  userId: string;
  email: string;
  expiresInSeconds?: number;
}) {
  const expiresInSeconds = params.expiresInSeconds ?? 600;
  const payload = JSON.stringify({
    p: PROFILE_EDIT_TICKET_PURPOSE,
    u: params.userId,
    e: params.email,
    exp: Date.now() + expiresInSeconds * 1000,
  });

  const encodedPayload = base64UrlEncode(payload);
  const signature = signPayload(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifyProfileEditTicket(params: {
  ticket: string;
  userId: string;
  email: string;
}) {
  const [encodedPayload, signature] = params.ticket.split(".");
  if (!encodedPayload || !signature) {
    return false;
  }

  const expectedSignature = signPayload(encodedPayload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return false;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as {
      p: string;
      u: string;
      e: string;
      exp: number;
    };

    if (payload.p !== PROFILE_EDIT_TICKET_PURPOSE) return false;
    if (payload.u !== params.userId) return false;
    if (payload.e !== params.email) return false;
    if (Date.now() > payload.exp) return false;

    return true;
  } catch {
    return false;
  }
}
