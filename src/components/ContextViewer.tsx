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
      {/* Tab bar */}
      <Box>
        <TabLabel label="CLAUDE.md" shortcut="1" active={activeTab === 'claudemd'} />
        <Text> </Text>
        <TabLabel label="Memory" shortcut="2" active={activeTab === 'memory'} />
        <Text> </Text>
        <TabLabel label="Plans" shortcut="3" active={activeTab === 'plans'} />
      </Box>

      <Box marginTop={1} flexDirection="column">
        {activeTab === 'claudemd' && <ClaudeMdView content={claudeMd} />}
        {activeTab === 'memory' && <MemoryView files={memoryFiles} />}
        {activeTab === 'plans' && <PlansView files={planFiles} />}
      </Box>
    </Box>
  );
}

function TabLabel({ label, shortcut, active }: { label: string; shortcut: string; active: boolean }) {
  return (
    <Text inverse={active} bold={active}>
      [{shortcut}] {label}
    </Text>
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
