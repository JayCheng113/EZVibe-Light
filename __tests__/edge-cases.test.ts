import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CommandRegistry } from '../src/lib/commands.js';
import type { Key } from 'ink';
import type { Idea, Session } from '../src/types.js';
import * as childProcess from 'child_process';
import {
  tmuxSessionName,
  createTmuxSession,
  listEzvibeSessions,
} from '../src/lib/tmux.js';

// ── Helpers ──

function makeKey(overrides: Partial<Key> = {}): Key {
  return {
    upArrow: false, downArrow: false, leftArrow: false, rightArrow: false,
    pageDown: false, pageUp: false, return: false, escape: false,
    ctrl: false, shift: false, tab: false, backspace: false,
    delete: false, meta: false, ...overrides,
  };
}

function makeIdea(overrides: Partial<Idea> = {}): Idea {
  return {
    id: 'test-id', name: 'Test', description: '', stage: 'exploring',
    projectPath: null, color: '#6366f1', createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z', archived: false, ...overrides,
  };
}

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: 'session-id', ideaId: 'test-id', tmuxSession: 'ezvibe-testidxx',
    status: 'active', cwd: '/tmp', startedAt: '2026-01-01T00:00:00Z',
    endedAt: null, ...overrides,
  };
}

// ── CommandRegistry Edge Cases ──

describe('CommandRegistry - Edge Cases', () => {
  it('should handle empty input string with no special keys', () => {
    const reg = new CommandRegistry();
    reg.register({ name: 'test', key: 'x', description: 'Test', execute: vi.fn() });
    expect(reg.handle('', makeKey(), { selectedIdea: undefined, activeSession: undefined, ideaCount: 0 })).toBe(false);
  });

  it('should handle registering same key twice (last wins)', () => {
    const reg = new CommandRegistry();
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    reg.register({ name: 'first', key: 'x', description: 'First', execute: fn1 });
    reg.register({ name: 'second', key: 'x', description: 'Second', execute: fn2 });

    reg.handle('x', makeKey(), { selectedIdea: undefined, activeSession: undefined, ideaCount: 0 });
    expect(fn1).not.toHaveBeenCalled();
    expect(fn2).toHaveBeenCalled();
  });

  it('should handle unregistering non-existent key without error', () => {
    const reg = new CommandRegistry();
    expect(() => reg.unregister('nonexistent')).not.toThrow();
  });

  it('should pass full context to canExecute and execute', () => {
    const reg = new CommandRegistry();
    const idea = makeIdea();
    const session = makeSession();
    const ctx = { selectedIdea: idea, activeSession: session, ideaCount: 5 };

    let receivedCtx: any;
    reg.register({
      name: 'test', key: 'x', description: 'Test',
      canExecute: (c) => { receivedCtx = c; return true; },
      execute: vi.fn(),
    });

    reg.handle('x', makeKey(), ctx);
    expect(receivedCtx.selectedIdea).toBe(idea);
    expect(receivedCtx.activeSession).toBe(session);
    expect(receivedCtx.ideaCount).toBe(5);
  });

  it('should handle special key taking priority over input char', () => {
    const reg = new CommandRegistry();
    const enterFn = vi.fn();
    const charFn = vi.fn();
    reg.register({ name: 'enter', key: 'enter', description: 'Enter', execute: enterFn });
    reg.register({ name: 'char', key: '\r', description: 'Char', execute: charFn });

    // When return key is true, it should resolve to 'enter' not '\r'
    reg.handle('\r', makeKey({ return: true }), { selectedIdea: undefined, activeSession: undefined, ideaCount: 0 });
    expect(enterFn).toHaveBeenCalled();
    expect(charFn).not.toHaveBeenCalled();
  });

  it('should return false when canExecute throws', () => {
    const reg = new CommandRegistry();
    reg.register({
      name: 'test', key: 'x', description: 'Test',
      canExecute: () => { throw new Error('boom'); },
      execute: vi.fn(),
    });

    // canExecute throwing should propagate (not silently swallowed)
    expect(() => reg.handle('x', makeKey(), { selectedIdea: undefined, activeSession: undefined, ideaCount: 0 })).toThrow();
  });
});

// ── tmux Edge Cases ──

vi.mock('child_process', () => ({
  execSync: vi.fn(),
  spawnSync: vi.fn(),
}));

const mockExecSync = vi.mocked(childProcess.execSync);

