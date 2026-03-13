import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';

interface Props {
  prompt: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
  placeholder?: string;
}

export function InputPrompt({ prompt, onSubmit, onCancel, placeholder }: Props) {
  const [value, setValue] = useState('');

  useInput((_input, key) => {
    if (key.escape) {
      onCancel();
    }
  });

  return (
    <Box
      borderStyle="round"
      borderColor="cyan"
      flexDirection="column"
      paddingX={1}
    >
      <Text bold color="cyan">{prompt}</Text>
      <Box>
        <Text color="cyan">{`> `}</Text>
        <TextInput
          value={value}
          onChange={setValue}
          onSubmit={(val) => {
            if (val.trim()) {
              onSubmit(val.trim());
            }
          }}
          placeholder={placeholder}
        />
      </Box>
      <Text dimColor>Enter to confirm, Esc to cancel</Text>
    </Box>
  );
}
