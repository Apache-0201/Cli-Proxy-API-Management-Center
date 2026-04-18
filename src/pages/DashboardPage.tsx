import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { IconBookOpen, IconFileText, IconKey, IconSatellite } from '@/components/ui/icons';
import { useAuthStore, useConfigStore, useModelsStore } from '@/stores';
import { apiKeysApi, authFilesApi } from '@/services/api';
import {
  DASHBOARD_TUTORIAL_URL,
  getAvailableModelsAnchorPath,
  normalizeApiKeyList,
  resolveDashboardTutorialLink,
} from './dashboardCards';
import styles from './DashboardPage.module.scss';

interface QuickStat {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  path?: string;
  href?: string | null;
  disabled?: boolean;
  loading?: boolean;
  sublabel?: string;
}

export function DashboardPage() {
  const { t, i18n } = useTranslation();
  const connectionStatus = useAuthStore((state) => state.connectionStatus);
  const serverBuildDate = useAuthStore((state) => state.serverBuildDate);
  const apiBase = useAuthStore((state) => state.apiBase);
  const config = useConfigStore((state) => state.config);
  const fetchModelsFromStore = useModelsStore((state) => state.fetchModels);
  const apiKeysCache = useRef<string[]>([]);

  const [stats, setStats] = useState<{
    apiKeys: number | null;
    authFiles: number | null;
    availableModels: number | null;
  }>({
    apiKeys: null,
    authFiles: null,
    availableModels: null,
  });

  const [loading, setLoading] = useState(true);
  const availableModelsAnchorPath = getAvailableModelsAnchorPath();
  const tutorialLink = resolveDashboardTutorialLink(DASHBOARD_TUTORIAL_URL);

  useEffect(() => {
    apiKeysCache.current = [];
  }, [apiBase, config?.apiKeys]);

  useEffect(() => {
    const fetchAvailableModelsCount = async () => {
      if (connectionStatus !== 'connected' || !apiBase) {
        return null;
      }

      if (!apiKeysCache.current.length) {
        const configKeys = normalizeApiKeyList(config?.apiKeys);
        if (configKeys.length) {
          apiKeysCache.current = configKeys;
        } else {
          const list = await apiKeysApi.list();
          apiKeysCache.current = normalizeApiKeyList(list);
        }
      }

      const models = await fetchModelsFromStore(apiBase, apiKeysCache.current[0], false);
      return models.length;
    };

    const fetchStats = async () => {
      setLoading(true);
      try {
        const [keysRes, filesRes, modelsRes] = await Promise.allSettled([
          apiKeysApi.list(),
          authFilesApi.list(),
          fetchAvailableModelsCount(),
        ]);

        setStats({
          apiKeys: keysRes.status === 'fulfilled' ? keysRes.value.length : null,
          authFiles: filesRes.status === 'fulfilled' ? filesRes.value.files.length : null,
          availableModels:
            modelsRes.status === 'fulfilled' && typeof modelsRes.value === 'number'
              ? modelsRes.value
              : null,
        });
      } finally {
        setLoading(false);
      }
    };

    if (connectionStatus === 'connected') {
      fetchStats();
    } else {
      setLoading(false);
    }
  }, [apiBase, config?.apiKeys, connectionStatus, fetchModelsFromStore]);

  const quickStats: QuickStat[] = [
    {
      label: t('dashboard.management_keys'),
      value: stats.apiKeys ?? '-',
      icon: <IconKey size={24} />,
      path: '/config',
      loading: loading && stats.apiKeys === null,
      sublabel: t('nav.config_management'),
    },
    {
      label: t('nav.auth_files'),
      value: stats.authFiles ?? '-',
      icon: <IconFileText size={24} />,
      path: '/auth-files',
      loading: loading && stats.authFiles === null,
      sublabel: t('dashboard.oauth_credentials'),
    },
    {
      label: t('dashboard.available_models'),
      value: stats.availableModels ?? '-',
      icon: <IconSatellite size={24} />,
      path: availableModelsAnchorPath,
      loading: loading && stats.availableModels === null,
      sublabel: t('dashboard.available_models_desc'),
    },
    {
      label: t('dashboard.tutorial_title', { defaultValue: '使用教程' }),
      value: t('dashboard.tutorial_stat_value', { defaultValue: '查看' }),
      icon: <IconBookOpen size={24} />,
      href: tutorialLink.href,
      disabled: tutorialLink.disabled,
      sublabel: tutorialLink.disabled
        ? t('dashboard.tutorial_pending', { defaultValue: '待配置' })
        : t('dashboard.tutorial_stat_desc', { defaultValue: '打开接入说明' }),
    },
  ];

  const routingStrategyRaw = config?.routingStrategy?.trim() || '';
  const routingStrategyDisplay = !routingStrategyRaw
    ? '-'
    : routingStrategyRaw === 'round-robin'
      ? t('basic_settings.routing_strategy_round_robin')
      : routingStrategyRaw === 'fill-first'
        ? t('basic_settings.routing_strategy_fill_first')
        : routingStrategyRaw;
  const routingStrategyBadgeClass = !routingStrategyRaw
    ? styles.configBadgeUnknown
    : routingStrategyRaw === 'round-robin'
      ? styles.configBadgeRoundRobin
      : routingStrategyRaw === 'fill-first'
        ? styles.configBadgeFillFirst
        : styles.configBadgeUnknown;

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <h1 className={styles.title}>{t('dashboard.title')}</h1>
        <p className={styles.subtitle}>{t('dashboard.subtitle')}</p>
      </div>

      <div className={styles.connectionCard}>
        <div className={styles.connectionStatus}>
          <span
            className={`${styles.statusDot} ${
              connectionStatus === 'connected'
                ? styles.connected
                : connectionStatus === 'connecting'
                  ? styles.connecting
                  : styles.disconnected
            }`}
          />
          <span className={styles.statusText}>
            {t(
              connectionStatus === 'connected'
                ? 'common.connected'
                : connectionStatus === 'connecting'
                  ? 'common.connecting'
                  : 'common.disconnected'
            )}
          </span>
        </div>
        <div className={styles.connectionInfo}>
          <span className={styles.serverUrl}>{apiBase || '-'}</span>
          {serverBuildDate && (
            <span className={styles.buildDate}>
              构建日期 {new Date(serverBuildDate).toLocaleDateString(i18n.language)}
            </span>
          )}
        </div>
      </div>

      <div className={styles.statsGrid}>
        {quickStats.map((stat) => {
          const content = (
            <>
              <div className={styles.statIcon}>{stat.icon}</div>
              <div className={styles.statContent}>
                <span className={styles.statValue}>{stat.loading ? '...' : stat.value}</span>
                <span className={styles.statLabel}>{stat.label}</span>
                {stat.sublabel && <span className={styles.statSublabel}>{stat.sublabel}</span>}
              </div>
            </>
          );

          if (stat.href && !stat.disabled) {
            return (
              <a
                key={stat.label}
                href={stat.href}
                target="_blank"
                rel="noreferrer"
                className={styles.statCard}
              >
                {content}
              </a>
            );
          }

          if (stat.path && !stat.disabled) {
            return (
              <Link key={stat.path} to={stat.path} className={styles.statCard}>
                {content}
              </Link>
            );
          }

          return (
            <div key={stat.label} className={`${styles.statCard} ${styles.statCardDisabled}`}>
              {content}
            </div>
          );
        })}
      </div>

      {config && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('dashboard.current_config')}</h2>
          <div className={styles.configGrid}>
            <div className={styles.configItem}>
              <span className={styles.configLabel}>{t('basic_settings.debug_enable')}</span>
              <span
                className={`${styles.configValue} ${config.debug ? styles.enabled : styles.disabled}`}
              >
                {config.debug ? t('common.yes') : t('common.no')}
              </span>
            </div>
            <div className={styles.configItem}>
              <span className={styles.configLabel}>
                {t('basic_settings.usage_statistics_enable')}
              </span>
              <span
                className={`${styles.configValue} ${config.usageStatisticsEnabled ? styles.enabled : styles.disabled}`}
              >
                {config.usageStatisticsEnabled ? t('common.yes') : t('common.no')}
              </span>
            </div>
            <div className={styles.configItem}>
              <span className={styles.configLabel}>
                {t('basic_settings.logging_to_file_enable')}
              </span>
              <span
                className={`${styles.configValue} ${config.loggingToFile ? styles.enabled : styles.disabled}`}
              >
                {config.loggingToFile ? t('common.yes') : t('common.no')}
              </span>
            </div>
            <div className={styles.configItem}>
              <span className={styles.configLabel}>{t('basic_settings.retry_count_label')}</span>
              <span className={styles.configValue}>{config.requestRetry ?? 0}</span>
            </div>
            <div className={styles.configItem}>
              <span className={styles.configLabel}>{t('basic_settings.ws_auth_enable')}</span>
              <span
                className={`${styles.configValue} ${config.wsAuth ? styles.enabled : styles.disabled}`}
              >
                {config.wsAuth ? t('common.yes') : t('common.no')}
              </span>
            </div>
            <div className={styles.configItem}>
              <span className={styles.configLabel}>{t('dashboard.routing_strategy')}</span>
              <span className={`${styles.configBadge} ${routingStrategyBadgeClass}`}>
                {routingStrategyDisplay}
              </span>
            </div>
            {config.proxyUrl && (
              <div className={`${styles.configItem} ${styles.configItemFull}`}>
                <span className={styles.configLabel}>{t('basic_settings.proxy_url_label')}</span>
                <span className={styles.configValueMono}>{config.proxyUrl}</span>
              </div>
            )}
          </div>
          <Link to="/config" className={styles.viewMoreLink}>
            {t('dashboard.edit_settings')} →
          </Link>
        </div>
      )}
    </div>
  );
}