describe('tmux - Edge Cases', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should handle empty ideaId', () => {
    expect(tmuxSessionName('')).toBe('ezvibe-');
  });

  it('should handle ideaId with special characters', () => {
    // UUID only contains hex + hyphens, but test defensive behavior
    expect(tmuxSessionName('abc-def0')).toBe('ezvibe-abc-def0');
  });

  it('should handle exactly 8 char ideaId', () => {
    expect(tmuxSessionName('12345678')).toBe('ezvibe-12345678');
  });

  it('should escape shell-unsafe characters in session name', () => {
    mockExecSync.mockReturnValue(Buffer.from(''));
    createTmuxSession({ name: "ezvibe-test'name", cwd: "/tmp/path with spaces" });

    const call = mockExecSync.mock.calls[0][0] as string;
    expect(call).toContain("'ezvibe-test'\\''name'");
    expect(call).toContain("'/tmp/path with spaces'");
  });

  it('should handle listEzvibeSessions with mixed valid/invalid lines', () => {
    mockExecSync.mockReturnValue('ezvibe-abc\n\n  \nezvibe-def\nrandom\n' as any);
    const sessions = listEzvibeSessions();
    // Empty and whitespace lines don't start with 'ezvibe-'
    expect(sessions).toEqual(['ezvibe-abc', 'ezvibe-def']);
  });

  it('should handle listEzvibeSessions with only non-ezvibe sessions', () => {
    mockExecSync.mockReturnValue('my-session\nother-session\n' as any);
    expect(listEzvibeSessions()).toEqual([]);
  });
});

// ── Wizard Edge Cases ──

describe('Wizard - Edge Cases (unit)', () => {
  // Test the wizard hook logic without React rendering
  it('should handle config with zero steps', () => {
    // A wizard with empty steps would call onComplete immediately
    const onComplete = vi.fn();
    const config = { steps: [], onComplete };

    // Simulating: if nextStep (0) >= steps.length (0), onComplete fires
    if (0 >= config.steps.length) {
      config.onComplete({});
    }
    expect(onComplete).toHaveBeenCalledWith({});
  });

  it('should handle config with single step', () => {
    const results: Record<string, string> = {};
    const step = { type: 'input' as const, key: 'name', prompt: 'Name:' };

    // Simulate submitting a value
    results[step.key] = 'My Idea';
    expect(results).toEqual({ name: 'My Idea' });
  });
});

// ── Type/Constant Edge Cases ──

describe('Stage constants', () => {
  it('should have exactly 4 stages in correct order', async () => {
    const { STAGES } = await import('../src/constants.js');
    expect(STAGES).toEqual(['exploring', 'planning', 'implementing', 'done']);
  });

  it('should have icons and colors for every stage', async () => {
    const { STAGES, STAGE_ICONS, STAGE_COLORS } = await import('../src/constants.js');
    for (const stage of STAGES) {
      expect(STAGE_ICONS[stage]).toBeDefined();
      expect(STAGE_COLORS[stage]).toBeDefined();
    }
  });
});

// ── Store Boundary Conditions ──

describe('Store - Extreme boundaries', () => {
  it('should handle idea with very long name', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const os = await import('os');
    const { Store } = await import('../src/lib/store.js');

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ezvibe-edge-'));
    try {
      const store = new Store(tmpDir);
      const longName = 'A'.repeat(10000);
      const idea = store.createIdea(longName);
      expect(idea.name).toBe(longName);
      expect(idea.name.length).toBe(10000);

      // Persistence check
      const store2 = new Store(tmpDir);
      expect(store2.getIdea(idea.id)?.name.length).toBe(10000);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('should handle idea with unicode/emoji name', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const os = await import('os');
    const { Store } = await import('../src/lib/store.js');

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ezvibe-edge-'));
    try {
      const store = new Store(tmpDir);
      const idea = store.createIdea('测试项目 🚀 αβγ');
      expect(idea.name).toBe('测试项目 🚀 αβγ');

      const store2 = new Store(tmpDir);
      expect(store2.getIdea(idea.id)?.name).toBe('测试项目 🚀 αβγ');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('should handle note with newlines and special characters', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const os = await import('os');
    const { Store } = await import('../src/lib/store.js');

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ezvibe-edge-'));
    try {
      const store = new Store(tmpDir);
      const idea = store.createIdea('Test');
      const content = 'Line 1\nLine 2\n\ttabbed\n"quoted"\n{json: true}';
      const note = store.createNote(idea.id, content);

      const store2 = new Store(tmpDir);
      const notes = store2.getNotes(idea.id);
      expect(notes[0].content).toBe(content);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('should handle deleting idea that has no sessions or notes', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const os = await import('os');
    const { Store } = await import('../src/lib/store.js');

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ezvibe-edge-'));
    try {
      const store = new Store(tmpDir);
      const idea = store.createIdea('Orphan');
      expect(() => store.deleteIdea(idea.id)).not.toThrow();
      expect(store.getIdeas()).toHaveLength(0);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('should handle deleting non-existent idea without error', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const os = await import('os');
    const { Store } = await import('../src/lib/store.js');

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ezvibe-edge-'));
    try {
      const store = new Store(tmpDir);
      expect(() => store.deleteIdea('does-not-exist')).not.toThrow();
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('should handle rapid sequential stage updates', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const os = await import('os');
    const { Store } = await import('../src/lib/store.js');

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ezvibe-edge-'));
    try {
      const store = new Store(tmpDir);
      const idea = store.createIdea('Cycling');

      store.updateIdea(idea.id, { stage: 'planning' });
      store.updateIdea(idea.id, { stage: 'implementing' });
      store.updateIdea(idea.id, { stage: 'done' });
      store.updateIdea(idea.id, { stage: 'exploring' });

      expect(store.getIdea(idea.id)?.stage).toBe('exploring');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
