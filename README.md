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

## Autonomous Agent Guardrails & Sandboxing

This repository is configured with a strict 3-tier security model for autonomous AI coding agents:

### 1. Ephemeral Containerization
- **Sandbox Image**: `docker/Dockerfile.agent` (unprivileged `agent` user on Node 20 Alpine).
- **Directory Restrictions**: Application source (`app/`, `lib/`, `prisma/`, `public/`) is mounted read-write (`:rw`), while root configs (`package.json`, `tsconfig.json`, `next.config.mjs`, `.env`) are mounted **read-only** (`:ro`).
- **Commands**:
  ```bash
  # Linux/WSL/macOS
  ./scripts/agent-container-run.sh run       # Launch ephemeral container (--rm)
  ./scripts/agent-container-run.sh respawn   # Terminate dirty container & respawn fresh

  # Windows PowerShell
  .\scripts\agent-container-run.ps1 run
  .\scripts\agent-container-run.ps1 respawn
  ```

### 2. Command Allowlisting
- **Safe Executor**: All commands executed by an agent must be routed through `node scripts/safe-executor.js <cmd>`.
- **Allowlisted**: `npm run build`, `npm run lint`, `npm test`, `git status`, `git diff`, `git add`, `git commit`, `npx prisma validate`.
- **Blocked**: Destructive actions (`rm -rf`), permission modifications (`chmod`), arbitrary outbound network calls (`curl`, `wget`), and direct pushes to `main`.

### 3. Git-Driven State Reversion
- Agents operate like junior developers:
  ```bash
  # 1. Start on an isolated task branch (prevent edits on main)
  node scripts/agent-task.js start <feature-name>

  # 2. Run automated validation (lint & build)
  node scripts/agent-task.js verify

  # 3. Commit to agent task branch
  node scripts/agent-task.js commit "feat: implement feature"

  # 4. Generate Pull Request summary (human review required)
  node scripts/agent-task.js pr

  # 5. Fast state reversion (wipes broken agent branch and restores clean main in seconds)
  node scripts/agent-task.js discard
  ```

---

## License

MIT
