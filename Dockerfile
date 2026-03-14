FROM node:20-slim

# Install system deps: ffmpeg, yt-dlp, python3, deno (for yt-dlp JS extraction)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    python3-pip \
    python3-venv \
    curl \
    unzip \
    && python3 -m venv /opt/venv \
    && /opt/venv/bin/pip install yt-dlp \
    && ln -s /opt/venv/bin/yt-dlp /usr/local/bin/yt-dlp \
    && curl -fsSL https://deno.land/install.sh | DENO_INSTALL=/usr/local sh \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Install tsx globally for running TypeScript
RUN npm install -g tsx

WORKDIR /app

# Copy package files first for better caching
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy source + worker
COPY tsconfig.json ./
COPY src/ ./src/
COPY worker.ts ./

# Copy cookies.txt if it exists (for YouTube auth on datacenter IPs)
# Goes to /app/ (CWD) since /data/ is a volume mount that overwrites at runtime
COPY cookies.tx[t] /app/cookies.txt

# Point CLI to use /data as its home dir (persistent volume on Fly.io)
# This makes it write output to /data/output/, read cookies from /data/cookies.txt
ENV NODE_ENV=production
ENV CLIPBOT_HOME=/data
ENV CLIPBOT_OUTPUT_DIR=/data/output
ENV WORKER_PORT=4000

EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
    CMD curl -f http://localhost:4000/health || exit 1

CMD ["tsx", "worker.ts"]
