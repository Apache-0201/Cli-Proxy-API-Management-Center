import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveSelectOptionVisualState } from '../src/components/ui/selectOptionState.ts';

test('未选中且未高亮的选项应保持默认态', () => {
  assert.equal(resolveSelectOptionVisualState({ active: false, highlighted: false }), 'idle');
});

test('未选中但高亮的选项应进入 hover 态', () => {
  assert.equal(resolveSelectOptionVisualState({ active: false, highlighted: true }), 'highlighted');
});

test('已选中但未高亮的选项应保持选中态', () => {
  assert.equal(resolveSelectOptionVisualState({ active: true, highlighted: false }), 'active');
});

test('已选中且高亮的选项应进入独立的选中 hover 态', () => {
  assert.equal(resolveSelectOptionVisualState({ active: true, highlighted: true }), 'activeHighlighted');
});
