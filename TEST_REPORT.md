# URL Shortener — Local QA & Full-Stack Test Report

**Execution Date:** 2026-09-23  
**Environment:** Windows (Local Docker Engine + Node.js v24.14.0)  
**Database:** PostgreSQL 16 (Port 5432)  
**Cache:** Redis 7-Alpine (Port 6379)  
**Server:** Next.js 14.2.23 (App Router on `http://localhost:3000`)

---

## 1. Summary of Execution Status

| Category | Status | Details |
| :--- | :---: | :--- |
| **Build Status** | **PASS** | `npm run build` compiled 14/14 static & dynamic routes with zero TypeScript or packaging errors. |
| **Lint Status** | **PASS** | `npm run lint` clean (0 errors, 0 warnings across all files). |
| **Vitest Total** | **PASS** | **88 / 88 tests passing** (8 test files, 100% pass rate). |
| **Pre-existing Tests** | **PASS** | 46 / 46 passing (all pre-existing suites preserved untouched). |
| **New Test Suites** | **PASS** | 42 / 42 passing (`tests/routing.unit.test.ts`, `tests/api.integration.test.ts`, `tests/frontend.smoke.test.ts`). |
| **Server Health** | **PASS** | Docker containers (`url_postgres`, `url_redis`) healthy; Next.js dev server ready in 3s. |

---

## 2. Feature & Test Matrix

| Feature | Test Description | Result | Notes |
| :--- | :--- | :---: | :--- |
| **Link Creation** | `POST /api/links` with valid URL | **PASS** | Returns 200 with generated `shortCode` and short URL. |
| **Link Creation Validation** | `POST /api/links` with invalid URL | **PASS** | Returns 400 Bad Request with Zod validation details. |
| **Custom Alias Uniqueness** | `POST /api/links` with duplicate custom alias | **PASS** | Returns 409 Conflict when alias is already taken. |
| **XSS Prevention** | `POST /api/links` with `javascript:alert(1)` | **PASS** | Rejected with 400 Bad Request (`safeHttpUrl` refinement). |
| **Redirection Core** | `GET /s/[code]` with valid active code | **PASS** | Returns 302 Found with `Location` header to original URL. |
| **Invalid Short Code** | `GET /s/[code]` with non-existent code | **PASS** | Returns 404 Not Found gracefully. |
| **Cache HIT Expiration** | `GET /s/[code]` for expired link cached in Redis | **PASS** | Cache HIT detects expiration, calls `redis.del`, and returns 404. |
| **Cache HIT Inactive** | `GET /s/[code]` for deactivated link cached in Redis | **PASS** | Cache HIT detects `isActive=false`, purges cache, returns 404. |
| **Rate Limiting** | 11 quick requests to `POST /api/links` from same IP | **PASS** | Requests 1–10 succeed; 11th returns 429 with `Retry-After: 60` and `X-RateLimit-Limit: 10`. |
| **Rate Limit Isolation** | Unique `x-forwarded-for` per test | **PASS** | Prevents cross-test interference while validating strict limits. |
| **UTM Campaign Tracking** | `POST /api/links` with `utmSource`, `utmMedium`, `utmCampaign` | **PASS** | Query parameters correctly appended to `originalUrl` in DB. |
| **A/B Traffic Splitting** | `splitDestinations` [50% A, 50% B] hit 20 times | **PASS** | Both variants hit >= 3 times; unit test with mocked `Math.random` confirms exact distribution. |
| **Smart Routing (Device)** | `rules: [{ type: 'device', value: 'mobile', destinationUrl }]` | **PASS** | Mobile User-Agent redirects to mobile destination; Desktop UA redirects to default. |
| **Smart Routing (Country)** | `rules: [{ type: 'country', value: 'US', destinationUrl }]` | **PASS** | Case-insensitive uppercase matching prioritizing country over device rule. |
| **Analytics Scoping** | `GET /api/links/[code]/stats` | **PASS** | All metrics (`totalClicks`, `clicksLast60Min`, `recentClicks`) scoped strictly to `linkId`. Link 2 stats stay 0 when clicking Link 1. |
| **Cache Invalidation** | `PATCH /api/links/[code]` with updated folder/favorite | **PASS** | Invalides Redis key (`redis.del`); next GET redirect reflects latest state. |
| **Link Deletion** | `DELETE /api/links/[code]` | **PASS** | Deletes record from database, clears Redis cache; subsequent GET returns 404. |
| **AI Fallback** | `POST /api/ai/generate` with `{ type: 'alias' }` | **PASS** | Returns 3 fallback suggestions cleanly when `GEMINI_API_KEY` is not configured. |
| **SSRF Defense** | `GET /api/metadata?url=http://localhost:3000` | **PASS** | Access to `localhost` blocked with 403 Forbidden. |
| **SSRF Defense (Cloud)** | `GET /api/metadata?url=http://169.254.169.254` | **PASS** | Access to AWS/cloud metadata IP blocked with 403 Forbidden. |
| **Metadata Scraping** | `GET /api/metadata?url=https://github.com` | **PASS** | Returns 200 with extracted title and favicon URL. |
| **Webhook Lifecycle** | `POST /api/webhooks`, `POST /api/webhooks/test`, `DELETE` | **PASS** | Creates webhook, executes test ping without CORS issues, cleans up record. |
| **Webhook Resilience** | `triggerWebhook` with no active webhooks | **PASS** | Non-blocking execution completes safely without throwing exceptions. |
| **API Keys Check** | `GET /api/v1/shorten` with invalid `x-api-key` | **PASS** | Returns 404 / 401 as expected (unconfigured endpoint). |
| **Password Protection** | Link with `password: 'test1234'` | **PASS** | `GET /s/[code]` redirects to `/verify/[code]`; POST verify wrong pwd -> 401; correct pwd -> 200 + destination. |
| **Click Limit (maxClicks)** | Link with `maxClicks: 2` | **PASS** | 1st and 2nd clicks redirect 302; 3rd click returns 404 limit reached. |
| **Active Status Toggle** | `PATCH /api/links/[code]` `{ isActive: false }` | **PASS** | Redirect returns 404 while inactive; reactivating restores 302 redirect. |
| **Bio Page API** | `POST /api/bio` and `GET /api/bio/[username]` | **PASS** | Profile created and retrieved with bio title and links. |
| **Frontend Root** | `GET /` | **PASS** | Returns HTTP 200 containing "Snip". |
| **Frontend Dashboard** | `GET /dashboard` | **PASS** | Returns HTTP 200 (or auth redirect if Clerk configured). |
| **Frontend Bio 404** | `GET /b/test-nonexistent-12345` | **PASS** | Returns 404 gracefully (no 500 error). |
| **Frontend Analytics** | `GET /analytics/invalidcode9999` | **PASS** | Renders analytics UI with empty/error state (no 500 crash). |

