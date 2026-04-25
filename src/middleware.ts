import { NextRequest, NextResponse } from "next/server";
import { getSessionCookieName } from "@/lib/auth-cookie";

const SESSION_COOKIE_NAME = getSessionCookieName();

export function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const origin = req.nextUrl.origin;
  const isLoggedIn = req.cookies.has(SESSION_COOKIE_NAME);

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
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/profile/:path*", "/admin/:path*"],
};
