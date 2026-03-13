import fs from 'fs';
import path from 'path';
import os from 'os';

const CLAUDE_DIR = path.join(os.homedir(), '.claude');

export function projectPathToClaudeKey(projectPath: string): string {
  return projectPath.replace(/\//g, '-');
}

export interface MemoryFile {
  name: string;
  content: string;
}

export interface PlanFile {
  filename: string;
  title: string;
  content: string;
}

export function getMemoryFiles(projectKey: string): MemoryFile[] {
  try {
    if (!fs.existsSync(CLAUDE_DIR)) return [];

    const memoryDir = path.join(CLAUDE_DIR, 'projects', projectKey, 'memory');
    if (!fs.existsSync(memoryDir)) return [];

    const files = fs.readdirSync(memoryDir).filter(f => f.endsWith('.md'));
    return files.map(f => {
      try {
        return {
          name: f,
          content: fs.readFileSync(path.join(memoryDir, f), 'utf-8'),
        };
      } catch {
        return { name: f, content: '' };
      }
    });
  } catch {
    return [];
  }
}

export function getPlanFiles(): PlanFile[] {
  try {
    if (!fs.existsSync(CLAUDE_DIR)) return [];

    const plansDir = path.join(CLAUDE_DIR, 'plans');
    if (!fs.existsSync(plansDir)) return [];

    const files = fs.readdirSync(plansDir).filter(f => f.endsWith('.md'));
    return files.map(f => {
      try {
        const content = fs.readFileSync(path.join(plansDir, f), 'utf-8');
        const titleMatch = content.match(/^#\s+(.+)$/m);
        return {
          filename: f,
          title: titleMatch ? titleMatch[1] : f.replace('.md', ''),
          content,
        };
      } catch {
        return {
          filename: f,
          title: f.replace('.md', ''),
          content: '',
        };
      }
    });
  } catch {
    return [];
  }
}

export interface DiscoveredProject {
  path: string;
  name: string;
  hasClaudeMd: boolean;
}

function claudeKeyToProjectPath(key: string): string | null {
  const parts = key.split('-').filter(Boolean);

  const simplePath = '/' + parts.join('/');
  if (fs.existsSync(simplePath)) {
    return simplePath;
  }

  function tryBuild(idx: number, segments: string[]): string | null {
    if (idx >= parts.length) {
      const candidate = '/' + segments.join('/');
      return fs.existsSync(candidate) ? candidate : null;
    }

    const asNew = tryBuild(idx + 1, [...segments, parts[idx]]);
    if (asNew) return asNew;

    if (segments.length > 0) {
      const merged = [...segments];
      merged[merged.length - 1] += '-' + parts[idx];
      const asMerged = tryBuild(idx + 1, merged);
      if (asMerged) return asMerged;
    }

    return null;
  }

  return tryBuild(0, []);
}

export function discoverProjects(): DiscoveredProject[] {
  try {
    const projectsDir = path.join(CLAUDE_DIR, 'projects');
    if (!fs.existsSync(projectsDir)) return [];

    const entries = fs.readdirSync(projectsDir, { withFileTypes: true });
    const results: Array<DiscoveredProject & { mtime: number }> = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const dirName = entry.name;
      const projectPath = claudeKeyToProjectPath(dirName);
      if (!projectPath) continue;

      const hasClaudeMd = fs.existsSync(
        path.join(projectsDir, dirName, 'CLAUDE.md')
      );

      let mtime = 0;
      try {
        const stat = fs.statSync(path.join(projectsDir, dirName));
        mtime = stat.mtimeMs;
      } catch {
        // ignore
      }

      results.push({
        path: projectPath,
        name: path.basename(projectPath),
        hasClaudeMd,
        mtime,
      });
    }

    results.sort((a, b) => b.mtime - a.mtime);
    return results.map(({ mtime: _, ...rest }) => rest);
  } catch {
    return [];
  }
}

export function getClaudeMd(projectPath: string): string | null {
  try {
    const key = projectPathToClaudeKey(projectPath);
    const filePath = path.join(CLAUDE_DIR, 'projects', key, 'CLAUDE.md');
    if (!fs.existsSync(filePath)) return null;
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}
