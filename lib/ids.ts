// lib/ids.ts
import { NextRequest } from "next/server";
import { config } from "./config";

// Create a Set-Cookie header string (HttpOnly, SameSite=Strict, Path=/, Secure?)
function cookieHeader(name: string, value: string, maxAgeSeconds: number): string {
  const attrs = [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    `Max-Age=${Math.max(0, Math.floor(maxAgeSeconds))}`,
  ];
  if (config.cookieSecure) attrs.push("Secure");
  return attrs.join("; ");
}

export function getOrMintGuestId(req: NextRequest): { id: string; setCookie?: string } {
  const name = config.guestIdCookieName;
  const existing = req.cookies.get(name)?.value;
  if (existing) return { id: existing };
  const id = crypto.randomUUID();
  return { id, setCookie: cookieHeader(name, id, config.guestIdTtlSeconds) };
}

export function getOrMintChatSessionId(req: NextRequest): { id: string; setCookie?: string } {
  const name = config.chatSessionCookieName;
  const existing = req.cookies.get(name)?.value;
  if (existing) return { id: existing };
  // New session id; rotate on TTL expiry (simple approach)
  const id = crypto.randomUUID();
  return { id, setCookie: cookieHeader(name, id, config.chatSessionTtlSeconds) };
}
