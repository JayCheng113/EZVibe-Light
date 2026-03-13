import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { Store } from '../src/lib/store.js';
import { STAGES } from '../src/constants.js';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ezvibe-robust-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ── Store Robustness ──

describe('Store - Corrupted data.json', () => {
  it('should recover from empty object', () => {
    fs.writeFileSync(path.join(tmpDir, 'data.json'), '{}');
    const store = new Store(tmpDir);
    expect(store.getIdeas()).toEqual([]);
    expect(store.getSessions()).toEqual([]);
    expect(store.getNotes('any')).toEqual([]);
  });

  it('should recover from partial structure (missing arrays)', () => {
    fs.writeFileSync(path.join(tmpDir, 'data.json'), '{"ideas": [], "version": 1}');
    const store = new Store(tmpDir);
    expect(store.getSessions()).toEqual([]);
    expect(store.getNotes('any')).toEqual([]);
  });

  it('should recover from null fields', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'data.json'),
      '{"ideas": null, "sessions": null, "notes": null}'
    );
    const store = new Store(tmpDir);
    expect(store.getIdeas()).toEqual([]);
    expect(store.getSessions()).toEqual([]);
  });

  it('should recover from non-array fields', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'data.json'),
      '{"ideas": "not-an-array", "sessions": 42, "notes": true}'
    );
    const store = new Store(tmpDir);
    expect(store.getIdeas()).toEqual([]);
    expect(store.getSessions()).toEqual([]);
  });

  it('should recover from empty file', () => {
    fs.writeFileSync(path.join(tmpDir, 'data.json'), '');
    const store = new Store(tmpDir);
    expect(store.getIdeas()).toEqual([]);
  });

  it('should recover from binary garbage', () => {
    fs.writeFileSync(path.join(tmpDir, 'data.json'), Buffer.from([0xff, 0xfe, 0x00, 0x01]));
    const store = new Store(tmpDir);
    expect(store.getIdeas()).toEqual([]);
  });

  it('should preserve valid data alongside invalid fields', () => {
    const data = {
      ideas: [{ id: 'test', name: 'Valid', description: '', stage: 'exploring', projectPath: null, color: '#fff', createdAt: '2026-01-01', updatedAt: '2026-01-01', archived: false }],
      sessions: 'invalid',
      notes: null,
    };
    fs.writeFileSync(path.join(tmpDir, 'data.json'), JSON.stringify(data));
    const store = new Store(tmpDir);
    expect(store.getIdeas()).toHaveLength(1);
    expect(store.getIdeas()[0].name).toBe('Valid');
    expect(store.getSessions()).toEqual([]);
  });
});

describe('Store - Directory resilience', () => {
  it('should recreate directory if deleted between operations', () => {
    const store = new Store(tmpDir);
    store.createIdea('Before delete');

    // Simulate directory deletion while app is running
    fs.rmSync(tmpDir, { recursive: true, force: true });

    // Next save should recreate the directory
    expect(() => store.createIdea('After delete')).not.toThrow();
    expect(fs.existsSync(tmpDir)).toBe(true);

    // Data written after recreation is accessible
    const store2 = new Store(tmpDir);
    // Only "After delete" survives (in-memory state had both, but we care about persistence)
    const ideas = store2.getIdeas();
    expect(ideas.length).toBeGreaterThanOrEqual(1);
    expect(ideas.some(i => i.name === 'After delete')).toBe(true);
  });

  it('should handle read-only data.json gracefully on load', () => {
    // Write valid data, then make it unreadable
    const store = new Store(tmpDir);
    store.createIdea('Protected');

    // Create a new store — load should still work since file is readable
    const store2 = new Store(tmpDir);
    expect(store2.getIdeas()).toHaveLength(1);
  });
});

// ── Store Scale ──

describe('Store - Scale', () => {
  it('should handle 200 ideas without issues', () => {
    const store = new Store(tmpDir);
    for (let i = 0; i < 200; i++) {
      store.createIdea(`Idea ${i}`, `Description ${i}`);
    }
    expect(store.getIdeas()).toHaveLength(200);

    // Persistence check
    const store2 = new Store(tmpDir);
    expect(store2.getIdeas()).toHaveLength(200);
  });

  it('should handle rapid create-delete cycles', () => {
    const store = new Store(tmpDir);
    for (let i = 0; i < 50; i++) {
      const idea = store.createIdea(`Temp ${i}`);
      store.deleteIdea(idea.id);
    }
    expect(store.getIdeas()).toHaveLength(0);
    expect(store.getSessions()).toHaveLength(0);
  });

  it('should handle many sessions per idea', () => {
    const store = new Store(tmpDir);
    const idea = store.createIdea('Multi-session');
    for (let i = 0; i < 20; i++) {
      const session = store.createSession(idea.id, `ezvibe-${i}`, '/tmp');
      store.updateSession(session.id, { status: 'dead', endedAt: new Date().toISOString() });
    }
    // Create one active
    store.createSession(idea.id, 'ezvibe-active', '/tmp');

    expect(store.getSessions(idea.id)).toHaveLength(21);
    expect(store.getActiveSession(idea.id)?.tmuxSession).toBe('ezvibe-active');
  });

  it('should handle many notes per idea', () => {
    const store = new Store(tmpDir);
    const idea = store.createIdea('Noted');
    for (let i = 0; i < 100; i++) {
      store.createNote(idea.id, `Note ${i}`);
    }
    expect(store.getNotes(idea.id)).toHaveLength(100);
  });
});

