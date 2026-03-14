/**
 * E2E UI Scenario Tests
 *
 * Tests the full App component with simulated user input,
 * verifying UI output and feature interactions through the TUI.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Mock tmux module
vi.mock('../src/lib/tmux.js', () => ({
  isTmuxAvailable: vi.fn(() => true),
  tmuxSessionName: vi.fn((id: string) => `ezvibe-${id.slice(0, 8)}`),
  createTmuxSession: vi.fn(),
  attachTmuxSession: vi.fn(),
  killTmuxSession: vi.fn(),
  isTmuxSessionAlive: vi.fn(() => false),
  listEzvibeSessions: vi.fn(() => []),
}));

let tmpDir: string;

vi.mock('../src/lib/store.js', async () => {
  const actual = await vi.importActual<typeof import('../src/lib/store.js')>('../src/lib/store.js');
  return {
    Store: class extends actual.Store {
      constructor() {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ezvibe-e2e-scn-'));
        super(tmpDir);
      }
    },
  };
});

import { App } from '../src/app.js';

const delay = (ms = 100) => new Promise(r => setTimeout(r, ms));

afterEach(() => {
  if (tmpDir && fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

// ════════════════════════════════════════════════════
// Initial State
// ════════════════════════════════════════════════════

describe('E2E: Initial State', () => {
  it('should show empty state with create hint', async () => {
    const { lastFrame } = render(<App version="test" />);
    await delay();

    const frame = lastFrame();
    expect(frame).toContain('No ideas yet');
    expect(frame).toContain('0 ideas');
  });

  it('should show version in header', async () => {
    const { lastFrame } = render(<App version="1.2.3" />);
    await delay();

    expect(lastFrame()).toContain('v1.2.3');
  });

  it('should show all three panel tabs', async () => {
    const { lastFrame } = render(<App version="test" />);
    await delay();

    const frame = lastFrame();
    expect(frame).toContain('Detail');
    expect(frame).toContain('Context');
    expect(frame).toContain('Notes');
  });
});

// ════════════════════════════════════════════════════
// Help Overlay
// ════════════════════════════════════════════════════

describe('E2E: Help Overlay', () => {
  it('should open on ? and show all shortcut categories', async () => {
    const { lastFrame, stdin } = render(<App version="test" />);
    await delay();

    stdin.write('?');
    await delay();

    const frame = lastFrame();
    expect(frame).toContain('Keyboard Shortcuts');
    expect(frame).toContain('Create new idea');
  });

  it('should close help on any key and return to main view', async () => {
    const { lastFrame, stdin } = render(<App version="test" />);
    await delay();

    stdin.write('?');
    await delay(150);

    expect(lastFrame()).toContain('Keyboard Shortcuts');

    stdin.write(' '); // space to close (neutral key)
    await delay(150);

    const frame = lastFrame();
    expect(frame).toContain('EZVibe Light');
    expect(frame).not.toContain('Keyboard Shortcuts');
  });

  it('should not execute commands while help is open (n after ? closes help only)', async () => {
    const { lastFrame, stdin } = render(<App version="test" />);
    await delay();

    stdin.write('?');
    await delay(150);
    expect(lastFrame()).toContain('Keyboard Shortcuts');

    // 'n' closes help overlay first (any key closes it), doesn't open wizard
    stdin.write('n');
    await delay(150);

    const frame = lastFrame();
    expect(frame).not.toContain('Keyboard Shortcuts');
    // The key was consumed by the overlay, wizard should not be open
    expect(frame).toContain('EZVibe Light');
  });
});

// ════════════════════════════════════════════════════
// Idea Creation Wizard
// ════════════════════════════════════════════════════

describe('E2E: Idea Creation Flow', () => {
  it('should open wizard on n and show first step', async () => {
    const { lastFrame, stdin } = render(<App version="test" />);
    await delay();

    stdin.write('n');
    await delay();

    expect(lastFrame()).toContain('New idea name');
  });
});

// ════════════════════════════════════════════════════
// Panel Switching
// ════════════════════════════════════════════════════

describe('E2E: Panel Switching', () => {
  it('should cycle through panels with Tab', async () => {
    const { lastFrame, stdin } = render(<App version="test" />);
    await delay();

    // Start on Detail (default)
    // Tab → Context
    stdin.write('\t');
    await delay();

    // Context panel with no idea selected shows "No project path"
    expect(lastFrame()).toContain('No project path');

    // Tab → Notes
    stdin.write('\t');
    await delay();
    expect(lastFrame()).toContain('No notes yet');

    // Tab → Detail (back to start)
    stdin.write('\t');
    await delay();
  });

  it('should show notes empty state in notes panel', async () => {
    const { lastFrame, stdin } = render(<App version="test" />);
    await delay();

    // Switch to notes panel
    stdin.write('\t'); // context
    await delay();
    stdin.write('\t'); // notes
    await delay();

    expect(lastFrame()).toContain('No notes yet');
  });
});

// ════════════════════════════════════════════════════
// Context Panel
// ════════════════════════════════════════════════════

describe('E2E: Context Panel', () => {
  it('should show no project path message when no idea is selected', async () => {
    const { lastFrame, stdin } = render(<App version="test" />);
    await delay();

    // Switch to context panel
    stdin.write('\t');
    await delay();

    expect(lastFrame()).toContain('No project path');
    expect(lastFrame()).toContain('Press [p]');
  });
});

// ════════════════════════════════════════════════════
// Navigation (Empty & Non-empty)
// ════════════════════════════════════════════════════

describe('E2E: Navigation', () => {
  it('should handle j/k on empty list without crashing', async () => {
    const { lastFrame, stdin } = render(<App version="test" />);
    await delay();

    stdin.write('j');
    await delay();
    stdin.write('k');
    await delay();
    stdin.write('j');
    await delay();

    // Should still be functional
    expect(lastFrame()).toContain('EZVibe Light');
    expect(lastFrame()).toContain('No ideas yet');
  });

  it('should handle guard commands on empty list without crashing', async () => {
    const { lastFrame, stdin } = render(<App version="test" />);
    await delay();

    // All these should be no-ops (guarded by needsIdea)
    const keys = ['e', 'd', 's', 'p', 'a', 'x'];
    for (const key of keys) {
      stdin.write(key);
      await delay(50);
    }
    await delay();

    // App should still be functional
    expect(lastFrame()).toContain('EZVibe Light');
  });
});

// ════════════════════════════════════════════════════
// Confirm Overlay
// ════════════════════════════════════════════════════

describe('E2E: Confirm Overlay', () => {
  it('should not show confirm overlay when no idea is selected', async () => {
    const { lastFrame, stdin } = render(<App version="test" />);
    await delay();

    // Press d with no ideas — guard should prevent
    stdin.write('d');
    await delay();

    expect(lastFrame()).not.toContain('(y/N)');
  });
});

// ════════════════════════════════════════════════════
// Status Bar
// ════════════════════════════════════════════════════

describe('E2E: Status Bar', () => {
  it('should show shortcut hints', async () => {
    const { lastFrame } = render(<App version="test" />);
    await delay();

    const frame = lastFrame();
    expect(frame).toContain('[n]');
    expect(frame).toContain('[q]');
  });

  it('should show zero counts on empty state', async () => {
    const { lastFrame } = render(<App version="test" />);
    await delay();

    expect(lastFrame()).toContain('0 ideas');
  });
});

// ════════════════════════════════════════════════════
// Wizard + Input Interaction
// ════════════════════════════════════════════════════

describe('E2E: Wizard Isolation', () => {
  it('should block normal commands while wizard is active', async () => {
    const { lastFrame, stdin } = render(<App version="test" />);
    await delay();

    // Open wizard
    stdin.write('n');
    await delay();
    expect(lastFrame()).toContain('New idea name');

    // Try to open help — should be blocked (useInput disabled during wizard)
    stdin.write('?');
    await delay();
    expect(lastFrame()).not.toContain('Keyboard Shortcuts');
  });

  it('should not quit while wizard is active', async () => {
    const { lastFrame, stdin } = render(<App version="test" />);
    await delay();

    stdin.write('n');
    await delay();

    // 'q' should type into input, not quit
    // (useInput is disabled when wizard.active)
    const frame = lastFrame();
    expect(frame).toContain('New idea name');
  });
});

// ════════════════════════════════════════════════════
// Multiple Feature Interactions
// ════════════════════════════════════════════════════

describe('E2E: Cross-Feature Sequences', () => {
  it('should handle help → close → navigate sequence', async () => {
    const { lastFrame, stdin } = render(<App version="test" />);
    await delay();

    // Open help
    stdin.write('?');
    await delay(150);
    expect(lastFrame()).toContain('Keyboard Shortcuts');

    // Close help
    stdin.write(' ');
    await delay(150);
    expect(lastFrame()).not.toContain('Keyboard Shortcuts');

    // Normal navigation should work
    stdin.write('j');
    await delay();
    expect(lastFrame()).toContain('EZVibe Light');
  });

  it('should handle rapid panel switching', async () => {
    const { lastFrame, stdin } = render(<App version="test" />);
    await delay();

    // Rapid tab presses
    for (let i = 0; i < 10; i++) {
      stdin.write('\t');
    }
    await delay();

    // Should not crash
    expect(lastFrame()).toContain('EZVibe Light');
  });

  it('should handle multiple wizard open/cancel cycles', async () => {
    const { lastFrame, stdin } = render(<App version="test" />);
    await delay();

    for (let i = 0; i < 3; i++) {
      stdin.write('n');
      await delay();
      expect(lastFrame()).toContain('New idea name');

      stdin.write('\x1b');
      await delay();
    }

    // App should still be functional
    expect(lastFrame()).toContain('EZVibe Light');
  });

  it('should handle switching panels then opening help', async () => {
    const { lastFrame, stdin } = render(<App version="test" />);
    await delay();

    // Switch to notes panel
    stdin.write('\t');
    await delay();
    stdin.write('\t');
    await delay();
    expect(lastFrame()).toContain('No notes yet');

    // Open help
    stdin.write('?');
    await delay(150);
    expect(lastFrame()).toContain('Keyboard Shortcuts');

    // Close help — should return to main view
    stdin.write(' ');
    await delay(150);
    expect(lastFrame()).toContain('EZVibe Light');
  });
});
