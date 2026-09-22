#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Safe Executor for AI Agents
 * Enforces command and file allowlists, blocking destructive actions,
 * permission escalations, and arbitrary outbound network requests.
 */

const { spawnSync } = require('child_process');

const rawArgs = process.argv.slice(2);
const commandString = rawArgs.join(' ').trim();

if (!commandString) {
  console.error('[SafeExecutor] Error: No command provided to execute.');
  console.error('[SafeExecutor] Usage: node scripts/safe-executor.js <command>');
  process.exit(1);
}

// -----------------------------------------------------------------------------
// 1. BLOCKED COMMANDS / TOKENS (Immediate Rejection)
// -----------------------------------------------------------------------------
const BLOCKED_PATTERNS = [
  { regex: /\brm\s+(-[a-zA-Z]*r[a-zA-Z]*f|-[a-zA-Z]*f[a-zA-Z]*r|--recursive)\b/i, reason: 'Destructive filesystem deletion (rm -rf)' },
  { regex: /\brmdir\s+(\/s|\/S)\b/i, reason: 'Destructive directory deletion (rmdir /s)' },
  { regex: /\b(chmod|chown|chgrp|setfacl)\b/i, reason: 'Permissions or ownership modification' },
  { regex: /\b(sudo|su|doas)\b/i, reason: 'Privilege escalation attempt' },
  { regex: /\b(curl|wget|nc|netcat|ncat|telnet|ssh|scp|sftp)\b/i, reason: 'Arbitrary outbound network request' },
  { regex: /\/dev\/tcp\//i, reason: 'Raw network socket interaction' },
  { regex: /\b(mkfs|dd\s+if=|shred)\b/i, reason: 'Disk or partition alteration' },
  { regex: /\bgit\s+push\b/i, reason: 'Direct push prohibited (must commit and PR from isolated task branch)' },
];

for (const { regex, reason } of BLOCKED_PATTERNS) {
  if (regex.test(commandString)) {
    console.error(`\x1b[31m[SafeExecutor] ACCESS DENIED: ${reason}\x1b[0m`);
    console.error(`[SafeExecutor] Offending command: "${commandString}"`);
    process.exit(1);
  }
}

// -----------------------------------------------------------------------------
// 2. ALLOWLIST PATTERNS (Whitelisted Commands)
// -----------------------------------------------------------------------------
const ALLOWED_COMMAND_PATTERNS = [
  // Build and Lint
  /^npm\s+run\s+build(\s+.*)?$/,
  /^npm\s+run\s+lint(\s+.*)?$/,
  /^npm\s+run\s+dev(\s+.*)?$/,
  /^npx\s+next\s+(build|lint|info)(\s+.*)?$/,
  /^npx\s+tsc(\s+--noEmit)?(\s+.*)?$/,

  // Testing
  /^npm\s+(test|run\s+test)(\s+.*)?$/,
  /^npx\s+(jest|vitest)(\s+.*)?$/,
  /^pytest(\s+.*)?$/,

  // Prisma
  /^npx\s+prisma\s+(validate|format|generate)(\s+.*)?$/,

  // Git Operations (read, status, staging, task branch commit)
  /^git\s+status(\s+.*)?$/,
  /^git\s+diff(\s+.*)?$/,
  /^git\s+log(\s+.*)?$/,
  /^git\s+show(\s+.*)?$/,
  /^git\s+branch(\s+.*)?$/,
  /^git\s+checkout\s+-b\s+agent\/[a-zA-Z0-9_-]+$/,
  /^git\s+checkout\s+[a-zA-Z0-9_-]+$/,
  /^git\s+switch\s+.*$/,
  /^git\s+add\s+.*$/,
  /^git\s+commit\s+.*$/,
  /^git\s+stash(\s+.*)?$/,
  /^git\s+rev-parse\s+.*$/,

  // Basic diagnostic / read operations
  /^node\s+-v$/,
  /^npm\s+-v$/,
  /^git\s+--version$/,
];

// Helper to check individual command parts (split by && if safe chaining is used)
const subCommands = commandString.split(/\s*&&\s*/);

for (const subCmd of subCommands) {
  const trimmed = subCmd.trim();
  const isAllowed = ALLOWED_COMMAND_PATTERNS.some((pattern) => pattern.test(trimmed));

  if (!isAllowed) {
    console.error(`\x1b[31m[SafeExecutor] ACCESS DENIED: Command not in allowlist.\x1b[0m`);
    console.error(`[SafeExecutor] Rejected command: "${trimmed}"`);
    console.error(`[SafeExecutor] Allowed commands include:`);
    console.error(`  - Build & Lint: 'npm run build', 'npm run lint', 'npx tsc'`);
    console.error(`  - Testing: 'npm test', 'npx jest', 'npx vitest', 'pytest'`);
    console.error(`  - Git: 'git status', 'git diff', 'git checkout -b agent/<name>', 'git add', 'git commit'`);
    console.error(`  - Prisma: 'npx prisma validate', 'npx prisma format', 'npx prisma generate'`);
    process.exit(1);
  }
}

// -----------------------------------------------------------------------------
// 3. EXECUTE ALLOWED COMMAND
// -----------------------------------------------------------------------------
console.log(`\x1b[32m[SafeExecutor] Command verified against allowlist. Executing...\x1b[0m`);

const result = spawnSync(commandString, {
  shell: true,
  stdio: 'inherit',
});

process.exit(result.status ?? 1);