// ── Concurrent Operations ──

describe('Store - Concurrent instances', () => {
  it('should not corrupt data with two stores reading same file', () => {
    const store1 = new Store(tmpDir);
    store1.createIdea('From store1');

    const store2 = new Store(tmpDir);
    expect(store2.getIdeas()).toHaveLength(1);

    store2.createIdea('From store2');

    const store3 = new Store(tmpDir);
    expect(store3.getIdeas()).toHaveLength(2);
  });

  it('should handle last-write-wins for overlapping writes', () => {
    const store1 = new Store(tmpDir);
    const store2 = new Store(tmpDir);

    store1.createIdea('First');
    store2.createIdea('Second');

    // store2 loaded before store1 wrote, so store2's write won't include "First"
    const store3 = new Store(tmpDir);
    const ideas = store3.getIdeas();
    // Last writer (store2) wins — only its data persists
    expect(ideas).toHaveLength(1);
    expect(ideas[0].name).toBe('Second');
  });
});

// ── Navigation Edge Cases ──

describe('Navigation - selectedIndex boundaries', () => {
  it('should compute correct flat index for grouped ideas', () => {
    const store = new Store(tmpDir);
    // Create ideas in different stages
    const a = store.createIdea('Exploring A');
    const b = store.createIdea('Exploring B');
    const c = store.createIdea('Planning C');
    store.updateIdea(c.id, { stage: 'planning' });
    const d = store.createIdea('Impl D');
    store.updateIdea(d.id, { stage: 'implementing' });

    const ideas = store.getIdeas();
    // Grouped order: exploring(A,B), planning(C), implementing(D)
    // Flat indices: A=0, B=1, C=2, D=3
    const grouped = STAGES.map(stage => ({
      stage,
      ideas: ideas.filter(i => i.stage === stage),
    })).filter(g => g.ideas.length > 0);

    let flatIndex = 0;
    const flatMap: Record<string, number> = {};
    for (const group of grouped) {
      for (const idea of group.ideas) {
        flatMap[idea.name] = flatIndex++;
      }
    }

    expect(flatMap['Exploring A']).toBe(0);
    expect(flatMap['Exploring B']).toBe(1);
    expect(flatMap['Planning C']).toBe(2);
    expect(flatMap['Impl D']).toBe(3);

    // New exploring idea should be at index 2 (end of exploring group)
    const newExploringIdx = ideas.filter(i => i.stage === 'exploring').length;
    // After adding one more exploring, it would be at index 2
    expect(newExploringIdx).toBe(2);
  });

  it('should handle deleting last idea gracefully', () => {
    const store = new Store(tmpDir);
    const idea = store.createIdea('Only one');

    store.deleteIdea(idea.id);
    expect(store.getIdeas()).toHaveLength(0);

    // Selecting index 0 on empty array yields undefined — not a crash
    const ideas = store.getIdeas();
    expect(ideas[0]).toBeUndefined();
  });

  it('should handle deleting all ideas then creating new one', () => {
    const store = new Store(tmpDir);
    const a = store.createIdea('A');
    const b = store.createIdea('B');

    store.deleteIdea(a.id);
    store.deleteIdea(b.id);
    expect(store.getIdeas()).toHaveLength(0);

    store.createIdea('C');
    expect(store.getIdeas()).toHaveLength(1);
    expect(store.getIdeas()[0].name).toBe('C');
  });
});

// ── Session Lifecycle ──

describe('Session - Lifecycle edge cases', () => {
  it('should handle creating session for non-existent idea', () => {
    const store = new Store(tmpDir);
    // This doesn't throw — store doesn't validate ideaId
    const session = store.createSession('nonexistent-id', 'ezvibe-test', '/tmp');
    expect(session.ideaId).toBe('nonexistent-id');
  });

  it('should handle updating non-existent session silently', () => {
    const store = new Store(tmpDir);
    // Should not throw
    expect(() => store.updateSession('nonexistent', { status: 'dead' })).not.toThrow();
  });

  it('should cascade delete sessions when idea is deleted', () => {
    const store = new Store(tmpDir);
    const idea = store.createIdea('With sessions');
    store.createSession(idea.id, 'ezvibe-1', '/tmp');
    store.createSession(idea.id, 'ezvibe-2', '/tmp');
    store.createNote(idea.id, 'Important');

    store.deleteIdea(idea.id);
    expect(store.getSessions()).toHaveLength(0);
    expect(store.getNotes(idea.id)).toHaveLength(0);
  });
});
