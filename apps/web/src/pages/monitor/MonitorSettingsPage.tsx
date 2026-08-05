import React, { useState, useCallback, useMemo } from 'react';
import { Settings, AlertTriangle, Bell, Database, Shield, Plug } from 'lucide-react';

import { useNotificationStore } from '@/store';
import {
  SettingsPageTemplate,
  type SettingTab,
  type SettingValueType,
} from '@/components/templates';

export const MonitorSettingsPage: React.FC = () => {
  const addNotification = useNotificationStore((state) => state.addNotification);

  const [generalSettings, setGeneralSettings] = useState({
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

  const [alertSettings, setAlertSettings] = useState({
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

  const [notificationSettings, setNotificationSettings] = useState({
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

  const [datasourceSettings, setDatasourceSettings] = useState({
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

  const [permissionSettings, setPermissionSettings] = useState({
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

  const [integrationSettings, setIntegrationSettings] = useState({
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
        title: '保存成功',
        message: '监控设置已保存',
        type: 'success',
      });
    },
    [addNotification]
  );

  const tabs: SettingTab[] = useMemo(
    () => [
      {
        id: 'general',
        label: '通用设置',
        icon: <Settings size={18} />,
        sections: [
          {
            id: 'general-basic',
            title: '基础配置',
            description: '配置监控系统的基础参数',
            color: 'primary',
            fields: [
              {
                id: 'general_monitoringEnabled',
                label: '启用监控',
                description: '开启或关闭全局监控',
                type: 'switch',
                value: generalSettings.monitoringEnabled,
                defaultValue: true,
              },
              {
                id: 'general_dataRetentionDays',
                label: '数据保留时间（天）',
                description: '监控数据保留的天数',
                type: 'number',
                value: generalSettings.dataRetentionDays,
                defaultValue: 30,
                helperText: '监控数据保留的天数',
              },
              {
                id: 'general_sampleRate',
                label: '采样率（%）',
                description: '数据采样百分比，0-100',
                type: 'number',
                value: generalSettings.sampleRate,
                defaultValue: 100,
                helperText: '数据采样百分比，0-100',
              },
              {
                id: 'general_autoDiscovery',
                label: '自动发现',
                description: '自动发现新的监控目标',
                type: 'switch',
                value: generalSettings.autoDiscovery,
                defaultValue: false,
              },
            ],
          },
          {
            id: 'general-check',
            title: '检查配置',
            description: '配置监控检查相关参数',
            color: 'info',
            fields: [
              {
                id: 'general_heartbeatInterval',
                label: '心跳间隔（秒）',
                description: '监控目标心跳检测间隔',
                type: 'number',
                value: generalSettings.heartbeatInterval,
                defaultValue: 60,
                helperText: '监控目标心跳检测间隔',
              },
              {
                id: 'general_maxConcurrentChecks',
                label: '最大并发检查数',
                description: '同时执行的最大检查任务数',
                type: 'number',
                value: generalSettings.maxConcurrentChecks,
                defaultValue: 100,
                helperText: '同时执行的最大检查任务数',
              },
            ],
          },
          {
            id: 'general-observability',
            title: '可观测性',
            description: '配置指标、日志和链路追踪',
            color: 'secondary',
            fields: [
              {
                id: 'general_enableMetrics',
                label: '指标监控',
                description: '收集和存储指标数据',
                type: 'switch',
                value: generalSettings.enableMetrics,
                defaultValue: true,
              },
              {
                id: 'general_enableLogs',
                label: '日志监控',
                description: '收集和分析日志数据',
                type: 'switch',
                value: generalSettings.enableLogs,
                defaultValue: true,
              },
              {
                id: 'general_enableTraces',
                label: '链路追踪',
                description: '收集和分析分布式链路',
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
        label: '告警设置',
        icon: <AlertTriangle size={18} />,
        sections: [
          {
            id: 'alert-strategy',
            title: '告警策略',
            description: '配置默认告警策略和规则',
            color: 'warning',
            fields: [
              {
                id: 'alert_defaultAlertStrategy',
                label: '默认告警策略',
                description: '选择默认的告警策略类型',
                type: 'select',
                value: alertSettings.defaultAlertStrategy,
                defaultValue: 'threshold',
                options: [
                  { label: '阈值告警', value: 'threshold' },
                  { label: '异常检测', value: 'anomaly' },
                  { label: '预测告警', value: 'forecast' },
                  { label: '复合告警', value: 'composite' },
                ],
              },
              {
                id: 'alert_enableAutoRecover',
                label: '自动恢复',
                description: '指标恢复正常后自动解除告警',
                type: 'switch',
                value: alertSettings.enableAutoRecover,
                defaultValue: true,
              },
              {
                id: 'alert_autoRecoverMinutes',
                label: '自动恢复等待（分钟）',
                description: '指标持续正常多久后自动恢复',
                type: 'number',
                value: alertSettings.autoRecoverMinutes,
                defaultValue: 5,
                helperText: '指标持续正常多久后自动恢复',
                disabled: !alertSettings.enableAutoRecover,
              },
            ],
          },
          {
            id: 'alert-escalation',
            title: '升级机制',
            description: '配置告警升级规则',
            color: 'error',
            fields: [
              {
                id: 'alert_escalationEnabled',
                label: '启用告警升级',
                description: '开启告警升级机制',
                type: 'switch',
                value: alertSettings.escalationEnabled,
                defaultValue: true,
              },
              {
                id: 'alert_escalationLevels',
                label: '最大升级层级',
                description: '告警升级的最大层级',
                type: 'number',
                value: alertSettings.escalationLevels,
                defaultValue: 3,
                disabled: !alertSettings.escalationEnabled,
              },
              {
                id: 'alert_escalationInterval',
                label: '升级间隔（分钟）',
                description: '告警未处理多久后升级到下一级',
                type: 'number',
                value: alertSettings.escalationInterval,
                defaultValue: 30,
                helperText: '告警未处理多久后升级到下一级',
                disabled: !alertSettings.escalationEnabled,
              },
            ],
          },
          {
            id: 'alert-silence',
            title: '静默规则',
            description: '配置告警静默规则',
            color: 'info',
            fields: [
              {
                id: 'alert_enableSilenceRules',
                label: '启用静默规则',
                description: '允许在特定时间段静默告警',
                type: 'switch',
                value: alertSettings.enableSilenceRules,
                defaultValue: true,
              },
              {
                id: 'alert_maxSilenceDuration',
                label: '最大静默时长（小时）',
                description: '单次静默的最大持续时间',
                type: 'number',
                value: alertSettings.maxSilenceDuration,
                defaultValue: 24,
                helperText: '单次静默的最大持续时间',
                disabled: !alertSettings.enableSilenceRules,
              },
            ],
          },
          {
            id: 'alert-dedup',
            title: '去重设置',
            description: '配置告警去重规则',
            color: 'secondary',
            fields: [
              {
                id: 'alert_enableDeduplication',
                label: '告警去重',
                description: '合并相同告警避免通知轰炸',
                type: 'switch',
                value: alertSettings.enableDeduplication,
                defaultValue: true,
              },
              {
                id: 'alert_dedupWindow',
                label: '去重窗口（分钟）',
                description: '在此时间窗口内相同告警只通知一次',
                type: 'number',
                value: alertSettings.dedupWindow,
                defaultValue: 5,
                helperText: '在此时间窗口内相同告警只通知一次',
                disabled: !alertSettings.enableDeduplication,
              },
            ],
          },
        ],
      },
      {
        id: 'notification',
        label: '通知设置',
        icon: <Bell size={18} />,
        sections: [
          {
            id: 'notification-channels',
            title: '通知渠道',
            description: '配置告警通知的发送渠道',
            color: 'primary',
            fields: [
              {
                id: 'notification_emailEnabled',
                label: '邮件通知',
                description: '通过邮件发送告警通知',
                type: 'switch',
                value: notificationSettings.emailEnabled,
                defaultValue: true,
              },
              {
                id: 'notification_smsEnabled',
                label: '短信通知',
                description: '通过短信发送紧急告警',
                type: 'switch',
                value: notificationSettings.smsEnabled,
                defaultValue: false,
              },
              {
                id: 'notification_pushEnabled',
                label: '站内推送',
                description: '在系统内推送实时告警',
                type: 'switch',
                value: notificationSettings.pushEnabled,
                defaultValue: true,
              },
              {
                id: 'notification_wechatEnabled',
                label: '企业微信',
                description: '通过企业微信发送告警',
                type: 'switch',
                value: notificationSettings.wechatEnabled,
                defaultValue: true,
              },
              {
                id: 'notification_phoneEnabled',
                label: '电话通知',
                description: '通过电话语音发送严重告警',
                type: 'switch',
                value: notificationSettings.phoneEnabled,
                defaultValue: false,
              },
            ],
          },
          {
            id: 'notification-levels',
            title: '告警级别',
            description: '配置不同级别告警的通知',
            color: 'warning',
            fields: [
              {
                id: 'notification_criticalNotify',
                label: '严重告警通知',
                description: '是否通知严重级别告警',
                type: 'switch',
                value: notificationSettings.criticalNotify,
                defaultValue: true,
              },
              {
                id: 'notification_warningNotify',
                label: '警告通知',
                description: '是否通知警告级别告警',
                type: 'switch',
                value: notificationSettings.warningNotify,
                defaultValue: true,
              },
              {
                id: 'notification_infoNotify',
                label: '信息通知',
                description: '是否通知信息级别告警',
                type: 'switch',
                value: notificationSettings.infoNotify,
                defaultValue: false,
              },
            ],
          },
          {
            id: 'notification-config',
            title: '通知配置',
            description: '配置通知模板和联系人',
            color: 'secondary',
            fields: [
              {
                id: 'notification_defaultTemplate',
                label: '默认通知模板',
                description: '选择默认的通知模板',
                type: 'select',
                value: notificationSettings.defaultTemplate,
                defaultValue: 'standard',
                options: [
                  { label: '标准模板', value: 'standard' },
                  { label: '简洁模板', value: 'concise' },
                  { label: '详细模板', value: 'detailed' },
                  { label: '自定义模板', value: 'custom' },
                ],
              },
              {
                id: 'notification_notifyContacts',
                label: '默认通知联系人',
                description: '多个联系人用逗号分隔',
                type: 'text',
                value: notificationSettings.notifyContacts,
                defaultValue: 'admin,ops',
                helperText: '多个联系人用逗号分隔',
              },
            ],
          },
        ],
      },
      {
        id: 'datasource',
        label: '数据源',
        icon: <Database size={18} />,
        sections: [
          {
            id: 'datasource-config',
            title: '数据源配置',
            description: '配置监控数据源连接',
            color: 'primary',
            fields: [
              {
                id: 'datasource_primaryDatasource',
                label: '主数据源类型',
                description: '选择主数据源类型',
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
                label: '连接超时（秒）',
                description: '数据源连接超时时间',
                type: 'number',
                value: datasourceSettings.connectionTimeout,
                defaultValue: 30,
              },
              {
                id: 'datasource_maxRetries',
                label: '最大重试次数',
                description: '连接失败后的最大重试次数',
                type: 'number',
                value: datasourceSettings.maxRetries,
                defaultValue: 3,
              },
              {
                id: 'datasource_retryInterval',
                label: '重试间隔（秒）',
                description: '重试之间的间隔时间',
                type: 'number',
                value: datasourceSettings.retryInterval,
                defaultValue: 10,
              },
            ],
          },
          {
            id: 'datasource-ssl',
            title: 'SSL 配置',
            description: '配置数据源 SSL 连接',
            color: 'success',
            fields: [
              {
                id: 'datasource_enableSsl',
                label: '启用 SSL',
                description: '使用 SSL/TLS 加密连接',
                type: 'switch',
                value: datasourceSettings.enableSsl,
                defaultValue: true,
              },
              {
                id: 'datasource_sslVerify',
                label: 'SSL 证书验证',
                description: '验证服务端 SSL 证书',
                type: 'switch',
                value: datasourceSettings.sslVerify,
                defaultValue: true,
                disabled: !datasourceSettings.enableSsl,
              },
            ],
          },
          {
            id: 'datasource-optimization',
            title: '查询优化',
            description: '配置查询性能优化选项',
            color: 'info',
            fields: [
              {
                id: 'datasource_batchQueryEnabled',
                label: '批量查询',
                description: '合并多个查询减少请求次数',
                type: 'switch',
                value: datasourceSettings.batchQueryEnabled,
                defaultValue: true,
              },
              {
                id: 'datasource_batchSize',
                label: '批量大小',
                description: '单次批量查询的最大数量',
                type: 'number',
                value: datasourceSettings.batchSize,
                defaultValue: 100,
                disabled: !datasourceSettings.batchQueryEnabled,
              },
              {
                id: 'datasource_cacheEnabled',
                label: '查询缓存',
                description: '缓存查询结果提升性能',
                type: 'switch',
                value: datasourceSettings.cacheEnabled,
                defaultValue: true,
              },
              {
                id: 'datasource_cacheTTL',
                label: '缓存过期时间（秒）',
                description: '缓存结果的过期时间',
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
        label: '权限设置',
        icon: <Shield size={18} />,
        sections: [
          {
            id: 'permission-control',
            title: '权限控制',
            description: '配置监控系统权限控制方式',
            color: 'primary',
            fields: [
              {
                id: 'permission_enableRoleBased',
                label: '基于角色的权限',
                description: '使用系统角色控制监控访问',
                type: 'switch',
                value: permissionSettings.enableRoleBased,
                defaultValue: true,
              },
              {
                id: 'permission_enableDeptBased',
                label: '基于部门的权限',
                description: '使用组织架构控制监控访问',
                type: 'switch',
                value: permissionSettings.enableDeptBased,
                defaultValue: false,
              },
              {
                id: 'permission_adminCanManageAll',
                label: '管理员管理全部',
                description: '管理员可管理所有监控配置',
                type: 'switch',
                value: permissionSettings.adminCanManageAll,
                defaultValue: true,
              },
            ],
          },
          {
            id: 'permission-access',
            title: '访问控制',
            description: '配置用户访问权限',
            color: 'warning',
            fields: [
              {
                id: 'permission_allowViewAllDashboards',
                label: '查看所有仪表盘',
                description: '用户可查看所有监控仪表盘',
                type: 'switch',
                value: permissionSettings.allowViewAllDashboards,
                defaultValue: false,
              },
              {
                id: 'permission_allowCreateAlertRules',
                label: '创建告警规则',
                description: '允许用户创建自定义告警规则',
                type: 'switch',
                value: permissionSettings.allowCreateAlertRules,
                defaultValue: true,
              },
              {
                id: 'permission_allowExportData',
                label: '导出数据',
                description: '允许导出监控数据',
                type: 'switch',
                value: permissionSettings.allowExportData,
                defaultValue: true,
              },
            ],
          },
          {
            id: 'permission-roles',
            title: '角色配置',
            description: '配置监控相关角色',
            color: 'secondary',
            fields: [
              {
                id: 'permission_monitorAdminRole',
                label: '监控管理员角色',
                description: '拥有此角色的用户为监控系统管理员',
                type: 'text',
                value: permissionSettings.monitorAdminRole,
                defaultValue: 'monitor_admin',
                helperText: '拥有此角色的用户为监控系统管理员',
              },
              {
                id: 'permission_editorRole',
                label: '监控编辑者角色',
                description: '可编辑监控配置但不可管理权限',
                type: 'text',
                value: permissionSettings.editorRole,
                defaultValue: 'monitor_editor',
                helperText: '可编辑监控配置但不可管理权限',
              },
              {
                id: 'permission_viewerRole',
                label: '监控查看者角色',
                description: '仅可查看监控数据',
                type: 'text',
                value: permissionSettings.viewerRole,
                defaultValue: 'monitor_viewer',
                helperText: '仅可查看监控数据',
              },
            ],
          },
        ],
      },
      {
        id: 'integration',
        label: '集成设置',
        icon: <Plug size={18} />,
        sections: [
          {
            id: 'integration-prometheus',
            title: 'Prometheus',
            description: '配置 Prometheus 集成',
            color: 'primary',
            fields: [
              {
                id: 'integration_prometheusEnabled',
                label: '启用 Prometheus',
                description: '集成 Prometheus 监控系统',
                type: 'switch',
                value: integrationSettings.prometheusEnabled,
                defaultValue: true,
              },
              {
                id: 'integration_prometheusUrl',
                label: 'Prometheus 地址',
                description: 'Prometheus 服务地址',
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
            description: '配置 Grafana 集成',
            color: 'info',
            fields: [
              {
                id: 'integration_grafanaEnabled',
                label: '启用 Grafana',
                description: '集成 Grafana 可视化面板',
                type: 'switch',
                value: integrationSettings.grafanaEnabled,
                defaultValue: true,
              },
              {
                id: 'integration_grafanaUrl',
                label: 'Grafana 地址',
                description: 'Grafana 服务地址',
                type: 'text',
                value: integrationSettings.grafanaUrl,
                defaultValue: 'http://localhost:3000',
                placeholder: 'http://localhost:3000',
                disabled: !integrationSettings.grafanaEnabled,
              },
              {
                id: 'integration_grafanaApiKey',
                label: 'Grafana API Key',
                description: '用于访问 Grafana API',
                type: 'password',
                value: integrationSettings.grafanaApiKey,
                defaultValue: '',
                placeholder: '用于访问 Grafana API',
                disabled: !integrationSettings.grafanaEnabled,
              },
            ],
          },
          {
            id: 'integration-webhook',
            title: 'Webhook',
            description: '配置 Webhook 集成',
            color: 'warning',
            fields: [
              {
                id: 'integration_webhookEnabled',
                label: '启用 Webhook',
                description: '通过 Webhook 推送告警事件',
                type: 'switch',
                value: integrationSettings.webhookEnabled,
                defaultValue: false,
              },
              {
                id: 'integration_webhookUrl',
                label: 'Webhook 地址',
                description: '接收告警事件的 Webhook 地址',
                type: 'text',
                value: integrationSettings.webhookUrl,
                defaultValue: '',
                placeholder: 'https://example.com/webhook',
                disabled: !integrationSettings.webhookEnabled,
              },
              {
                id: 'integration_webhookSecret',
                label: 'Webhook 密钥',
                description: '用于签名验证的密钥',
                type: 'password',
                value: integrationSettings.webhookSecret,
                defaultValue: '',
                placeholder: '用于签名验证的密钥',
                disabled: !integrationSettings.webhookEnabled,
              },
            ],
          },
          {
            id: 'integration-api',
            title: 'API 访问',
            description: '配置 API 访问控制',
            color: 'secondary',
            fields: [
              {
                id: 'integration_enableApiAccess',
                label: '启用 API 访问',
                description: '允许通过 API 操作监控',
                type: 'switch',
                value: integrationSettings.enableApiAccess,
                defaultValue: true,
              },
              {
                id: 'integration_apiRateLimit',
                label: 'API 调用频率限制（次/分钟）',
                description: 'API 调用频率限制，0 表示不限制',
                type: 'number',
                value: integrationSettings.apiRateLimit,
                defaultValue: 1000,
                helperText: '0 表示不限制',
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
      title='监控设置'
      subtitle='配置监控系统的各项参数'
      tabs={tabs}
      onSave={handleSave}
    />
  );
};

export default MonitorSettingsPage;
