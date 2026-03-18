import { NextRequest, NextResponse } from "next/server";

const isCloudMode = !!process.env.NEXT_PUBLIC_CONVEX_URL;

const PUBLIC_PATHS = [
  "/login",
  "/api/auth",
  "/api/webhooks",
  "/_next",
  "/favicon.ico",
];

export default function proxy(req: NextRequest) {
  // Local mode: pass everything through
  if (!isCloudMode) return NextResponse.next();

  const { pathname } = req.nextUrl;

  // Allow public paths and static assets
  if (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.includes(".") // static files (images, fonts, etc.)
  ) {
    return NextResponse.next();
  }

  // Check for BetterAuth session cookie
  const sessionCookie =
    req.cookies.get("better-auth.session_token") ??
    req.cookies.get("__Secure-better-auth.session_token");

  if (!sessionCookie?.value) {
    // Not authenticated — redirect to login
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated user visiting /login — redirect to home
  if (pathname === "/login") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
