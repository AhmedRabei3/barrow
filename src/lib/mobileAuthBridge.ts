import jwt from "jsonwebtoken";
import type { User } from "@prisma/client";

const MOBILE_AUTH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30;

const getMobileAuthSecret = () => {
  const secret =
    process.env.MOBILE_AUTH_JWT_SECRET ||
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET;

  if (!secret) {
    throw new Error("Missing MOBILE_AUTH_JWT_SECRET/AUTH_SECRET");
  }

  return secret;
};

export const signMobileAccessToken = (userId: string) => {
  const secret = getMobileAuthSecret();

  return jwt.sign({ sub: userId, aud: "mobile-auth" }, secret, {
    algorithm: "HS256",
    expiresIn: MOBILE_AUTH_TOKEN_TTL_SECONDS,
  });
};

export const verifyMobileAccessToken = (token: string) => {
  try {
    const secret = getMobileAuthSecret();
    const decoded = jwt.verify(token, secret, {
      algorithms: ["HS256"],
      audience: "mobile-auth",
    }) as jwt.JwtPayload;

    const subject = typeof decoded.sub === "string" ? decoded.sub : null;
    return subject;
  } catch {
    return null;
  }
};

const normalizeAvatar = (user: User) => user.profileImage || user.image || null;

export const toMobileSessionPayload = (params: {
  user: User;
  accessToken: string;
}) => {
  const { user, accessToken } = params;

  return {
    access_token: accessToken,
    refresh_token: null,
    token_type: "bearer",
    expires_in: MOBILE_AUTH_TOKEN_TTL_SECONDS,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      image: normalizeAvatar(user),
      balance: Number(user.balance),
      isActive: Boolean(user.isActive),
      isAdmin: Boolean(user.isAdmin),
      isOwner: Boolean(user.isOwner),
      isIdentityVerified: Boolean(user.isIdentityVerified),
      activeUntil: user.activeUntil,
      pendingReferralEarnings: Number(user.pendingReferralEarnings),
      preferredInterestOrder: user.preferredInterestOrder,
      notifications: [],
    },
  };
};
