import { useCallback, useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';
import { ConfigSection } from '@/components/config/ConfigSection';
import type {
  AuthBindingOption,
  ProxyApiKeyEntry,
  PayloadFilterRule,
  PayloadParamValidationErrorCode,
  PayloadRule,
  VisualConfigValidationErrorCode,
  VisualConfigValidationErrors,
  VisualConfigValues,
} from '@/types/visualConfig';
import {
  ApiKeysCardEditor,
  PayloadFilterRulesEditor,
  PayloadRulesEditor,
} from './VisualConfigEditorBlocks';
import { authFilesApi } from '@/services/api/authFiles';
import type { AuthFileItem } from '@/types/authFile';

interface VisualConfigEditorProps {
  values: VisualConfigValues;
  validationErrors?: VisualConfigValidationErrors;
  disabled?: boolean;
  onChange: (values: Partial<VisualConfigValues>) => void;
}

function getValidationMessage(
  t: ReturnType<typeof useTranslation>['t'],
  errorCode?: VisualConfigValidationErrorCode | PayloadParamValidationErrorCode
) {
  if (!errorCode) return undefined;
  return t(`config_management.visual.validation.${errorCode}`);
}

type ToggleRowProps = {
  title: string;
  description?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
};

function ToggleRow({ title, description, checked, disabled, onChange }: ToggleRowProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        flexWrap: 'wrap',
      }}
    >
      <div style={{ minWidth: 220 }}>
        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{title}</div>
        {description && (
          <div style={{ marginTop: 4, fontSize: 13, color: 'var(--text-secondary)' }}>
            {description}
          </div>
        )}
      </div>
      <ToggleSwitch checked={checked} onChange={onChange} disabled={disabled} ariaLabel={title} />
    </div>
  );
}

function SectionGrid({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 16,
      }}
    >
      {children}
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: 'var(--border-color)', margin: '16px 0' }} />;
}

/**
 * 缩短认证文件名用于下拉显示。
 * 例：codex-cc4b9895-lvcq@ipssi-lyon.com-team.json → codex-lvcq
 */
function shortenAuthFileName(name: string): string {
  let s = name.endsWith('.json') ? name.slice(0, -5) : name;
  if (s.endsWith('-team')) s = s.slice(0, -5);
  const atIdx = s.indexOf('@');
  if (atIdx !== -1) s = s.slice(0, atIdx);
  const parts = s.split('-').filter(Boolean);
  if (parts.length <= 2) return s;
  return `${parts[0]}-${parts[parts.length - 1]}`;
}

function resolveAuthBindingOptionValue(configured: string, options: AuthBindingOption[]): string {
  const trimmed = configured.trim();
  if (!trimmed) return '';
  const option = options.find(
    (item) => item.value === trimmed || item.authIndex === trimmed || item.authIdentity === trimmed
  );
  return option?.value ?? trimmed;
}

