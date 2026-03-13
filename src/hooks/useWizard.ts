import { useState, useCallback } from 'react';

export interface WizardStep {
  type: 'input' | 'project-picker' | 'confirm';
  prompt: string;
  placeholder?: string;
  /** Key to store the result under */
  key: string;
}

export interface WizardConfig {
  steps: WizardStep[];
  onComplete: (results: Record<string, string>) => void;
}

interface WizardState {
  config: WizardConfig;
  currentStep: number;
  results: Record<string, string>;
}

export function useWizard() {
  const [state, setState] = useState<WizardState | null>(null);

  const start = useCallback((config: WizardConfig) => {
    setState({ config, currentStep: 0, results: {} });
  }, []);

  const submitStep = useCallback((value: string) => {
    setState(prev => {
      if (!prev) return null;

      const step = prev.config.steps[prev.currentStep];
      const results = { ...prev.results, [step.key]: value };
      const nextStep = prev.currentStep + 1;

      if (nextStep >= prev.config.steps.length) {
        // All steps done — call onComplete and close
        prev.config.onComplete(results);
        return null;
      }

      return { ...prev, currentStep: nextStep, results };
    });
  }, []);

  const cancel = useCallback(() => {
    setState(null);
  }, []);

  const currentStep = state
    ? state.config.steps[state.currentStep]
    : null;

  return {
    active: state !== null,
    currentStep,
    start,
    submitStep,
    cancel,
  };
}
