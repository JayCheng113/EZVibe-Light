import React from 'react';
import { Box, Text } from 'ink';

interface Props {
  onClose: () => void;
}

const SHORTCUTS = [
  ['', '── Session ──'],
  ['Enter', 'Attach/create Claude Code session'],
  ['Ctrl-b d', 'Detach from session (back to EZVibe)'],
  ['x', 'Stop session'],
  ['', '── Ideas ──'],
  ['j / Down', 'Move down'],
  ['k / Up', 'Move up'],
  ['n', 'Create new idea'],
  ['s / S', 'Cycle stage forward/back'],
  ['e', 'Edit idea'],
  ['d', 'Delete idea'],
  ['p', 'Set project path'],
  ['a', 'Add note'],
  ['', '── Panels ──'],
  ['Tab', 'Switch panel (detail/context/notes)'],
  ['1/2/3', 'Context tab (CLAUDE.md/Memory/Plans)'],
  ['', '── App ──'],
  ['?', 'Toggle help'],
  ['q', 'Quit'],
] as const;

export function HelpOverlay({ onClose }: Props) {
  return (
    <Box
      borderStyle="round"
      borderColor="yellow"
      flexDirection="column"
      paddingX={2}
      paddingY={1}
    >
      <Text bold color="yellow">Keyboard Shortcuts</Text>
      <Box marginTop={1} flexDirection="column">
        {SHORTCUTS.map(([key, desc], i) =>
          key === '' ? (
            <Box key={`section-${i}`} marginTop={i === 0 ? 0 : 1}>
              <Text color="cyan" bold>{desc}</Text>
            </Box>
          ) : (
            <Box key={key}>
              <Box width={20}>
                <Text bold>{key}</Text>
              </Box>
              <Text>{desc}</Text>
            </Box>
          )
        )}
      </Box>
      <Box marginTop={1}>
        <Text dimColor>Press any key to close</Text>
      </Box>
    </Box>
  );
}
