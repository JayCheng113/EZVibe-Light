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
    if (projects.length === 0) return;
    if (input === 'j' || key.downArrow) {
      setSelectedIdx(i => Math.min(i + 1, projects.length - 1));
    }
    if (input === 'k' || key.upArrow) {
      setSelectedIdx(i => Math.max(i - 1, 0));
    }
    if (key.return) {
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

  // Show a scrolling window of 15 items centered on selection
  const maxVisible = 15;
  const start = Math.max(0, Math.min(selectedIdx - Math.floor(maxVisible / 2), projects.length - maxVisible));
  const visible = projects.slice(start, start + maxVisible);

  return (
    <Box borderStyle="round" borderColor="cyan" flexDirection="column" paddingX={1}>
      <Text bold color="cyan">Select Project (j/k to navigate, Enter to select)</Text>
      {start > 0 && <Text dimColor>  ↑ {start} more</Text>}
      {visible.map((proj, i) => {
        const idx = start + i;
        return (
          <Box key={proj.path}>
            <Text inverse={idx === selectedIdx} bold={idx === selectedIdx}>
              {idx === selectedIdx ? '> ' : '  '}
              {proj.name}
              <Text dimColor> {proj.path}</Text>
              {proj.hasClaudeMd && <Text color="green"> [CLAUDE.md]</Text>}
            </Text>
          </Box>
        );
      })}
      {start + maxVisible < projects.length && (
        <Text dimColor>  ↓ {projects.length - start - maxVisible} more</Text>
      )}
      <Text dimColor>Esc to cancel</Text>
    </Box>
  );
}
