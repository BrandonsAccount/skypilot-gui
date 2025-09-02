import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { config } from "@/lib/config";

/**
 * Optional access guard.
 * WHAT: When auth is enabled, protect /chat and /api/chat paths.
 * WHY: Ensures only authenticated users can access chat endpoints.
 *
 * NOTE: This is a minimal example; in production you may:
 * - verify a signed cookie
 * - call your session store
 * - or defer to upstream WAF/IdP middleware
 */
export async function middleware(req: NextRequest) {
  if (!config.authEnabled) return NextResponse.next();

  const { pathname } = req.nextUrl;
  const needsAuth = pathname.startsWith("/chat") || pathname.startsWith("/api/chat");

  if (!needsAuth) return NextResponse.next();

  const hasCookie = req.cookies.has(config.sessionCookieName);
  if (!hasCookie) {
    const url = req.nextUrl.clone();
    url.pathname = "/api/auth/signin";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

// Configure which paths are checked by this middleware
export const configMiddleware = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
