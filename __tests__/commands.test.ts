import { describe, it, expect, vi } from 'vitest';
import { CommandRegistry } from '../src/lib/commands.js';
import type { Key } from 'ink';

function makeKey(overrides: Partial<Key> = {}): Key {
  return {
    upArrow: false,
    downArrow: false,
    leftArrow: false,
    rightArrow: false,
    pageDown: false,
    pageUp: false,
    return: false,
    escape: false,
    ctrl: false,
    shift: false,
    tab: false,
    backspace: false,
    delete: false,
    meta: false,
    ...overrides,
  };
}

const emptyCtx = { selectedIdea: undefined, activeSession: undefined, ideaCount: 0 };

describe('CommandRegistry', () => {
  it('should register and execute a command', () => {
    const reg = new CommandRegistry();
    const fn = vi.fn();

    reg.register({ name: 'test', key: 'x', description: 'Test', execute: fn });
    const handled = reg.handle('x', makeKey(), emptyCtx);

    expect(handled).toBe(true);
    expect(fn).toHaveBeenCalledWith(emptyCtx);
  });

  it('should return false for unregistered keys', () => {
    const reg = new CommandRegistry();
    expect(reg.handle('z', makeKey(), emptyCtx)).toBe(false);
  });

  it('should respect canExecute', () => {
    const reg = new CommandRegistry();
    const fn = vi.fn();

    reg.register({
      name: 'test', key: 'x', description: 'Test',
      canExecute: (ctx) => !!ctx.selectedIdea,
      execute: fn,
    });

    expect(reg.handle('x', makeKey(), emptyCtx)).toBe(false);
    expect(fn).not.toHaveBeenCalled();
  });

  it('should resolve special keys (return, tab, arrows)', () => {
    const reg = new CommandRegistry();
    const enterFn = vi.fn();
    const tabFn = vi.fn();
    const downFn = vi.fn();
    const upFn = vi.fn();

    reg.register({ name: 'enter', key: 'enter', description: 'Enter', execute: enterFn });
    reg.register({ name: 'tab', key: 'tab', description: 'Tab', execute: tabFn });
    reg.register({ name: 'down', key: 'down', description: 'Down', execute: downFn });
    reg.register({ name: 'up', key: 'up', description: 'Up', execute: upFn });

    reg.handle('', makeKey({ return: true }), emptyCtx);
    reg.handle('', makeKey({ tab: true }), emptyCtx);
    reg.handle('', makeKey({ downArrow: true }), emptyCtx);
    reg.handle('', makeKey({ upArrow: true }), emptyCtx);

    expect(enterFn).toHaveBeenCalled();
    expect(tabFn).toHaveBeenCalled();
    expect(downFn).toHaveBeenCalled();
    expect(upFn).toHaveBeenCalled();
  });

  it('should unregister a command', () => {
    const reg = new CommandRegistry();
    const fn = vi.fn();

    reg.register({ name: 'test', key: 'x', description: 'Test', execute: fn });
    reg.unregister('x');

    expect(reg.handle('x', makeKey(), emptyCtx)).toBe(false);
    expect(fn).not.toHaveBeenCalled();
  });

  it('should list all commands', () => {
    const reg = new CommandRegistry();
    reg.register({ name: 'a', key: 'a', description: 'A', execute: vi.fn() });
    reg.register({ name: 'b', key: 'b', description: 'B', execute: vi.fn() });

    expect(reg.getAll()).toHaveLength(2);
    expect(reg.getAll().map(c => c.name)).toEqual(['a', 'b']);
  });
});
