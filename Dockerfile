# --------------------------------------------------------------
# Multi-stage Dockerfile for Next.js (production server build)
# WHAT: Builds a minimal, non-root container that runs `next start`.
# WHY: Aligns with 12-factor (config via env), smaller image, safer defaults.
# --------------------------------------------------------------

# 1) Base builder: install deps and build the Next app
FROM node:20-alpine AS builder

# Ensure predictable environment
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

WORKDIR /app

# Install system deps only if you need (kept minimal here)
# RUN apk add --no-cache ...

# Install dependencies (use separate layers for better caching)
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./
# install WITH devDependencies (important for Tailwind/PostCSS/TS build)
RUN --mount=type=cache,target=/root/.npm \
  if [ -f yarn.lock ]; then corepack enable && yarn install --frozen-lockfile; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable && pnpm install --frozen-lockfile; \
  elif [ -f package-lock.json ] || [ -f npm-shrinkwrap.json ]; then npm ci --include=dev; \
  else npm install --include=dev; fi

# Copy the rest of the source and build
COPY . .
RUN npm run build

# strip dev deps AFTER build
RUN npm prune --omit=dev

# 2) Runtime image: copy only what we need to run the app
# --- Runner ---
FROM node:20-alpine AS runner
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
WORKDIR /app

# create non-root user
RUN addgroup -S app && adduser -S app -G app

# copy artifacts (as app owner)
COPY --from=builder --chown=app:app /app/package.json ./package.json
COPY --from=builder --chown=app:app /app/.next ./.next
# if you don’t have /public, either create it in the builder or remove this line
COPY --from=builder --chown=app:app /app/public ./public
COPY --from=builder --chown=app:app /app/node_modules ./node_modules
COPY --from=builder --chown=app:app /app/next.config.mjs ./next.config.mjs

EXPOSE 3000
USER app

# Healthcheck using Node's http client (no curl needed)
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/chat',r=>process.exit(r.statusCode<400?0:1)).on('error',()=>process.exit(1))"

CMD ["npm", "start"]

