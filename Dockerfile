FROM node:20-slim AS base

# Install system deps: ffmpeg, yt-dlp, python3, build tools for native modules (better-sqlite3)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    python3-pip \
    python3-venv \
    curl \
    build-essential \
    && python3 -m venv /opt/venv \
    && /opt/venv/bin/pip install yt-dlp \
    && ln -s /opt/venv/bin/yt-dlp /usr/local/bin/yt-dlp \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# ── Stage 1: Install ALL CLI deps (including dev for tsc build) ──────────
FROM base AS cli-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ── Stage 2: Build CLI (TypeScript → dist/) ─────────────────────────────
FROM cli-deps AS cli-build
COPY tsconfig.json ./
COPY src/ ./src/
RUN npx tsc

# ── Stage 3: Install CLI production deps only ────────────────────────────
FROM base AS cli-prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev \
    && rm -rf node_modules/ffmpeg-static/* \
    && echo 'export default "/usr/bin/ffmpeg";' > node_modules/ffmpeg-static/index.mjs \
    && echo '{"main":"index.mjs","type":"module"}' > node_modules/ffmpeg-static/package.json \
    && rm -rf node_modules/ffprobe-static/bin \
    && echo 'export default { path: "/usr/bin/ffprobe" };' > node_modules/ffprobe-static/index.mjs \
    && echo '{"main":"index.mjs","type":"module"}' > node_modules/ffprobe-static/package.json

# ── Stage 4: Install UI deps ─────────────────────────────────────────────
FROM base AS ui-deps
WORKDIR /app/ui
COPY ui/package.json ui/package-lock.json ./
RUN npm ci

# ── Stage 5: Build UI (Next.js) ──────────────────────────────────────────
FROM base AS ui-build
WORKDIR /app

# Copy CLI source (needed by UI build for path resolution / imports)
COPY package.json package-lock.json tsconfig.json ./
COPY src/ ./src/
COPY clipbot.config.json ./
COPY --from=cli-prod-deps /app/node_modules ./node_modules

# Copy UI source + deps
COPY ui/ ./ui/
COPY --from=ui-deps /app/ui/node_modules ./ui/node_modules

# Build Next.js (BETTER_AUTH_SECRET needed at build time to avoid prerender crash)
WORKDIR /app/ui
ENV NEXT_TELEMETRY_DISABLED=1
ENV BETTER_AUTH_SECRET=build-time-placeholder-not-used-at-runtime
RUN npm run build

# ── Stage 6: Production image ────────────────────────────────────────────
FROM base AS production
WORKDIR /app

# Copy compiled CLI + production deps + prompts
COPY package.json package-lock.json ./
COPY clipbot.config.json ./
COPY prompts/ ./prompts/
COPY --from=cli-build /app/dist ./dist
COPY --from=cli-prod-deps /app/node_modules ./node_modules

# Copy built UI + deps
COPY --from=ui-build /app/ui/.next ./ui/.next
COPY --from=ui-build /app/ui/public ./ui/public
COPY ui/package.json ./ui/package.json
COPY ui/next.config.ts ./ui/next.config.ts
COPY --from=ui-deps /app/ui/node_modules ./ui/node_modules

# Environment
ENV NODE_ENV=production
ENV CLIPBOT_HOME=/data
ENV CLIPBOT_OUTPUT_DIR=/data/output
ENV CLIPBOT_CLI_ROOT=/app
ENV CLIPBOT_PRODUCTION=1
ENV PORT=3000

EXPOSE 3000

# Health check against Next.js
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s \
    CMD curl -f http://localhost:3000/ || exit 1

# Start Next.js
WORKDIR /app/ui
CMD ["npx", "next", "start", "-H", "0.0.0.0", "-p", "3000"]
