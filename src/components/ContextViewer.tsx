import React from 'react';
import { Box, Text } from 'ink';
import type { ContextTab } from '../types.js';
import type { MemoryFile, PlanFile } from '../lib/claude-data.js';

interface Props {
  activeTab: ContextTab;
  claudeMd: string | null;
  memoryFiles: MemoryFile[];
  planFiles: PlanFile[];
  projectPath: string | null;
}

export function ContextViewer({ activeTab, claudeMd, memoryFiles, planFiles, projectPath }: Props) {
  if (!projectPath) {
    return (
      <Box flexDirection="column" paddingX={1}>
        <Text dimColor>No project path set for this idea.</Text>
        <Text dimColor>Press [p] to set a project path.</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box>
        <Text inverse={activeTab === 'claudemd'} bold={activeTab === 'claudemd'}>[1] CLAUDE.md</Text>
        <Text> </Text>
        <Text inverse={activeTab === 'memory'} bold={activeTab === 'memory'}>[2] Memory</Text>
        <Text> </Text>
        <Text inverse={activeTab === 'plans'} bold={activeTab === 'plans'}>[3] Plans</Text>
      </Box>

      <Box marginTop={1} flexDirection="column">
        {activeTab === 'claudemd' && <ClaudeMdView content={claudeMd} />}
        {activeTab === 'memory' && <MemoryView files={memoryFiles} />}
        {activeTab === 'plans' && <PlansView files={planFiles} />}
      </Box>
    </Box>
  );
}

function ClaudeMdView({ content }: { content: string | null }) {
  if (!content) {
    return <Text dimColor>No CLAUDE.md found.</Text>;
  }
  const allLines = content.split('\n');
  const lines = allLines.slice(0, 20);
  return (
    <Box flexDirection="column">
      {lines.map((line, i) => (
        <Text key={i}>{line}</Text>
      ))}
      {allLines.length > 20 && (
        <Text dimColor>... ({allLines.length - 20} more lines)</Text>
      )}
    </Box>
  );
}

function MemoryView({ files }: { files: MemoryFile[] }) {
  if (files.length === 0) {
    return <Text dimColor>No memory files found.</Text>;
  }
  return (
    <Box flexDirection="column">
      {files.map(file => (
        <Box key={file.name} flexDirection="column" marginBottom={1}>
          <Text bold color="cyan">{file.name}</Text>
          <Text>{file.content.slice(0, 200)}{file.content.length > 200 ? '...' : ''}</Text>
        </Box>
      ))}
    </Box>
  );
}

function PlansView({ files }: { files: PlanFile[] }) {
  if (files.length === 0) {
    return <Text dimColor>No plan files found.</Text>;
  }
  return (
    <Box flexDirection="column">
      {files.map(file => (
        <Box key={file.filename} marginBottom={1}>
          <Text>
            <Text bold color="yellow">{file.title}</Text>
            <Text dimColor> ({file.filename})</Text>
          </Text>
        </Box>
      ))}
    </Box>
  );
}
