import { config } from "./config";

/** AppSession: shape we rely on downstream */
export type AppSession = { user: { id: string; role?: string } } | null;

/**
 * Minimal role check helper.
 * WHAT: Throws if the current user lacks the required role(s).
 * WHY: Centralizes authorization for endpoints that need it.
 */
export function requireRole(session: { user?: { role?: string } } | null, roles: string[]) {
  if (!config.authEnabled) return; // No-op when auth is off
  const role = session?.user?.role;
  if (!role || !roles.includes(role)) {
    const err = new Error("Forbidden") as any;
    err.status = 403;
    throw err;
  }
}

/**
 * Server-side session getter that works with auth toggled off.
 * WHAT: Returns an anonymous dev session when auth is disabled; otherwise uses NextAuth.
 * WHY: Keeps endpoints simple while allowing you to flip auth on without code changes.
 */
export async function getServerSession(): Promise<AppSession> {
  if (!config.authEnabled) {
    // Anonymous dev session for local testing
    return { user: { id: "anon-dev", role: "customer" } };
  }
  // Lazy-load to avoid bundling next-auth when auth is off
  const { getServerSession: realGet } = await import("next-auth");
  const { authOptions } = await import("@/app/api/auth/[...nextauth]/auth-options");
  // TS may not know about custom fields you attach in callbacks; cast to AppSession.
  const sess = (await realGet(authOptions as any)) as any;
  return (sess ?? null) as AppSession;
}
