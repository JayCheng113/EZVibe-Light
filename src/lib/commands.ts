import type { Key } from 'ink';
import type { Idea, Session } from '../types.js';

export interface CommandContext {
  selectedIdea: Idea | undefined;
  activeSession: Session | undefined;
  ideaCount: number;
}

export interface Command {
  name: string;
  key: string;
  description: string;
  /** Return false to indicate the command shouldn't run (e.g. no idea selected) */
  canExecute?: (ctx: CommandContext) => boolean;
  execute: (ctx: CommandContext) => void;
}

export class CommandRegistry {
  private commands: Map<string, Command> = new Map();

  register(cmd: Command): this {
    this.commands.set(cmd.key, cmd);
    return this;
  }

  unregister(key: string): this {
    this.commands.delete(key);
    return this;
  }

  get(key: string): Command | undefined {
    return this.commands.get(key);
  }

  getAll(): Command[] {
    return [...this.commands.values()];
  }

  /** Try to execute a command for the given key. Returns true if handled. */
  handle(input: string, key: Key, ctx: CommandContext): boolean {
    // Map special keys to string identifiers
    const keyId = this.resolveKey(input, key);
    if (!keyId) return false;

    const cmd = this.commands.get(keyId);
    if (!cmd) return false;
    if (cmd.canExecute && !cmd.canExecute(ctx)) return false;

    cmd.execute(ctx);
    return true;
  }

  private resolveKey(input: string, key: Key): string | null {
    if (key.return) return 'enter';
    if (key.tab) return 'tab';
    if (key.downArrow) return 'down';
    if (key.upArrow) return 'up';
    if (input) return input;
    return null;
  }
}