---

## 3. Bugs Identified & Fixed

1. **Missing Rate Limiting on `POST /api/links`**:
   - *Issue:* Any client could flood link creation without restriction.
   - *Fix:* Added Redis `ratelimit:${ip}` counter in `app/api/links/route.ts` with 60s TTL, limiting to 10 requests per IP and returning 429 with standard `Retry-After: 60` and `X-RateLimit-Limit: 10` headers.

2. **Cache HIT Expiry & Inactivity Leak**:
   - *Issue:* If a link expired or was deactivated after being cached in Redis, subsequent requests hitting cache could continue to redirect.
   - *Fix:* Added mandatory `!cached.isActive` and `cached.expiresAt < now` validation on Cache HIT in `app/s/[code]/route.ts`. Upon expiration, the cache entry is immediately purged with `redis.del` and HTTP 404 is returned.

3. **Legacy / Corrupted Redis Cache Fallback**:
   - *Issue:* Plain string cache values or malformed JSON caused JSON parsing errors.
   - *Fix:* Created `parseCachedLinkData` helper in `lib/routing.ts` that safely validates JSON structure and returns `null` for legacy string formats or corrupted payloads, triggering a clean DB miss and cache regeneration.

4. **XSS Payload Permissiveness in URL Validation**:
   - *Issue:* `z.string().url()` alone permitted `javascript:alert(1)` schemes in some runtimes.
   - *Fix:* Created `safeHttpUrl` refinement in `lib/validations.ts` requiring URLs to explicitly begin with `http://` or `https://`, rejecting malicious script schemes with 400 Bad Request.

5. **Async Click Handling Fallback**:
   - *Issue:* Unhandled queue failures could interrupt click logging.
   - *Fix:* Added `try / catch` around queue submission with automatic fallback to direct `prisma.click.create` and `prisma.link.update` in `lib/routing.ts`.

6. **Custom Alias Length Constraint**:
   - *Issue:* Tests creating custom aliases with timestamps exceeded the 20-character regex constraint (`/^[a-zA-Z0-9-_]{3,20}$/`).
   - *Fix:* Standardized test code generator to guarantee compact, unique aliases between 12 and 18 characters beginning with `test-`.

7. **Status Code Uniformity**:
   - *Issue:* `POST /api/links` and `POST /api/webhooks` returned HTTP 201 while test specifications and clients expected HTTP 200.
   - *Fix:* Standardized response status to 200 OK.

---

## 4. Remaining TODOs / Recommendations

- [ ] **Background Worker Deployment**: For high-volume production deployments (>1,000 req/sec), stand up an external BullMQ/Redis worker process to consume the `clickQueue` asynchronously instead of direct database fallback.
- [ ] **GeoIP Database Integration**: For self-hosted production setups outside Vercel/Cloudflare, connect MaxMind GeoLite2 to resolve `country` from IP if CDN headers are not present.

---

## 5. How to Run Tests

### Prerequisites
Ensure PostgreSQL and Redis containers are running:
```bash
docker compose up -d
docker ps
```

### Static Analysis
```bash
# Run ESLint
npm run lint

# Run Next.js Production Build
npm run build
```

### Automated Testing with Vitest
```bash
# Start dev server in the background (required for API integration tests)
npm run dev

# Run all 88 unit, integration, and smoke tests
npx vitest run

# Run only unit tests
npx vitest run tests/routing.unit.test.ts

# Run only API integration tests
npx vitest run tests/api.integration.test.ts

# Run only frontend smoke tests
npx vitest run tests/frontend.smoke.test.ts
```
