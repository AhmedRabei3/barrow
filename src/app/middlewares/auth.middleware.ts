import type { User } from "@prisma/client";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { verifyMobileAccessToken } from "@/lib/mobileAuthBridge";
import { prisma } from "@/lib/prisma";

export type AuthedRequest = NextRequest & {
  user: User;
};

type AuthedHandler = (
  req: AuthedRequest,
  context?: unknown,
) => Response | Promise<Response>;

const resolveBearerToken = (req: NextRequest) => {
  const header =
    req.headers.get("authorization") ?? req.headers.get("Authorization");

  if (!header?.startsWith("Bearer ")) {
    return null;
  }

  return header.slice("Bearer ".length).trim() || null;
};

const resolveAuthenticatedUser = async (req: NextRequest) => {
  const bearerToken = resolveBearerToken(req);

  if (bearerToken) {
    const userId = verifyMobileAccessToken(bearerToken);
    if (!userId) {
      return null;
    }

    return prisma.user.findFirst({
      where: { id: userId, isDeleted: false },
    });
  }

  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return null;
  }

  return prisma.user.findFirst({
    where: { id: userId, isDeleted: false },
  });
};

export function withMobileOrWebAuth(handler: AuthedHandler) {
  return async (req: NextRequest, context?: unknown) => {
    const user = await resolveAuthenticatedUser(req);

    if (!user) {
      return NextResponse.json(
        { ok: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const authedReq = req as AuthedRequest;
    authedReq.user = user;

    return handler(authedReq, context);
  };
}
