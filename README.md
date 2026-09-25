# Snip.ly — Modern URL Shortener & Link Platform

> High-performance, production-ready URL shortener, dynamic routing engine, and bio-link hub built with Next.js 14 App Router, PostgreSQL, Redis, BullMQ, and Tailwind CSS.

**Live Demo**: [UPDATE_AFTER_DEPLOY]

---

## 🚀 Features Grid

| Feature | Description |
|---|---|
| ⚡ **URL Shortening** | Instant short link creation with custom aliases, auto-generated favicons, and QR codes. |
| 🌍 **Smart Redirects** | Route visitors dynamically by country (GeoIP ISO codes) or device type (Mobile vs. Desktop). |
| 🔀 **A/B Testing** | Weighted traffic split across multiple destinations with statistical validation. |
| 🏷️ **UTM Builder** | Automated UTM parameter appending (`utm_source`, `utm_medium`, `utm_campaign`). |
| 📊 **Live Analytics** | Real-time click counters, 60-min velocity, country/browser breakdowns, and CSV export. |
| 🤖 **AI Suggestions** | AI-generated catchy slugs and metadata via Google Gemini 2.0 Flash with local fallback. |
| 👤 **Bio Link Hubs** | Public `/b/:username` landing pages displaying verified link collections and social profiles. |
| 🔔 **Webhooks** | Automated webhook dispatch on click milestones (`10`, `50`, `100`, `500`, `1000`, `5000`). |
| 🔑 **API Keys** | Programmatic REST API access with SHA-256 hashed API keys (`snip_...`). |
| 🔒 **Access Controls** | Bcrypt password protection unlock screen, expiration dates, and max click limits. |

---

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router, Server Components & Route Handlers)
- **Language**: TypeScript 5
- **Database**: PostgreSQL 16 via Prisma ORM 6
- **Caching & State**: Redis 7 via `ioredis` (Supports Upstash `rediss://` TLS)
- **Job Queue**: BullMQ (with automatic direct PostgreSQL fallback for serverless)
- **Authentication**: Optional Clerk integration with graceful non-authenticated fallback
- **Styling & UI**: Tailwind CSS, Framer Motion, Lucide Icons, Sonner Toasts
- **Testing**: Vitest (Unit, Integration, and Frontend Smoke tests)

---

## 📐 Architecture

```text
                                  +------------------+
                                  |   User Browser   |
                                  +--------+---------+
                                           |
                                           v
                             +-----------------------------+
                             |     Next.js 14 Server       |
                             |  (App Router / Serverless)  |
                             +--------------+--------------+
                                            |
                         +------------------+------------------+
                         |                                     |
               [ Cache Lookup ]                              [ Miss ]
                         v                                     v
             +-----------------------+               +-------------------+
             |    Redis JSON Cache   |               |   PostgreSQL DB   |
             |   (Sub-ms Redirect)   |               |   (Prisma ORM)    |
             +-----------+-----------+               +---------+---------+
                         |                                     |
                         +------------------+------------------+
                                            |
                                            v
                                 +---------------------+
                                 | 302 Target Redirect |
                                 +----------+----------+
                                            |
                                            v
                       +-----------------------------------------+
                       |        Async Click Ingestion            |
                       |  1. Try BullMQ Queue -> Worker Process  |
                       |  2. Direct PostgreSQL fallback on error |
                       +-----------------------------------------+
```

---

## 💻 Run Locally

### 1. Start Infrastructure
Run PostgreSQL and Redis via Docker Compose:
```bash
docker compose up -d
```

### 2. Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

### 3. Sync Database Schema
Push the Prisma schema to your local database:
```bash
npx prisma db push
```

### 4. Run Development Server and Worker
In **Terminal 1** (Next.js dev server):
```bash
npm run dev
```

In **Terminal 2** (BullMQ asynchronous worker):
```bash
npm run worker
```

### 5. Explore Interactive Demo Mode
1. Open [http://localhost:3000/demo](http://localhost:3000/demo) in your browser.
2. Click **"Seed Realistic Demo Data"** to automatically populate sample links, smart routes, A/B splits, and 50 realistic historical clicks.
3. Walk through the interactive feature tours or test smart routing live!

---

## 🔐 Environment Variables

| Variable | Description | Example / Required |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/urldb?schema=public` |
| `REDIS_URL` | Redis connection URL (`rediss://` for Upstash) | `redis://localhost:6379` |
| `NEXT_PUBLIC_BASE_URL` | Application root URL for short links | `https://snip-ly.vercel.app` or `http://localhost:3000` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key (Optional) | `pk_test_...` |
| `CLERK_SECRET_KEY` | Clerk secret key (Optional) | `sk_test_...` |
| `GEMINI_API_KEY` | Google Gemini API key (Optional) | `AIzaSy...` (from Google AI Studio) |

---

## 📡 REST API Documentation

### 1. Create a Short Link
```http
POST /api/links
Content-Type: application/json

{
  "originalUrl": "https://example.com/long-page-url",
  "customAlias": "my-promo",
  "folder": "Marketing",
  "tags": ["launch", "q4"],
  "rules": [
    { "type": "device", "value": "mobile", "destinationUrl": "https://m.example.com" }
  ]
}
```

### 2. Redirect Short Link
```http
GET /s/:code
```
Returns `302 Found` with `Location` pointing to the resolved destination (evaluating GeoIP, device rules, and A/B split weights).

### 3. Developer API (External Shortening)
```http
POST /api/v1/shorten
Content-Type: application/json
x-api-key: snip_YOUR_API_KEY

{
  "originalUrl": "https://example.com",
  "customAlias": "api-docs"
}
```

---

## 🧪 Running Tests

Run the full automated test suite (Unit, Integration, and Smoke tests):
```bash
npx vitest run
```
Or run in watch mode:
```bash
npm test
```
