<p align="center">
  <b>EZVibe Light</b><br>
  <i>37 KB. Zero native deps. Full Claude Code orchestration.</i>
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> &middot;
  <a href="#how-it-works">How It Works</a> &middot;
  <a href="#keyboard-shortcuts">Shortcuts</a> &middot;
  <a href="#architecture">Architecture</a>
</p>

---

You're juggling 5 Claude Code sessions across 3 projects. Terminal tabs everywhere. You forgot which session was for the auth refactor. The API design plan? Somewhere in `~/.claude/plans/`. Your notes? Gone.

**EZVibe Light fixes this in 37 KB.**

```
┌─ Ideas ───────┬─ Detail ─────────────────┐
│ ? EXPLORING   │                          │
│ > Auth Refac… │ > Auth Refactor          │
│   New Feature │                          │
│               │ Stage: implementing      │
│ # PLANNING    │ Path:  ~/projects/auth   │
│   API Design  │ Session: ● active        │
│               │                          │
│ > IMPLEMENTING│ Notes (2)                │
│   Login Page  │ - Check migration script │
│               │ - Update JWT config      │
│ * DONE        ├──────────────────────────┤
│   Dark Theme  │ [1]CLAUDE.md [2]Memory   │
│               │ [3]Plans                 │
└───────────────┴──────────────────────────┘
 [n]ew [Enter]attach [s]tage [Tab]panel [q]uit
```

One TUI. All your ideas. All your sessions. All your Claude context.

## Quick Start

```bash
npx ezvibe-light
```

That's it. No build step. No config files. No browser. No native compilation.

> Requires Node.js 18+, [tmux](https://github.com/tmux/tmux), and [Claude Code](https://docs.anthropic.com/en/docs/claude-code)

<details>
<summary>Installing prerequisites</summary>

```bash
# tmux
brew install tmux          # macOS
sudo apt install tmux      # Ubuntu/Debian

# Claude Code
npm install -g @anthropic-ai/claude-code
```

</details>

## How It Works

```
   You press 'n'          You press Enter        You press Ctrl-b d
        |                       |                        |
   Name your idea     -->  Claude Code starts   -->  Back to EZVibe Light
   Pick a project          in a tmux session         Session keeps running
   Set the stage           Full terminal control     Pick up where you left off
```

**The key insight:** tmux sessions survive everything. Close your terminal, SSH disconnect, reboot EZVibe Light — your Claude Code sessions are still there, exactly where you left them.

### The Workflow

1. **`n`** &mdash; Create an idea. Name it, describe it, pick a project from your `~/.claude/projects/`
2. **`Enter`** &mdash; Launch Claude Code in tmux (or reattach to an existing session)
3. **`Ctrl-b d`** &mdash; Detach. You're back in EZVibe Light. Claude keeps running.
4. **`s`** &mdash; Move your idea through stages: `exploring` &rarr; `planning` &rarr; `implementing` &rarr; `done`
5. **`Tab`** &mdash; Browse your CLAUDE.md, memory files, and plans — without leaving the TUI

## Why Not Just Use Terminal Tabs?

| | Terminal tabs | EZVibe Light |
|---|---|---|
| **Remember which session is which** | You don't | Idea names + stages |
| **See Claude's plans/memory** | Open another terminal, cat the files | Press `Tab` |
| **Track progress across projects** | Sticky notes? | Built-in lifecycle |
| **Session persistence** | Close tab = gone | tmux = immortal |
| **Take notes on a task** | Open a text editor | Press `a` |

## Why Not EZVibe (Web)?

EZVibe Light is EZVibe's little sibling. Same ideas, radically different philosophy.

| | EZVibe (Web) | EZVibe Light |
|---|---|---|
| **Install** | Minutes (C++ compilation) | **3 seconds** |
| **Runtime deps** | 15+ including native modules | **3** (pure JavaScript) |
| **Bundle** | Multi-MB Next.js build | **37 KB** |
| **Startup** | Build + dual-process boot | **Instant** |
| **Over SSH** | No (needs browser) | **Yes** |
| **Form factor** | Browser tab | **Your terminal** |

If you want dashboards and WebGL terminals, use [EZVibe](https://github.com/JayCheng113/EZVibe). If you want something that starts before you finish blinking, use EZVibe Light.

## Keyboard Shortcuts

Everything is one keypress away. No menus. No mouse.

### Navigation
| Key | Action |
|---|---|
| `j` / `k` | Move up / down |
| `Tab` | Cycle panels: Detail &rarr; Context &rarr; Notes |
| `1` `2` `3` | Context tabs: CLAUDE.md / Memory / Plans |

### Ideas
| Key | Action |
|---|---|
| `n` | New idea (guided wizard) |
| `s` / `S` | Cycle stage forward / backward |
| `e` | Edit name |
| `d` | Delete (with confirmation) |
| `p` | Set project path |
| `a` | Add a note |

### Sessions
| Key | Action |
|---|---|
| `Enter` | Attach session (creates one if none exists) |
| `x` | Kill session |
| `Ctrl-b d` | Detach from tmux (while inside a session) |

### App
| Key | Action |
|---|---|
| `?` | Show all shortcuts |
| `q` | Quit |

## Architecture

```
ezvibe-light
├── Ink (React for CLI)        TUI rendering
├── CommandRegistry            Extensible keyboard actions
├── Wizard state machine       Multi-step input flows
├── tmux                       Session persistence
├── JSON file                  Data storage
└── ~/.claude/ reader          Plans, memory, CLAUDE.md
```

**1,900 lines. Single process. Zero native deps. 43 tests.**

No Express server. No WebSocket layer. No webpack build. Just Node.js talking to tmux.

### Data

```
~/.ezvibe-light/
└── data.json          # Your ideas, sessions, notes — human-readable JSON
```

Back it up, version-control it, edit it by hand. It's just a file.

### Extensibility

Commands are registered declaratively:

```typescript
commands.register({
  name: 'my-action',
  key: 'g',
  description: 'Do something cool',
  canExecute: (ctx) => !!ctx.selectedIdea,
  execute: (ctx) => { /* your logic */ },
});
```

Multi-step flows use a wizard state machine:

```typescript
wizard.start({
  steps: [
    { type: 'input', key: 'name', prompt: 'Name:' },
    { type: 'project-picker', key: 'path', prompt: 'Project:' },
  ],
  onComplete: (results) => createIdea(results.name, results.path),
});
```

No callback nesting. No framework lock-in. Add features without touching the core.

## Development

```bash
cd ezvibe-light
npm install           # 3 seconds, zero compilation
npm run dev           # watch mode with tsup
npm run build         # production build (37 KB)
npm test              # 43 tests across 5 suites
```

### Test Coverage

| Suite | Tests | What it covers |
|---|---|---|
| `store.test.ts` | 16 | CRUD, persistence, cascading deletes, edge cases |
| `tmux.test.ts` | 14 | Command construction, session lifecycle, env cleanup |
| `commands.test.ts` | 6 | Registration, guards, key resolution, unregister |
| `wizard.test.tsx` | 3 | Step progression, completion, cancellation |
| `e2e.test.tsx` | 4 | Full app rendering, shortcuts, overlay lifecycle |

## License

MIT

---

<p align="center">
  <b>Built with Claude Code.</b> The entire thing — brainstorming, spec, implementation, tests — was built using the tool it manages.
</p>
