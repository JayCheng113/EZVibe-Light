import { useState, useEffect } from 'react';
import type { ContextTab } from '../types.js';
import {
  getMemoryFiles,
  getPlanFiles,
  getClaudeMd,
  projectPathToClaudeKey,
  type MemoryFile,
  type PlanFile,
} from '../lib/claude-data.js';

interface ClaudeContext {
  claudeMd: string | null;
  memoryFiles: MemoryFile[];
  planFiles: PlanFile[];
}

export function useClaudeContext(
  projectPath: string | null,
  activeTab: ContextTab
) {
  const [context, setContext] = useState<ClaudeContext>({
    claudeMd: null,
    memoryFiles: [],
    planFiles: [],
  });

  // Reset all context when project changes
  useEffect(() => {
    setContext({ claudeMd: null, memoryFiles: [], planFiles: [] });
  }, [projectPath]);

  // Load data for the active tab
  useEffect(() => {
    if (!projectPath) return;

    const key = projectPathToClaudeKey(projectPath);

    if (activeTab === 'claudemd') {
      setContext(prev => ({ ...prev, claudeMd: getClaudeMd(projectPath) }));
    } else if (activeTab === 'memory') {
      setContext(prev => ({ ...prev, memoryFiles: getMemoryFiles(key) }));
    } else if (activeTab === 'plans') {
      setContext(prev => ({ ...prev, planFiles: getPlanFiles() }));
    }
  }, [projectPath, activeTab]);

  return context;
}
