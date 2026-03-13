import { describe, it, expect, vi } from 'vitest';
import React, { useRef, useEffect } from 'react';
import { render } from 'ink-testing-library';
import { Box, Text } from 'ink';
import { useWizard, type WizardConfig } from '../src/hooks/useWizard.js';

// Wrapper component to test the hook in an Ink context
function WizardHarness({ config, autoSubmit }: { config: WizardConfig; autoSubmit?: string[] }) {
  const wizard = useWizard();
  const started = useRef(false);
  const submitIdx = useRef(0);

  useEffect(() => {
    if (!started.current) {
      started.current = true;
      wizard.start(config);
    }
  }, []);

  useEffect(() => {
    if (autoSubmit && wizard.active && submitIdx.current < autoSubmit.length) {
      const val = autoSubmit[submitIdx.current];
      submitIdx.current++;
      wizard.submitStep(val);
    }
  });

  return (
    <Box flexDirection="column">
      <Text>active:{String(wizard.active)}</Text>
      <Text>step:{wizard.currentStep?.key ?? 'none'}</Text>
      <Text>prompt:{wizard.currentStep?.prompt ?? 'none'}</Text>
    </Box>
  );
}

describe('useWizard', () => {
  it('should start with first step', async () => {
    const onComplete = vi.fn();
    const { lastFrame } = render(
      <WizardHarness config={{
        steps: [{ type: 'input', key: 'name', prompt: 'Name:' }],
        onComplete,
      }} />
    );

    await new Promise(r => setTimeout(r, 50));

    const frame = lastFrame();
    expect(frame).toContain('active:true');
    expect(frame).toContain('step:name');
    expect(frame).toContain('prompt:Name:');
  });

  it('should call onComplete with results after all steps', async () => {
    const onComplete = vi.fn();
    render(
      <WizardHarness
        config={{
          steps: [
            { type: 'input', key: 'name', prompt: 'Name:' },
            { type: 'input', key: 'desc', prompt: 'Desc:' },
          ],
          onComplete,
        }}
        autoSubmit={['My Idea', 'A description']}
      />
    );

    await new Promise(r => setTimeout(r, 100));

    expect(onComplete).toHaveBeenCalledWith({
      name: 'My Idea',
      desc: 'A description',
    });
  });

  it('should deactivate after completion', async () => {
    const onComplete = vi.fn();
    const { lastFrame } = render(
      <WizardHarness
        config={{
          steps: [{ type: 'input', key: 'val', prompt: 'Val:' }],
          onComplete,
        }}
        autoSubmit={['hello']}
      />
    );

    await new Promise(r => setTimeout(r, 100));

    expect(lastFrame()).toContain('active:false');
    expect(lastFrame()).toContain('step:none');
  });
});
