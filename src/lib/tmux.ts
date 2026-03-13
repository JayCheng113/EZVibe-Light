import { execSync, spawnSync } from 'child_process';

export function isTmuxAvailable(): boolean {
  try {
    execSync('which tmux', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

export function tmuxSessionName(ideaId: string): string {
  return `ezvibe-${ideaId.slice(0, 8)}`;
}

export function createTmuxSession(opts: {
  name: string;
  cwd: string;
  command?: string;
}): void {
  const cmd = opts.command ?? 'claude';
  // Clear CLAUDE_CODE_SESSION to avoid nested-session detection
  const fullCmd = `env -u CLAUDE_CODE_SESSION ${cmd}`;
  execSync(
    `tmux new-session -d -s ${shellEscape(opts.name)} -c ${shellEscape(opts.cwd)} ${shellEscape(fullCmd)}`,
    { stdio: 'ignore' }
  );
}

export function attachTmuxSession(name: string): void {
  // This hands full terminal control to tmux.
  // When user presses Ctrl-b d, control returns here.
  spawnSync('tmux', ['attach-session', '-t', name], {
    stdio: 'inherit',
  });
}

export function killTmuxSession(name: string): void {
  try {
    execSync(`tmux kill-session -t ${shellEscape(name)}`, { stdio: 'ignore' });
  } catch {
    // Session may already be dead
  }
}

export function isTmuxSessionAlive(name: string): boolean {
  try {
    execSync(`tmux has-session -t ${shellEscape(name)}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

export function listEzvibeSessions(): string[] {
  try {
    const output = execSync("tmux list-sessions -F '#{session_name}' 2>/dev/null", {
      encoding: 'utf-8',
    });
    return output
      .trim()
      .split('\n')
      .filter(name => name.startsWith('ezvibe-'));
  } catch {
    return [];
  }
}

function shellEscape(s: string): string {
  return `'${s.replace(/'/g, "'\\''")}'`;
}
