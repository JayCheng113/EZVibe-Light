<p align="center">
  <b>EZVibe Light</b><br>
  <i>43 KB. Zero native deps. Full Claude Code orchestration.</i>
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> &middot;
  <a href="#the-workflow">Workflow</a> &middot;
  <a href="#keyboard-shortcuts">Shortcuts</a> &middot;
  <a href="#architecture">Architecture</a>
</p>

---

You're running 5 Claude Code sessions across 3 projects. Terminal tabs everywhere. You forgot which one was the auth refactor. The API plan? Buried in `~/.claude/`. Your notes? Gone.

**One command. All your sessions. All your context.**

```bash
npx ezvibe-light
```

```
┌─ Ideas ───────┬─ Detail ─────────────────┐
│ ? EXPLORING   │                          │
│ > Auth Refac… │ > Auth Refactor          │
│   API Client  │                          │
│               │ Stage: implementing      │
│ # PLANNING    │ Path:  ~/projects/auth   │
│   DB Schema   │ Session: ● running       │
│               │                          │
│ > IMPLEMENTING│ Notes (2)                │
│   Login Page  │ - Check migration script │
│     ● running │ - Update JWT config      │
│ * DONE        ├──────────────────────────┤
│   Dark Theme  │ [1]CLAUDE.md [2]Memory   │
│     ○ stopped │ [3]Plans                 │
└───────────────┴──────────────────────────┘
 [n]ew [Enter]attach [s]tage [Tab]panel [q]uit
```

## Quick Start

```bash
npx ezvibe-light
```

No build step. No config files. No browser. No compilation. Just works.

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

## The Workflow

```
  Press 'n'              Press Enter            Press Ctrl-b d
      │                      │                       │
  Name your idea    →   Claude Code launches   →  Back to EZVibe Light
  Pick a project        in a tmux session         Session keeps running
                        Full terminal access      Switch to another idea
```

**The key insight:** tmux sessions are immortal. Close your terminal, lose SSH, reboot — your Claude Code sessions are still there, right where you left them.

### Switching Between Sessions

This is the core loop:

1. **`Enter`** — Jump into a Claude Code session
2. **`Ctrl-b d`** — Detach. Back to EZVibe Light. Claude keeps running in the background.
3. **`j/k`** — Select another idea
4. **`Enter`** — Jump into that session

All sessions run simultaneously. Switch between them in seconds.

### Full Lifecycle

1. **`n`** — Create an idea. Name it, pick a project from `~/.claude/projects/`
2. **`Enter`** — Launch Claude Code (or reattach to an existing session)
3. **`Ctrl-b d`** — Detach. Switch to another idea. Repeat.
4. **`s`** — Move through stages: `exploring` → `planning` → `implementing` → `done`
5. **`Tab`** — Browse CLAUDE.md, memory files, and plans without leaving the TUI

## Why Not Terminal Tabs?

| | Terminal tabs | EZVibe Light |
|---|---|---|
| **Which session is which?** | You don't know | Idea names + stages + status |
| **Claude's plans/memory** | Another terminal, cat files | Press `Tab` |
| **Track progress** | Sticky notes? | Built-in lifecycle |
| **Session persistence** | Close tab = gone | tmux = immortal |
| **Notes on a task** | Open a text editor | Press `a` |

## Why Not EZVibe (Web)?

Same family, different philosophy.

| | [EZVibe](https://github.com/JayCheng113/EZVibe) | EZVibe Light |
|---|---|---|
| **Install** | Minutes (C++ compilation) | **Instant** |
| **Runtime deps** | 15+ including native modules | **3** (pure JS) |
| **Bundle** | Multi-MB Next.js | **43 KB** |
| **Over SSH** | No (needs browser) | **Yes** |
| **Form factor** | Browser dashboard | **Your terminal** |

Want WebGL terminals and dashboards? Use [EZVibe](https://github.com/JayCheng113/EZVibe). Want something that starts before you finish blinking? Use EZVibe Light.

## Keyboard Shortcuts

Every action is one keypress. No menus. No mouse. Press `?` for the full list.

### Sessions
| Key | Action |
|---|---|
| `Enter` | Attach Claude Code session (creates one if none exists) |
| `Ctrl-b d` | Detach — back to EZVibe Light, session keeps running |
| `x` | Kill session |

### Ideas
| Key | Action |
|---|---|
| `j` / `k` | Navigate up / down |
| `n` | New idea (guided wizard) |
| `s` / `S` | Cycle stage forward / backward |
| `e` | Edit name |
| `d` | Delete (with confirmation) |
| `p` | Set project path |
| `a` | Add a note |

### Panels
| Key | Action |
|---|---|
| `Tab` | Cycle: Detail → Context → Notes |
| `1` `2` `3` | Context tabs: CLAUDE.md / Memory / Plans |

## Architecture

```
43 KB bundle. 3 dependencies. Single process.

┌────────────────────────────────────────────┐
│  Ink (React for CLI)     TUI rendering     │
│  CommandRegistry         Extensible keys   │
│  Wizard state machine    Multi-step flows  │
│  tmux                    Session immortality│
│  JSON file               Zero-config store │
│  ~/.claude/ reader       Plans + memory    │
└────────────────────────────────────────────┘
```

No Express. No WebSocket. No webpack. Just Node.js talking to tmux.

### Data

```
~/.ezvibe-light/
└── data.json     # Ideas, sessions, notes — human-readable JSON
```

Back it up, version-control it, edit it by hand. It's just a file.

### Extensibility

Add commands without touching the core:

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

## Development

```bash
git clone https://github.com/JayCheng113/EZVibe-Light.git
cd EZVibe-Light
npm install           # 3 seconds, zero compilation
npm run dev           # watch mode
npm run build         # production build (43 KB)
npm test              # 43 tests, 5 suites
```

| Suite | Tests | Covers |
|---|---|---|
| `store.test.ts` | 16 | CRUD, persistence, cascading deletes |
| `tmux.test.ts` | 14 | Command construction, session lifecycle |
| `commands.test.ts` | 6 | Registration, guards, key resolution |
| `wizard.test.tsx` | 3 | Step progression, completion, cancellation |
| `e2e.test.tsx` | 4 | Full app rendering, shortcuts, overlays |

## License

MIT

---

<p align="center">
  <b>Built with Claude Code.</b> The tool that manages Claude Code — built entirely by Claude Code.
</p>
