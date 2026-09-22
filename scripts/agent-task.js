#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unused-vars */
/**
 * Git-Driven State Reversion Workflow for AI Agents
 * 
 * Rules:
 * - Agents are NEVER allowed to make edits directly on 'main'.
 * - Every task MUST start on an isolated 'agent/<task-name>' branch.
 * - Changes must be committed on the branch; direct deploys/pushes to production are blocked.
 * - Corrupted or broken branches can be discarded instantly with 1 command.
 */

const { execSync } = require('child_process');

const args = process.argv.slice(2);
const action = args[0];
const param = args.slice(1).join(' ');

function run(cmd) {
  try {
    return execSync(cmd, { stdio: 'pipe', encoding: 'utf-8' }).trim();
  } catch (error) {
    if (error.stdout) console.log(error.stdout.toString());
    if (error.stderr) console.error(error.stderr.toString());
    throw error;
  }
}

function getCurrentBranch() {
  return run('git rev-parse --abbrev-ref HEAD');
}

function showHelp() {
  console.log(`
Agent Git-Driven State Reversion Tool
======================================
Usage: node scripts/agent-task.js <command> [arguments]

Commands:
  start <task-name>  Create and switch to a new isolated branch 'agent/<task-name>' from main
  verify             Run allowlisted lint and build checks to ensure code is clean
  commit "<message>" Commit current changes on the agent task branch (blocked on main)
  pr                 Prepare pull request summary (prevents direct merge to production)
  discard            Instantly discard the corrupted branch and reset back to clean main
`);
}

switch (action) {
  case 'start': {
    const rawTaskName = param || `task-${Date.now()}`;
    const sanitizedTask = rawTaskName.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    const branchName = `agent/${sanitizedTask}`;

    console.log(`[AgentGit] Starting new task on isolated branch: ${branchName}`);
    
    // Check if repo has uncommitted changes
    const status = run('git status --porcelain');
    if (status) {
      console.warn(`[AgentGit] Warning: Working directory has modified files. Stashing them.`);
      run('git stash');
    }

    // Checkout main first
    try {
      run('git checkout main');
    } catch {
      console.warn(`[AgentGit] Could not checkout main, attempting to branch from current HEAD.`);
    }

    // Create and checkout new branch
    run(`git checkout -b ${branchName}`);
    console.log(`\x1b[32m[AgentGit] Successfully checked out branch '${branchName}'. Ready for agent work.\x1b[0m`);
    break;
  }

  case 'verify': {
    console.log(`[AgentGit] Verifying build and lint standards...`);
    try {
      console.log(`[AgentGit] Running linter...`);
      execSync('npm run lint', { stdio: 'inherit' });
      console.log(`[AgentGit] Running build check...`);
      execSync('npm run build', { stdio: 'inherit' });
      console.log(`\x1b[32m[AgentGit] Verification passed cleanly!\x1b[0m`);
    } catch (err) {
      console.error(`\x1b[31m[AgentGit] Verification failed! Please fix errors or run discard.\x1b[0m`);
      process.exit(1);
    }
    break;
  }

  case 'commit': {
    const currentBranch = getCurrentBranch();
    if (currentBranch === 'main' || currentBranch === 'master') {
      console.error(`\x1b[31m[AgentGit] BLOCKED: Agents are NOT allowed to commit directly to '${currentBranch}'.\x1b[0m`);
      console.error(`[AgentGit] Please run: node scripts/agent-task.js start <task-name>`);
      process.exit(1);
    }

    if (!param) {
      console.error(`[AgentGit] Error: Commit message required. Example: node scripts/agent-task.js commit "feat: add url stats"`);
      process.exit(1);
    }

    console.log(`[AgentGit] Staging changes on branch '${currentBranch}'...`);
    run('git add -A');

    const status = run('git status --porcelain');
    if (!status) {
      console.log(`[AgentGit] Working directory clean; nothing to commit.`);
      process.exit(0);
    }

    const message = param.startsWith('agent:') || param.startsWith('feat:') || param.startsWith('fix:')
      ? param
      : `agent: ${param}`;

    run(`git commit -m "${message.replace(/"/g, '\\"')}"`);
    console.log(`\x1b[32m[AgentGit] Successfully committed changes to '${currentBranch}'.\x1b[0m`);
    break;
  }

  case 'pr': {
    const currentBranch = getCurrentBranch();
    if (currentBranch === 'main' || currentBranch === 'master') {
      console.error(`[AgentGit] Current branch is ${currentBranch}. Switch to an agent task branch first.`);
      process.exit(1);
    }

    console.log(`\x1b[34m========================================================================\x1b[0m`);
    console.log(`\x1b[32m[AgentGit] Task Complete. Pull Request Protocol:\x1b[0m`);
    console.log(`  Source Branch : ${currentBranch}`);
    console.log(`  Target Branch : main`);
    console.log(`  Production Push: STRICTLY FORBIDDEN FOR AGENTS`);
    console.log(`\x1b[34m========================================================================\x1b[0m`);
    console.log(`\nTo push and open a Pull Request for human code review:`);
    console.log(`  1. git push origin ${currentBranch}`);
    console.log(`  2. gh pr create --base main --head ${currentBranch} --title "Agent PR: ${currentBranch}"`);
    console.log(`\x1b[34m========================================================================\x1b[0m\n`);
    break;
  }

  case 'discard': {
    const currentBranch = getCurrentBranch();
    if (currentBranch === 'main' || currentBranch === 'master') {
      console.error(`[AgentGit] Error: Already on '${currentBranch}'. Nothing to discard.`);
      process.exit(1);
    }

    console.log(`\x1b[33m[AgentGit] Discarding branch '${currentBranch}'...\x1b[0m`);
    
    // Reset all uncommitted changes on this branch
    try {
      run('git reset --hard HEAD');
      run('git clean -fd');
    } catch (e) {
      // ignore
    }

    // Switch back to main
    console.log(`[AgentGit] Switching back to pristine 'main'...`);
    run('git checkout main');

    // Force delete corrupted agent branch
    console.log(`[AgentGit] Deleting corrupted agent branch '${currentBranch}'...`);
    run(`git branch -D ${currentBranch}`);

    console.log(`\x1b[32m[AgentGit] Complete! Clean state restored to 'main' in seconds.\x1b[0m`);
    break;
  }

  default:
    showHelp();
    break;
}