export function VisualConfigEditor({
  values,
  validationErrors,
  disabled = false,
  onChange,
}: VisualConfigEditorProps) {
  const { t } = useTranslation();
  const routingStrategyLabelId = useId();
  const routingStrategyHintId = `${routingStrategyLabelId}-hint`;
  const defaultModelAccountLabelId = useId();

  const [authFiles, setAuthFiles] = useState<AuthFileItem[]>([]);
  useEffect(() => {
    authFilesApi
      .list()
      .then((res) => {
        setAuthFiles(res.files ?? []);
      })
      .catch(() => {
        /* silent – dropdown stays empty */
      });
  }, []);

  const authIndexOptions = useMemo<AuthBindingOption[]>(() => {
    const options: AuthBindingOption[] = [];
    for (const f of authFiles) {
      // API 返回 snake_case，类型定义为 camelCase，兼容两者。
      const idx = f['auth_index'] ?? f.authIndex;
      const identity = f['auth_identity'] ?? f.authIdentity;
      if (idx == null || String(idx).trim() === '') continue;
      const shortName = shortenAuthFileName(f.name);
      const authIndex = String(idx).trim();
      const authIdentity = typeof identity === 'string' ? identity.trim() : '';
      options.push({
        value: authIdentity || authIndex,
        label: `${shortName} (${authIndex})`,
        authIndex,
        ...(authIdentity ? { authIdentity } : {}),
      });
    }
    return options;
  }, [authFiles]);
  const defaultModelAccountValue = resolveAuthBindingOptionValue(
    values.defaultModelAccount,
    authIndexOptions
  );

  const isAccountBind = values.routingStrategy === 'account-bind';
  const keepaliveInputId = useId();
  const keepaliveHintId = `${keepaliveInputId}-hint`;
  const keepaliveErrorId = `${keepaliveInputId}-error`;
  const nonstreamKeepaliveInputId = useId();
  const nonstreamKeepaliveHintId = `${nonstreamKeepaliveInputId}-hint`;
  const nonstreamKeepaliveErrorId = `${nonstreamKeepaliveInputId}-error`;
  const isKeepaliveDisabled =
    values.streaming.keepaliveSeconds === '' || values.streaming.keepaliveSeconds === '0';
  const isNonstreamKeepaliveDisabled =
    values.streaming.nonstreamKeepaliveInterval === '' ||
    values.streaming.nonstreamKeepaliveInterval === '0';
  const portError = getValidationMessage(t, validationErrors?.port);
  const logsMaxSizeError = getValidationMessage(t, validationErrors?.logsMaxTotalSizeMb);
  const requestRetryError = getValidationMessage(t, validationErrors?.requestRetry);
  const maxRetryIntervalError = getValidationMessage(t, validationErrors?.maxRetryInterval);
  const keepaliveError = getValidationMessage(t, validationErrors?.['streaming.keepaliveSeconds']);
  const bootstrapRetriesError = getValidationMessage(
    t,
    validationErrors?.['streaming.bootstrapRetries']
  );
  const nonstreamKeepaliveError = getValidationMessage(
    t,
    validationErrors?.['streaming.nonstreamKeepaliveInterval']
  );

  const handleApiKeyEntriesChange = useCallback(
    (apiKeyEntries: ProxyApiKeyEntry[]) => onChange({ apiKeyEntries }),
    [onChange]
  );
  const handlePayloadDefaultRulesChange = useCallback(
    (payloadDefaultRules: PayloadRule[]) => onChange({ payloadDefaultRules }),
    [onChange]
  );
  const handlePayloadOverrideRulesChange = useCallback(
    (payloadOverrideRules: PayloadRule[]) => onChange({ payloadOverrideRules }),
    [onChange]
  );
  const handlePayloadFilterRulesChange = useCallback(
    (payloadFilterRules: PayloadFilterRule[]) => onChange({ payloadFilterRules }),
    [onChange]
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <ConfigSection
        title={t('config_management.visual.sections.server.title')}
        description={t('config_management.visual.sections.server.description')}
      >
        <SectionGrid>
          <Input
            label={t('config_management.visual.sections.server.host')}
            placeholder="0.0.0.0"
            value={values.host}
            onChange={(e) => onChange({ host: e.target.value })}
            disabled={disabled}
          />
          <Input
            label={t('config_management.visual.sections.server.port')}
            type="number"
            placeholder="8317"
            value={values.port}
            onChange={(e) => onChange({ port: e.target.value })}
            disabled={disabled}
            error={portError}
          />
        </SectionGrid>
      </ConfigSection>

      <ConfigSection
        title={t('config_management.visual.sections.tls.title')}
        description={t('config_management.visual.sections.tls.description')}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <ToggleRow
            title={t('config_management.visual.sections.tls.enable')}
            description={t('config_management.visual.sections.tls.enable_desc')}
            checked={values.tlsEnable}
            disabled={disabled}
            onChange={(tlsEnable) => onChange({ tlsEnable })}
          />
          {values.tlsEnable && (
            <>
              <Divider />
              <SectionGrid>
                <Input
                  label={t('config_management.visual.sections.tls.cert')}
                  placeholder="/path/to/cert.pem"
                  value={values.tlsCert}
                  onChange={(e) => onChange({ tlsCert: e.target.value })}
                  disabled={disabled}
                />
                <Input
                  label={t('config_management.visual.sections.tls.key')}
                  placeholder="/path/to/key.pem"
                  value={values.tlsKey}
                  onChange={(e) => onChange({ tlsKey: e.target.value })}
                  disabled={disabled}
                />
              </SectionGrid>
            </>
          )}
        </div>
      </ConfigSection>

      <ConfigSection
        title={t('config_management.visual.sections.remote.title')}
        description={t('config_management.visual.sections.remote.description')}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <ToggleRow
            title={t('config_management.visual.sections.remote.allow_remote')}
            description={t('config_management.visual.sections.remote.allow_remote_desc')}
            checked={values.rmAllowRemote}
            disabled={disabled}
            onChange={(rmAllowRemote) => onChange({ rmAllowRemote })}
          />
          <ToggleRow
            title={t('config_management.visual.sections.remote.disable_panel')}
            description={t('config_management.visual.sections.remote.disable_panel_desc')}
            checked={values.rmDisableControlPanel}
            disabled={disabled}
            onChange={(rmDisableControlPanel) => onChange({ rmDisableControlPanel })}
          />
          <SectionGrid>
            <Input
              label={t('config_management.visual.sections.remote.secret_key')}
              type="password"
              placeholder={t('config_management.visual.sections.remote.secret_key_placeholder')}
              value={values.rmSecretKey}
              onChange={(e) => onChange({ rmSecretKey: e.target.value })}
              disabled={disabled}
            />
            <Input
              label={t('config_management.visual.sections.remote.panel_repo')}
              placeholder="https://github.com/router-for-me/Cli-Proxy-API-Management-Center"
              value={values.rmPanelRepo}
              onChange={(e) => onChange({ rmPanelRepo: e.target.value })}
              disabled={disabled}
            />
          </SectionGrid>
        </div>
      </ConfigSection>

      <ConfigSection
        title={t('config_management.visual.sections.auth.title')}
        description={t('config_management.visual.sections.auth.description')}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input
            label={t('config_management.visual.sections.auth.auth_dir')}
            placeholder="~/.cli-proxy-api"
            value={values.authDir}
            onChange={(e) => onChange({ authDir: e.target.value })}
            disabled={disabled}
            hint={t('config_management.visual.sections.auth.auth_dir_hint')}
          />
          <ApiKeysCardEditor
            value={values.apiKeyEntries}
            disabled={disabled}
            onChange={handleApiKeyEntriesChange}
            isAccountBind={isAccountBind}
            authIndexOptions={authIndexOptions}
            defaultModelAccount={values.defaultModelAccount}
          />
        </div>
      </ConfigSection>

      <ConfigSection
        title={t('config_management.visual.sections.system.title')}
        description={t('config_management.visual.sections.system.description')}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <SectionGrid>
            <ToggleRow
              title={t('config_management.visual.sections.system.debug')}
              description={t('config_management.visual.sections.system.debug_desc')}
              checked={values.debug}
              disabled={disabled}
              onChange={(debug) => onChange({ debug })}
            />
            <ToggleRow
              title={t('config_management.visual.sections.system.commercial_mode')}
              description={t('config_management.visual.sections.system.commercial_mode_desc')}
              checked={values.commercialMode}
              disabled={disabled}
              onChange={(commercialMode) => onChange({ commercialMode })}
            />
            <ToggleRow
              title={t('config_management.visual.sections.system.logging_to_file')}
              description={t('config_management.visual.sections.system.logging_to_file_desc')}
              checked={values.loggingToFile}
              disabled={disabled}
              onChange={(loggingToFile) => onChange({ loggingToFile })}
            />
            <ToggleRow
              title={t('config_management.visual.sections.system.usage_statistics')}
              description={t('config_management.visual.sections.system.usage_statistics_desc')}
              checked={values.usageStatisticsEnabled}
              disabled={disabled}
              onChange={(usageStatisticsEnabled) => onChange({ usageStatisticsEnabled })}
            />
          </SectionGrid>

          <SectionGrid>
            <Input
              label={t('config_management.visual.sections.system.logs_max_size')}
              type="number"
              placeholder="0"
              value={values.logsMaxTotalSizeMb}
              onChange={(e) => onChange({ logsMaxTotalSizeMb: e.target.value })}
              disabled={disabled}
              error={logsMaxSizeError}
            />
          </SectionGrid>
        </div>
      </ConfigSection>

      <ConfigSection
        title={t('config_management.visual.sections.network.title')}
        description={t('config_management.visual.sections.network.description')}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <SectionGrid>
            <div className="form-group">
              <label id={routingStrategyLabelId} htmlFor={`${routingStrategyLabelId}-select`}>
                {t('config_management.visual.sections.network.routing_strategy')}
              </label>
              <Select
                value={values.routingStrategy}
                options={[
                  {
                    value: 'round-robin',
                    label: t('config_management.visual.sections.network.strategy_round_robin'),
                  },
                  {
                    value: 'fill-first',
                    label: t('config_management.visual.sections.network.strategy_fill_first'),
                  },
                  {
                    value: 'sf',
                    label: t('config_management.visual.sections.network.strategy_sf'),
                  },
                  {
                    value: 'account-bind',
                    label: t('config_management.visual.sections.network.strategy_account_bind'),
                  },
                ]}
                id={`${routingStrategyLabelId}-select`}
                disabled={disabled}
                ariaLabelledBy={routingStrategyLabelId}
                ariaDescribedBy={routingStrategyHintId}
                onChange={(nextValue) =>
                  onChange({ routingStrategy: nextValue as VisualConfigValues['routingStrategy'] })
                }
              />
              <div id={routingStrategyHintId} className="hint">
                {t('config_management.visual.sections.network.routing_strategy_hint')}
              </div>
            </div>
            {isAccountBind ? (
              <div className="form-group">
                <label
                  id={defaultModelAccountLabelId}
                  htmlFor={`${defaultModelAccountLabelId}-select`}
                >
                  {t('config_management.visual.sections.network.default_model_account')}
                </label>
                <Select
                  value={defaultModelAccountValue}
                  options={[
                    {
                      value: '',
                      label: t(
                        'config_management.visual.sections.network.default_model_account_placeholder'
                      ),
                    },
                    ...authIndexOptions,
                  ]}
                  id={`${defaultModelAccountLabelId}-select`}
                  disabled={disabled}
                  ariaLabelledBy={defaultModelAccountLabelId}
                  onChange={(v) => onChange({ defaultModelAccount: v })}
                />
              </div>
            ) : (
              <Input
                label={t('config_management.visual.sections.network.proxy_url')}
                placeholder="socks5://user:pass@127.0.0.1:1080/"
                value={values.proxyUrl}
                onChange={(e) => onChange({ proxyUrl: e.target.value })}
                disabled={disabled}
              />
            )}
            <Input
              label={t('config_management.visual.sections.network.request_retry')}
              type="number"
              placeholder="3"
              value={values.requestRetry}
              onChange={(e) => onChange({ requestRetry: e.target.value })}
              disabled={disabled}
              error={requestRetryError}
            />
            <Input
              label={t('config_management.visual.sections.network.max_retry_interval')}
              type="number"
              placeholder="30"
              value={values.maxRetryInterval}
              onChange={(e) => onChange({ maxRetryInterval: e.target.value })}
              disabled={disabled}
              error={maxRetryIntervalError}
            />
          </SectionGrid>

          <ToggleRow
            title={t('config_management.visual.sections.network.force_model_prefix')}
            description={t('config_management.visual.sections.network.force_model_prefix_desc')}
            checked={values.forceModelPrefix}
            disabled={disabled}
            onChange={(forceModelPrefix) => onChange({ forceModelPrefix })}
          />
          <ToggleRow
            title={t('config_management.visual.sections.network.ws_auth')}
            description={t('config_management.visual.sections.network.ws_auth_desc')}
            checked={values.wsAuth}
            disabled={disabled}
            onChange={(wsAuth) => onChange({ wsAuth })}
          />
        </div>
      </ConfigSection>

      <ConfigSection
        title={t('config_management.visual.sections.quota.title')}
        description={t('config_management.visual.sections.quota.description')}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <ToggleRow
            title={t('config_management.visual.sections.quota.switch_project')}
            description={t('config_management.visual.sections.quota.switch_project_desc')}
            checked={values.quotaSwitchProject}
            disabled={disabled}
            onChange={(quotaSwitchProject) => onChange({ quotaSwitchProject })}
          />
          <ToggleRow
            title={t('config_management.visual.sections.quota.switch_preview_model')}
            description={t('config_management.visual.sections.quota.switch_preview_model_desc')}
            checked={values.quotaSwitchPreviewModel}
            disabled={disabled}
            onChange={(quotaSwitchPreviewModel) => onChange({ quotaSwitchPreviewModel })}
          />
        </div>
      </ConfigSection>

      <ConfigSection
        title={t('config_management.visual.sections.streaming.title')}
        description={t('config_management.visual.sections.streaming.description')}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <SectionGrid>
            <div className="form-group">
              <label htmlFor={keepaliveInputId}>
                {t('config_management.visual.sections.streaming.keepalive_seconds')}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id={keepaliveInputId}
                  className="input"
                  type="number"
                  placeholder="0"
                  value={values.streaming.keepaliveSeconds}
                  onChange={(e) =>
                    onChange({
                      streaming: { ...values.streaming, keepaliveSeconds: e.target.value },
                    })
                  }
                  disabled={disabled}
                />
                {isKeepaliveDisabled && (
                  <span
                    style={{
                      position: 'absolute',
                      right: 10,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: 12,
                      color: 'var(--text-secondary)',
                      background: 'var(--bg-secondary)',
                      padding: '2px 8px',
                      borderRadius: 999,
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    {t('config_management.visual.sections.streaming.disabled')}
                  </span>
                )}
              </div>
              {keepaliveError && (
                <div id={keepaliveErrorId} className="error-box">
                  {keepaliveError}
                </div>
              )}
              <div id={keepaliveHintId} className="hint">
                {t('config_management.visual.sections.streaming.keepalive_hint')}
              </div>
            </div>
            <Input
              label={t('config_management.visual.sections.streaming.bootstrap_retries')}
              type="number"
              placeholder="1"
              value={values.streaming.bootstrapRetries}
              onChange={(e) =>
                onChange({ streaming: { ...values.streaming, bootstrapRetries: e.target.value } })
              }
              disabled={disabled}
              hint={t('config_management.visual.sections.streaming.bootstrap_hint')}
              error={bootstrapRetriesError}
            />
          </SectionGrid>

          <SectionGrid>
            <div className="form-group">
              <label htmlFor={nonstreamKeepaliveInputId}>
                {t('config_management.visual.sections.streaming.nonstream_keepalive')}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  className="input"
                  type="number"
                  placeholder="0"
                  value={values.streaming.nonstreamKeepaliveInterval}
                  onChange={(e) =>
                    onChange({
                      streaming: {
                        ...values.streaming,
                        nonstreamKeepaliveInterval: e.target.value,
                      },
                    })
                  }
                  disabled={disabled}
                />
                {isNonstreamKeepaliveDisabled && (
                  <span
                    style={{
                      position: 'absolute',
                      right: 10,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: 12,
                      color: 'var(--text-secondary)',
                      background: 'var(--bg-secondary)',
                      padding: '2px 8px',
                      borderRadius: 999,
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    {t('config_management.visual.sections.streaming.disabled')}
                  </span>
                )}
              </div>
              {nonstreamKeepaliveError && (
                <div id={nonstreamKeepaliveErrorId} className="error-box">
                  {nonstreamKeepaliveError}
                </div>
              )}
              <div id={nonstreamKeepaliveHintId} className="hint">
                {t('config_management.visual.sections.streaming.nonstream_keepalive_hint')}
              </div>
            </div>
          </SectionGrid>
        </div>
      </ConfigSection>

      <ConfigSection
        title={t('config_management.visual.sections.payload.title')}
        description={t('config_management.visual.sections.payload.description')}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
              {t('config_management.visual.sections.payload.default_rules')}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
              {t('config_management.visual.sections.payload.default_rules_desc')}
            </div>
            <PayloadRulesEditor
              value={values.payloadDefaultRules}
              disabled={disabled}
              onChange={handlePayloadDefaultRulesChange}
            />
          </div>

          <div>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
              {t('config_management.visual.sections.payload.override_rules')}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
              {t('config_management.visual.sections.payload.override_rules_desc')}
            </div>
            <PayloadRulesEditor
              value={values.payloadOverrideRules}
              disabled={disabled}
              protocolFirst
              onChange={handlePayloadOverrideRulesChange}
            />
          </div>

          <div>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
              {t('config_management.visual.sections.payload.filter_rules')}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
              {t('config_management.visual.sections.payload.filter_rules_desc')}
            </div>
            <PayloadFilterRulesEditor
              value={values.payloadFilterRules}
              disabled={disabled}
              onChange={handlePayloadFilterRulesChange}
            />
          </div>
        </div>
      </ConfigSection>
    </div>
  );
}
