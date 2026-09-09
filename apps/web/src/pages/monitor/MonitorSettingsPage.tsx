import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Settings, AlertTriangle, Bell, Database, Shield, Plug } from 'lucide-react';
import { useNotificationStore } from '@/store';
import {
  SettingsPageTemplate,
  type SettingTab,
  type SettingValueType,
} from '@/components/templates';
import i18n from '@/i18n';
import { monitorApi } from '@/api/monitor';

// 默认设置值（后端无数据时使用）
const DEFAULT_GENERAL: Record<string, SettingValueType> = {
  monitoringEnabled: true,
  dataRetentionDays: 30,
  sampleRate: 100,
  autoDiscovery: false,
  heartbeatInterval: 60,
  maxConcurrentChecks: 100,
  enableMetrics: true,
  enableLogs: true,
  enableTraces: false,
};
const DEFAULT_ALERT: Record<string, SettingValueType> = {
  defaultAlertStrategy: 'threshold',
  enableAutoRecover: true,
  autoRecoverMinutes: 5,
  escalationEnabled: true,
  escalationLevels: 3,
  escalationInterval: 30,
  enableSilenceRules: true,
  maxSilenceDuration: 24,
  enableDeduplication: true,
  dedupWindow: 5,
};
const DEFAULT_NOTIFICATION: Record<string, SettingValueType> = {
  emailEnabled: true,
  smsEnabled: false,
  pushEnabled: true,
  wechatEnabled: true,
  phoneEnabled: false,
  criticalNotify: true,
  warningNotify: true,
  infoNotify: false,
  defaultTemplate: 'standard',
  notifyContacts: 'admin,ops',
};
const DEFAULT_DATASOURCE: Record<string, SettingValueType> = {
  primaryDatasource: 'prometheus',
  connectionTimeout: 30,
  maxRetries: 3,
  retryInterval: 10,
  enableSsl: true,
  sslVerify: true,
  batchQueryEnabled: true,
  batchSize: 100,
  cacheEnabled: true,
  cacheTTL: 300,
};
const DEFAULT_PERMISSION: Record<string, SettingValueType> = {
  enableRoleBased: true,
  enableDeptBased: false,
  adminCanManageAll: true,
  allowViewAllDashboards: false,
  allowCreateAlertRules: true,
  allowExportData: true,
  monitorAdminRole: 'monitor_admin',
  viewerRole: 'monitor_viewer',
  editorRole: 'monitor_editor',
};
const DEFAULT_INTEGRATION: Record<string, SettingValueType> = {
  prometheusEnabled: true,
  prometheusUrl: 'http://localhost:9090',
  grafanaEnabled: true,
  grafanaUrl: 'http://localhost:3000',
  grafanaApiKey: '',
  webhookEnabled: false,
  webhookUrl: '',
  webhookSecret: '',
  enableApiAccess: true,
  apiRateLimit: 1000,
};

/** 从后端 key-value map 中提取某个分类的设置，合并默认值 */
function extractCategory(
  data: Record<string, unknown> | undefined,
  prefix: string,
  defaults: Record<string, SettingValueType>
): Record<string, SettingValueType> {
  const result = { ...defaults };
  if (!data) return result;
  for (const key of Object.keys(defaults)) {
    const fullKey = `${prefix}_${key}`;
    const val = data[fullKey];
    if (
      val !== undefined &&
      val !== null &&
      (typeof val === 'string' ||
        typeof val === 'number' ||
        typeof val === 'boolean' ||
        Array.isArray(val))
    ) {
      result[key] = val as SettingValueType;
    }
  }
  return result;
}

