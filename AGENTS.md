<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Autonomous Agent Execution & Safety Guardrails

All autonomous agents working in this repository MUST comply with the following three pillars:

## 1. Ephemeral Containerization
- **No direct host execution**: Never run arbitrary un-sandboxed processes or persistent mutations directly on the host machine.
- **Ephemeral Docker sandbox**: Execute the agent inside an ephemeral Docker container containing a clone/mount of the repository (`docker/docker-compose.agent.yml` or `scripts/agent-container-run.sh`).
- **Instant respawn & recovery**: If an agent corrupts the environment or enters an infinite loop, kill and respawn the container from the base image in seconds (`scripts/agent-container-run.sh respawn`).

## 2. Command and File Allowlisting
- **No unrestricted bash**: Route all terminal commands through the executor script (`scripts/safe-executor.sh` or `node scripts/safe-executor.js`).
- **Allowed commands**:
  - Build & compile: `npm run build`, `npm run lint`, `npx tsc`
  - Testing: `npm test`, `npx jest`, `npx vitest`, `pytest`
  - Git operations: `git status`, `git diff`, `git log`, `git checkout`, `git branch`, `git add`, `git commit`
  - Prisma validation: `npx prisma validate`, `npx prisma format`, `npx prisma generate`
- **Blocked commands**:
  - Destructive commands: `rm -rf`, `rm -r`, `rmdir /s`
  - Permissions & ownership: `chmod`, `chown`, `sudo`, `su`
  - Arbitrary outbound network requests: `curl`, `wget`, `nc`, `netcat`, raw sockets
  - Production deployments / direct pushes: `git push origin main`
- **Directory restrictions**:
  - Modifiable directories (Read-Write): `app/`, `lib/`, `prisma/`, `public/`
  - Core configuration files (Read-Only): `package.json`, `tsconfig.json`, `next.config.mjs`, `eslint.config.mjs`, `docker-compose.yml`, `.env*`

## 3. Git-Driven State Reversion
- **Junior developer protocol**: Treat the agent as an unprivileged developer. Never push to production or merge into `main`.
- **Task branch isolation**: Every task must run on a dedicated branch (`agent/<task-name>`) created via `node scripts/agent-task.js start <task-name>`.
- **Review via Pull Request**: Commits must stay on the agent branch. Open a PR for human review rather than direct deployment.
- **One-command rollback**: If an agent breaks or corrupts code, discard the branch instantly without affecting `main`: `node scripts/agent-task.js discard`.
