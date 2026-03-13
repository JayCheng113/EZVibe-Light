import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { discoverProjects, type DiscoveredProject } from '../lib/claude-data.js';

interface Props {
  onSelect: (path: string) => void;
  onCancel: () => void;
}

export function ProjectPicker({ onSelect, onCancel }: Props) {
  const [projects] = useState<DiscoveredProject[]>(() => discoverProjects());
  const [selectedIdx, setSelectedIdx] = useState(0);

  useInput((input, key) => {
    if (key.escape) {
      onCancel();
      return;
    }
    if (input === 'j' || key.downArrow) {
      setSelectedIdx(i => Math.min(i + 1, projects.length - 1));
    }
    if (input === 'k' || key.upArrow) {
      setSelectedIdx(i => Math.max(i - 1, 0));
    }
    if (key.return && projects.length > 0) {
      onSelect(projects[selectedIdx].path);
    }
  });

  if (projects.length === 0) {
    return (
      <Box borderStyle="round" borderColor="cyan" flexDirection="column" paddingX={1}>
        <Text bold color="cyan">Select Project</Text>
        <Text dimColor>No Claude projects found in ~/.claude/projects/</Text>
        <Text dimColor>Press Esc to cancel</Text>
      </Box>
    );
  }

  return (
    <Box borderStyle="round" borderColor="cyan" flexDirection="column" paddingX={1}>
      <Text bold color="cyan">Select Project (j/k to navigate, Enter to select)</Text>
      {projects.slice(0, 15).map((proj, i) => (
        <Box key={proj.path}>
          <Text inverse={i === selectedIdx} bold={i === selectedIdx}>
            {i === selectedIdx ? '> ' : '  '}
            {proj.name}
            <Text dimColor> {proj.path}</Text>
            {proj.hasClaudeMd && <Text color="green"> [CLAUDE.md]</Text>}
          </Text>
        </Box>
      ))}
      <Text dimColor>Esc to cancel</Text>
    </Box>
  );
}
