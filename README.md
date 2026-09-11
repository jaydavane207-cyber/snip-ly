# Scalable URL Shortener

A high-performance, scalable URL Shortener backend built with **Next.js 14 App Router**, **PostgreSQL**, **Redis**, and **Prisma ORM**.

## Features

- ⚡ **High-Performance Caching**: Redis (ioredis) caching with 1-hour TTL on redirects for low-latency lookups.
- 🗄️ **Persistent Relational DB**: PostgreSQL 16 managed via Prisma ORM for structured link and click tracking.
- 🔗 **Custom Aliases & NanoID Generation**: Supports custom short codes (validated via Zod) or auto-generated 7-character NanoIDs.
- ⏳ **Link Expiration**: Configurable expiration periods (`1h`, `24h`, `7d`, `never`).
- 🛡️ **Type-Safe Validation**: Full request schema validation powered by Zod.
- 🐳 **Containerized Setup**: Ready-to-use Docker Compose for PostgreSQL 16 and Redis 7.

---

## Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router, TypeScript)
- **Database**: [PostgreSQL 16](https://www.postgresql.org/)
- **Caching**: [Redis 7](https://redis.io/) via [ioredis](https://github.com/redis/ioredis)
- **ORM**: [Prisma](https://www.prisma.io/)
- **Validation**: [Zod](https://zod.dev/)
- **ID Generator**: [nanoid](https://github.com/ai/nanoid)

---

## Architecture & Flow

```
[Client] ---> POST /api/links ---> Zod Validation ---> Check / Generate Code ---> Prisma (PostgreSQL) ---> Return Short URL
[Client] ---> GET /s/:code   ---> Check Redis Cache
                                      |
                                      +--> Cache HIT  ---> 302 Redirect to originalUrl
                                      +--> Cache MISS ---> Prisma DB Lookup ---> (Not found / Expired -> 404)
                                                                 |
                                                                 +--> Set Redis Cache (TTL 3600s) ---> 302 Redirect
```

---

## Getting Started

### 1. Prerequisites
- [Node.js 18+](https://nodejs.org/)
- [Docker](https://www.docker.com/) & Docker Compose

### 2. Clone and Install Dependencies
```bash
git clone https://github.com/jaydavane207-cyber/url-shortener.git
cd url-shortener
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Ensure `.env` matches your configuration:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/urldb?schema=public"
REDIS_URL="redis://localhost:6379"
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
```

### 4. Start Infrastructure (Postgres & Redis)
```bash
docker compose up -d
```

### 5. Run Database Migrations
```bash
npx prisma migrate dev --name init
```

### 6. Start the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## API Documentation

### 1. Create Short Link
**`POST /api/links`**

**Request Body:**
```json
{
  "originalUrl": "https://example.com/very/long/url",
  "customAlias": "my-alias",   // Optional: 3-20 alphanumeric, hyphen, underscore characters
  "expiresIn": "24h"          // Optional: "1h" | "24h" | "7d" | "never" (default: "never")
}
```

**Success Response (`201 Created`):**
```json
{
  "shortCode": "my-alias",
  "shortUrl": "http://localhost:3000/s/my-alias"
}
```

**Error Responses:**
- `400 Bad Request`: Validation failure (e.g. invalid URL, invalid alias format).
- `409 Conflict`: Custom alias is already in use.
- `500 Internal Server Error`: Unexpected server error.

---

### 2. Redirect to Original URL
**`GET /s/:code`**

- Checks Redis cache for `short:<code` (Cache HIT -> 302 Redirect).
- If not cached, looks up in PostgreSQL and populates Redis cache with 3600s TTL.
- Returns `302 Found` with `Location` header targeting the original URL.
- Returns `404 Not Found` if the code does not exist or has expired.

---

## License

MIT
