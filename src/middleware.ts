import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getSessionCookieName } from "@/lib/auth-cookie";

const SESSION_COOKIE_NAME = getSessionCookieName();

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const origin = req.nextUrl.origin;

  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
    cookieName: SESSION_COOKIE_NAME,
  });

  const isLoggedIn = Boolean(token?.sub);
  const isAdmin = Boolean(token?.isAdmin);

  if (!isLoggedIn && pathname.startsWith("/profile")) {
    const redirect = new URL("/", origin);
    redirect.searchParams.set("login", "true");
    return NextResponse.redirect(redirect);
  }

  if (pathname.startsWith("/admin")) {
    if (!isLoggedIn) {
      const redirect = new URL("/", origin);
      redirect.searchParams.set("login", "true");
      return NextResponse.redirect(redirect);
    }

    if (!isAdmin) {
      return NextResponse.redirect(new URL("/", origin));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/profile/:path*", "/admin/:path*"],
};
