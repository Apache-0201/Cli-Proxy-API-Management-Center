import { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { IconSatellite } from '@/components/ui/icons';
import openaiDarkIcon from '@/assets/icons/openai-dark.svg';
import openaiLightIcon from '@/assets/icons/openai-light.svg';
import claudeIcon from '@/assets/icons/claude.svg';
import geminiIcon from '@/assets/icons/gemini.svg';
import qwenIcon from '@/assets/icons/qwen.svg';
import kimiDarkIcon from '@/assets/icons/kimi-dark.svg';
import kimiLightIcon from '@/assets/icons/kimi-light.svg';
import glmIcon from '@/assets/icons/glm.svg';
import grokIcon from '@/assets/icons/grok.svg';
import deepseekIcon from '@/assets/icons/deepseek.svg';
import minimaxIcon from '@/assets/icons/minimax.svg';
import { useAuthStore, useConfigStore, useModelsStore, useThemeStore } from '@/stores';
import { apiKeysApi } from '@/services/api';
import { buildDashboardModelGroups, normalizeApiKeyList } from '@/pages/dashboardCards';
import styles from './AvailableModelsCard.module.scss';

const MODEL_GROUP_ICONS: Record<string, string | { light: string; dark: string }> = {
  gpt: { light: openaiLightIcon, dark: openaiDarkIcon },
  claude: claudeIcon,
  gemini: geminiIcon,
  qwen: qwenIcon,
  kimi: { light: kimiDarkIcon, dark: kimiLightIcon },
  glm: glmIcon,
  grok: grokIcon,
  deepseek: deepseekIcon,
  minimax: minimaxIcon,
};

export type AvailableModelsCardProps = {
  sectionId?: string;
};

export function AvailableModelsCard(props: AvailableModelsCardProps) {
  const { sectionId } = props;
  const { t } = useTranslation();
  const connectionStatus = useAuthStore((state) => state.connectionStatus);
  const apiBase = useAuthStore((state) => state.apiBase);
  const config = useConfigStore((state) => state.config);
  const resolvedTheme = useThemeStore((state) => state.resolvedTheme);
  const models = useModelsStore((state) => state.models);
  const modelsLoading = useModelsStore((state) => state.loading);
  const modelsError = useModelsStore((state) => state.error);
  const fetchModelsFromStore = useModelsStore((state) => state.fetchModels);
  const apiKeysCache = useRef<string[]>([]);

  useEffect(() => {
    apiKeysCache.current = [];
  }, [apiBase, config?.apiKeys]);

  const resolveApiKeysForModels = useCallback(async () => {
    if (apiKeysCache.current.length) {
      return apiKeysCache.current;
    }

    const configKeys = normalizeApiKeyList(config?.apiKeys);
    if (configKeys.length) {
      apiKeysCache.current = configKeys;
      return configKeys;
    }

    try {
      const list = await apiKeysApi.list();
      const normalized = normalizeApiKeyList(list);
      if (normalized.length) {
        apiKeysCache.current = normalized;
      }
      return normalized;
    } catch {
      return [];
    }
  }, [config?.apiKeys]);

  const fetchModels = useCallback(
    async (forceRefresh = false) => {
      if (connectionStatus !== 'connected' || !apiBase) {
        return;
      }

      try {
        const apiKeys = await resolveApiKeysForModels();
        const primaryKey = apiKeys[0];
        await fetchModelsFromStore(apiBase, primaryKey, forceRefresh);
      } catch {
        // Keep the card resilient when model fetching fails
      }
    },
    [apiBase, connectionStatus, fetchModelsFromStore, resolveApiKeysForModels]
  );

  useEffect(() => {
    if (connectionStatus !== 'connected') return;
    void fetchModels();
  }, [connectionStatus, fetchModels]);

  const modelGroups = buildDashboardModelGroups(models);

  const renderGroupIcon = (groupId: string) => {
    const icon = MODEL_GROUP_ICONS[groupId];
    if (!icon) {
      return (
        <span className={styles.modelGroupFallbackIcon}>
          <IconSatellite size={16} />
        </span>
      );
    }

    const src = typeof icon === 'string' ? icon : resolvedTheme === 'dark' ? icon.dark : icon.light;

    return <img src={src} alt="" aria-hidden="true" className={styles.modelGroupBrandIcon} />;
  };

  return (
    <section id={sectionId} className={styles.modelCard}>
      <div className={styles.header}>
        <div className={styles.titleBlock}>
          <h2 className={styles.title}>{t('dashboard.available_models_card_title')}</h2>
          <p className={styles.subtitle}>{t('dashboard.available_models_card_desc')}</p>
        </div>
        <Button
          variant="secondary"
          className="btn btn-secondary btn-sm"
          onClick={() => void fetchModels(true)}
          disabled={connectionStatus !== 'connected' || modelsLoading}
          loading={modelsLoading}
        >
          {t('common.refresh')}
        </Button>
      </div>

      <div className={styles.modelSummary}>
        <span className={styles.modelSummaryBadge}>
          {t('dashboard.available_models_count', {
            count: models.length,
          })}
        </span>
      </div>

      {modelsLoading && models.length === 0 ? (
        <div className={styles.contentState}>{t('common.loading')}</div>
      ) : modelsError && models.length === 0 ? (
        <div className={`${styles.contentState} ${styles.contentStateError}`}>
          {t('dashboard.available_models_error', {
            message: modelsError,
          })}
        </div>
      ) : modelGroups.length === 0 ? (
        <div className={styles.contentState}>{t('dashboard.available_models_empty')}</div>
      ) : (
        <div className={styles.modelGroupList}>
          {modelGroups.map((group) => (
            <section key={group.id} className={styles.modelGroupCard}>
              <div className={styles.modelGroupHeader}>
                <div className={styles.modelGroupTitleRow}>
                  {renderGroupIcon(group.id)}
                  <span className={styles.modelGroupTitle}>{group.label}</span>
                </div>
                <span className={styles.modelGroupCount}>
                  {t('dashboard.available_models_group_count', {
                    count: group.items.length,
                  })}
                </span>
              </div>
              <div className={styles.modelChipList}>
                {group.items.map((model) => (
                  <span key={`${group.id}-${model.name}`} className={styles.modelChip}>
                    {model.alias || model.name}
                  </span>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}
