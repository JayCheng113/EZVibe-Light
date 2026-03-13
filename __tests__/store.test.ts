import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { Store } from '../src/lib/store.js';

let tmpDir: string;
let store: Store;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ezvibe-test-'));
  store = new Store(tmpDir);
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('Store - Ideas', () => {
  it('should start with no ideas', () => {
    expect(store.getIdeas()).toEqual([]);
  });

  it('should create an idea', () => {
    const idea = store.createIdea('Test Idea', 'A description', '/tmp/project');
    expect(idea.name).toBe('Test Idea');
    expect(idea.description).toBe('A description');
    expect(idea.stage).toBe('exploring');
    expect(idea.projectPath).toBe('/tmp/project');
    expect(idea.id).toBeTruthy();
  });

  it('should persist ideas to disk', () => {
    store.createIdea('Persistent Idea');

    // Create a new store from the same directory
    const store2 = new Store(tmpDir);
    const ideas = store2.getIdeas();
    expect(ideas).toHaveLength(1);
    expect(ideas[0].name).toBe('Persistent Idea');
  });

  it('should update an idea', () => {
    const idea = store.createIdea('Original');
    store.updateIdea(idea.id, { name: 'Updated', stage: 'planning' });

    const updated = store.getIdea(idea.id);
    expect(updated?.name).toBe('Updated');
    expect(updated?.stage).toBe('planning');
    // updatedAt is set on update (may or may not differ in same ms)
    expect(updated?.updatedAt).toBeTruthy();
  });

  it('should delete an idea and cascade to sessions/notes', () => {
    const idea = store.createIdea('To Delete');
    store.createSession(idea.id, 'ezvibe-test', '/tmp');
    store.createNote(idea.id, 'A note');

    store.deleteIdea(idea.id);

    expect(store.getIdeas()).toHaveLength(0);
    expect(store.getSessions(idea.id)).toHaveLength(0);
    expect(store.getNotes(idea.id)).toHaveLength(0);
  });

  it('should not return archived ideas by default', () => {
    const idea = store.createIdea('Archived');
    store.updateIdea(idea.id, { archived: true });

    expect(store.getIdeas()).toHaveLength(0);
    expect(store.getIdeas(true)).toHaveLength(1);
  });

  it('should throw when updating non-existent idea', () => {
    expect(() => store.updateIdea('nonexistent', { name: 'x' })).toThrow();
  });
});

describe('Store - Sessions', () => {
  it('should create a session', () => {
    const idea = store.createIdea('Idea');
    const session = store.createSession(idea.id, 'ezvibe-abc12345', '/tmp');

    expect(session.ideaId).toBe(idea.id);
    expect(session.tmuxSession).toBe('ezvibe-abc12345');
    expect(session.status).toBe('active');
  });

  it('should get active session for an idea', () => {
    const idea = store.createIdea('Idea');
    store.createSession(idea.id, 'ezvibe-test1', '/tmp');

    const active = store.getActiveSession(idea.id);
    expect(active).toBeTruthy();
    expect(active?.tmuxSession).toBe('ezvibe-test1');
  });

  it('should update session status', () => {
    const idea = store.createIdea('Idea');
    const session = store.createSession(idea.id, 'ezvibe-test1', '/tmp');

    store.updateSession(session.id, { status: 'dead', endedAt: new Date().toISOString() });

    const updated = store.getSessions(idea.id);
    expect(updated[0].status).toBe('dead');
    expect(updated[0].endedAt).toBeTruthy();
  });

  it('should return no active session when all are dead', () => {
    const idea = store.createIdea('Idea');
    const session = store.createSession(idea.id, 'ezvibe-test1', '/tmp');
    store.updateSession(session.id, { status: 'dead' });

    expect(store.getActiveSession(idea.id)).toBeUndefined();
  });
});

describe('Store - Notes', () => {
  it('should create and retrieve notes', () => {
    const idea = store.createIdea('Idea');
    store.createNote(idea.id, 'First note');
    store.createNote(idea.id, 'Second note');

    const notes = store.getNotes(idea.id);
    expect(notes).toHaveLength(2);
    expect(notes[0].content).toBe('First note');
  });

  it('should delete a note', () => {
    const idea = store.createIdea('Idea');
    const note = store.createNote(idea.id, 'To delete');
    store.deleteNote(note.id);

    expect(store.getNotes(idea.id)).toHaveLength(0);
  });
});

describe('Store - Edge cases', () => {
  it('should handle corrupted JSON gracefully', () => {
    fs.writeFileSync(path.join(tmpDir, 'data.json'), 'NOT VALID JSON');
    const store2 = new Store(tmpDir);
    expect(store2.getIdeas()).toEqual([]);
  });

  it('should handle missing data file', () => {
    const newDir = path.join(tmpDir, 'new-dir');
    const store2 = new Store(newDir);
    expect(store2.getIdeas()).toEqual([]);
    // Should create the directory
    expect(fs.existsSync(newDir)).toBe(true);
  });

  it('should use atomic writes (temp file + rename)', () => {
    store.createIdea('Test');
    // After save, there should be a data.json but no data.json.tmp
    expect(fs.existsSync(path.join(tmpDir, 'data.json'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'data.json.tmp'))).toBe(false);
  });
});
