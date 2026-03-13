import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import type { Idea, Session, Note } from '../types.js';

interface StoreData {
  version: 1;
  ideas: Idea[];
  sessions: Session[];
  notes: Note[];
}

function defaultData(): StoreData {
  return {
    version: 1,
    ideas: [],
    sessions: [],
    notes: [],
  };
}

export class Store {
  private filePath: string;
  private dir: string;
  private data: StoreData;

  constructor(dir?: string) {
    this.dir = dir ?? path.join(os.homedir(), '.ezvibe-light');
    this.filePath = path.join(this.dir, 'data.json');
    this.data = defaultData();
    this.load();
  }

  load(): void {
    try {
      if (!fs.existsSync(this.dir)) {
        fs.mkdirSync(this.dir, { recursive: true });
      }
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        // Validate structure — fall back to defaults for missing/invalid fields
        this.data = {
          version: 1,
          ideas: Array.isArray(parsed.ideas) ? parsed.ideas : [],
          sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
          notes: Array.isArray(parsed.notes) ? parsed.notes : [],
        };
      }
    } catch {
      this.data = defaultData();
    }
  }

  save(): void {
    // Ensure directory exists (could be deleted while app is running)
    if (!fs.existsSync(this.dir)) {
      fs.mkdirSync(this.dir, { recursive: true });
    }
    const tmp = this.filePath + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2));
    fs.renameSync(tmp, this.filePath);
  }

  // Ideas

  getIdeas(includeArchived = false): Idea[] {
    return this.data.ideas.filter(i => includeArchived || !i.archived);
  }

  getIdea(id: string): Idea | undefined {
    return this.data.ideas.find(i => i.id === id);
  }

  createIdea(name: string, description = '', projectPath: string | null = null): Idea {
    const now = new Date().toISOString();
    const idea: Idea = {
      id: crypto.randomUUID(),
      name,
      description,
      stage: 'exploring',
      projectPath,
      color: '#6366f1',
      createdAt: now,
      updatedAt: now,
      archived: false,
    };
    this.data.ideas.push(idea);
    this.save();
    return idea;
  }

  updateIdea(id: string, updates: Partial<Omit<Idea, 'id' | 'createdAt'>>): Idea {
    const idea = this.data.ideas.find(i => i.id === id);
    if (!idea) throw new Error(`Idea not found: ${id}`);
    Object.assign(idea, updates, { updatedAt: new Date().toISOString() });
    this.save();
    return idea;
  }

  deleteIdea(id: string): void {
    this.data.ideas = this.data.ideas.filter(i => i.id !== id);
    this.data.sessions = this.data.sessions.filter(s => s.ideaId !== id);
    this.data.notes = this.data.notes.filter(n => n.ideaId !== id);
    this.save();
  }

  // Sessions

  getSessions(ideaId?: string): Session[] {
    if (ideaId) return this.data.sessions.filter(s => s.ideaId === ideaId);
    return [...this.data.sessions];
  }

  getActiveSession(ideaId: string): Session | undefined {
    return this.data.sessions.find(s => s.ideaId === ideaId && s.status === 'active');
  }

  createSession(ideaId: string, tmuxSession: string, cwd: string): Session {
    const session: Session = {
      id: crypto.randomUUID(),
      ideaId,
      tmuxSession,
      status: 'active',
      cwd,
      startedAt: new Date().toISOString(),
      endedAt: null,
    };
    this.data.sessions.push(session);
    this.save();
    return session;
  }

  updateSession(id: string, updates: Partial<Omit<Session, 'id' | 'ideaId' | 'startedAt'>>): void {
    const session = this.data.sessions.find(s => s.id === id);
    if (!session) return;
    Object.assign(session, updates);
    this.save();
  }

  // Notes

  getNotes(ideaId: string): Note[] {
    return this.data.notes.filter(n => n.ideaId === ideaId);
  }

  createNote(ideaId: string, content: string): Note {
    const note: Note = {
      id: crypto.randomUUID(),
      ideaId,
      content,
      createdAt: new Date().toISOString(),
    };
    this.data.notes.push(note);
    this.save();
    return note;
  }

  deleteNote(id: string): void {
    this.data.notes = this.data.notes.filter(n => n.id !== id);
    this.save();
  }
}
