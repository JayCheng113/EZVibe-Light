import { useState, useCallback } from 'react';
import type { Idea, Stage } from '../types.js';
import { Store } from '../lib/store.js';
import { STAGES } from '../constants.js';

export function useIdeas(store: Store) {
  const [ideas, setIdeas] = useState<Idea[]>(() => store.getIdeas());

  const refresh = useCallback(() => {
    setIdeas(store.getIdeas());
  }, [store]);

  const createIdea = useCallback(
    (name: string, description?: string, projectPath?: string | null) => {
      const idea = store.createIdea(name, description, projectPath);
      refresh();
      return idea;
    },
    [store, refresh]
  );

  const updateIdea = useCallback(
    (id: string, updates: Partial<Omit<Idea, 'id' | 'createdAt'>>) => {
      const idea = store.updateIdea(id, updates);
      refresh();
      return idea;
    },
    [store, refresh]
  );

  const deleteIdea = useCallback(
    (id: string) => {
      store.deleteIdea(id);
      refresh();
    },
    [store, refresh]
  );

  const cycleStage = useCallback(
    (id: string, reverse = false) => {
      const idea = store.getIdea(id);
      if (!idea) return;
      const idx = STAGES.indexOf(idea.stage);
      const next = reverse
        ? (idx - 1 + STAGES.length) % STAGES.length
        : (idx + 1) % STAGES.length;
      store.updateIdea(id, { stage: STAGES[next] as Stage });
      refresh();
    },
    [store, refresh]
  );

  return { ideas, createIdea, updateIdea, deleteIdea, cycleStage, refresh };
}
