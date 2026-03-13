import React from 'react';
import { Box, Text } from 'ink';

interface Props {
  onClose: () => void;
}

const SHORTCUTS = [
  ['j / Down', 'Move down'],
  ['k / Up', 'Move up'],
  ['n', 'Create new idea'],
  ['Enter', 'Attach/create session'],
  ['s / S', 'Cycle stage forward/back'],
  ['e', 'Edit idea'],
  ['d', 'Delete idea'],
  ['p', 'Set project path'],
  ['x', 'Kill session'],
  ['a', 'Add note'],
  ['Tab', 'Switch panel (detail/context/notes)'],
  ['1/2/3', 'Context tab (CLAUDE.md/Memory/Plans)'],
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
        {SHORTCUTS.map(([key, desc]) => (
          <Box key={key}>
            <Box width={20}>
              <Text bold>{key}</Text>
            </Box>
            <Text>{desc}</Text>
          </Box>
        ))}
      </Box>
      <Box marginTop={1}>
        <Text dimColor>Press any key to close</Text>
      </Box>
    </Box>
  );
}
