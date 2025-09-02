/**
 * Centralized environment parsing and feature flags.
 * WHAT: Reads env once and exports typed config.
 * WHY: 12-Factor: configuration via environment; avoids magic constants.
 */
const toInt = (v: string | undefined, d: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : d;
};

const bool = (v: string | undefined, d = false) => {
  if (v == null) return d;
  return ["1", "true", "yes", "on"].includes(String(v).toLowerCase());
};

export const config = {
  /** Feature flags */
  authEnabled: bool(process.env.AUTH_ENABLED, false),

  /** Upstream (Messenger) target */
  messengerUrl: process.env.MESSENGER_URL || "",
  messengerApiKey: process.env.MESSENGER_API_KEY || "",
  messengerSupportsStream: bool(process.env.MESSENGER_SUPPORTS_STREAM, true),

  /**
   * SSRF allowlist: exact host:port entries (comma-separated). No scheme, no path.
   * Example: "messenger:8000,api.example.com:443"
   */
  allowlist: (process.env.ALLOWLIST || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),

  /**
   * NextAuth (OIDC) session cookie (Auth.js) — distinct from the chat session cookie below.
   * Keep this for your IdP session; chat flows should use chatSessionCookieName.
   */
  sessionCookieName: process.env.SESSION_COOKIE_NAME || "__Secure-nextchat.sid",
  sessionMaxAgeSeconds: Number(process.env.SESSION_MAX_AGE_SECONDS || "3600"),

  /** Authorization policy for protected endpoints */
  allowedRoles: (process.env.ALLOWED_ROLES || "customer,agent")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),

  /**
   * Chat payload format sent to Messenger.
   * - "json": POST JSON { messages, userId, sessionId, userPrompt }
   * - "form": POST x-www-form-urlencoded
   * - "query": POST with ?user_id=&session_id=&user_prompt= (FastAPI validator style)
   */
  messengerBodyFormat: (process.env.MESSENGER_BODY_FORMAT || "json")
    .toLowerCase() as "json" | "form" | "query",

  /**
   * Query param names (only used when messengerBodyFormat="query").
   * NOTE: Route currently uses fixed names "user_id", "session_id", "user_prompt".
   * Keep these envs if you anticipate upstream renames; otherwise ignore.
   */
  qpUserId: process.env.QUERY_PARAM_USER_ID || "user_id",
  qpSessionId: process.env.QUERY_PARAM_SESSION_ID || "session_id",
  qpUserPrompt: process.env.QUERY_PARAM_USER_PROMPT || "user_prompt",

  /**
   * Dev-only: force a stable session id for easier debugging/integration tests.
   * Leave empty in prod; the server will mint a secure, random session id cookie.
   */
  messengerFixedSessionId: process.env.MESSENGER_SESSION_ID || "",

  /**
   * Guest + Chat Session cookies (used to derive user_id and session_id)
   * WHAT:
   *  - guestIdCookieName: long-lived, pseudonymous browser identifier (guest:<uuid>)
   *  - chatSessionCookieName: shorter-lived chat session id
   * WHY:
   *  - server-generated, HttpOnly cookies keep IDs off window scope (XSS-resistant)
   *  - separate from NextAuth cookie to avoid mixing concerns
   */
  guestIdCookieName: process.env.GUEST_ID_COOKIE_NAME || "__Host-nextchat.gid",
  chatSessionCookieName:
    process.env.CHAT_SESSION_COOKIE_NAME || "__Host-nextchat.sid",

  /** TTLs (seconds) — adjust to your policy */
  guestIdTtlSeconds: toInt(process.env.GUEST_ID_TTL_SECONDS, 60 * 60 * 24 * 365), // 1 year
  chatSessionTtlSeconds: toInt(process.env.CHAT_SESSION_TTL_SECONDS, 60 * 60 * 24), // 1 day

  /**
   * Cookie security flags:
   * - cookieSecure: adds `Secure` to Set-Cookie (required for __Host- prefix; true in prod)
   * - All cookies are set HttpOnly, SameSite=Strict, Path=/ by the route helper.
   */
  cookieSecure: bool(
    process.env.COOKIE_SECURE,
    process.env.NODE_ENV === "production"
  ),

  /** OIDC / NextAuth configuration */
  oidc: {
    issuer: process.env.OIDC_ISSUER || "",
    clientId: process.env.OIDC_CLIENT_ID || "",
    clientSecret: process.env.OIDC_CLIENT_SECRET || "",
    nextAuthSecret: process.env.NEXTAUTH_SECRET || "",
    nextAuthUrl: process.env.NEXTAUTH_URL || "http://localhost:3000",
  },
} as const;

// Optional: export a type for convenience in other modules
export type AppConfig = typeof config;
