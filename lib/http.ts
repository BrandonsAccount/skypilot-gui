import { config } from "./config";

/**
 * Hardened fetch wrapper for server-side use.
 * WHAT: Enforces an allowlist and consistent fetch defaults; supports bearer.
 * WHY: Reduces SSRF risk and keeps outbound calls consistent.
 */
export async function hardenedFetch(
  url: string,
  init: RequestInit = {},
  opts?: { bearer?: string }
): Promise<Response> {
  const u = new URL(url);
  const hostPort = `${u.host}`; // includes :port if present

  if (config.allowlist.length > 0 && !config.allowlist.includes(hostPort)) {
    throw new Error(`Upstream host not in ALLOWLIST: ${hostPort}`);
  }

  const headers = new Headers(init.headers || {});
  if (opts?.bearer) headers.set("Authorization", `Bearer ${opts.bearer}`);

  return fetch(url, {
    redirect: "error",
    cache: "no-store",
    ...init,
    headers
  });
}

/**
 * Pipe an upstream streaming response directly to the client.
 * WHAT: Rewraps body stream while preserving status and basic content-type.
 * WHY: Avoids buffering large responses and keeps latency low.
 */
export function streamToResponse(res: Response): Response {
  if (!res.body) {
    return new Response("Upstream had no body", { status: 502 });
  }
  const contentType = res.headers.get("Content-Type") ?? "text/plain; charset=utf-8";
  return new Response(res.body, { status: res.status, headers: { "Content-Type": contentType } });
}
