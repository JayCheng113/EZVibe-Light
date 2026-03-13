#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import { execSync } from 'child_process';
import { App } from './app.js';
import { isTmuxAvailable } from './lib/tmux.js';

const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
  EZVibe Light - Lightweight TUI for Claude Code sessions

  Usage: ezvibe-light [options]

  Options:
    --help, -h       Show this help
    --version, -v    Show version
  `);
  process.exit(0);
}

if (args.includes('--version') || args.includes('-v')) {
  console.log('0.1.0');
  process.exit(0);
}

function checkClaude(): boolean {
  try {
    execSync('which claude', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// Startup
const cyan = (s: string) => `\x1b[36m${s}\x1b[0m`;
const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;

console.log(`
${cyan('  ╔═══════════════════════════════╗')}
${cyan('  ║')}   ${green('EZVibe Light')} v0.1.1        ${cyan('║')}
${cyan('  ║')}   Lightweight Claude Manager   ${cyan('║')}
${cyan('  ╚═══════════════════════════════╝')}
`);

const skipChecks = args.includes('--no-check');

if (!skipChecks) {
  if (!isTmuxAvailable()) {
    console.log(red('  Error: tmux is required but not found.'));
    console.log('  Install it:');
    console.log('    macOS: brew install tmux');
    console.log('    Ubuntu: sudo apt install tmux');
    console.log('  Or run with --no-check to skip prerequisite checks.');
    process.exit(1);
  }

  if (!checkClaude()) {
    console.log(red('  Error: Claude Code CLI not found.'));
    console.log('  Install it: npm install -g @anthropic-ai/claude-code');
    console.log('  Or run with --no-check to skip prerequisite checks.');
    process.exit(1);
  }

  console.log(`  ${green('✓')} tmux detected`);
  console.log(`  ${green('✓')} Claude Code detected\n`);
} else {
  console.log(`  ${cyan('!')} Skipping prerequisite checks\n`);
}

const { waitUntilExit } = render(<App />);
await waitUntilExit();
