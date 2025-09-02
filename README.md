<h3 align="center"><img src="public/img/skypilot-gui-logo.png" height="64"><br>SkyPilot GUI</h3>
<!-- https://raw.githubusercontent.com/brandonsaccount/skypilot-gui/poc/ -->

## A web-based chat interface for SkyPilot MCP.


---

## Design concepts
- **Security context:** Keep tokens and policy **server-side** (BFF), enforce security headers, and avoid exposing long‑lived secrets to the browser.
- **12-Factor ready:** Config via env, stateless processes, logging to stdout, strict separation of build and run stages.
- **Auth on a switch:** Use OIDC (Authorization Code + PKCE via Auth.js/NextAuth) when you’re ready. Disabled by default so you can bootstrap fast.
- **Messenger-first:** The BFF **POSTs** your chat payloads to **`MESSENGER_URL`** (with optional bearer). The Messenger can call FastAPI/LLM/etc.

---

## Quick Start

```bash
# 1) Install deps
npm install

# 2) Create env
cp .env.example .env.local

# 3) Start Dev (no auth; dev echo fallback)
npm run dev
# open http://localhost:3000
```

### Enable Auth (later)
Out-of-the-box you can run the UI without auth and without a live Messenger by using the built-in dev echo fallback. Flip `AUTH_ENABLED=true` and point `MESSENGER_URL` to your service when ready.


1. Set in `.env.local`:
   ```ini
   AUTH_ENABLED=true
   OIDC_ISSUER=your-issuer
   OIDC_CLIENT_ID=your-client-id
   OIDC_CLIENT_SECRET=your-client-secret
   NEXTAUTH_SECRET=long-random-string
   ```
2. Configure your IdP redirect URI to `http://localhost:3000/api/auth/callback/oidc`.
3. Add your Messenger to the CSP `connect-src` and `ALLOWLIST` in the env and Next config if needed.
4. Restart `npm run dev`.

### Point to SkyPilot Messenger

Set:
```ini
MESSENGER_URL=https://messenger.example.com/messages
MESSENGER_API_KEY=your-token   # optional
ALLOWLIST=messenger.example.com:443
```

> **Contract:** The BFF will `POST`:
> ```json
> {
>   "messages": [{"role":"user","content":"Hi"}],
>   "userId": "abc123"
> }
> ```
> If `MESSENGER_SUPPORTS_STREAM=true`, the BFF sets `Accept: text/event-stream` and will proxy a streamed text body back to the browser. Otherwise it expects JSON `{ "reply": "..." }`.

---

## Architecture

**Browser ⇄ Next.js (BFF) ⇄ Messenger Service ⇄ FastAPI/LLM**

- **BFF route** `/api/chat`: validates input, adds user context (if auth enabled), and calls `MESSENGER_URL` with a short‑lived server credential.
- **No browser tokens:** Access/refresh tokens are never exposed to JS; the app uses HTTP‑only cookies for the session.
- **Streaming:** If your Messenger streams (SSE/chunked), the BFF pipes it back to the client.

---

## Security Notes (friendly defaults)

- **CSP & headers**: Set in `next.config.mjs`. Adjust `connect-src` for your Messenger host.
- **RBAC hook**: `requireRole()` in `lib/auth.ts` demonstrates how to gate endpoints.
- **Validation**: `zod` strictly validates requests (and you can validate responses too).
- **Allowlist**: `lib/http.ts` blocks calls to non-allowlisted upstreams to reduce SSRF risk.
- **Cookies**: HTTP-only, `Secure`, `SameSite=Strict` when deployed behind HTTPS.
- **Secrets**: Never stored client-side. All secrets come from env.

---

## Project Structure

```
app/
  api/
    chat/route.ts           # BFF: POST to Messenger (streams or JSON)
    auth/[...nextauth]/route.ts   # OIDC handler (only active if AUTH_ENABLED=true)
  chat/page.tsx             # Chat UI
  layout.tsx                # App frame & global styles
  page.tsx                  # Redirect to /chat
lib/
  auth.ts                   # Session/role helpers (what & why explained)
  config.ts                 # Centralized env parsing + feature flags
  http.ts                   # Hardened fetch + stream piping
  types.ts                  # Shared types (Message)
app/globals.css             # Tailwind base styles
middleware.ts               # Optional guard (only when AUTH_ENABLED=true)
```

---

## Mocking & Local Dev

- No Messenger running? Leave `MESSENGER_URL` unset or point it at localhost and keep `MESSENGER_SUPPORTS_STREAM=false`. The BFF has a **dev echo fallback** so you can test the UI.
- To fully test streaming, run any local HTTP server that streams text, and set `MESSENGER_SUPPORTS_STREAM=true`.

---

## Deployment

- Containers recommended. Pass all config via environment variables.
- Ensure your platform injects `NEXTAUTH_SECRET` and IdP secrets.
- Update `connect-src` CSP for production hosts and terminate TLS upstream.

---

## License

MIT — use freely, harden for your environment.

---

## Running in Docker

This project includes a **multi-stage Dockerfile** for containerized builds and runtime.

### Build the image

```bash
docker build -t skypilot-gui .
```

### Run the container

Pass environment variables via `--env` or `--env-file`:

```bash
docker run --rm -p 3000:3000 --env-file .env.local --network skypilot --name skypilot-gui skypilot-gui
```

Visit [http://localhost:3000](http://localhost:3000).

> **Note:** In production, ensure `NODE_ENV=production`, and mount any required secrets/config via environment variables.

---

## Container Build & Run

This project ships with a production-ready **multi-stage Dockerfile** that runs `next start` as a **non-root** user. All configuration is supplied via environment variables (12‑factor).

### Build

```bash
# From repo root
docker build -t nextjs-chat-bff:latest .
```

### Run (no auth; dev echo fallback)

```bash
docker run --rm -p 3000:3000 \
  -e AUTH_ENABLED=false \
  -e ALLOWLIST=localhost:9000 \
  nextjs-chat-bff:latest
# open http://localhost:3000
```

### Run against your Messenger

```bash
docker run --rm -p 3000:3000 \
  -e AUTH_ENABLED=false \
  -e MESSENGER_URL=https://messenger.example.com/messages \
  -e MESSENGER_API_KEY=your-token \
  -e MESSENGER_SUPPORTS_STREAM=true \
  -e ALLOWLIST=messenger.example.com:443 \
  nextjs-chat-bff:latest
```

### Run with OIDC auth enabled

```bash
docker run --rm -p 3000:3000 \
  -e AUTH_ENABLED=true \
  -e OIDC_ISSUER=https://your-issuer \
  -e OIDC_CLIENT_ID=client-id \
  -e OIDC_CLIENT_SECRET=client-secret \
  -e NEXTAUTH_SECRET=$(openssl rand -hex 32) \
  -e NEXTAUTH_URL=http://localhost:3000 \
  -e SESSION_COOKIE_NAME=__Secure-nextchat.sid \
  -e SESSION_MAX_AGE_SECONDS=3600 \
  -e ALLOWED_ROLES="customer,agent" \
  -e ALLOWLIST=messenger.example.com:443 \
  -e MESSENGER_URL=https://messenger.example.com/messages \
  -e MESSENGER_API_KEY=your-token \
  nextjs-chat-bff:latest
```

> **Notes**
> - The image runs as a **non-root** user and exposes port **3000**.
> - Healthcheck hits `/` every 30s; adjust or remove as desired.
> - Update CSP `connect-src` in `next.config.mjs` for your production Messenger domain(s).
> - If your platform injects env via secrets/vars, you can omit them from the `docker run` CLI.