export const MonitorSettingsPage: React.FC = () => {
  const addNotification = useNotificationStore((state) => state.addNotification);

  // 从后端加载设置
  const { data: settingsData, isLoading: settingsLoading } = useQuery({
    queryKey: ['monitor', 'settings', 'all'],
    queryFn: async () => {
      try {
        const resp = await monitorApi.settings.list();
        return resp.data ?? {};
      } catch {
        return {};
      }
    },
    staleTime: 30_000,
  });

  const [generalSettings, setGeneralSettings] =
    useState<Record<string, SettingValueType>>(DEFAULT_GENERAL);
  const [alertSettings, setAlertSettings] =
    useState<Record<string, SettingValueType>>(DEFAULT_ALERT);
  const [notificationSettings, setNotificationSettings] =
    useState<Record<string, SettingValueType>>(DEFAULT_NOTIFICATION);
  const [datasourceSettings, setDatasourceSettings] =
    useState<Record<string, SettingValueType>>(DEFAULT_DATASOURCE);
  const [permissionSettings, setPermissionSettings] =
    useState<Record<string, SettingValueType>>(DEFAULT_PERMISSION);
  const [integrationSettings, setIntegrationSettings] =
    useState<Record<string, SettingValueType>>(DEFAULT_INTEGRATION);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // 后端数据到达后合并到本地 state（仅执行一次）
  useEffect(() => {
    if (settingsData && !settingsLoaded) {
      setGeneralSettings(extractCategory(settingsData, 'general', DEFAULT_GENERAL));
      setAlertSettings(extractCategory(settingsData, 'alert', DEFAULT_ALERT));
      setNotificationSettings(extractCategory(settingsData, 'notification', DEFAULT_NOTIFICATION));
      setDatasourceSettings(extractCategory(settingsData, 'datasource', DEFAULT_DATASOURCE));
      setPermissionSettings(extractCategory(settingsData, 'permission', DEFAULT_PERMISSION));
      setIntegrationSettings(extractCategory(settingsData, 'integration', DEFAULT_INTEGRATION));
      setSettingsLoaded(true);
    }
  }, [settingsData, settingsLoaded]);

  const handleSave = useCallback(
    async (data: Record<string, SettingValueType>) => {
      // 1. 更新本地 state
      Object.keys(data).forEach((key) => {
        if (key.startsWith('general_')) {
          const settingKey = key.replace('general_', '');
          setGeneralSettings((prev) => ({ ...prev, [settingKey]: data[key] }));
        } else if (key.startsWith('alert_')) {
          const settingKey = key.replace('alert_', '');
          setAlertSettings((prev) => ({ ...prev, [settingKey]: data[key] }));
        } else if (key.startsWith('notification_')) {
          const settingKey = key.replace('notification_', '');
          setNotificationSettings((prev) => ({ ...prev, [settingKey]: data[key] }));
        } else if (key.startsWith('datasource_')) {
          const settingKey = key.replace('datasource_', '');
          setDatasourceSettings((prev) => ({ ...prev, [settingKey]: data[key] }));
        } else if (key.startsWith('permission_')) {
          const settingKey = key.replace('permission_', '');
          setPermissionSettings((prev) => ({ ...prev, [settingKey]: data[key] }));
        } else if (key.startsWith('integration_')) {
          const settingKey = key.replace('integration_', '');
          setIntegrationSettings((prev) => ({ ...prev, [settingKey]: data[key] }));
        }
      });

      // 2. 持久化到后端（批量 upsert）
      try {
        await monitorApi.settings.batchUpdate(data as Record<string, unknown>);
        addNotification({
          title: i18n.t('monitor.monitor_settings_page.k0'),
          message: i18n.t('monitor.monitor_settings_page.k1'),
          type: 'success',
        });
      } catch {
        addNotification({
          title: i18n.t('monitor.monitor_settings_page.k0'),
          message: '设置保存失败，请稍后重试',
          type: 'error',
        });
      }
    },
    [addNotification]
  );
  const tabs: SettingTab[] = useMemo(
    () => [
      {
        id: 'general',
        label: i18n.t('monitor.monitor_settings_page.k2'),
        icon: <Settings size={18} />,
        sections: [
          {
            id: 'general-basic',
            title: i18n.t('monitor.monitor_settings_page.k3'),
            description: i18n.t('monitor.monitor_settings_page.k4'),
            color: 'primary',
            fields: [
              {
                id: 'general_monitoringEnabled',
                label: i18n.t('monitor.monitor_settings_page.k5'),
                description: i18n.t('monitor.monitor_settings_page.k6'),
                type: 'switch',
                value: generalSettings.monitoringEnabled,
                defaultValue: true,
              },
              {
                id: 'general_dataRetentionDays',
                label: i18n.t('monitor.monitor_settings_page.k7'),
                description: i18n.t('monitor.monitor_settings_page.k8'),
                type: 'number',
                value: generalSettings.dataRetentionDays,
                defaultValue: 30,
                helperText: i18n.t('monitor.monitor_settings_page.k9'),
              },
              {
                id: 'general_sampleRate',
                label: i18n.t('monitor.monitor_settings_page.k10'),
                description: i18n.t('monitor.monitor_settings_page.0100_11'),
                type: 'number',
                value: generalSettings.sampleRate,
                defaultValue: 100,
                helperText: i18n.t('monitor.monitor_settings_page.0100_12'),
              },
              {
                id: 'general_autoDiscovery',
                label: i18n.t('monitor.monitor_settings_page.k13'),
                description: i18n.t('monitor.monitor_settings_page.k14'),
                type: 'switch',
                value: generalSettings.autoDiscovery,
                defaultValue: false,
              },
            ],
          },
          {
            id: 'general-check',
            title: i18n.t('monitor.monitor_settings_page.k15'),
            description: i18n.t('monitor.monitor_settings_page.k16'),
            color: 'info',
            fields: [
              {
                id: 'general_heartbeatInterval',
                label: i18n.t('monitor.monitor_settings_page.k17'),
                description: i18n.t('monitor.monitor_settings_page.k18'),
                type: 'number',
                value: generalSettings.heartbeatInterval,
                defaultValue: 60,
                helperText: i18n.t('monitor.monitor_settings_page.k19'),
              },
              {
                id: 'general_maxConcurrentChecks',
                label: i18n.t('monitor.monitor_settings_page.k20'),
                description: i18n.t('monitor.monitor_settings_page.k21'),
                type: 'number',
                value: generalSettings.maxConcurrentChecks,
                defaultValue: 100,
                helperText: i18n.t('monitor.monitor_settings_page.k22'),
              },
            ],
          },
          {
            id: 'general-observability',
            title: i18n.t('monitor.monitor_settings_page.k23'),
            description: i18n.t('monitor.monitor_settings_page.k24'),
            color: 'secondary',
            fields: [
              {
                id: 'general_enableMetrics',
                label: i18n.t('monitor.monitor_settings_page.k25'),
                description: i18n.t('monitor.monitor_settings_page.k26'),
                type: 'switch',
                value: generalSettings.enableMetrics,
                defaultValue: true,
              },
              {
                id: 'general_enableLogs',
                label: i18n.t('monitor.monitor_settings_page.k27'),
                description: i18n.t('monitor.monitor_settings_page.k28'),
                type: 'switch',
                value: generalSettings.enableLogs,
                defaultValue: true,
              },
              {
                id: 'general_enableTraces',
                label: i18n.t('monitor.monitor_settings_page.k29'),
                description: i18n.t('monitor.monitor_settings_page.k30'),
                type: 'switch',
                value: generalSettings.enableTraces,
                defaultValue: false,
              },
            ],
          },
        ],
      },
      {
        id: 'alert',
        label: i18n.t('monitor.monitor_settings_page.k31'),
        icon: <AlertTriangle size={18} />,
        sections: [
          {
            id: 'alert-strategy',
            title: i18n.t('monitor.monitor_settings_page.k32'),
            description: i18n.t('monitor.monitor_settings_page.k33'),
            color: 'warning',
            fields: [
              {
                id: 'alert_defaultAlertStrategy',
                label: i18n.t('monitor.monitor_settings_page.k34'),
                description: i18n.t('monitor.monitor_settings_page.k35'),
                type: 'select',
                value: alertSettings.defaultAlertStrategy,
                defaultValue: 'threshold',
                options: [
                  { label: i18n.t('monitor.monitor_settings_page.k36'), value: 'threshold' },
                  { label: i18n.t('monitor.monitor_settings_page.k37'), value: 'anomaly' },
                  { label: i18n.t('monitor.monitor_settings_page.k38'), value: 'forecast' },
                  { label: i18n.t('monitor.monitor_settings_page.k39'), value: 'composite' },
                ],
              },
              {
                id: 'alert_enableAutoRecover',
                label: i18n.t('monitor.monitor_settings_page.k40'),
                description: i18n.t('monitor.monitor_settings_page.k41'),
                type: 'switch',
                value: alertSettings.enableAutoRecover,
                defaultValue: true,
              },
              {
                id: 'alert_autoRecoverMinutes',
                label: i18n.t('monitor.monitor_settings_page.k42'),
                description: i18n.t('monitor.monitor_settings_page.k43'),
                type: 'number',
                value: alertSettings.autoRecoverMinutes,
                defaultValue: 5,
                helperText: i18n.t('monitor.monitor_settings_page.k44'),
                disabled: !alertSettings.enableAutoRecover,
              },
            ],
          },
          {
            id: 'alert-escalation',
            title: i18n.t('monitor.monitor_settings_page.k45'),
            description: i18n.t('monitor.monitor_settings_page.k46'),
            color: 'error',
            fields: [
              {
                id: 'alert_escalationEnabled',
                label: i18n.t('monitor.monitor_settings_page.k47'),
                description: i18n.t('monitor.monitor_settings_page.k48'),
                type: 'switch',
                value: alertSettings.escalationEnabled,
                defaultValue: true,
              },
              {
                id: 'alert_escalationLevels',
                label: i18n.t('monitor.monitor_settings_page.k49'),
                description: i18n.t('monitor.monitor_settings_page.k50'),
                type: 'number',
                value: alertSettings.escalationLevels,
                defaultValue: 3,
                disabled: !alertSettings.escalationEnabled,
              },
              {
                id: 'alert_escalationInterval',
                label: i18n.t('monitor.monitor_settings_page.k51'),
                description: i18n.t('monitor.monitor_settings_page.k52'),
                type: 'number',
                value: alertSettings.escalationInterval,
                defaultValue: 30,
                helperText: i18n.t('monitor.monitor_settings_page.k53'),
                disabled: !alertSettings.escalationEnabled,
              },
            ],
          },
          {
            id: 'alert-silence',
            title: i18n.t('monitor.monitor_settings_page.k54'),
            description: i18n.t('monitor.monitor_settings_page.k55'),
            color: 'info',
            fields: [
              {
                id: 'alert_enableSilenceRules',
                label: i18n.t('monitor.monitor_settings_page.k56'),
                description: i18n.t('monitor.monitor_settings_page.k57'),
                type: 'switch',
                value: alertSettings.enableSilenceRules,
                defaultValue: true,
              },
              {
                id: 'alert_maxSilenceDuration',
                label: i18n.t('monitor.monitor_settings_page.k58'),
                description: i18n.t('monitor.monitor_settings_page.k59'),
                type: 'number',
                value: alertSettings.maxSilenceDuration,
                defaultValue: 24,
                helperText: i18n.t('monitor.monitor_settings_page.k60'),
                disabled: !alertSettings.enableSilenceRules,
              },
            ],
          },
          {
            id: 'alert-dedup',
            title: i18n.t('monitor.monitor_settings_page.k61'),
            description: i18n.t('monitor.monitor_settings_page.k62'),
            color: 'secondary',
            fields: [
              {
                id: 'alert_enableDeduplication',
                label: i18n.t('monitor.monitor_settings_page.k63'),
                description: i18n.t('monitor.monitor_settings_page.k64'),
                type: 'switch',
                value: alertSettings.enableDeduplication,
                defaultValue: true,
              },
              {
                id: 'alert_dedupWindow',
                label: i18n.t('monitor.monitor_settings_page.k65'),
                description: i18n.t('monitor.monitor_settings_page.k66'),
                type: 'number',
                value: alertSettings.dedupWindow,
                defaultValue: 5,
                helperText: i18n.t('monitor.monitor_settings_page.k67'),
                disabled: !alertSettings.enableDeduplication,
              },
            ],
          },
        ],
      },
      {
        id: 'notification',
        label: i18n.t('monitor.monitor_settings_page.k68'),
        icon: <Bell size={18} />,
        sections: [
          {
            id: 'notification-channels',
            title: i18n.t('monitor.monitor_settings_page.k69'),
            description: i18n.t('monitor.monitor_settings_page.k70'),
            color: 'primary',
            fields: [
              {
                id: 'notification_emailEnabled',
                label: i18n.t('monitor.monitor_settings_page.k71'),
                description: i18n.t('monitor.monitor_settings_page.k72'),
                type: 'switch',
                value: notificationSettings.emailEnabled,
                defaultValue: true,
              },
              {
                id: 'notification_smsEnabled',
                label: i18n.t('monitor.monitor_settings_page.k73'),
                description: i18n.t('monitor.monitor_settings_page.k74'),
                type: 'switch',
                value: notificationSettings.smsEnabled,
                defaultValue: false,
              },
              {
                id: 'notification_pushEnabled',
                label: i18n.t('monitor.monitor_settings_page.k75'),
                description: i18n.t('monitor.monitor_settings_page.k76'),
                type: 'switch',
                value: notificationSettings.pushEnabled,
                defaultValue: true,
              },
              {
                id: 'notification_wechatEnabled',
                label: i18n.t('monitor.monitor_settings_page.k77'),
                description: i18n.t('monitor.monitor_settings_page.k78'),
                type: 'switch',
                value: notificationSettings.wechatEnabled,
                defaultValue: true,
              },
              {
                id: 'notification_phoneEnabled',
                label: i18n.t('monitor.monitor_settings_page.k79'),
                description: i18n.t('monitor.monitor_settings_page.k80'),
                type: 'switch',
                value: notificationSettings.phoneEnabled,
                defaultValue: false,
              },
            ],
          },
          {
            id: 'notification-levels',
            title: i18n.t('monitor.monitor_settings_page.k81'),
            description: i18n.t('monitor.monitor_settings_page.k82'),
            color: 'warning',
            fields: [
              {
                id: 'notification_criticalNotify',
                label: i18n.t('monitor.monitor_settings_page.k83'),
                description: i18n.t('monitor.monitor_settings_page.k84'),
                type: 'switch',
                value: notificationSettings.criticalNotify,
                defaultValue: true,
              },
              {
                id: 'notification_warningNotify',
                label: i18n.t('monitor.monitor_settings_page.k85'),
                description: i18n.t('monitor.monitor_settings_page.k86'),
                type: 'switch',
                value: notificationSettings.warningNotify,
                defaultValue: true,
              },
              {
                id: 'notification_infoNotify',
                label: i18n.t('monitor.monitor_settings_page.k87'),
                description: i18n.t('monitor.monitor_settings_page.k88'),
                type: 'switch',
                value: notificationSettings.infoNotify,
                defaultValue: false,
              },
            ],
          },
          {
            id: 'notification-config',
            title: i18n.t('monitor.monitor_settings_page.k89'),
            description: i18n.t('monitor.monitor_settings_page.k90'),
            color: 'secondary',
            fields: [
              {
                id: 'notification_defaultTemplate',
                label: i18n.t('monitor.monitor_settings_page.k91'),
                description: i18n.t('monitor.monitor_settings_page.k92'),
                type: 'select',
                value: notificationSettings.defaultTemplate,
                defaultValue: 'standard',
                options: [
                  { label: i18n.t('monitor.monitor_settings_page.k93'), value: 'standard' },
                  { label: i18n.t('monitor.monitor_settings_page.k94'), value: 'concise' },
                  { label: i18n.t('monitor.monitor_settings_page.k95'), value: 'detailed' },
                  { label: i18n.t('monitor.monitor_settings_page.k96'), value: 'custom' },
                ],
              },
              {
                id: 'notification_notifyContacts',
                label: i18n.t('monitor.monitor_settings_page.k97'),
                description: i18n.t('monitor.monitor_settings_page.k98'),
                type: 'text',
                value: notificationSettings.notifyContacts,
                defaultValue: 'admin,ops',
                helperText: i18n.t('monitor.monitor_settings_page.k99'),
              },
            ],
          },
        ],
      },
      {
        id: 'datasource',
        label: i18n.t('monitor.monitor_settings_page.k100'),
        icon: <Database size={18} />,
        sections: [
          {
            id: 'datasource-config',
            title: i18n.t('monitor.monitor_settings_page.k101'),
            description: i18n.t('monitor.monitor_settings_page.k102'),
            color: 'primary',
            fields: [
              {
                id: 'datasource_primaryDatasource',
                label: i18n.t('monitor.monitor_settings_page.k103'),
                description: i18n.t('monitor.monitor_settings_page.k104'),
                type: 'select',
                value: datasourceSettings.primaryDatasource,
                defaultValue: 'prometheus',
                options: [
                  { label: 'Prometheus', value: 'prometheus' },
                  { label: 'InfluxDB', value: 'influxdb' },
                  { label: 'Elasticsearch', value: 'elasticsearch' },
                  { label: 'MySQL', value: 'mysql' },
                  { label: 'PostgreSQL', value: 'postgresql' },
                ],
              },
              {
                id: 'datasource_connectionTimeout',
                label: i18n.t('monitor.monitor_settings_page.k105'),
                description: i18n.t('monitor.monitor_settings_page.k106'),
                type: 'number',
                value: datasourceSettings.connectionTimeout,
                defaultValue: 30,
              },
              {
                id: 'datasource_maxRetries',
                label: i18n.t('monitor.monitor_settings_page.k107'),
                description: i18n.t('monitor.monitor_settings_page.k108'),
                type: 'number',
                value: datasourceSettings.maxRetries,
                defaultValue: 3,
              },
              {
                id: 'datasource_retryInterval',
                label: i18n.t('monitor.monitor_settings_page.k109'),
                description: i18n.t('monitor.monitor_settings_page.k110'),
                type: 'number',
                value: datasourceSettings.retryInterval,
                defaultValue: 10,
              },
            ],
          },
          {
            id: 'datasource-ssl',
            title: i18n.t('pages.monitor_settings_page.ssl_0'),
            description: i18n.t('monitor.monitor_settings_page.ssl_111'),
            color: 'success',
            fields: [
              {
                id: 'datasource_enableSsl',
                label: i18n.t('monitor.monitor_settings_page.ssl_112'),
                description: i18n.t('monitor.monitor_settings_page.ssltls_113'),
                type: 'switch',
                value: datasourceSettings.enableSsl,
                defaultValue: true,
              },
              {
                id: 'datasource_sslVerify',
                label: i18n.t('pages.monitor_settings_page.ssl_1'),
                description: i18n.t('monitor.monitor_settings_page.ssl_114'),
                type: 'switch',
                value: datasourceSettings.sslVerify,
                defaultValue: true,
                disabled: !datasourceSettings.enableSsl,
              },
            ],
          },
          {
            id: 'datasource-optimization',
            title: i18n.t('monitor.monitor_settings_page.k115'),
            description: i18n.t('monitor.monitor_settings_page.k116'),
            color: 'info',
            fields: [
              {
                id: 'datasource_batchQueryEnabled',
                label: i18n.t('monitor.monitor_settings_page.k117'),
                description: i18n.t('monitor.monitor_settings_page.k118'),
                type: 'switch',
                value: datasourceSettings.batchQueryEnabled,
                defaultValue: true,
              },
              {
                id: 'datasource_batchSize',
                label: i18n.t('monitor.monitor_settings_page.k119'),
                description: i18n.t('monitor.monitor_settings_page.k120'),
                type: 'number',
                value: datasourceSettings.batchSize,
                defaultValue: 100,
                disabled: !datasourceSettings.batchQueryEnabled,
              },
              {
                id: 'datasource_cacheEnabled',
                label: i18n.t('monitor.monitor_settings_page.k121'),
                description: i18n.t('monitor.monitor_settings_page.k122'),
                type: 'switch',
                value: datasourceSettings.cacheEnabled,
                defaultValue: true,
              },
              {
                id: 'datasource_cacheTTL',
                label: i18n.t('monitor.monitor_settings_page.k123'),
                description: i18n.t('monitor.monitor_settings_page.k124'),
                type: 'number',
                value: datasourceSettings.cacheTTL,
                defaultValue: 300,
                disabled: !datasourceSettings.cacheEnabled,
              },
            ],
          },
        ],
      },
      {
        id: 'permission',
        label: i18n.t('monitor.monitor_settings_page.k125'),
        icon: <Shield size={18} />,
        sections: [
          {
            id: 'permission-control',
            title: i18n.t('monitor.monitor_settings_page.k126'),
            description: i18n.t('monitor.monitor_settings_page.k127'),
            color: 'primary',
            fields: [
              {
                id: 'permission_enableRoleBased',
                label: i18n.t('monitor.monitor_settings_page.k128'),
                description: i18n.t('monitor.monitor_settings_page.k129'),
                type: 'switch',
                value: permissionSettings.enableRoleBased,
                defaultValue: true,
              },
              {
                id: 'permission_enableDeptBased',
                label: i18n.t('monitor.monitor_settings_page.k130'),
                description: i18n.t('monitor.monitor_settings_page.k131'),
                type: 'switch',
                value: permissionSettings.enableDeptBased,
                defaultValue: false,
              },
              {
                id: 'permission_adminCanManageAll',
                label: i18n.t('monitor.monitor_settings_page.k132'),
                description: i18n.t('monitor.monitor_settings_page.k133'),
                type: 'switch',
                value: permissionSettings.adminCanManageAll,
                defaultValue: true,
              },
            ],
          },
          {
            id: 'permission-access',
            title: i18n.t('monitor.monitor_settings_page.k134'),
            description: i18n.t('monitor.monitor_settings_page.k135'),
            color: 'warning',
            fields: [
              {
                id: 'permission_allowViewAllDashboards',
                label: i18n.t('monitor.monitor_settings_page.k136'),
                description: i18n.t('monitor.monitor_settings_page.k137'),
                type: 'switch',
                value: permissionSettings.allowViewAllDashboards,
                defaultValue: false,
              },
              {
                id: 'permission_allowCreateAlertRules',
                label: i18n.t('monitor.monitor_settings_page.k138'),
                description: i18n.t('monitor.monitor_settings_page.k139'),
                type: 'switch',
                value: permissionSettings.allowCreateAlertRules,
                defaultValue: true,
              },
              {
                id: 'permission_allowExportData',
                label: i18n.t('monitor.monitor_settings_page.k140'),
                description: i18n.t('monitor.monitor_settings_page.k141'),
                type: 'switch',
                value: permissionSettings.allowExportData,
                defaultValue: true,
              },
            ],
          },
          {
            id: 'permission-roles',
            title: i18n.t('monitor.monitor_settings_page.k142'),
            description: i18n.t('monitor.monitor_settings_page.k143'),
            color: 'secondary',
            fields: [
              {
                id: 'permission_monitorAdminRole',
                label: i18n.t('monitor.monitor_settings_page.k144'),
                description: i18n.t('monitor.monitor_settings_page.k145'),
                type: 'text',
                value: permissionSettings.monitorAdminRole,
                defaultValue: 'monitor_admin',
                helperText: i18n.t('monitor.monitor_settings_page.k146'),
              },
              {
                id: 'permission_editorRole',
                label: i18n.t('monitor.monitor_settings_page.k147'),
                description: i18n.t('monitor.monitor_settings_page.k148'),
                type: 'text',
                value: permissionSettings.editorRole,
                defaultValue: 'monitor_editor',
                helperText: i18n.t('monitor.monitor_settings_page.k149'),
              },
              {
                id: 'permission_viewerRole',
                label: i18n.t('monitor.monitor_settings_page.k150'),
                description: i18n.t('monitor.monitor_settings_page.k151'),
                type: 'text',
                value: permissionSettings.viewerRole,
                defaultValue: 'monitor_viewer',
                helperText: i18n.t('monitor.monitor_settings_page.k152'),
              },
            ],
          },
        ],
      },
      {
        id: 'integration',
        label: i18n.t('monitor.monitor_settings_page.k153'),
        icon: <Plug size={18} />,
        sections: [
          {
            id: 'integration-prometheus',
            title: 'Prometheus',
            description: i18n.t('monitor.monitor_settings_page.prometheus_154'),
            color: 'primary',
            fields: [
              {
                id: 'integration_prometheusEnabled',
                label: i18n.t('monitor.monitor_settings_page.prometheus_155'),
                description: i18n.t('monitor.monitor_settings_page.prometheus_156'),
                type: 'switch',
                value: integrationSettings.prometheusEnabled,
                defaultValue: true,
              },
              {
                id: 'integration_prometheusUrl',
                label: i18n.t('pages.monitor_settings_page.prometheus_2'),
                description: i18n.t('pages.monitor_settings_page.prometheus_3'),
                type: 'text',
                value: integrationSettings.prometheusUrl,
                defaultValue: 'http://localhost:9090',
                placeholder: 'http://localhost:9090',
                disabled: !integrationSettings.prometheusEnabled,
              },
            ],
          },
          {
            id: 'integration-grafana',
            title: 'Grafana',
            description: i18n.t('monitor.monitor_settings_page.grafana_157'),
            color: 'info',
            fields: [
              {
                id: 'integration_grafanaEnabled',
                label: i18n.t('monitor.monitor_settings_page.grafana_158'),
                description: i18n.t('monitor.monitor_settings_page.grafana_159'),
                type: 'switch',
                value: integrationSettings.grafanaEnabled,
                defaultValue: true,
              },
              {
                id: 'integration_grafanaUrl',
                label: i18n.t('pages.monitor_settings_page.grafana_4'),
                description: i18n.t('pages.monitor_settings_page.grafana_5'),
                type: 'text',
                value: integrationSettings.grafanaUrl,
                defaultValue: 'http://localhost:3000',
                placeholder: 'http://localhost:3000',
                disabled: !integrationSettings.grafanaEnabled,
              },
              {
                id: 'integration_grafanaApiKey',
                label: 'Grafana API Key',
                description: i18n.t('monitor.monitor_settings_page.grafanaapi_160'),
                type: 'password',
                value: integrationSettings.grafanaApiKey,
                defaultValue: '',
                placeholder: i18n.t('monitor.monitor_settings_page.grafanaapi_161'),
                disabled: !integrationSettings.grafanaEnabled,
              },
            ],
          },
          {
            id: 'integration-webhook',
            title: 'Webhook',
            description: i18n.t('monitor.monitor_settings_page.webhook_162'),
            color: 'warning',
            fields: [
              {
                id: 'integration_webhookEnabled',
                label: i18n.t('monitor.monitor_settings_page.webhook_163'),
                description: i18n.t('monitor.monitor_settings_page.webhook_164'),
                type: 'switch',
                value: integrationSettings.webhookEnabled,
                defaultValue: false,
              },
              {
                id: 'integration_webhookUrl',
                label: i18n.t('pages.monitor_settings_page.webhook_6'),
                description: i18n.t('monitor.monitor_settings_page.webhook_165'),
                type: 'text',
                value: integrationSettings.webhookUrl,
                defaultValue: '',
                placeholder: 'https://example.com/webhook',
                disabled: !integrationSettings.webhookEnabled,
              },
              {
                id: 'integration_webhookSecret',
                label: i18n.t('pages.monitor_settings_page.webhook_7'),
                description: i18n.t('monitor.monitor_settings_page.k166'),
                type: 'password',
                value: integrationSettings.webhookSecret,
                defaultValue: '',
                placeholder: i18n.t('monitor.monitor_settings_page.k167'),
                disabled: !integrationSettings.webhookEnabled,
              },
            ],
          },
          {
            id: 'integration-api',
            title: i18n.t('pages.monitor_settings_page.api_8'),
            description: i18n.t('monitor.monitor_settings_page.api_168'),
            color: 'secondary',
            fields: [
              {
                id: 'integration_enableApiAccess',
                label: i18n.t('monitor.monitor_settings_page.api_169'),
                description: i18n.t('monitor.monitor_settings_page.api_170'),
                type: 'switch',
                value: integrationSettings.enableApiAccess,
                defaultValue: true,
              },
              {
                id: 'integration_apiRateLimit',
                label: i18n.t('pages.monitor_settings_page.api_9'),
                description: i18n.t('pages.monitor_settings_page.api0_10'),
                type: 'number',
                value: integrationSettings.apiRateLimit,
                defaultValue: 1000,
                helperText: i18n.t('pages.monitor_settings_page.0_11'),
                disabled: !integrationSettings.enableApiAccess,
              },
            ],
          },
        ],
      },
    ],
    [
      generalSettings,
      alertSettings,
      notificationSettings,
      datasourceSettings,
      permissionSettings,
      integrationSettings,
    ]
  );
  return (
    <SettingsPageTemplate
      title={i18n.t('monitor.monitor_settings_page.k171')}
      subtitle={i18n.t('monitor.monitor_settings_page.k172')}
      tabs={tabs}
      onSave={handleSave}
    />
  );
};
export default MonitorSettingsPage;
