export type SelectOptionVisualState = 'idle' | 'highlighted' | 'active' | 'activeHighlighted';

interface SelectOptionVisualStateInput {
  active: boolean;
  highlighted: boolean;
}

export function resolveSelectOptionVisualState({
  active,
  highlighted,
}: SelectOptionVisualStateInput): SelectOptionVisualState {
  if (active && highlighted) {
    return 'activeHighlighted';
  }

  if (active) {
    return 'active';
  }

  if (highlighted) {
    return 'highlighted';
  }

  return 'idle';
}
