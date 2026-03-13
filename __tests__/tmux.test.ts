import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as childProcess from 'child_process';
import {
  isTmuxAvailable,
  tmuxSessionName,
  createTmuxSession,
  killTmuxSession,
  isTmuxSessionAlive,
  listEzvibeSessions,
} from '../src/lib/tmux.js';

vi.mock('child_process', () => ({
  execSync: vi.fn(),
  spawnSync: vi.fn(),
}));

const mockExecSync = vi.mocked(childProcess.execSync);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('tmuxSessionName', () => {
  it('should generate name from first 8 chars of ideaId', () => {
    expect(tmuxSessionName('abcdef12-3456-7890')).toBe('ezvibe-abcdef12');
  });

  it('should handle short ideaId', () => {
    expect(tmuxSessionName('abc')).toBe('ezvibe-abc');
  });
});

describe('isTmuxAvailable', () => {
  it('should return true when tmux is found', () => {
    mockExecSync.mockReturnValue(Buffer.from('/usr/bin/tmux'));
    expect(isTmuxAvailable()).toBe(true);
  });

  it('should return false when tmux is not found', () => {
    mockExecSync.mockImplementation(() => {
      throw new Error('not found');
    });
    expect(isTmuxAvailable()).toBe(false);
  });
});

describe('createTmuxSession', () => {
  it('should create a tmux session with correct command', () => {
    mockExecSync.mockReturnValue(Buffer.from(''));
    createTmuxSession({ name: 'ezvibe-test', cwd: '/tmp/project' });

    expect(mockExecSync).toHaveBeenCalledWith(
      expect.stringContaining('tmux new-session -d -s'),
      expect.objectContaining({ stdio: 'ignore' })
    );
    expect(mockExecSync).toHaveBeenCalledWith(
      expect.stringContaining('ezvibe-test'),
      expect.any(Object)
    );
  });

  it('should clean CLAUDE_CODE_SESSION env var', () => {
    mockExecSync.mockReturnValue(Buffer.from(''));
    createTmuxSession({ name: 'ezvibe-test', cwd: '/tmp' });

    expect(mockExecSync).toHaveBeenCalledWith(
      expect.stringContaining('env -u CLAUDE_CODE_SESSION'),
      expect.any(Object)
    );
  });

  it('should use custom command when provided', () => {
    mockExecSync.mockReturnValue(Buffer.from(''));
    createTmuxSession({ name: 'ezvibe-test', cwd: '/tmp', command: 'zsh' });

    expect(mockExecSync).toHaveBeenCalledWith(
      expect.stringContaining('zsh'),
      expect.any(Object)
    );
  });
});

describe('killTmuxSession', () => {
  it('should kill session', () => {
    mockExecSync.mockReturnValue(Buffer.from(''));
    killTmuxSession('ezvibe-test');

    expect(mockExecSync).toHaveBeenCalledWith(
      expect.stringContaining('tmux kill-session -t'),
      expect.any(Object)
    );
  });

  it('should not throw when session does not exist', () => {
    mockExecSync.mockImplementation(() => {
      throw new Error('session not found');
    });
    expect(() => killTmuxSession('nonexistent')).not.toThrow();
  });
});

describe('isTmuxSessionAlive', () => {
  it('should return true for alive session', () => {
    mockExecSync.mockReturnValue(Buffer.from(''));
    expect(isTmuxSessionAlive('ezvibe-test')).toBe(true);
  });

  it('should return false for dead session', () => {
    mockExecSync.mockImplementation(() => {
      throw new Error('not found');
    });
    expect(isTmuxSessionAlive('ezvibe-test')).toBe(false);
  });
});

describe('listEzvibeSessions', () => {
  it('should filter only ezvibe- sessions', () => {
    mockExecSync.mockReturnValue(
      'ezvibe-abc12345\nezvibe-def67890\nother-session\n' as any
    );
    const sessions = listEzvibeSessions();
    expect(sessions).toEqual(['ezvibe-abc12345', 'ezvibe-def67890']);
  });

  it('should return empty array when no sessions', () => {
    mockExecSync.mockImplementation(() => {
      throw new Error('no server');
    });
    expect(listEzvibeSessions()).toEqual([]);
  });

  it('should handle empty tmux output', () => {
    mockExecSync.mockReturnValue('' as any);
    expect(listEzvibeSessions()).toEqual([]);
  });
});
