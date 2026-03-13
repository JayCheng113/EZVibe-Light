import { useState, useCallback, useEffect } from 'react';
import type { Session } from '../types.js';
import { Store } from '../lib/store.js';
import * as tmux from '../lib/tmux.js';

export function useSessions(store: Store) {
  const [sessions, setSessions] = useState<Session[]>(() => store.getSessions());

  const refresh = useCallback(() => {
    setSessions(store.getSessions());
  }, [store]);

  // Sync tmux state every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const alive = tmux.listEzvibeSessions();
      const activeSessions = store.getSessions().filter(s => s.status === 'active');
      let changed = false;

      for (const session of activeSessions) {
        if (!alive.includes(session.tmuxSession)) {
          store.updateSession(session.id, {
            status: 'dead',
            endedAt: new Date().toISOString(),
          });
          changed = true;
        }
      }

      if (changed) refresh();
    }, 5000);

    return () => clearInterval(interval);
  }, [store, refresh]);

  const startSession = useCallback(
    (ideaId: string, cwd: string): Session | null => {
      const name = tmux.tmuxSessionName(ideaId);

      // Kill existing dead tmux session with same name
      if (tmux.isTmuxSessionAlive(name)) {
        tmux.killTmuxSession(name);
      }

      try {
        tmux.createTmuxSession({ name, cwd });
      } catch {
        return null;
      }

      const session = store.createSession(ideaId, name, cwd);
      refresh();
      return session;
    },
    [store, refresh]
  );

  const attachSession = useCallback((tmuxName: string) => {
    if (tmux.isTmuxSessionAlive(tmuxName)) {
      tmux.attachTmuxSession(tmuxName);
    }
  }, []);

  const killSession = useCallback(
    (sessionId: string) => {
      const session = store.getSessions().find(s => s.id === sessionId);
      if (!session) return;

      tmux.killTmuxSession(session.tmuxSession);
      store.updateSession(sessionId, {
        status: 'dead',
        endedAt: new Date().toISOString(),
      });
      refresh();
    },
    [store, refresh]
  );

  const getActiveSession = useCallback(
    (ideaId: string): Session | undefined => {
      return sessions.find(s => s.ideaId === ideaId && s.status === 'active');
    },
    [sessions]
  );

  return { sessions, startSession, attachSession, killSession, getActiveSession, refresh };
}
