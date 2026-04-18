import { classifyModels, type ModelGroup, type ModelInfo } from '@/utils/models';

export const DASHBOARD_TUTORIAL_URL = 'https://wiki.dxy.net/pages/viewpage.action?pageId=367939510';
export const AUTH_FILES_AVAILABLE_MODELS_ANCHOR = '/auth-files?anchor=available-models';

export type DashboardTutorialLink = {
  href: string | null;
  disabled: boolean;
};

export function buildDashboardModelGroups(models: ModelInfo[]): ModelGroup[] {
  return classifyModels(models).map((group) => ({
    ...group,
    items: [...group.items].sort((left, right) => {
      const leftLabel = (left.alias || left.name).toLowerCase();
      const rightLabel = (right.alias || right.name).toLowerCase();
      return leftLabel.localeCompare(rightLabel);
    }),
  }));
}

export function normalizeApiKeyList(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const keys: string[] = [];

  input.forEach((item) => {
    const record =
      item !== null && typeof item === 'object' && !Array.isArray(item)
        ? (item as Record<string, unknown>)
        : null;
    const value =
      typeof item === 'string'
        ? item
        : record
          ? (record['api-key'] ?? record['apiKey'] ?? record.key ?? record.Key)
          : '';
    const trimmed = String(value ?? '').trim();
    if (!trimmed || seen.has(trimmed)) return;
    seen.add(trimmed);
    keys.push(trimmed);
  });

  return keys;
}

export function resolveDashboardTutorialLink(url: string): DashboardTutorialLink {
  const normalized = url.trim();
  return {
    href: normalized || null,
    disabled: !normalized,
  };
}

export function getAvailableModelsAnchorPath(): string {
  return AUTH_FILES_AVAILABLE_MODELS_ANCHOR;
}
