# Snip.ly - Production URL Shortener & Link Management Platform

A high-performance, enterprise-grade URL shortener and bio-link management platform built with Next.js 14 App Router, PostgreSQL 16, Redis 7, Prisma ORM, BullMQ, and Tailwind CSS.

---

## Architecture Overview

```
                                      +------------------------+
                                      |     Client Browser     |
                                      +-----------+------------+
                                                  |
                    +-----------------------------+-----------------------------+
                    |                                                           |
          [ Redirect: /s/:code ]                                       [ API / Dashboard ]
                    |                                                           |
        +-----------v-----------+                                   +-----------v-----------+
        |   Redis Cache Lookup  |                                   |  Next.js 14 App Router|
        +-----+-----------+-----+                                   |  Zod Schema Validation|
              |           |                                         +-----------+-----------+
         (Cache Hit) (Cache Miss)                                               |
              |           |                                         +-----------v-----------+
              |     +-----v-----+                                   |   PostgreSQL 16 DB    |
              |     | PostgreSQL|                                   |     (Prisma ORM)      |
              |     +-----+-----+                                   +-----------------------+
              |           |
        +-----v-----------v-----+
        |  Rule Resolution:     |
        |  1. Country (GeoIP)   |
        |  2. Device (Mobile/PC)|
        |  3. A/B Split (Weight)|
        |  4. Original URL      |
        +-----------+-----------+
                    |
        +-----------v-----------+
        |  302 Found Redirect   |
        +-----------+-----------+
                    | (async non-blocking)
        +-----------v-----------+
        |  BullMQ Click Queue   |-----> [ Background Worker: clickWorker.ts ]
        |  (Redis 7 Stream)     |-----> [ DB Persistence + Webhook Milestones ]
        +-----------------------+
```

---

## Core Capabilities

- **Ultra-Fast Redirects with Redis Caching**: Sub-millisecond redirects served directly from Redis with 1-hour sliding TTL.
- **Smart Dynamic Routing**: Geolocation routing (GeoIP) and device-specific routing (mobile vs. desktop).
- **A/B Split Testing**: Weighted multi-destination traffic distribution across up to 5 target URLs.
- **Asynchronous Click Ingestion (BullMQ)**: High-throughput click event queueing powered by Redis and processed by background worker processes.
- **Live Real-Time Analytics & CSV Export**: Real-time click counters, 60-minute live velocity, active user estimations, country/browser breakdowns, and one-click CSV export.
- **Developer REST API**: Programmatic link creation via `/api/v1/shorten` authenticated by revocable SHA-256 API keys (`x-api-key: snip_...`).
- **Bio Link Hubs**: Customizable public bio profiles (`/b/:username`) displaying selected verified links and social profiles.
- **Webhook Milestones**: Automatic webhook dispatch on click milestones (10, 50, 100, 500, 1000, 5000) with timeout safety.
- **AI-Powered Alias & Metadata Generation**: Automated custom alias and metadata generation using Google Gemini 2.0 Flash with deterministic fallback.
- **Password Protection & Expiry**: Bcrypt-hashed password protection unlock screens and time-based link expiration (`1h`, `24h`, `7d`, `never`).
- **Security & SSRF Hardening**: Private IP and localhost filtering, input sanitation, and rate limiting (10 requests/minute per IP).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14.2 (App Router, Server Components, Route Handlers) |
| Language | TypeScript 5 |
| Database | PostgreSQL 16 (via Prisma ORM 6) |
| Caching & Queue | Redis 7 (via ioredis and BullMQ) |
| Worker Process | tsx running BullMQ Worker |
| Styling | Tailwind CSS, Lucide Icons, Framer Motion |
| Charts & UI | Recharts, Sonner (Toasts), QRCode.react |
| Testing | Vitest 5 |

---

## Getting Started

### 1. Prerequisites
- Node.js 18+ (Node 20+ recommended)
- Docker & Docker Compose (or local PostgreSQL & Redis)

### 2. Infrastructure Setup
Start the PostgreSQL 16 and Redis 7 containers:
```bash
docker compose up -d
```

Verify containers are running:
```bash
docker ps
```

### 3. Environment Configuration
Verify your `.env` file contains valid database and cache connection strings:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/urldb?schema=public"
REDIS_URL="redis://localhost:6379"
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
GEMINI_API_KEY=""
```

### 4. Database Schema Sync
Generate the Prisma client and sync schema to PostgreSQL:
```bash
npx prisma db push
```

### 5. Running the Application
Run the Next.js development server:
```bash
npm run dev
```

In a separate terminal, launch the background click processing worker:
```bash
npm run worker
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Production Build & Scripts

- `npm run build`: Generates Prisma client and compiles production Next.js application with zero warnings/errors.
- `npm run start`: Starts the optimized production Next.js HTTP server.
- `npm run worker`: Starts the BullMQ background worker for queue processing.
- `npm run lint`: Runs ESLint across all source directories (`app/`, `lib/`, `components/`, `workers/`).
- `npm test`: Executes all Vitest unit and integration test suites.

---

## REST API Documentation

### Create Short Link (REST v1)
`POST /api/v1/shorten`

Headers:
- `Content-Type: application/json`
- `x-api-key: snip_your_api_key_here`

Request Body:
```json
{
  "originalUrl": "https://example.com/target-landing-page",
  "customAlias": "custom-promo",
  "expiresIn": "7d",
  "title": "Promo Campaign",
  "folder": "Marketing",
  "tags": ["promo", "summer"]
}
```

Response (`200 OK`):
```json
{
  "id": "cuid_here",
  "shortCode": "custom-promo",
  "shortUrl": "http://localhost:3000/s/custom-promo",
  "originalUrl": "https://example.com/target-landing-page",
  "title": "Promo Campaign"
}
```

### Export Click Analytics (CSV)
`GET /api/links/:code/export`

Returns a CSV file attachment containing:
- `timestamp`: ISO-8601 click timestamp
- `country`: Two-letter ISO country code or UNKNOWN
- `device`: `desktop` or `mobile`
- `browser`: Detected browser family
- `os`: Operating system family
- `referrer`: HTTP referrer URL or Direct

---

## Testing & Quality Assurance

Run the test suite:
```bash
npx vitest run
```

All 88 test cases across 8 test suites pass:
1. `tests/routing.unit.test.ts` (20 tests): Destination resolution, smart routing rules, weighted A/B split calculations.
2. `tests/api.integration.test.ts` (18 tests): Full HTTP API lifecycle, redirects, rate limiting, UTM parameters, password verification, max clicks enforcement.
3. `tests/frontend.smoke.test.ts` (4 tests): Route smoke tests for dashboard, bio links, and analytics.
4. `lib/__tests__/verify.test.ts` (5 tests): Password hashing and comparison logic.
5. `lib/__tests__/routing.test.ts` (13 tests): Smart rule matchers and device parsing.
6. `lib/__tests__/metadata.test.ts` (6 tests): SSRF protection and metadata extraction.
7. `lib/__tests__/schemas.test.ts` (11 tests): Zod validation schemas.
8. `lib/__tests__/v3_features.test.ts` (11 tests): Webhooks, live stats, and bio hubs.
