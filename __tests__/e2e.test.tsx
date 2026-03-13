import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Mock tmux module before importing App
vi.mock('../src/lib/tmux.js', () => ({
  isTmuxAvailable: vi.fn(() => true),
  tmuxSessionName: vi.fn((id: string) => `ezvibe-${id.slice(0, 8)}`),
  createTmuxSession: vi.fn(),
  attachTmuxSession: vi.fn(),
  killTmuxSession: vi.fn(),
  isTmuxSessionAlive: vi.fn(() => false),
  listEzvibeSessions: vi.fn(() => []),
}));

// We need to mock the Store to use a temp directory
let tmpDir: string;

vi.mock('../src/lib/store.js', async () => {
  const actual = await vi.importActual<typeof import('../src/lib/store.js')>('../src/lib/store.js');
  return {
    Store: class extends actual.Store {
      constructor() {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ezvibe-e2e-'));
        super(tmpDir);
      }
    },
  };
});

import { App } from '../src/app.js';

afterEach(() => {
  if (tmpDir && fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

describe('App E2E', () => {
  it('should render the initial screen', () => {
    const { lastFrame } = render(<App />);
    const frame = lastFrame();

    expect(frame).toContain('EZVibe Light');
    expect(frame).toContain('No ideas yet');
  });

  it('should show status bar with shortcuts', () => {
    const { lastFrame } = render(<App />);
    const frame = lastFrame();

    expect(frame).toContain('[n]');
    expect(frame).toContain('[q]');
    expect(frame).toContain('0 ideas');
  });

  it('should show panel tabs', () => {
    const { lastFrame } = render(<App />);
    const frame = lastFrame();

    expect(frame).toContain('Detail');
    expect(frame).toContain('Context');
    expect(frame).toContain('Notes');
  });

  it('should show help overlay when ? is pressed and close on next key', async () => {
    const { lastFrame, stdin } = render(<App />);

    stdin.write('?');
    await new Promise(r => setTimeout(r, 50));

    const helpFrame = lastFrame();
    expect(helpFrame).toContain('Keyboard Shortcuts');
    expect(helpFrame).toContain('Create new idea');

    stdin.write('x'); // Any key to close
    await new Promise(r => setTimeout(r, 50));

    const closedFrame = lastFrame();
    expect(closedFrame).toContain('EZVibe Light');
    expect(closedFrame).not.toContain('Keyboard Shortcuts');
  });
});
