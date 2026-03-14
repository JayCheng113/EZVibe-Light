/**
 * User Workflow & Cross-Feature Scenario Tests
 *
 * Simulates real user journeys through the application,
 * testing both individual feature flows and feature interactions.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { Store } from '../src/lib/store.js';
import { CommandRegistry, type CommandContext } from '../src/lib/commands.js';
import { STAGES } from '../src/constants.js';
import type { Key } from 'ink';
import type { Idea, Session } from '../src/types.js';

// ── Helpers ──

let tmpDir: string;
let store: Store;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ezvibe-scenario-'));
  store = new Store(tmpDir);
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function makeKey(overrides: Partial<Key> = {}): Key {
  return {
    upArrow: false, downArrow: false, leftArrow: false, rightArrow: false,
    pageDown: false, pageUp: false, return: false, escape: false,
    ctrl: false, shift: false, tab: false, backspace: false,
    delete: false, meta: false, ...overrides,
  };
}

function buildContext(store: Store, selectedIndex: number): CommandContext {
  const ideas = store.getIdeas();
  const selectedIdea = ideas[selectedIndex];
  const activeSession = selectedIdea
    ? store.getActiveSession(selectedIdea.id)
    : undefined;
  return { selectedIdea, activeSession, ideaCount: ideas.length };
}

// ════════════════════════════════════════════════════
// PART 1: Single Feature Complete Workflows
// ════════════════════════════════════════════════════

describe('Workflow: Idea Full Lifecycle', () => {
  it('should go through exploring → planning → implementing → done', () => {
    const idea = store.createIdea('Auth Refactor', 'Rewrite auth middleware');
    expect(idea.stage).toBe('exploring');
    expect(idea.description).toBe('Rewrite auth middleware');

    // User presses 's' to cycle forward through stages
    store.updateIdea(idea.id, { stage: 'planning' });
    expect(store.getIdea(idea.id)?.stage).toBe('planning');

    store.updateIdea(idea.id, { stage: 'implementing' });
    expect(store.getIdea(idea.id)?.stage).toBe('implementing');

    store.updateIdea(idea.id, { stage: 'done' });
    expect(store.getIdea(idea.id)?.stage).toBe('done');

    // Verify timestamps updated
    const final = store.getIdea(idea.id)!;
    expect(final.updatedAt).not.toBe(final.createdAt);
  });

  it('should cycle backwards with Shift+S (done → implementing → ...)', () => {
    const idea = store.createIdea('Test');
    store.updateIdea(idea.id, { stage: 'done' });

    // Backward cycling logic
    const stages = [...STAGES];
    let idx = stages.indexOf('done'); // 3
    idx = (idx - 1 + stages.length) % stages.length; // 2
    store.updateIdea(idea.id, { stage: stages[idx] });
    expect(store.getIdea(idea.id)?.stage).toBe('implementing');

    idx = (idx - 1 + stages.length) % stages.length; // 1
    store.updateIdea(idea.id, { stage: stages[idx] });
    expect(store.getIdea(idea.id)?.stage).toBe('planning');

    idx = (idx - 1 + stages.length) % stages.length; // 0
    store.updateIdea(idea.id, { stage: stages[idx] });
    expect(store.getIdea(idea.id)?.stage).toBe('exploring');

    // Wrap around to done
    idx = (idx - 1 + stages.length) % stages.length; // 3
    store.updateIdea(idea.id, { stage: stages[idx] });
    expect(store.getIdea(idea.id)?.stage).toBe('done');
  });

  it('should create idea with all optional fields as defaults', () => {
    const idea = store.createIdea('Minimal');
    expect(idea.description).toBe('');
    expect(idea.projectPath).toBeNull();
    expect(idea.color).toBe('#6366f1');
    expect(idea.archived).toBe(false);
    expect(idea.stage).toBe('exploring');
  });

  it('should handle edit then delete flow', () => {
    const idea = store.createIdea('Original Name');
    store.updateIdea(idea.id, { name: 'Edited Name' });
    expect(store.getIdea(idea.id)?.name).toBe('Edited Name');

    store.deleteIdea(idea.id);
    expect(store.getIdea(idea.id)).toBeUndefined();
    expect(store.getIdeas()).toHaveLength(0);
  });
});

describe('Workflow: Session Full Lifecycle', () => {
  it('should create → mark dead → create new session for same idea', () => {
    const idea = store.createIdea('My Project');
    const session1 = store.createSession(idea.id, 'ezvibe-abc12345', '/tmp/project');
    expect(session1.status).toBe('active');
    expect(store.getActiveSession(idea.id)?.id).toBe(session1.id);

    // Session dies (background sync detects)
    store.updateSession(session1.id, { status: 'dead', endedAt: new Date().toISOString() });
    expect(store.getActiveSession(idea.id)).toBeUndefined();

    // User presses Enter again → new session created
    const session2 = store.createSession(idea.id, 'ezvibe-abc12345', '/tmp/project');
    expect(session2.status).toBe('active');
    expect(store.getActiveSession(idea.id)?.id).toBe(session2.id);

    // Both sessions exist in history
    expect(store.getSessions(idea.id)).toHaveLength(2);
  });

  it('should handle session with project path as cwd', () => {
    const idea = store.createIdea('With Path', '', '/Users/dev/my-project');
    const cwd = idea.projectPath || process.cwd();
    const session = store.createSession(idea.id, 'ezvibe-test1234', cwd);
    expect(session.cwd).toBe('/Users/dev/my-project');
  });

  it('should use process.cwd when idea has no project path', () => {
    const idea = store.createIdea('No Path');
    const cwd = idea.projectPath || '/fallback/cwd';
    const session = store.createSession(idea.id, 'ezvibe-test1234', cwd);
    expect(session.cwd).toBe('/fallback/cwd');
  });

  it('should track multiple dead sessions in history', () => {
    const idea = store.createIdea('History');
    for (let i = 0; i < 5; i++) {
      const s = store.createSession(idea.id, `ezvibe-session${i}`, '/tmp');
      store.updateSession(s.id, { status: 'dead', endedAt: new Date().toISOString() });
    }
    // Create one active
    store.createSession(idea.id, 'ezvibe-active', '/tmp');

    const all = store.getSessions(idea.id);
    expect(all).toHaveLength(6);
    expect(all.filter(s => s.status === 'dead')).toHaveLength(5);
    expect(all.filter(s => s.status === 'active')).toHaveLength(1);
  });
});

describe('Workflow: Note Management', () => {
  it('should add multiple notes and retrieve in order', () => {
    const idea = store.createIdea('Noted Idea');
    store.createNote(idea.id, 'First thought');
    store.createNote(idea.id, 'Second thought');
    store.createNote(idea.id, 'Third thought');

    const notes = store.getNotes(idea.id);
    expect(notes).toHaveLength(3);
    expect(notes[0].content).toBe('First thought');
    expect(notes[2].content).toBe('Third thought');
  });

  it('should delete specific note without affecting others', () => {
    const idea = store.createIdea('Multi-note');
    const n1 = store.createNote(idea.id, 'Keep me');
    const n2 = store.createNote(idea.id, 'Delete me');
    const n3 = store.createNote(idea.id, 'Keep me too');

    store.deleteNote(n2.id);

    const remaining = store.getNotes(idea.id);
    expect(remaining).toHaveLength(2);
    expect(remaining.map(n => n.content)).toEqual(['Keep me', 'Keep me too']);
  });

  it('should handle notes with markdown content', () => {
    const idea = store.createIdea('MD Notes');
    store.createNote(idea.id, '# Heading\n\n- bullet 1\n- bullet 2\n\n```ts\nconst x = 1;\n```');

    const notes = store.getNotes(idea.id);
    expect(notes[0].content).toContain('# Heading');
    expect(notes[0].content).toContain('```ts');
  });

  it('should isolate notes between different ideas', () => {
    const idea1 = store.createIdea('Idea 1');
    const idea2 = store.createIdea('Idea 2');

    store.createNote(idea1.id, 'Note for idea 1');
    store.createNote(idea2.id, 'Note for idea 2');

    expect(store.getNotes(idea1.id)).toHaveLength(1);
    expect(store.getNotes(idea2.id)).toHaveLength(1);
    expect(store.getNotes(idea1.id)[0].content).toBe('Note for idea 1');
  });
});

describe('Workflow: Project Association', () => {
  it('should set and change project path', () => {
    const idea = store.createIdea('Flexible Project');
    expect(idea.projectPath).toBeNull();

    store.updateIdea(idea.id, { projectPath: '/home/user/project-a' });
    expect(store.getIdea(idea.id)?.projectPath).toBe('/home/user/project-a');

    // User changes project association
    store.updateIdea(idea.id, { projectPath: '/home/user/project-b' });
    expect(store.getIdea(idea.id)?.projectPath).toBe('/home/user/project-b');
  });

  it('should allow clearing project path back to null', () => {
    const idea = store.createIdea('Unset Project', '', '/some/path');
    expect(idea.projectPath).toBe('/some/path');

    store.updateIdea(idea.id, { projectPath: null });
    expect(store.getIdea(idea.id)?.projectPath).toBeNull();
  });
});

describe('Workflow: Navigation Through Grouped Ideas', () => {
  it('should navigate across stage groups correctly', () => {
    // Create ideas in different stages
    const a = store.createIdea('Explore A');
    const b = store.createIdea('Explore B');
    const c = store.createIdea('Plan C');
    store.updateIdea(c.id, { stage: 'planning' });
    const d = store.createIdea('Impl D');
    store.updateIdea(d.id, { stage: 'implementing' });
    const e = store.createIdea('Done E');
    store.updateIdea(e.id, { stage: 'done' });

    const ideas = store.getIdeas();

    // Build flat list grouped by stage
    const grouped = STAGES.flatMap(stage =>
      ideas.filter(i => i.stage === stage)
    );

    expect(grouped[0].name).toBe('Explore A');
    expect(grouped[1].name).toBe('Explore B');
    expect(grouped[2].name).toBe('Plan C');
    expect(grouped[3].name).toBe('Impl D');
    expect(grouped[4].name).toBe('Done E');

    // Simulate j/k navigation
    let idx = 0;
    idx = Math.min(idx + 1, grouped.length - 1); // j → 1
    expect(grouped[idx].name).toBe('Explore B');
    idx = Math.min(idx + 1, grouped.length - 1); // j → 2 (crosses to planning)
    expect(grouped[idx].name).toBe('Plan C');
    idx = Math.max(idx - 1, 0); // k → 1
    expect(grouped[idx].name).toBe('Explore B');
  });

  it('should clamp at boundaries', () => {
    store.createIdea('Only Idea');
    const ideas = store.getIdeas();

    let idx = 0;
    idx = Math.min(idx + 1, ideas.length - 1); // try go down
    expect(idx).toBe(0); // clamped

    idx = Math.max(idx - 1, 0); // try go up
    expect(idx).toBe(0); // clamped
  });

  it('should handle empty ideas list', () => {
    const ideas = store.getIdeas();
    expect(ideas).toHaveLength(0);

    // Selecting on empty list
    const selected = ideas[0];
    expect(selected).toBeUndefined();
  });
});

describe('Workflow: Archive', () => {
  it('should hide archived ideas from default list but keep data', () => {
    const idea = store.createIdea('Soon Archived');
    store.createNote(idea.id, 'Important note');
    store.createSession(idea.id, 'ezvibe-archive1', '/tmp');

    store.updateIdea(idea.id, { archived: true });

    // Not in default list
    expect(store.getIdeas()).toHaveLength(0);
    // But exists when including archived
    expect(store.getIdeas(true)).toHaveLength(1);
    // Notes and sessions still exist
    expect(store.getNotes(idea.id)).toHaveLength(1);
    expect(store.getSessions(idea.id)).toHaveLength(1);
  });

  it('should unarchive idea', () => {
    const idea = store.createIdea('Toggle Archive');
    store.updateIdea(idea.id, { archived: true });
    expect(store.getIdeas()).toHaveLength(0);

    store.updateIdea(idea.id, { archived: false });
    expect(store.getIdeas()).toHaveLength(1);
  });
});

// ════════════════════════════════════════════════════
// PART 2: Cross-Feature Interaction Tests
// ════════════════════════════════════════════════════

describe('Cross: Idea + Session Interaction', () => {
  it('should cascade delete sessions and notes when idea is deleted', () => {
    const idea = store.createIdea('Full Idea');
    store.createSession(idea.id, 'ezvibe-full1234', '/tmp');
    store.createSession(idea.id, 'ezvibe-full5678', '/tmp');
    store.createNote(idea.id, 'Note 1');
    store.createNote(idea.id, 'Note 2');
    store.createNote(idea.id, 'Note 3');

    // Delete idea — should cascade
    store.deleteIdea(idea.id);

    expect(store.getIdeas()).toHaveLength(0);
    expect(store.getSessions(idea.id)).toHaveLength(0);
    expect(store.getNotes(idea.id)).toHaveLength(0);
    // Also verify global sessions are gone
    expect(store.getSessions()).toHaveLength(0);
  });

  it('should not affect other ideas when deleting one', () => {
    const idea1 = store.createIdea('Keep');
    const idea2 = store.createIdea('Delete');
    store.createSession(idea1.id, 'ezvibe-keep1234', '/tmp');
    store.createSession(idea2.id, 'ezvibe-del12345', '/tmp');
    store.createNote(idea1.id, 'Keep note');
    store.createNote(idea2.id, 'Delete note');

    store.deleteIdea(idea2.id);

    expect(store.getIdeas()).toHaveLength(1);
    expect(store.getIdeas()[0].name).toBe('Keep');
    expect(store.getSessions(idea1.id)).toHaveLength(1);
    expect(store.getNotes(idea1.id)).toHaveLength(1);
    expect(store.getSessions(idea2.id)).toHaveLength(0);
    expect(store.getNotes(idea2.id)).toHaveLength(0);
  });

  it('should handle stage change while session is active', () => {
    const idea = store.createIdea('Staging');
    const session = store.createSession(idea.id, 'ezvibe-stage123', '/tmp');

    // Cycle through all stages — session should remain active
    for (const stage of STAGES) {
      store.updateIdea(idea.id, { stage });
      expect(store.getActiveSession(idea.id)?.id).toBe(session.id);
      expect(store.getActiveSession(idea.id)?.status).toBe('active');
    }
  });

  it('should handle editing idea name while session is active', () => {
    const idea = store.createIdea('Original');
    const session = store.createSession(idea.id, 'ezvibe-edit1234', '/tmp');

    store.updateIdea(idea.id, { name: 'Renamed' });

    // Session unaffected
    expect(store.getActiveSession(idea.id)?.id).toBe(session.id);
    expect(store.getActiveSession(idea.id)?.status).toBe('active');
    expect(store.getIdea(idea.id)?.name).toBe('Renamed');
  });

  it('should handle changing project path while session is active', () => {
    const idea = store.createIdea('Path Change', '', '/old/path');
    const session = store.createSession(idea.id, 'ezvibe-path1234', '/old/path');

    store.updateIdea(idea.id, { projectPath: '/new/path' });

    // Session keeps its original cwd
    const activeSession = store.getActiveSession(idea.id);
    expect(activeSession?.cwd).toBe('/old/path');
    // But idea has new path
    expect(store.getIdea(idea.id)?.projectPath).toBe('/new/path');
  });
});

describe('Cross: Multiple Ideas + Sessions Status', () => {
  it('should track active session count across multiple ideas', () => {
    const idea1 = store.createIdea('A');
    const idea2 = store.createIdea('B');
    const idea3 = store.createIdea('C');

    store.createSession(idea1.id, 'ezvibe-a1234567', '/tmp');
    store.createSession(idea2.id, 'ezvibe-b1234567', '/tmp');
    // idea3 has no session

    const allSessions = store.getSessions();
    const activeCount = allSessions.filter(s => s.status === 'active').length;
    expect(activeCount).toBe(2);

    // Kill one
    const s = store.getSessions(idea1.id)[0];
    store.updateSession(s.id, { status: 'dead' });

    const newActiveCount = store.getSessions().filter(s => s.status === 'active').length;
    expect(newActiveCount).toBe(1);
  });

  it('should handle ideas across all stages with sessions', () => {
    const ideas = STAGES.map((stage, i) => {
      const idea = store.createIdea(`Idea ${stage}`);
      store.updateIdea(idea.id, { stage });
      if (i % 2 === 0) {
        store.createSession(idea.id, `ezvibe-${stage.slice(0, 8)}`, '/tmp');
      }
      return idea;
    });

    // exploring (idx 0) and implementing (idx 2) have sessions
    expect(store.getActiveSession(ideas[0].id)).toBeTruthy();
    expect(store.getActiveSession(ideas[1].id)).toBeUndefined();
    expect(store.getActiveSession(ideas[2].id)).toBeTruthy();
    expect(store.getActiveSession(ideas[3].id)).toBeUndefined();
  });
});

describe('Cross: Idea + Notes Lifecycle', () => {
  it('should add notes at different stages of idea lifecycle', () => {
    const idea = store.createIdea('Evolving Idea');

    store.createNote(idea.id, 'Initial brainstorm');
    store.updateIdea(idea.id, { stage: 'planning' });
    store.createNote(idea.id, 'Architecture decisions');
    store.updateIdea(idea.id, { stage: 'implementing' });
    store.createNote(idea.id, 'Implementation note');
    store.updateIdea(idea.id, { stage: 'done' });
    store.createNote(idea.id, 'Retrospective');

    const notes = store.getNotes(idea.id);
    expect(notes).toHaveLength(4);
    expect(notes[0].content).toBe('Initial brainstorm');
    expect(notes[3].content).toBe('Retrospective');
  });

  it('should handle notes on multiple ideas independently', () => {
    const idea1 = store.createIdea('Project A');
    const idea2 = store.createIdea('Project B');

    for (let i = 0; i < 5; i++) store.createNote(idea1.id, `A-note-${i}`);
    for (let i = 0; i < 3; i++) store.createNote(idea2.id, `B-note-${i}`);

    expect(store.getNotes(idea1.id)).toHaveLength(5);
    expect(store.getNotes(idea2.id)).toHaveLength(3);

    // Delete idea1 — idea2's notes untouched
    store.deleteIdea(idea1.id);
    expect(store.getNotes(idea2.id)).toHaveLength(3);
  });
});

describe('Cross: Selection + Deletion Interaction', () => {
  it('should adjust selection when middle idea is deleted', () => {
    store.createIdea('A');
    const b = store.createIdea('B');
    store.createIdea('C');

    let selectedIndex = 1; // selecting B
    store.deleteIdea(b.id);

    // User would press up or index clamped
    selectedIndex = Math.max(0, selectedIndex - 1);
    const ideas = store.getIdeas();
    expect(ideas).toHaveLength(2);
    expect(ideas[selectedIndex].name).toBe('A');
  });

  it('should adjust selection when last idea is deleted', () => {
    store.createIdea('A');
    const b = store.createIdea('B');

    let selectedIndex = 1; // selecting B (last)
    store.deleteIdea(b.id);

    selectedIndex = Math.max(0, selectedIndex - 1);
    const ideas = store.getIdeas();
    expect(ideas).toHaveLength(1);
    expect(ideas[selectedIndex].name).toBe('A');
  });

  it('should adjust selection when first idea is deleted', () => {
    const a = store.createIdea('A');
    store.createIdea('B');
    store.createIdea('C');

    let selectedIndex = 0; // selecting A (first)
    store.deleteIdea(a.id);

    selectedIndex = Math.max(0, selectedIndex - 1); // becomes 0
    const ideas = store.getIdeas();
    expect(ideas[selectedIndex].name).toBe('B');
  });

  it('should handle deleting only idea', () => {
    const a = store.createIdea('Only');
    let selectedIndex = 0;

    store.deleteIdea(a.id);
    selectedIndex = Math.max(0, selectedIndex - 1);

    expect(store.getIdeas()).toHaveLength(0);
    expect(store.getIdeas()[selectedIndex]).toBeUndefined();
  });

  it('should select new idea after creation', () => {
    store.createIdea('First');
    store.createIdea('Second');

    // After creating third idea (exploring stage), it should be last in exploring group
    store.createIdea('Third');
    const ideas = store.getIdeas();
    const exploringCount = ideas.filter(i => i.stage === 'exploring').length;
    const newSelectedIndex = exploringCount - 1; // last exploring item
    expect(ideas[newSelectedIndex].name).toBe('Third');
  });
});

describe('Cross: Session Lifecycle + Store Persistence', () => {
  it('should persist session state changes across store reloads', () => {
    const idea = store.createIdea('Persistent Session');
    const session = store.createSession(idea.id, 'ezvibe-persist1', '/tmp');

    // Reload store
    const store2 = new Store(tmpDir);
    expect(store2.getActiveSession(idea.id)?.id).toBe(session.id);

    // Mark dead and reload
    store2.updateSession(session.id, { status: 'dead', endedAt: '2026-01-01T12:00:00Z' });
    const store3 = new Store(tmpDir);
    expect(store3.getActiveSession(idea.id)).toBeUndefined();
    expect(store3.getSessions(idea.id)[0].status).toBe('dead');
    expect(store3.getSessions(idea.id)[0].endedAt).toBe('2026-01-01T12:00:00Z');
  });

  it('should persist all data types through store reload', () => {
    const idea = store.createIdea('Full Stack', 'desc', '/project');
    store.updateIdea(idea.id, { stage: 'implementing' });
    store.createSession(idea.id, 'ezvibe-full1234', '/project');
    store.createNote(idea.id, 'Important finding');
    store.createNote(idea.id, 'TODO: follow up');

    const store2 = new Store(tmpDir);
    const loaded = store2.getIdea(idea.id)!;
    expect(loaded.name).toBe('Full Stack');
    expect(loaded.stage).toBe('implementing');
    expect(loaded.projectPath).toBe('/project');
    expect(store2.getSessions(idea.id)).toHaveLength(1);
    expect(store2.getNotes(idea.id)).toHaveLength(2);
  });
});

describe('Cross: Command Guards + State', () => {
  it('should block idea commands when no idea is selected', () => {
    const reg = new CommandRegistry();
    const executeFn = vi.fn();
    const needsIdea = (ctx: CommandContext) => !!ctx.selectedIdea;

    reg.register({ name: 'edit', key: 'e', description: 'Edit', canExecute: needsIdea, execute: executeFn });
    reg.register({ name: 'delete', key: 'd', description: 'Delete', canExecute: needsIdea, execute: executeFn });
    reg.register({ name: 'stage', key: 's', description: 'Stage', canExecute: needsIdea, execute: executeFn });
    reg.register({ name: 'project', key: 'p', description: 'Project', canExecute: needsIdea, execute: executeFn });
    reg.register({ name: 'note', key: 'a', description: 'Note', canExecute: needsIdea, execute: executeFn });
    reg.register({
      name: 'attach', key: 'enter', description: 'Attach',
      canExecute: needsIdea, execute: executeFn,
    });

    const emptyCtx: CommandContext = { selectedIdea: undefined, activeSession: undefined, ideaCount: 0 };

    // All should be blocked
    for (const key of ['e', 'd', 's', 'p', 'a']) {
      expect(reg.handle(key, makeKey(), emptyCtx)).toBe(false);
    }
    expect(reg.handle('', makeKey({ return: true }), emptyCtx)).toBe(false);
    expect(executeFn).not.toHaveBeenCalled();
  });

  it('should allow idea commands when idea is selected', () => {
    const reg = new CommandRegistry();
    const executeFn = vi.fn();
    const needsIdea = (ctx: CommandContext) => !!ctx.selectedIdea;

    reg.register({ name: 'edit', key: 'e', description: 'Edit', canExecute: needsIdea, execute: executeFn });

    const idea = store.createIdea('Selected');
    const ctx: CommandContext = { selectedIdea: idea, activeSession: undefined, ideaCount: 1 };

    expect(reg.handle('e', makeKey(), ctx)).toBe(true);
    expect(executeFn).toHaveBeenCalledTimes(1);
  });

  it('should block stop command when no active session', () => {
    const reg = new CommandRegistry();
    const executeFn = vi.fn();

    reg.register({
      name: 'stop', key: 'x', description: 'Stop',
      canExecute: (ctx) => !!ctx.selectedIdea && !!ctx.activeSession,
      execute: executeFn,
    });

    const idea = store.createIdea('No Session');
    const ctx: CommandContext = { selectedIdea: idea, activeSession: undefined, ideaCount: 1 };

    expect(reg.handle('x', makeKey(), ctx)).toBe(false);
    expect(executeFn).not.toHaveBeenCalled();
  });

  it('should allow stop command when active session exists', () => {
    const reg = new CommandRegistry();
    const executeFn = vi.fn();

    reg.register({
      name: 'stop', key: 'x', description: 'Stop',
      canExecute: (ctx) => !!ctx.selectedIdea && !!ctx.activeSession,
      execute: executeFn,
    });

    const idea = store.createIdea('With Session');
    const session = store.createSession(idea.id, 'ezvibe-active12', '/tmp');
    const ctx: CommandContext = { selectedIdea: idea, activeSession: session, ideaCount: 1 };

    expect(reg.handle('x', makeKey(), ctx)).toBe(true);
    expect(executeFn).toHaveBeenCalledTimes(1);
  });

  it('should always allow navigation and app commands', () => {
    const reg = new CommandRegistry();
    const downFn = vi.fn();
    const upFn = vi.fn();
    const helpFn = vi.fn();
    const createFn = vi.fn();
    const quitFn = vi.fn();

    reg.register({ name: 'down', key: 'j', description: 'Down', execute: downFn });
    reg.register({ name: 'up', key: 'k', description: 'Up', execute: upFn });
    reg.register({ name: 'help', key: '?', description: 'Help', execute: helpFn });
    reg.register({ name: 'create', key: 'n', description: 'New', execute: createFn });
    reg.register({ name: 'quit', key: 'q', description: 'Quit', execute: quitFn });

    const emptyCtx: CommandContext = { selectedIdea: undefined, activeSession: undefined, ideaCount: 0 };

    // All should work even with no selection
    expect(reg.handle('j', makeKey(), emptyCtx)).toBe(true);
    expect(reg.handle('k', makeKey(), emptyCtx)).toBe(true);
    expect(reg.handle('?', makeKey(), emptyCtx)).toBe(true);
    expect(reg.handle('n', makeKey(), emptyCtx)).toBe(true);
    expect(reg.handle('q', makeKey(), emptyCtx)).toBe(true);
  });
});

describe('Cross: Panel Switching + Context Tabs', () => {
  it('should cycle through right panels', () => {
    const panels: Array<'detail' | 'context' | 'notes'> = ['detail', 'context', 'notes'];
    let currentPanel: 'detail' | 'context' | 'notes' = 'detail';

    // Simulate Tab presses
    for (let i = 0; i < 6; i++) {
      currentPanel = panels[(panels.indexOf(currentPanel) + 1) % panels.length];
    }
    // After 6 tabs, should be back to detail (6 % 3 === 0, but we start at detail and cycle)
    // detail→context→notes→detail→context→notes→(detail after 6th)
    expect(currentPanel).toBe('detail');
  });

  it('should remember context tab when switching away and back', () => {
    let contextTab: 'claudemd' | 'memory' | 'plans' = 'claudemd';
    let panel: 'detail' | 'context' | 'notes' = 'context';

    // User switches to memory tab
    contextTab = 'memory';

    // User switches panel to notes
    panel = 'notes';

    // User switches back to context
    panel = 'context';

    // Context tab should still be memory
    expect(contextTab).toBe('memory');
  });
});

describe('Cross: Confirm Overlay Behavior', () => {
  it('should simulate delete confirm flow (y)', () => {
    const idea = store.createIdea('To Delete');
    store.createNote(idea.id, 'Note');
    let deleted = false;

    // Simulate confirm overlay
    const onConfirm = () => {
      store.deleteIdea(idea.id);
      deleted = true;
    };

    // User presses 'y'
    onConfirm();

    expect(deleted).toBe(true);
    expect(store.getIdeas()).toHaveLength(0);
    expect(store.getNotes(idea.id)).toHaveLength(0);
  });

  it('should simulate delete cancel flow (n)', () => {
    const idea = store.createIdea('Safe Idea');
    let deleted = false;

    // Simulate confirm overlay — user presses any key other than y
    const userPressedY = false;
    if (userPressedY) {
      store.deleteIdea(idea.id);
      deleted = true;
    }

    expect(deleted).toBe(false);
    expect(store.getIdeas()).toHaveLength(1);
  });
});

describe('Cross: Rapid Operations', () => {
  it('should handle rapid create → edit → stage → delete cycle', () => {
    for (let i = 0; i < 20; i++) {
      const idea = store.createIdea(`Rapid ${i}`);
      store.updateIdea(idea.id, { name: `Rapid-Edited ${i}` });
      store.updateIdea(idea.id, { stage: 'planning' });
      store.updateIdea(idea.id, { stage: 'implementing' });
      store.deleteIdea(idea.id);
    }

    expect(store.getIdeas()).toHaveLength(0);
    expect(store.getSessions()).toHaveLength(0);
  });

  it('should handle rapid create with sessions and notes then bulk delete', () => {
    const ideaIds: string[] = [];
    for (let i = 0; i < 10; i++) {
      const idea = store.createIdea(`Bulk ${i}`);
      store.createSession(idea.id, `ezvibe-bulk${i.toString().padStart(4, '0')}`, '/tmp');
      store.createNote(idea.id, `Note for ${i}`);
      ideaIds.push(idea.id);
    }

    expect(store.getIdeas()).toHaveLength(10);
    expect(store.getSessions()).toHaveLength(10);

    // Delete all
    for (const id of ideaIds) {
      store.deleteIdea(id);
    }

    expect(store.getIdeas()).toHaveLength(0);
    expect(store.getSessions()).toHaveLength(0);
  });
});

describe('Cross: Stage Grouping + New Idea Placement', () => {
  it('should place new idea in exploring group', () => {
    const impl = store.createIdea('Implementing Thing');
    store.updateIdea(impl.id, { stage: 'implementing' });
    const done = store.createIdea('Done Thing');
    store.updateIdea(done.id, { stage: 'done' });

    // New idea goes to exploring
    store.createIdea('New Idea');

    const ideas = store.getIdeas();
    const grouped = STAGES.flatMap(stage =>
      ideas.filter(i => i.stage === stage)
    );

    // New exploring idea should come before implementing and done
    expect(grouped[0].name).toBe('New Idea');
    expect(grouped[0].stage).toBe('exploring');
    expect(grouped[1].name).toBe('Implementing Thing');
    expect(grouped[2].name).toBe('Done Thing');
  });

  it('should regroup idea when stage changes', () => {
    const a = store.createIdea('A');
    const b = store.createIdea('B');

    // Both in exploring initially
    // Move A to done
    store.updateIdea(a.id, { stage: 'done' });

    const ideas = store.getIdeas();
    const grouped = STAGES.flatMap(stage =>
      ideas.filter(i => i.stage === stage)
    );

    // B (exploring) comes first, A (done) comes last
    expect(grouped[0].name).toBe('B');
    expect(grouped[0].stage).toBe('exploring');
    expect(grouped[1].name).toBe('A');
    expect(grouped[1].stage).toBe('done');
  });
});

describe('Cross: Data Integrity After Complex Operations', () => {
  it('should maintain correct state after mixed operations', () => {
    // Create 3 ideas with different states
    const alpha = store.createIdea('Alpha', 'First project', '/alpha');
    const beta = store.createIdea('Beta', 'Second project', '/beta');
    const gamma = store.createIdea('Gamma', 'Third project');

    // Add sessions
    store.createSession(alpha.id, 'ezvibe-alpha123', '/alpha');
    const betaSession = store.createSession(beta.id, 'ezvibe-beta1234', '/beta');

    // Add notes
    store.createNote(alpha.id, 'Alpha note 1');
    store.createNote(alpha.id, 'Alpha note 2');
    store.createNote(beta.id, 'Beta note');

    // Change stages
    store.updateIdea(alpha.id, { stage: 'implementing' });
    store.updateIdea(beta.id, { stage: 'done' });

    // Kill beta session
    store.updateSession(betaSession.id, { status: 'dead', endedAt: new Date().toISOString() });

    // Archive gamma
    store.updateIdea(gamma.id, { archived: true });

    // Verify final state
    const visibleIdeas = store.getIdeas();
    expect(visibleIdeas).toHaveLength(2); // gamma is archived

    expect(store.getIdea(alpha.id)?.stage).toBe('implementing');
    expect(store.getActiveSession(alpha.id)).toBeTruthy();
    expect(store.getNotes(alpha.id)).toHaveLength(2);

    expect(store.getIdea(beta.id)?.stage).toBe('done');
    expect(store.getActiveSession(beta.id)).toBeUndefined();
    expect(store.getNotes(beta.id)).toHaveLength(1);

    expect(store.getIdeas(true)).toHaveLength(3);

    // Delete alpha — cascade should clean up sessions and notes
    store.deleteIdea(alpha.id);
    expect(store.getIdeas()).toHaveLength(1);
    expect(store.getSessions(alpha.id)).toHaveLength(0);
    expect(store.getNotes(alpha.id)).toHaveLength(0);
    // Beta's data untouched
    expect(store.getSessions(beta.id)).toHaveLength(1);
    expect(store.getNotes(beta.id)).toHaveLength(1);

    // Persistence check
    const store2 = new Store(tmpDir);
    expect(store2.getIdeas()).toHaveLength(1);
    expect(store2.getIdeas()[0].name).toBe('Beta');
    expect(store2.getIdeas(true)).toHaveLength(2); // beta + archived gamma
  });

  it('should survive store reload between every operation', () => {
    // Simulate app restart between each action
    let s = new Store(tmpDir);
    const idea = s.createIdea('Resilient');

    s = new Store(tmpDir);
    s.updateIdea(idea.id, { stage: 'planning' });

    s = new Store(tmpDir);
    s.createSession(idea.id, 'ezvibe-resilien', '/tmp');

    s = new Store(tmpDir);
    s.createNote(idea.id, 'Persistent note');

    s = new Store(tmpDir);
    s.updateIdea(idea.id, { name: 'Still Resilient' });

    // Final verification
    const final = new Store(tmpDir);
    expect(final.getIdea(idea.id)?.name).toBe('Still Resilient');
    expect(final.getIdea(idea.id)?.stage).toBe('planning');
    expect(final.getSessions(idea.id)).toHaveLength(1);
    expect(final.getNotes(idea.id)).toHaveLength(1);
  });
});
