export interface Idea {
  id: string;
  name: string;
  description: string;
  stage: 'exploring' | 'planning' | 'implementing' | 'done';
  projectPath: string | null;
  color: string;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
}

export interface Session {
  id: string;
  ideaId: string;
  tmuxSession: string;
  status: 'active' | 'dead';
  cwd: string;
  startedAt: string;
  endedAt: string | null;
}

export interface Note {
  id: string;
  ideaId: string;
  content: string;
  createdAt: string;
}

export type Stage = Idea['stage'];

export type RightPanel = 'detail' | 'context' | 'notes';

export type ContextTab = 'claudemd' | 'memory' | 'plans';