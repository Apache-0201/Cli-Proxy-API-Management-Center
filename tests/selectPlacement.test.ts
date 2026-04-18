import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveSelectDropdownPlacement } from '../src/components/ui/selectPlacement.ts';

test('短菜单在下方空间足够容纳实际内容时应向下弹出', () => {
  const placement = resolveSelectDropdownPlacement({
    triggerTop: 420,
    triggerBottom: 460,
    viewportHeight: 640,
    optionCount: 3,
  });

  assert.equal(placement.direction, 'bottom');
});

test('长菜单在下方空间不足且上方空间更大时应向上弹出', () => {
  const placement = resolveSelectDropdownPlacement({
    triggerTop: 420,
    triggerBottom: 460,
    viewportHeight: 640,
    optionCount: 12,
  });

  assert.equal(placement.direction, 'top');
  assert.ok(placement.maxHeight > 0);
});
