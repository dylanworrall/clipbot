# Socials

AI-powered social media content engine. Clip videos, generate posts, publish everywhere, and learn what works — all through natural conversation.

Built by [Soshilabs](https://soshi.dev)

## What it does

- **Video clipping** — Drop a YouTube URL or upload a `.mov`/`.mp4`. AI finds viral moments, cuts short-form clips, adds captions, and formats for TikTok/Reels/Shorts.
- **AI drafting** — Generate tweets, threads, LinkedIn posts, Instagram captions. Swipe through them Tinder-style or review in a list.
- **Multi-platform publishing** — Publish to 14+ platforms via [Zernio](https://zernio.com): TikTok, YouTube, Instagram, Facebook, X, LinkedIn, Pinterest, Reddit, Bluesky, Threads, Telegram, Snapchat, WhatsApp, Google Business.
- **AutoScore** — Self-improving feedback loop. Compares predicted virality scores against real engagement data and adjusts scoring weights over time.
- **Content autopilot** — Fetches trending topics from tracked creators, analyzes what performs well, generates draft posts daily.
- **Brand profile** — AI learns your tone, audience, and content pillars from your website. All generated content matches your voice.
- **Real analytics** — Pull engagement data from Zernio (views, likes, comments, shares, engagement rate) with platform breakdowns.
- **MCP server** — 57 tools exposed over JSON-RPC for integration with Claude Desktop, Soshi Desktop, or any MCP client.

## Stack

| Layer | Tech |
|-------|------|
| UI | Next.js 16, React 19, Tailwind CSS 4, Framer Motion |
| AI | Vercel AI SDK, Claude/Gemini models |
| Publishing | [Zernio API](https://docs.zernio.com) (OAuth connect + post management) |
| Auth | BetterAuth + Convex |
| Pipeline | FFmpeg, yt-dlp, Cobalt |
| Data | JSON file stores (local), Convex (cloud) |

## Getting started

```bash
# Clone
git clone https://github.com/dylanworrall/clipbot.git
cd clipbot

# Install dependencies
npm install
cd ui && npm install

# Set up environment
cp .env.example .env
# Add your keys:
#   GOOGLE_GENERATIVE_AI_API_KEY=...
#   LATE_API_KEY=sk_...  (Zernio API key)

# Run the UI
cd ui && npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_GENERATIVE_AI_API_KEY` | Yes | Gemini API key for AI analysis |
| `LATE_API_KEY` | Yes | Zernio API key for publishing + analytics |
| `COBALT_URL` | No | Self-hosted Cobalt instance for downloads (default: `http://localhost:9000`) |
| `CONVEX_DEPLOYMENT` | Cloud only | Convex deployment for auth + cloud storage |
| `NEXT_PUBLIC_CONVEX_URL` | Cloud only | Convex URL (enables cloud mode) |

## Features

### Video pipeline
Paste a YouTube URL or drag-and-drop a video file. The pipeline:
1. Downloads the video (Cobalt or yt-dlp)
2. Transcribes with word-level timestamps
3. AI analyzes transcript for viral moments (scored 1-10)
4. FFmpeg cuts clips with background fill + captions
5. Clips appear in the UI ready for review and publishing

Supports: YouTube, Twitch, Kick, TikTok, Instagram, X, Facebook, Reddit, Dailymotion, Vimeo. Plus local `.mov`, `.mp4`, `.mkv`, `.avi`, `.webm` files.

### AI chat
Conversational interface with 30+ tools. Examples:
- "Process this YouTube video: [url]"
- "Generate 5 tweets about AI productivity"
- "Run the autopilot"
- "Connect my TikTok account"
- "Show my analytics for the last 30 days"
- "Fill my queue with linkedin posts and threads"

### Social connectors
Connect accounts via Zernio OAuth. Multiple accounts per platform supported (each gets its own Zernio profile). Publishing targets all connected accounts automatically.

### AutoScore
Learns from real post analytics to improve virality predictions:
- Collects engagement data from all published posts
- Normalizes to 1-10 scale via percentile ranking
- Pearson correlation tracks prediction accuracy
- Per-category weight adjustments (education, entertainment, controversy, etc.)
- Decay-weighted for recency — recent data matters more

### Content queue
AI generates content in multiple formats (tweet, thread, LinkedIn, caption, script, meme). Review in:
- **List view** — Edit inline, publish, or delete
- **Swipe view** — Tinder-style cards, swipe right to approve, left to reject

### MCP server
JSON-RPC endpoint at `/api/mcp` exposes all tools for external AI agents:

```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

## Project structure

```
clipbot/
  src/                  # CLI pipeline (TypeScript)
    modules/            # downloader, transcript, analyzer, clipper, publisher, captions
    pipeline/           # runner, state management
  ui/                   # Next.js web app
    src/
      app/              # Pages (chat, drafts, calendar, analytics, creators, settings)
      components/       # UI components (Soshi dark design system)
      lib/
        ai/             # AI tools (tools.ts), system prompt, tool definitions
        mcp/            # MCP server (handler, auth, crypto, rate limiting)
        *.ts            # Stores (brand, queue, schedule, autoscore, settings, creators)
      hooks/            # React hooks (useSettings, useAiChat, useThreads)
    convex/             # Convex schema + functions (cloud mode)
  dist/                 # Compiled CLI + MCP tools
```

## Settings

Accessible at `/settings` with tabs:

| Tab | What it does |
|-----|-------------|
| General | Account, API keys, Claude model config |
| Brand | AI-powered brand profile (scrape URL, edit tone/audience/topics) |
| Style | Pipeline defaults, caption styling, background fill |
| Scoring | Virality weight sliders (hook, standalone, controversy, education, etc.) |
| AutoScore | Self-improving feedback loop config + learning cycle |
| Autopilot | Daily content generation config (posts/day, preferred time, platforms) |
| Connectors | Social account connections (14 platforms via Zernio) |
| Billing | Subscription management (cloud mode, via Whop) |

## License

Private. Copyright Soshilabs 2026.
