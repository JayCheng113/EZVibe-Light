import React, { useState, useMemo, useCallback } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { Store } from './lib/store.js';
import { CommandRegistry } from './lib/commands.js';
import { useIdeas } from './hooks/useIdeas.js';
import { useSessions } from './hooks/useSessions.js';
import { useClaudeContext } from './hooks/useClaudeContext.js';
import { useWizard } from './hooks/useWizard.js';
import { IdeaList } from './components/IdeaList.js';
import { IdeaDetail } from './components/IdeaDetail.js';
import { ContextViewer } from './components/ContextViewer.js';
import { StatusBar } from './components/StatusBar.js';
import { InputPrompt } from './components/InputPrompt.js';
import { HelpOverlay } from './components/HelpOverlay.js';
import { ProjectPicker } from './components/ProjectPicker.js';
import type { RightPanel, ContextTab } from './types.js';

// -- Overlay (only for help and confirm — wizard handles the rest) --

type Overlay =
  | null
  | { type: 'help' }
  | { type: 'confirm'; prompt: string; onConfirm: () => void };

// -- App --

export function App({ version }: { version: string }) {
  const store = useMemo(() => new Store(), []);
  const { exit } = useApp();

  const { ideas, createIdea, updateIdea, deleteIdea, cycleStage } = useIdeas(store);
  const { sessions, startSession, attachSession, killSession, getActiveSession, refresh } = useSessions(store);
  const wizard = useWizard();

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [rightPanel, setRightPanel] = useState<RightPanel>('detail');
  const [contextTab, setContextTab] = useState<ContextTab>('claudemd');
  const [overlay, setOverlay] = useState<Overlay>(null);

  const selectedIdea = ideas[selectedIndex] ?? undefined;
  const activeSession = selectedIdea ? getActiveSession(selectedIdea.id) : undefined;
  const notes = selectedIdea ? store.getNotes(selectedIdea.id) : [];
  const activeSessionCount = sessions.filter(s => s.status === 'active').length;

  const claudeContext = useClaudeContext(selectedIdea?.projectPath ?? null, contextTab);

  // -- Command registry (stable across renders via useMemo) --

  const commands = useMemo(() => {
    const reg = new CommandRegistry();

    // Navigation
    reg.register({
      name: 'move-down', key: 'j', description: 'Move down',
      execute: () => setSelectedIndex(i => Math.min(i + 1, ideas.length - 1)),
    });
    reg.register({
      name: 'move-down-arrow', key: 'down', description: 'Move down',
      execute: () => setSelectedIndex(i => Math.min(i + 1, ideas.length - 1)),
    });
    reg.register({
      name: 'move-up', key: 'k', description: 'Move up',
      execute: () => setSelectedIndex(i => Math.max(i - 1, 0)),
    });
    reg.register({
      name: 'move-up-arrow', key: 'up', description: 'Move up',
      execute: () => setSelectedIndex(i => Math.max(i - 1, 0)),
    });

    // App
    reg.register({
      name: 'quit', key: 'q', description: 'Quit',
      execute: () => exit(),
    });
    reg.register({
      name: 'help', key: '?', description: 'Toggle help',
      execute: () => setOverlay({ type: 'help' }),
    });
    reg.register({
      name: 'switch-panel', key: 'tab', description: 'Switch panel',
      execute: () => setRightPanel(p => {
        const panels: RightPanel[] = ['detail', 'context', 'notes'];
        return panels[(panels.indexOf(p) + 1) % panels.length];
      }),
    });

    // Context tabs
    reg.register({
      name: 'context-claudemd', key: '1', description: 'CLAUDE.md tab',
      execute: () => setContextTab('claudemd'),
    });
    reg.register({
      name: 'context-memory', key: '2', description: 'Memory tab',
      execute: () => setContextTab('memory'),
    });
    reg.register({
      name: 'context-plans', key: '3', description: 'Plans tab',
      execute: () => setContextTab('plans'),
    });

    // Idea actions
    reg.register({
      name: 'create-idea', key: 'n', description: 'Create new idea',
      execute: () => {
        wizard.start({
          steps: [
            { type: 'input', key: 'name', prompt: 'New idea name:', placeholder: 'e.g. Auth refactor' },
            { type: 'input', key: 'description', prompt: 'Description (optional):', placeholder: 'Brief description...' },
            { type: 'project-picker', key: 'projectPath', prompt: 'Select project' },
          ],
          onComplete: (r) => {
            createIdea(r.name, r.description, r.projectPath);
            setSelectedIndex(ideas.length);
          },
        });
      },
    });

    reg.register({
      name: 'attach-session', key: 'enter', description: 'Attach/create session',
      canExecute: (ctx) => !!ctx.selectedIdea,
      execute: (ctx) => {
        if (!ctx.selectedIdea) return;
        const existing = getActiveSession(ctx.selectedIdea.id);
        if (existing) {
          attachSession(existing.tmuxSession);
        } else {
          const cwd = ctx.selectedIdea.projectPath || process.cwd();
          const session = startSession(ctx.selectedIdea.id, cwd);
          if (session) attachSession(session.tmuxSession);
        }
        // Refresh session state immediately after returning from tmux
        refresh();
      },
    });

    reg.register({
      name: 'cycle-stage', key: 's', description: 'Cycle stage forward',
      canExecute: (ctx) => !!ctx.selectedIdea,
      execute: (ctx) => { if (ctx.selectedIdea) cycleStage(ctx.selectedIdea.id); },
    });
    reg.register({
      name: 'cycle-stage-back', key: 'S', description: 'Cycle stage backward',
      canExecute: (ctx) => !!ctx.selectedIdea,
      execute: (ctx) => { if (ctx.selectedIdea) cycleStage(ctx.selectedIdea.id, true); },
    });

    reg.register({
      name: 'edit-idea', key: 'e', description: 'Edit idea',
      canExecute: (ctx) => !!ctx.selectedIdea,
      execute: (ctx) => {
        if (!ctx.selectedIdea) return;
        const idea = ctx.selectedIdea;
        wizard.start({
          steps: [
            { type: 'input', key: 'name', prompt: `Edit name (current: ${idea.name}):`, placeholder: idea.name },
          ],
          onComplete: (r) => updateIdea(idea.id, { name: r.name }),
        });
      },
    });

    reg.register({
      name: 'delete-idea', key: 'd', description: 'Delete idea',
      canExecute: (ctx) => !!ctx.selectedIdea,
      execute: (ctx) => {
        if (!ctx.selectedIdea) return;
        const idea = ctx.selectedIdea;
        setOverlay({
          type: 'confirm',
          prompt: `Delete "${idea.name}"? (y/N)`,
          onConfirm: () => {
            deleteIdea(idea.id);
            setSelectedIndex(i => Math.max(0, i - 1));
          },
        });
      },
    });

    reg.register({
      name: 'set-project', key: 'p', description: 'Set project path',
      canExecute: (ctx) => !!ctx.selectedIdea,
      execute: (ctx) => {
        if (!ctx.selectedIdea) return;
        const idea = ctx.selectedIdea;
        wizard.start({
          steps: [
            { type: 'project-picker', key: 'projectPath', prompt: 'Select project' },
          ],
          onComplete: (r) => updateIdea(idea.id, { projectPath: r.projectPath }),
        });
      },
    });

    reg.register({
      name: 'stop-session', key: 'x', description: 'Stop session',
      canExecute: (ctx) => {
        if (!ctx.selectedIdea) return false;
        return sessions.some(s => s.ideaId === ctx.selectedIdea!.id && s.status === 'active');
      },
      execute: (ctx) => {
        if (!ctx.selectedIdea) return;
        const idea = ctx.selectedIdea;
        const session = sessions.find(s => s.ideaId === idea.id && s.status === 'active');
        if (!session) return;
        setOverlay({
          type: 'confirm',
          prompt: `Stop session for "${idea.name}"? (y/N)`,
          onConfirm: () => killSession(session.id),
        });
      },
    });

    reg.register({
      name: 'add-note', key: 'a', description: 'Add note',
      canExecute: (ctx) => !!ctx.selectedIdea,
      execute: (ctx) => {
        if (!ctx.selectedIdea) return;
        const idea = ctx.selectedIdea;
        wizard.start({
          steps: [
            { type: 'input', key: 'content', prompt: 'Add note:', placeholder: 'Type your note...' },
          ],
          onComplete: (r) => store.createNote(idea.id, r.content),
        });
      },
    });

    return reg;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ideas.length, selectedIdea?.id, activeSession?.id, sessions]);

  // -- Input handling --

  useInput((input, key) => {
    // Overlay intercepts all input
    if (overlay) {
      if (overlay.type === 'help') {
        setOverlay(null);
      } else if (overlay.type === 'confirm') {
        if (input === 'y' || input === 'Y') {
          overlay.onConfirm();
        }
        setOverlay(null);
      }
      return;
    }

    // Delegate to command registry
    const ctx = { selectedIdea, activeSession, ideaCount: ideas.length };
    commands.handle(input, key, ctx);
  }, { isActive: !wizard.active });

  // -- Render --

  if (overlay?.type === 'help') {
    return <HelpOverlay onClose={() => setOverlay(null)} />;
  }

  return (
    <Box flexDirection="column" height={process.stdout.rows || 24}>
      {/* Header */}
      <Box paddingX={1}>
        <Text bold color="cyan">EZVibe Light</Text>
        <Text dimColor> v{version}</Text>
      </Box>

      {/* Main content */}
      <Box flexGrow={1}>
        {/* Left panel */}
        <Box width="40%" borderStyle="single" borderRight>
          <IdeaList ideas={ideas} selectedIndex={selectedIndex} sessions={sessions} />
        </Box>

        {/* Right panel */}
        <Box width="60%" flexDirection="column">
          <Box paddingX={1}>
            <PanelTab label="Detail" active={rightPanel === 'detail'} />
            <Text> </Text>
            <PanelTab label="Context" active={rightPanel === 'context'} />
            <Text> </Text>
            <PanelTab label="Notes" active={rightPanel === 'notes'} />
          </Box>
          <Box flexGrow={1}>
            {rightPanel === 'detail' && (
              <IdeaDetail idea={selectedIdea} activeSession={activeSession} notes={notes} />
            )}
            {rightPanel === 'context' && (
              <ContextViewer
                activeTab={contextTab}
                claudeMd={claudeContext.claudeMd}
                memoryFiles={claudeContext.memoryFiles}
                planFiles={claudeContext.planFiles}
                projectPath={selectedIdea?.projectPath ?? null}
              />
            )}
            {rightPanel === 'notes' && <NotesPanel notes={notes} />}
          </Box>
        </Box>
      </Box>

      {/* Status bar */}
      <StatusBar rightPanel={rightPanel} activeSessionCount={activeSessionCount} ideaCount={ideas.length} />

      {/* Wizard overlay */}
      {wizard.active && wizard.currentStep?.type === 'input' && (
        <InputPrompt
          prompt={wizard.currentStep.prompt}
          onSubmit={wizard.submitStep}
          onCancel={wizard.cancel}
          placeholder={wizard.currentStep.placeholder}
        />
      )}
      {wizard.active && wizard.currentStep?.type === 'project-picker' && (
        <ProjectPicker onSelect={wizard.submitStep} onCancel={wizard.cancel} />
      )}

      {/* Confirm overlay */}
      {overlay?.type === 'confirm' && (
        <Box borderStyle="round" borderColor="red" paddingX={1}>
          <Text bold color="red">{overlay.prompt}</Text>
        </Box>
      )}
    </Box>
  );
}

function PanelTab({ label, active }: { label: string; active: boolean }) {
  return <Text inverse={active} bold={active}>{` ${label} `}</Text>;
}

function NotesPanel({ notes }: { notes: import('./types.js').Note[] }) {
  if (notes.length === 0) {
    return (
      <Box flexDirection="column" paddingX={1}>
        <Text dimColor>No notes yet. Press [a] to add one.</Text>
      </Box>
    );
  }
  return (
    <Box flexDirection="column" paddingX={1}>
      {notes.map(note => (
        <Box key={note.id} flexDirection="column" marginBottom={1}>
          <Text dimColor>{new Date(note.createdAt).toLocaleString()}</Text>
          <Text>{note.content}</Text>
        </Box>
      ))}
    </Box>
  );
}
