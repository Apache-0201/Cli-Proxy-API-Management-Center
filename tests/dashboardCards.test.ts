import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDashboardModelGroups,
  getAvailableModelsAnchorPath,
  resolveDashboardTutorialLink,
} from '../src/pages/dashboardCards.ts';

test('仪表盘模型卡片应按分类聚合并保留组内模型', () => {
  const groups = buildDashboardModelGroups([
    { name: 'claude-sonnet-4-6' },
    { name: 'gpt-5.4' },
    { name: 'gpt-5.3-codex' },
  ]);

  assert.deepEqual(
    groups.map((group) => group.label),
    ['GPT', 'Claude']
  );
  assert.deepEqual(
    groups[0]?.items.map((item) => item.name),
    ['gpt-5.3-codex', 'gpt-5.4']
  );
});

test('教程卡片在链接为空时应禁用点击', () => {
  assert.deepEqual(resolveDashboardTutorialLink(''), {
    href: null,
    disabled: true,
  });
});

test('仪表盘应提供跳转到认证文件模型卡片的锚点路径', () => {
  assert.equal(getAvailableModelsAnchorPath(), '/auth-files?anchor=available-models');
});
