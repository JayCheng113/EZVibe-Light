import React from 'react';
import { Box, Text } from 'ink';
import type { Idea, Session, Note } from '../types.js';
import { STAGE_ICONS, STAGE_COLORS } from '../constants.js';

interface Props {
  idea: Idea | undefined;
  activeSession: Session | undefined;
  notes: Note[];
}

export function IdeaDetail({ idea, activeSession, notes }: Props) {
  if (!idea) {
    return (
      <Box flexDirection="column" paddingX={1}>
        <Text dimColor>Select an idea to view details.</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingX={1}>
      <Text bold color={STAGE_COLORS[idea.stage]}>
        {STAGE_ICONS[idea.stage]} {idea.name}
      </Text>

      {idea.description && (
        <Box marginTop={1}>
          <Text>{idea.description}</Text>
        </Box>
      )}

      <Box marginTop={1} flexDirection="column">
        <Text dimColor>Stage: <Text color={STAGE_COLORS[idea.stage]}>{idea.stage}</Text></Text>
        {idea.projectPath && (
          <Text dimColor>Path: <Text>{idea.projectPath}</Text></Text>
        )}
        <Text dimColor>Created: <Text>{new Date(idea.createdAt).toLocaleDateString()}</Text></Text>
      </Box>

      <Box marginTop={1}>
        <Text dimColor>Session: </Text>
        {activeSession ? (
          <Text color="green">● running ({activeSession.tmuxSession})</Text>
        ) : (
          <Text dimColor>○ no session - press Enter to start</Text>
        )}
      </Box>

      {notes.length > 0 && (
        <Box marginTop={1} flexDirection="column">
          <Text dimColor underline>Notes ({notes.length})</Text>
          {notes.slice(0, 3).map(note => (
            <Text key={note.id} dimColor>
              - {note.content.slice(0, 60)}{note.content.length > 60 ? '...' : ''}
            </Text>
          ))}
        </Box>
      )}
    </Box>
  );
}
