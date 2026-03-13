import React from 'react';
import { Box, Text } from 'ink';
import type { Idea, Session } from '../types.js';
import { STAGE_ICONS, STAGE_COLORS, STAGES } from '../constants.js';

interface Props {
  ideas: Idea[];
  selectedIndex: number;
  sessions: Session[];
}

export function IdeaList({ ideas, selectedIndex, sessions }: Props) {
  if (ideas.length === 0) {
    return (
      <Box flexDirection="column" paddingX={1}>
        <Text dimColor>No ideas yet.</Text>
        <Text dimColor>Press [n] to create one.</Text>
      </Box>
    );
  }

  // Group by stage
  const grouped = STAGES.map(stage => ({
    stage,
    ideas: ideas.filter(i => i.stage === stage),
  })).filter(g => g.ideas.length > 0);

  let flatIndex = 0;

  return (
    <Box flexDirection="column" paddingX={1}>
      {grouped.map(group => (
        <Box key={group.stage} flexDirection="column">
          <Text color={STAGE_COLORS[group.stage]} bold>
            {`${STAGE_ICONS[group.stage]} ${group.stage.toUpperCase()}`}
          </Text>
          {group.ideas.map(idea => {
            const idx = flatIndex++;
            const isSelected = idx === selectedIndex;
            const hasActive = sessions.some(
              s => s.ideaId === idea.id && s.status === 'active'
            );

            return (
              <Box key={idea.id} paddingLeft={1}>
                <Text
                  inverse={isSelected}
                  color={isSelected ? undefined : undefined}
                  bold={isSelected}
                >
                  {isSelected ? '> ' : '  '}
                  {idea.name}
                </Text>
                {hasActive && <Text color="green"> ●</Text>}
              </Box>
            );
          })}
        </Box>
      ))}
    </Box>
  );
}
