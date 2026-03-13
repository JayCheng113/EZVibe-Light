import React from 'react';
import { Box, Text } from 'ink';
import type { RightPanel } from '../types.js';

interface Props {
  rightPanel: RightPanel;
  activeSessionCount: number;
  ideaCount: number;
}

export function StatusBar({ rightPanel, activeSessionCount, ideaCount }: Props) {
  return (
    <Box borderStyle="single" borderTop borderBottom={false} borderLeft={false} borderRight={false}>
      <Box flexGrow={1}>
        <Text dimColor>
          <Text bold>[n]</Text>ew{' '}
          <Text bold>[Enter]</Text>attach{' '}
          <Text bold>[s]</Text>tage{' '}
          <Text bold>[e]</Text>dit{' '}
          <Text bold>[d]</Text>elete{' '}
          <Text bold>[x]</Text>stop{' '}
          <Text bold>[Tab]</Text>panel{' '}
          <Text bold>[a]</Text>note{' '}
          <Text bold>[?]</Text>help{' '}
          <Text bold>[q]</Text>uit
        </Text>
      </Box>
      <Box>
        <Text dimColor>
          {ideaCount} ideas | {activeSessionCount} active
        </Text>
      </Box>
    </Box>
  );
}
