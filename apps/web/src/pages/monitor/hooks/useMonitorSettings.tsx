import { useState, useCallback, useMemo } from 'react';
import { Settings, AlertTriangle, Bell, Database, Shield, Plug } from 'lucide-react';
import { useNotificationStore } from '@/store';
import type { SettingTab, SettingValueType } from '@/components/templates';
import i18n from '@/i18n';

interface GeneralSettings {
  monitoringEnabled: boolean;
  dataRetentionDays: number;
  sampleRate: number;
  autoDiscovery: boolean;
  heartbeatInterval: number;
  maxConcurrentChecks: number;
  enableMetrics: boolean;
  enableLogs: boolean;
  enableTraces: boolean;
}
interface AlertSettings {
  defaultAlertStrategy: string;
  enableAutoRecover: boolean;
  autoRecoverMinutes: number;
  escalationEnabled: boolean;
  escalationLevels: number;
  escalationInterval: number;
  enableSilenceRules: boolean;
  maxSilenceDuration: number;
  enableDeduplication: boolean;
  dedupWindow: number;
}
interface NotificationSettings {
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
  wechatEnabled: boolean;
  phoneEnabled: boolean;
  criticalNotify: boolean;
  warningNotify: boolean;
  infoNotify: boolean;
  defaultTemplate: string;
  notifyContacts: string;
}
interface DatasourceSettings {
  primaryDatasource: string;
  connectionTimeout: number;
  maxRetries: number;
  retryInterval: number;
  enableSsl: boolean;
  sslVerify: boolean;
  batchQueryEnabled: boolean;
  batchSize: number;
  cacheEnabled: boolean;
  cacheTTL: number;
}
interface PermissionSettings {
  enableRoleBased: boolean;
  enableDeptBased: boolean;
  adminCanManageAll: boolean;
  allowViewAllDashboards: boolean;
  allowCreateAlertRules: boolean;
  allowExportData: boolean;
  monitorAdminRole: string;
  viewerRole: string;
  editorRole: string;
}
interface IntegrationSettings {
  prometheusEnabled: boolean;
  prometheusUrl: string;
  grafanaEnabled: boolean;
  grafanaUrl: string;
  grafanaApiKey: string;
  webhookEnabled: boolean;
  webhookUrl: string;
  webhookSecret: string;
  enableApiAccess: boolean;
  apiRateLimit: number;
}
type TranslateFn = (key: string) => string;
export function buildSettingsTabs(
  t: TranslateFn,
  generalSettings: GeneralSettings,
  alertSettings: AlertSettings,
  notificationSettings: NotificationSettings,
  datasourceSettings: DatasourceSettings,
  permissionSettings: PermissionSettings,
  integrationSettings: IntegrationSettings
): SettingTab[] {
  return [
    {
      id: 'general',
      label: i18n.t('monitor.settings.general_settings'),
      icon: <Settings size={18} />,
      sections: [
        {
          id: 'general-basic',
          title: i18n.t('monitor.settings.basic_config'),
          description: i18n.t('monitor.settings.configure_basic_monitoring_params'),
          color: 'primary',
          fields: [
            {
              id: 'general_monitoringEnabled',
              label: i18n.t('monitor.settings.enable_monitoring'),
              description: i18n.t('monitor.settings.toggle_global_monitoring'),
              type: 'switch',
              value: generalSettings.monitoringEnabled,
              defaultValue: true,
            },
            {
              id: 'general_dataRetentionDays',
              label: i18n.t('monitor.settings.data_retention_days'),
              description: i18n.t('monitor.settings.monitoring_data_retention_days'),
              type: 'number',
              value: generalSettings.dataRetentionDays,
              defaultValue: 30,
              helperText: i18n.t('monitor.settings.monitoring_data_retention_days'),
            },
            {
              id: 'general_sampleRate',
              label: i18n.t('monitor.settings.sample_rate_pct'),
              description: i18n.t('monitor.settings.data_sample_pct_desc'),
              type: 'number',
              value: generalSettings.sampleRate,
              defaultValue: 100,
              helperText: i18n.t('monitor.settings.data_sample_pct_desc'),
            },
            {
              id: 'general_autoDiscovery',
              label: i18n.t('monitor.settings.auto_discovery'),
              description: i18n.t('monitor.settings.auto_discover_new_targets'),
              type: 'switch',
              value: generalSettings.autoDiscovery,
              defaultValue: false,
            },
          ],
        },
        {
          id: 'general-check',
          title: i18n.t('monitor.settings.check_config'),
          description: i18n.t('monitor.settings.configure_check_params'),
          color: 'info',
          fields: [
            {
              id: 'general_heartbeatInterval',
              label: i18n.t('monitor.settings.heartbeat_interval_sec'),
              description: i18n.t('monitor.settings.heartbeat_interval_desc'),
              type: 'number',
              value: generalSettings.heartbeatInterval,
              defaultValue: 60,
              helperText: i18n.t('monitor.settings.heartbeat_interval_desc'),
            },
            {
              id: 'general_maxConcurrentChecks',
              label: i18n.t('monitor.settings.max_concurrent_checks'),
              description: i18n.t('monitor.settings.max_concurrent_checks_desc'),
              type: 'number',
              value: generalSettings.maxConcurrentChecks,
              defaultValue: 100,
              helperText: i18n.t('monitor.settings.max_concurrent_checks_desc'),
            },
          ],
        },
        {
          id: 'general-observability',
          title: i18n.t('monitor.settings.observability'),
          description: i18n.t('monitor.settings.configure_metrics_logs_traces'),
          color: 'secondary',
          fields: [
            {
              id: 'general_enableMetrics',
              label: i18n.t('monitor.settings.metrics_monitoring'),
              description: i18n.t('monitor.settings.collect_store_metrics'),
              type: 'switch',
              value: generalSettings.enableMetrics,
              defaultValue: true,
            },
            {
              id: 'general_enableLogs',
              label: i18n.t('monitor.settings.log_monitoring'),
              description: i18n.t('monitor.settings.collect_analyze_logs'),
              type: 'switch',
              value: generalSettings.enableLogs,
              defaultValue: true,
            },
            {
              id: 'general_enableTraces',
              label: i18n.t('monitor.settings.trace_tracking'),
              description: i18n.t('monitor.settings.collect_analyze_traces'),
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
      label: i18n.t('monitor.settings.alert_settings'),
      icon: <AlertTriangle size={18} />,
      sections: [
        {
          id: 'alert-strategy',
          title: i18n.t('monitor.settings.alert_strategy'),
          description: i18n.t('monitor.settings.configure_default_alert_strategy'),
          color: 'warning',
          fields: [
            {
              id: 'alert_defaultAlertStrategy',
              label: i18n.t('monitor.settings.default_alert_strategy'),
              description: i18n.t('monitor.settings.select_default_alert_strategy'),
              type: 'select',
              value: alertSettings.defaultAlertStrategy,
              defaultValue: 'threshold',
              options: [
                { label: i18n.t('monitor.settings.threshold_alert'), value: 'threshold' },
                { label: i18n.t('monitor.settings.anomaly_detection'), value: 'anomaly' },
                { label: i18n.t('monitor.settings.forecast_alert'), value: 'forecast' },
                { label: i18n.t('monitor.settings.composite_alert'), value: 'composite' },
              ],
            },
            {
              id: 'alert_enableAutoRecover',
              label: i18n.t('monitor.settings.auto_recover'),
              description: i18n.t('monitor.settings.auto_recover_desc'),
              type: 'switch',
              value: alertSettings.enableAutoRecover,
              defaultValue: true,
            },
            {
              id: 'alert_autoRecoverMinutes',
              label: i18n.t('monitor.settings.auto_recover_wait_min'),
              description: i18n.t('monitor.settings.auto_recover_duration_desc'),
              type: 'number',
              value: alertSettings.autoRecoverMinutes,
              defaultValue: 5,
              helperText: i18n.t('monitor.settings.auto_recover_duration_desc'),
              disabled: !alertSettings.enableAutoRecover,
            },
          ],
        },
        {
          id: 'alert-escalation',
          title: i18n.t('monitor.settings.escalation_mechanism'),
          description: i18n.t('monitor.settings.configure_escalation_rules'),
          color: 'error',
          fields: [
            {
              id: 'alert_escalationEnabled',
              label: i18n.t('monitor.settings.enable_escalation'),
              description: i18n.t('monitor.settings.enable_escalation_desc'),
              type: 'switch',
              value: alertSettings.escalationEnabled,
              defaultValue: true,
            },
            {
              id: 'alert_escalationLevels',
              label: i18n.t('monitor.settings.max_escalation_levels'),
              description: i18n.t('monitor.settings.max_escalation_levels_desc'),
              type: 'number',
              value: alertSettings.escalationLevels,
              defaultValue: 3,
              disabled: !alertSettings.escalationEnabled,
            },
            {
              id: 'alert_escalationInterval',
              label: i18n.t('monitor.settings.escalation_interval_min'),
              description: i18n.t('monitor.settings.escalation_interval_desc'),
              type: 'number',
              value: alertSettings.escalationInterval,
              defaultValue: 30,
              helperText: i18n.t('monitor.settings.escalation_interval_desc'),
              disabled: !alertSettings.escalationEnabled,
            },
          ],
        },
        {
          id: 'alert-silence',
          title: i18n.t('monitor.settings.silence_rules'),
          description: i18n.t('monitor.settings.configure_silence_rules'),
          color: 'info',
          fields: [
            {
              id: 'alert_enableSilenceRules',
              label: i18n.t('monitor.settings.enable_silence_rules'),
              description: i18n.t('monitor.settings.enable_silence_desc'),
              type: 'switch',
              value: alertSettings.enableSilenceRules,
              defaultValue: true,
            },
            {
              id: 'alert_maxSilenceDuration',
              label: i18n.t('monitor.settings.max_silence_hours'),
              description: i18n.t('monitor.settings.max_silence_duration_desc'),
              type: 'number',
              value: alertSettings.maxSilenceDuration,
              defaultValue: 24,
              helperText: i18n.t('monitor.settings.max_silence_duration_desc'),
              disabled: !alertSettings.enableSilenceRules,
            },
          ],
        },
        {
          id: 'alert-dedup',
          title: i18n.t('monitor.settings.dedup_settings'),
          description: i18n.t('monitor.settings.configure_dedup_rules'),
          color: 'secondary',
          fields: [
            {
              id: 'alert_enableDeduplication',
              label: i18n.t('monitor.settings.alert_dedup'),
              description: i18n.t('monitor.settings.dedup_desc'),
              type: 'switch',
              value: alertSettings.enableDeduplication,
              defaultValue: true,
            },
            {
              id: 'alert_dedupWindow',
              label: i18n.t('monitor.settings.dedup_window_min'),
              description: i18n.t('monitor.settings.dedup_window_desc'),
              type: 'number',
              value: alertSettings.dedupWindow,
              defaultValue: 5,
              helperText: i18n.t('monitor.settings.dedup_window_desc'),
              disabled: !alertSettings.enableDeduplication,
            },
          ],
        },
      ],
    },
    {
      id: 'notification',
      label: i18n.t('monitor.settings.notification_settings'),
      icon: <Bell size={18} />,
      sections: [
        {
          id: 'notification-channels',
          title: i18n.t('monitor.settings.notification_channels'),
          description: i18n.t('monitor.settings.configure_notification_channels'),
          color: 'primary',
          fields: [
            {
              id: 'notification_emailEnabled',
              label: i18n.t('monitor.settings.email_notification'),
              description: i18n.t('monitor.settings.email_notification_desc'),
              type: 'switch',
              value: notificationSettings.emailEnabled,
              defaultValue: true,
            },
            {
              id: 'notification_smsEnabled',
              label: i18n.t('monitor.settings.sms_notification'),
              description: i18n.t('monitor.settings.sms_notification_desc'),
              type: 'switch',
              value: notificationSettings.smsEnabled,
              defaultValue: false,
            },
            {
              id: 'notification_pushEnabled',
              label: i18n.t('monitor.settings.in_app_push'),
              description: i18n.t('monitor.settings.in_app_push_desc'),
              type: 'switch',
              value: notificationSettings.pushEnabled,
              defaultValue: true,
            },
            {
              id: 'notification_wechatEnabled',
              label: i18n.t('monitor.settings.wechat_work'),
              description: i18n.t('monitor.settings.wechat_work_desc'),
              type: 'switch',
              value: notificationSettings.wechatEnabled,
              defaultValue: true,
            },
            {
              id: 'notification_phoneEnabled',
              label: i18n.t('monitor.settings.phone_notification'),
              description: i18n.t('monitor.settings.phone_notification_desc'),
              type: 'switch',
              value: notificationSettings.phoneEnabled,
              defaultValue: false,
            },
          ],
        },
        {
          id: 'notification-levels',
          title: i18n.t('monitor.settings.alert_levels'),
          description: i18n.t('monitor.settings.configure_alert_level_notifications'),
          color: 'warning',
          fields: [
            {
              id: 'notification_criticalNotify',
              label: i18n.t('monitor.settings.critical_alert_notify'),
              description: i18n.t('monitor.settings.critical_notify_desc'),
              type: 'switch',
              value: notificationSettings.criticalNotify,
              defaultValue: true,
            },
            {
              id: 'notification_warningNotify',
              label: i18n.t('monitor.settings.warning_notify'),
              description: i18n.t('monitor.settings.warning_notify_desc'),
              type: 'switch',
              value: notificationSettings.warningNotify,
              defaultValue: true,
            },
            {
              id: 'notification_infoNotify',
              label: i18n.t('monitor.settings.info_notify'),
              description: i18n.t('monitor.settings.info_notify_desc'),
              type: 'switch',
              value: notificationSettings.infoNotify,
              defaultValue: false,
            },
          ],
        },
        {
          id: 'notification-config',
          title: i18n.t('monitor.settings.notification_config'),
          description: i18n.t('monitor.settings.configure_template_and_contacts'),
          color: 'secondary',
          fields: [
            {
              id: 'notification_defaultTemplate',
              label: i18n.t('monitor.settings.default_notification_template'),
              description: i18n.t('monitor.settings.select_default_template'),
              type: 'select',
              value: notificationSettings.defaultTemplate,
              defaultValue: 'standard',
              options: [
                { label: i18n.t('monitor.settings.standard_template'), value: 'standard' },
                { label: i18n.t('monitor.settings.concise_template'), value: 'concise' },
                { label: i18n.t('monitor.settings.detailed_template'), value: 'detailed' },
                { label: i18n.t('monitor.settings.custom_template'), value: 'custom' },
              ],
            },
            {
              id: 'notification_notifyContacts',
              label: i18n.t('monitor.settings.default_notify_contacts'),
              description: i18n.t('monitor.settings.contacts_separator_desc'),
              type: 'text',
              value: notificationSettings.notifyContacts,
              defaultValue: 'admin,ops',
              helperText: i18n.t('monitor.settings.contacts_separator_desc'),
            },
          ],
        },
      ],
    },
    {
      id: 'datasource',
      label: i18n.t('monitor.settings.datasource'),
      icon: <Database size={18} />,
      sections: [
        {
          id: 'datasource-config',
          title: i18n.t('monitor.settings.datasource_config'),
          description: i18n.t('monitor.settings.configure_datasource_connection'),
          color: 'primary',
          fields: [
            {
              id: 'datasource_primaryDatasource',
              label: i18n.t('monitor.settings.primary_datasource_type'),
              description: i18n.t('monitor.settings.select_primary_datasource'),
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
              label: i18n.t('monitor.settings.connection_timeout_sec'),
              description: i18n.t('monitor.settings.datasource_timeout_desc'),
              type: 'number',
              value: datasourceSettings.connectionTimeout,
              defaultValue: 30,
            },
            {
              id: 'datasource_maxRetries',
              label: i18n.t('monitor.settings.max_retries'),
              description: i18n.t('monitor.settings.max_retries_desc'),
              type: 'number',
              value: datasourceSettings.maxRetries,
              defaultValue: 3,
            },
            {
              id: 'datasource_retryInterval',
              label: i18n.t('monitor.settings.retry_interval_sec'),
              description: i18n.t('monitor.settings.retry_interval_desc'),
              type: 'number',
              value: datasourceSettings.retryInterval,
              defaultValue: 10,
            },
          ],
        },
        {
          id: 'datasource-ssl',
          title: i18n.t('monitor.settings.ssl_config'),
          description: i18n.t('monitor.settings.configure_ssl_connection'),
          color: 'success',
          fields: [
            {
              id: 'datasource_enableSsl',
              label: i18n.t('monitor.settings.enable_ssl'),
              description: i18n.t('monitor.settings.use_ssl_tls'),
              type: 'switch',
              value: datasourceSettings.enableSsl,
              defaultValue: true,
            },
            {
              id: 'datasource_sslVerify',
              label: i18n.t('monitor.settings.ssl_verify'),
              description: i18n.t('monitor.settings.verify_ssl_cert'),
              type: 'switch',
              value: datasourceSettings.sslVerify,
              defaultValue: true,
              disabled: !datasourceSettings.enableSsl,
            },
          ],
        },
        {
          id: 'datasource-optimization',
          title: i18n.t('monitor.settings.query_optimization'),
          description: i18n.t('monitor.settings.configure_query_optimization'),
          color: 'info',
          fields: [
            {
              id: 'datasource_batchQueryEnabled',
              label: i18n.t('monitor.settings.batch_query'),
              description: i18n.t('monitor.settings.batch_query_desc'),
              type: 'switch',
              value: datasourceSettings.batchQueryEnabled,
              defaultValue: true,
            },
            {
              id: 'datasource_batchSize',
              label: i18n.t('monitor.settings.batch_size'),
              description: i18n.t('monitor.settings.max_batch_size'),
              type: 'number',
              value: datasourceSettings.batchSize,
              defaultValue: 100,
              disabled: !datasourceSettings.batchQueryEnabled,
            },
            {
              id: 'datasource_cacheEnabled',
              label: i18n.t('monitor.settings.query_cache'),
              description: i18n.t('monitor.settings.cache_query_desc'),
              type: 'switch',
              value: datasourceSettings.cacheEnabled,
              defaultValue: true,
            },
            {
              id: 'datasource_cacheTTL',
              label: i18n.t('monitor.settings.cache_ttl_sec'),
              description: i18n.t('monitor.settings.cache_ttl_desc'),
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
      label: i18n.t('monitor.settings.permission_settings'),
      icon: <Shield size={18} />,
      sections: [
        {
          id: 'permission-control',
          title: i18n.t('monitor.settings.access_control'),
          description: i18n.t('monitor.settings.configure_access_control'),
          color: 'primary',
          fields: [
            {
              id: 'permission_enableRoleBased',
              label: i18n.t('monitor.settings.role_based_permission'),
              description: i18n.t('monitor.settings.use_system_roles'),
              type: 'switch',
              value: permissionSettings.enableRoleBased,
              defaultValue: true,
            },
            {
              id: 'permission_enableDeptBased',
              label: i18n.t('monitor.settings.dept_based_permission'),
              description: i18n.t('monitor.settings.use_org_structure'),
              type: 'switch',
              value: permissionSettings.enableDeptBased,
              defaultValue: false,
            },
            {
              id: 'permission_adminCanManageAll',
              label: i18n.t('monitor.settings.admin_manage_all'),
              description: i18n.t('monitor.settings.admin_manage_all_desc'),
              type: 'switch',
              value: permissionSettings.adminCanManageAll,
              defaultValue: true,
            },
          ],
        },
        {
          id: 'permission-access',
          title: i18n.t('monitor.settings.access_control_settings'),
          description: i18n.t('monitor.settings.configure_permissions'),
          color: 'warning',
          fields: [
            {
              id: 'permission_allowViewAllDashboards',
              label: i18n.t('monitor.settings.view_all_dashboards'),
              description: i18n.t('monitor.settings.view_all_dashboards_desc'),
              type: 'switch',
              value: permissionSettings.allowViewAllDashboards,
              defaultValue: false,
            },
            {
              id: 'permission_allowCreateAlertRules',
              label: i18n.t('monitor.settings.create_alert_rules'),
              description: i18n.t('monitor.settings.allow_custom_alert_rules'),
              type: 'switch',
              value: permissionSettings.allowCreateAlertRules,
              defaultValue: true,
            },
            {
              id: 'permission_allowExportData',
              label: i18n.t('monitor.settings.export_data'),
              description: i18n.t('monitor.settings.allow_export_data'),
              type: 'switch',
              value: permissionSettings.allowExportData,
              defaultValue: true,
            },
          ],
        },
        {
          id: 'permission-roles',
          title: i18n.t('monitor.settings.role_config'),
          description: i18n.t('monitor.settings.configure_monitor_roles'),
          color: 'secondary',
          fields: [
            {
              id: 'permission_monitorAdminRole',
              label: i18n.t('monitor.settings.monitor_admin_role'),
              description: i18n.t('monitor.settings.monitor_admin_role_desc'),
              type: 'text',
              value: permissionSettings.monitorAdminRole,
              defaultValue: 'monitor_admin',
              helperText: i18n.t('monitor.settings.monitor_admin_role_desc'),
            },
            {
              id: 'permission_editorRole',
              label: i18n.t('monitor.settings.monitor_editor_role'),
              description: i18n.t('monitor.settings.edit_without_permission_mgmt'),
              type: 'text',
              value: permissionSettings.editorRole,
              defaultValue: 'monitor_editor',
              helperText: i18n.t('monitor.settings.edit_without_permission_mgmt'),
            },
            {
              id: 'permission_viewerRole',
              label: i18n.t('monitor.settings.monitor_viewer_role'),
              description: i18n.t('monitor.settings.view_only_monitoring'),
              type: 'text',
              value: permissionSettings.viewerRole,
              defaultValue: 'monitor_viewer',
              helperText: i18n.t('monitor.settings.view_only_monitoring'),
            },
          ],
        },
      ],
    },
    {
      id: 'integration',
      label: i18n.t('monitor.settings.integration_settings'),
      icon: <Plug size={18} />,
      sections: [
        {
          id: 'integration-prometheus',
          title: 'Prometheus',
          description: i18n.t('monitor.settings.configure_prometheus'),
          color: 'primary',
          fields: [
            {
              id: 'integration_prometheusEnabled',
              label: i18n.t('monitor.settings.enable_prometheus'),
              description: i18n.t('monitor.settings.integrate_prometheus'),
              type: 'switch',
              value: integrationSettings.prometheusEnabled,
              defaultValue: true,
            },
            {
              id: 'integration_prometheusUrl',
              label: i18n.t('monitor.settings.prometheus_url'),
              description: i18n.t('monitor.settings.prometheus_url_desc'),
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
          description: i18n.t('monitor.settings.configure_grafana'),
          color: 'info',
          fields: [
            {
              id: 'integration_grafanaEnabled',
              label: i18n.t('monitor.settings.enable_grafana'),
              description: i18n.t('monitor.settings.integrate_grafana'),
              type: 'switch',
              value: integrationSettings.grafanaEnabled,
              defaultValue: true,
            },
            {
              id: 'integration_grafanaUrl',
              label: i18n.t('monitor.settings.grafana_url'),
              description: i18n.t('monitor.settings.grafana_url_desc'),
              type: 'text',
              value: integrationSettings.grafanaUrl,
              defaultValue: 'http://localhost:3000',
              placeholder: 'http://localhost:3000',
              disabled: !integrationSettings.grafanaEnabled,
            },
            {
              id: 'integration_grafanaApiKey',
              label: 'Grafana API Key',
              description: i18n.t('monitor.settings.grafana_api_key_desc'),
              type: 'password',
              value: integrationSettings.grafanaApiKey,
              defaultValue: '',
              placeholder: i18n.t('monitor.settings.grafana_api_key_desc'),
              disabled: !integrationSettings.grafanaEnabled,
            },
          ],
        },
        {
          id: 'integration-webhook',
          title: 'Webhook',
          description: i18n.t('monitor.settings.configure_webhook'),
          color: 'warning',
          fields: [
            {
              id: 'integration_webhookEnabled',
              label: i18n.t('monitor.settings.enable_webhook'),
              description: i18n.t('monitor.settings.webhook_push_desc'),
              type: 'switch',
              value: integrationSettings.webhookEnabled,
              defaultValue: false,
            },
            {
              id: 'integration_webhookUrl',
              label: i18n.t('monitor.settings.webhook_url'),
              description: i18n.t('monitor.settings.webhook_url_desc'),
              type: 'text',
              value: integrationSettings.webhookUrl,
              defaultValue: '',
              placeholder: 'https://example.com/webhook',
              disabled: !integrationSettings.webhookEnabled,
            },
            {
              id: 'integration_webhookSecret',
              label: i18n.t('monitor.settings.webhook_secret'),
              description: i18n.t('monitor.settings.webhook_secret_desc'),
              type: 'password',
              value: integrationSettings.webhookSecret,
              defaultValue: '',
              placeholder: i18n.t('monitor.settings.webhook_secret_desc'),
              disabled: !integrationSettings.webhookEnabled,
            },
          ],
        },
        {
          id: 'integration-api',
          title: i18n.t('monitor.settings.api_access'),
          description: i18n.t('monitor.settings.configure_api_access'),
          color: 'secondary',
          fields: [
            {
              id: 'integration_enableApiAccess',
              label: i18n.t('monitor.settings.enable_api_access'),
              description: i18n.t('monitor.settings.allow_api_operations'),
              type: 'switch',
              value: integrationSettings.enableApiAccess,
              defaultValue: true,
            },
            {
              id: 'integration_apiRateLimit',
              label: i18n.t('monitor.settings.api_rate_limit'),
              description: i18n.t('monitor.settings.api_rate_limit_desc'),
              type: 'number',
              value: integrationSettings.apiRateLimit,
              defaultValue: 1000,
              helperText: i18n.t('monitor.settings.no_limit'),
              disabled: !integrationSettings.enableApiAccess,
            },
          ],
        },
      ],
    },
  ];
}
export const useMonitorSettings = () => {
  const addNotification = useNotificationStore((state) => state.addNotification);
  const [generalSettings, setGeneralSettings] = useState<GeneralSettings>({
    monitoringEnabled: true,
    dataRetentionDays: 30,
    sampleRate: 100,
    autoDiscovery: false,
    heartbeatInterval: 60,
    maxConcurrentChecks: 100,
    enableMetrics: true,
    enableLogs: true,
    enableTraces: false,
  });
  const [alertSettings, setAlertSettings] = useState<AlertSettings>({
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
  });
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
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
  });
  const [datasourceSettings, setDatasourceSettings] = useState<DatasourceSettings>({
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
  });
  const [permissionSettings, setPermissionSettings] = useState<PermissionSettings>({
    enableRoleBased: true,
    enableDeptBased: false,
    adminCanManageAll: true,
    allowViewAllDashboards: false,
    allowCreateAlertRules: true,
    allowExportData: true,
    monitorAdminRole: 'monitor_admin',
    viewerRole: 'monitor_viewer',
    editorRole: 'monitor_editor',
  });
  const [integrationSettings, setIntegrationSettings] = useState<IntegrationSettings>({
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
  });
  const handleSave = useCallback(
    async (data: Record<string, SettingValueType>) => {
      Object.keys(data).forEach((key) => {
        if (key.startsWith('general_')) {
          const settingKey = key.replace('general_', '');
          setGeneralSettings((prev) => ({
            ...prev,
            [settingKey]: data[key],
          }));
        } else if (key.startsWith('alert_')) {
          const settingKey = key.replace('alert_', '');
          setAlertSettings((prev) => ({
            ...prev,
            [settingKey]: data[key],
          }));
        } else if (key.startsWith('notification_')) {
          const settingKey = key.replace('notification_', '');
          setNotificationSettings((prev) => ({
            ...prev,
            [settingKey]: data[key],
          }));
        } else if (key.startsWith('datasource_')) {
          const settingKey = key.replace('datasource_', '');
          setDatasourceSettings((prev) => ({
            ...prev,
            [settingKey]: data[key],
          }));
        } else if (key.startsWith('permission_')) {
          const settingKey = key.replace('permission_', '');
          setPermissionSettings((prev) => ({
            ...prev,
            [settingKey]: data[key],
          }));
        } else if (key.startsWith('integration_')) {
          const settingKey = key.replace('integration_', '');
          setIntegrationSettings((prev) => ({
            ...prev,
            [settingKey]: data[key],
          }));
        }
      });
      addNotification({
        title: i18n.t('monitor.settings.save_success'),
        message: i18n.t('monitor.settings.monitor_settings_saved'),
        type: 'success',
      });
    },
    [addNotification, i18n.t]
  );
  const tabs = useMemo(
    () =>
      buildSettingsTabs(
        i18n.t,
        generalSettings,
        alertSettings,
        notificationSettings,
        datasourceSettings,
        permissionSettings,
        integrationSettings
      ),
    [
      i18n.t,
      generalSettings,
      alertSettings,
      notificationSettings,
      datasourceSettings,
      permissionSettings,
      integrationSettings,
    ]
  );
  return {
    generalSettings,
    setGeneralSettings,
    alertSettings,
    setAlertSettings,
    notificationSettings,
    setNotificationSettings,
    datasourceSettings,
    setDatasourceSettings,
    permissionSettings,
    setPermissionSettings,
    integrationSettings,
    setIntegrationSettings,
    handleSave,
    tabs,
  };
};
