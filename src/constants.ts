import type { Stage } from './types.js';

export const STAGES: readonly Stage[] = ['exploring', 'planning', 'implementing', 'done'] as const;

export const STAGE_LABELS: Record<Stage, string> = {
  exploring: 'Exploring',
  planning: 'Planning',
  implementing: 'Implementing',
  done: 'Done',
};

export const STAGE_ICONS: Record<Stage, string> = {
  exploring: '?',
  planning: '#',
  implementing: '>',
  done: '*',
};

export const STAGE_COLORS: Record<Stage, string> = {
  exploring: 'magenta',
  planning: 'red',
  implementing: 'cyan',
  done: 'green',
};
