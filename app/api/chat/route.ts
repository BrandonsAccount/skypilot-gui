// app/api/chat/route.ts
import { NextRequest } from "next/server";
import { z } from "zod";
import { config } from "@/lib/config";
import { hardenedFetch, streamToResponse } from "@/lib/http";
import { getServerSession, requireRole } from "@/lib/auth";
import { getOrMintGuestId, getOrMintChatSessionId } from "@/lib/ids";

/**
 * BFF chat route: validates input, enriches with user context, and POSTs to Messenger.
 * WHAT: Acts as a secure proxy between the browser and your backend Messenger service.
 * WHY: Keeps tokens/server credentials off the browser; centralizes policy and validation.
 */

const ChatInput = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "system"]),
        content: z.string(),
      })
    )
    .min(1, "At least one message is required"),
});

export async function POST(req: NextRequest) {
  // 1) Validate browser input (defense-in-depth)
  const parsed = ChatInput.safeParse(await req.json());
  if (!parsed.success) {
    return new Response(`Invalid payload: ${parsed.error.message}`, { status: 400 });
  }

  // 2) Session & authorization (no-op when auth is disabled)
  const session = await getServerSession();
  try {
    requireRole(session, config.allowedRoles);
  } catch {
    return new Response("Forbidden", { status: 403 });
  }

  // 3) Derive IDs (guest when auth off; chat session cookie for all)
  const setCookies: string[] = [];

  let userId: string;
  if (config.authEnabled && session?.user?.id) {
    userId = String(session.user.id);
  } else {
    const g = getOrMintGuestId(req);
    userId = `guest:${g.id}`;
    if (g.setCookie) setCookies.push(g.setCookie);
  }

  const s = getOrMintChatSessionId(req);
  const sessionId = s.id;
  if (s.setCookie) setCookies.push(s.setCookie);

  // 4) Determine user_prompt from the last user message
  const lastUser = [...parsed.data.messages].reverse().find((m) => m.role === "user");
  const userPrompt =
    lastUser?.content ?? parsed.data.messages.map((m) => m.content).join("\n");

  // 5) Dev echo fallback if no Messenger configured
  if (!config.messengerUrl) {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(c) {
        c.enqueue(encoder.encode("Echoing your input:\n\n"));
        c.enqueue(
          encoder.encode(parsed.data.messages.map((m) => `${m.role}: ${m.content}`).join("\n"))
        );
        c.enqueue(encoder.encode("\n\n(Configure MESSENGER_URL to call your backend.)"));
        c.close();
      },
    });
    const res = new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
    for (const ck of setCookies) res.headers.append("Set-Cookie", ck);
    return res;
  }

  // 6) Build outbound request — ALWAYS append required query params
  const bodyFormat =
    (config as any).messengerBodyFormat ?? ("json" as "json" | "form" | "query");

  const u = new URL(config.messengerUrl);
  u.searchParams.set("user_id", userId);
  u.searchParams.set("session_id", sessionId);
  u.searchParams.set("user_prompt", userPrompt);

  const headers: Record<string, string> = {};
  let body: BodyInit | undefined;

  if (bodyFormat === "form") {
    const form = new URLSearchParams();
    form.set("messages", JSON.stringify(parsed.data.messages));
    form.set("userId", userId);
    form.set("sessionId", sessionId);
    form.set("userPrompt", userPrompt);
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    body = form.toString();
  } else if (bodyFormat === "json") {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify({
      messages: parsed.data.messages,
      userId,
      sessionId,
      userPrompt,
    });
  } else {
    // bodyFormat === "query": no body
  }

  if (config.messengerSupportsStream) headers["Accept"] = "text/event-stream";

  // 7) Call Messenger (SSRF allowlist enforced inside hardenedFetch)
  const upstream = await hardenedFetch(
    u.toString(),
    { method: "POST", headers, body },
    { bearer: config.messengerApiKey || undefined }
  );

  // Helper to attach debug + cookies on the way out
  const expose = (r: Response) => {
    r.headers.set("x-upstream-url", u.toString()); // remove in prod if sensitive
    for (const ck of setCookies) r.headers.append("Set-Cookie", ck);
    return r;
  };

  if (!upstream.ok) {
    const text = await upstream.text().catch(() => "");
    return expose(new Response(text || "Messenger error", { status: upstream.status }));
  }

  // 8) Stream or JSON passthrough
  const ct = upstream.headers.get("Content-Type") || "";
  if (ct.includes("text/") || ct.includes("event-stream")) {
    return expose(streamToResponse(upstream));
  }

    const data = await upstream.json().catch(() => ({} as any));

    // Handle JSON-RPC envelope or plain object
    const payload =
      data && typeof data === "object" && "result" in data ? (data as any).result : data;

    // If the thinker returned a JSON-RPC error with 200 OK, surface it
    if (data && typeof data === "object" && "error" in data && !("result" in data)) {
      const err = (data as any).error;
      const msg =
        (err && (err.message || err.data || JSON.stringify(err))) || "Messenger JSON-RPC error";
      return expose(new Response(msg, { status: 502 }));
    }

    // Option A: pass through exactly what the GUI expects ({answer, confidence, ...})
    return expose(Response.json(payload));
}
