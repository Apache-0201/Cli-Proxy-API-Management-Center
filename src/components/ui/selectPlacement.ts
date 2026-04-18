export const SELECT_DROPDOWN_OFFSET = 6;
const VIEWPORT_GAP = 8;
const DEFAULT_MAX_DROPDOWN_HEIGHT = 240;
const DEFAULT_OPTION_HEIGHT = 36;
const DEFAULT_OPTION_GAP = 4;
const DEFAULT_DROPDOWN_VERTICAL_PADDING = 12;

export interface SelectDropdownPlacementInput {
  triggerTop: number;
  triggerBottom: number;
  viewportHeight: number;
  optionCount: number;
  maxDropdownHeight?: number;
  optionHeight?: number;
  optionGap?: number;
  dropdownVerticalPadding?: number;
}

export interface SelectDropdownPlacement {
  direction: 'top' | 'bottom';
  maxHeight: number;
}

export function resolveSelectDropdownPlacement({
  triggerTop,
  triggerBottom,
  viewportHeight,
  optionCount,
  maxDropdownHeight = DEFAULT_MAX_DROPDOWN_HEIGHT,
  optionHeight = DEFAULT_OPTION_HEIGHT,
  optionGap = DEFAULT_OPTION_GAP,
  dropdownVerticalPadding = DEFAULT_DROPDOWN_VERTICAL_PADDING,
}: SelectDropdownPlacementInput): SelectDropdownPlacement {
  const resolvedOptionCount = Math.max(optionCount, 0);
  const estimatedContentHeight =
    resolvedOptionCount * optionHeight +
    Math.max(resolvedOptionCount - 1, 0) * optionGap +
    dropdownVerticalPadding;
  const desiredHeight = Math.min(maxDropdownHeight, estimatedContentHeight);
  const spaceBelow = Math.max(
    viewportHeight - triggerBottom - SELECT_DROPDOWN_OFFSET - VIEWPORT_GAP,
    0
  );
  const spaceAbove = Math.max(triggerTop - SELECT_DROPDOWN_OFFSET - VIEWPORT_GAP, 0);

  if (spaceBelow >= desiredHeight || spaceBelow >= spaceAbove) {
    return {
      direction: 'bottom',
      maxHeight: Math.min(maxDropdownHeight, spaceBelow),
    };
  }

  return {
    direction: 'top',
    maxHeight: Math.min(maxDropdownHeight, spaceAbove),
  };
}
