import React, { useState, useCallback, useMemo } from 'react';
import { Settings, Bell, MessageSquare, Zap, Bookmark } from 'lucide-react';

import { useNotificationStore } from '@/store';
import {
  SettingsPageTemplate,
  type SettingTab,
  type SettingValueType,
} from '@/components/templates';

export const NotificationSettingsPage: React.FC = () => {
  const addNotification = useNotificationStore((state) => state.addNotification);

  const [generalSettings, setGeneralSettings] = useState({
    notificationEnabled: true,
    doNotDisturbEnabled: false,
    doNotDisturbStart: '22:00',
    doNotDisturbEnd: '08:00',
    soundEnabled: true,
    vibrationEnabled: false,
    badgeEnabled: true,
  });

  const [channelSettings, setChannelSettings] = useState({
    inAppEnabled: true,
    emailEnabled: true,
    smsEnabled: false,
    pushEnabled: true,
    wechatEnabled: false,
    emailAddress: 'user@example.com',
    smsPhone: '138****8888',
    wechatCorpId: '',
  });

  const [messageSettings, setMessageSettings] = useState({
    enableCategory: true,
    defaultImportance: 'normal',
    autoReadEnabled: false,
    autoReadDelay: 5,
    markAsReadOnOpen: true,
    showSenderAvatar: true,
    maxDisplayCount: 100,
    groupByType: true,
  });

  const [subscriptionSettings, setSubscriptionSettings] = useState({
    systemAnnouncement: true,
    workflowNotification: true,
    taskReminder: true,
    messageReply: true,
    securityAlert: true,
    weeklyReport: false,
    productUpdate: false,
    marketingMessage: false,
  });

  const [advancedSettings, setAdvancedSettings] = useState({
    retryEnabled: true,
    maxRetryCount: 3,
    retryInterval: 5,
    rateLimitEnabled: true,
    maxPerMinute: 60,
    maxPerHour: 1000,
    webhookEnabled: false,
    webhookUrl: '',
    webhookSecret: '',
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
        } else if (key.startsWith('channel_')) {
          const settingKey = key.replace('channel_', '');
          setChannelSettings((prev) => ({
            ...prev,
            [settingKey]: data[key],
          }));
        } else if (key.startsWith('message_')) {
          const settingKey = key.replace('message_', '');
          setMessageSettings((prev) => ({
            ...prev,
            [settingKey]: data[key],
          }));
        } else if (key.startsWith('subscription_')) {
          const settingKey = key.replace('subscription_', '');
          setSubscriptionSettings((prev) => ({
            ...prev,
            [settingKey]: data[key],
          }));
        } else if (key.startsWith('advanced_')) {
          const settingKey = key.replace('advanced_', '');
          setAdvancedSettings((prev) => ({
            ...prev,
            [settingKey]: data[key],
          }));
        }
      });

      addNotification({
        title: '保存成功',
        message: '通知设置已保存',
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
            id: 'general-notification',
            title: '通知开关',
            description: '配置通知总开关和基础行为',
            color: 'primary',
            fields: [
              {
                id: 'general_notificationEnabled',
                label: '总通知开关',
                description: '关闭后将不再接收任何通知',
                type: 'switch',
                value: generalSettings.notificationEnabled,
                defaultValue: true,
              },
              {
                id: 'general_soundEnabled',
                label: '声音提醒',
                description: '收到通知时播放提示音',
                type: 'switch',
                value: generalSettings.soundEnabled,
                defaultValue: true,
                disabled: !generalSettings.notificationEnabled,
              },
              {
                id: 'general_vibrationEnabled',
                label: '震动提醒',
                description: '收到通知时设备震动',
                type: 'switch',
                value: generalSettings.vibrationEnabled,
                defaultValue: false,
                disabled: !generalSettings.notificationEnabled,
              },
              {
                id: 'general_badgeEnabled',
                label: '角标显示',
                description: '在应用图标上显示未读数量',
                type: 'switch',
                value: generalSettings.badgeEnabled,
                defaultValue: true,
                disabled: !generalSettings.notificationEnabled,
              },
            ],
          },
          {
            id: 'general-dnd',
            title: '免打扰时段',
            description: '配置免打扰时间段',
            color: 'warning',
            fields: [
              {
                id: 'general_doNotDisturbEnabled',
                label: '启用免打扰',
                description: '在指定时段内静默通知',
                type: 'switch',
                value: generalSettings.doNotDisturbEnabled,
                defaultValue: false,
              },
              {
                id: 'general_doNotDisturbStart',
                label: '开始时间',
                description: '免打扰开始时间',
                type: 'text',
                value: generalSettings.doNotDisturbStart,
                defaultValue: '22:00',
                disabled: !generalSettings.doNotDisturbEnabled,
                placeholder: 'HH:mm',
              },
              {
                id: 'general_doNotDisturbEnd',
                label: '结束时间',
                description: '免打扰结束时间',
                type: 'text',
                value: generalSettings.doNotDisturbEnd,
                defaultValue: '08:00',
                disabled: !generalSettings.doNotDisturbEnabled,
                placeholder: 'HH:mm',
              },
            ],
          },
        ],
      },
      {
        id: 'channel',
        label: '渠道设置',
        icon: <Bell size={18} />,
        sections: [
          {
            id: 'channel-settings',
            title: '通知渠道',
            description: '配置通知发送渠道和相关参数',
            color: 'primary',
            fields: [
              {
                id: 'channel_inAppEnabled',
                label: '站内信',
                description: '系统内消息通知',
                type: 'switch',
                value: channelSettings.inAppEnabled,
                defaultValue: true,
              },
              {
                id: 'channel_emailEnabled',
                label: '邮件通知',
                description: '通过邮件发送通知',
                type: 'switch',
                value: channelSettings.emailEnabled,
                defaultValue: true,
              },
              {
                id: 'channel_emailAddress',
                label: '通知邮箱',
                description: '接收通知的邮箱地址',
                type: 'text',
                value: channelSettings.emailAddress,
                defaultValue: 'user@example.com',
                disabled: !channelSettings.emailEnabled,
                placeholder: '请输入接收通知的邮箱',
              },
              {
                id: 'channel_smsEnabled',
                label: '短信通知',
                description: '通过短信发送紧急通知',
                type: 'switch',
                value: channelSettings.smsEnabled,
                defaultValue: false,
              },
              {
                id: 'channel_smsPhone',
                label: '接收手机号',
                description: '接收短信的手机号码',
                type: 'text',
                value: channelSettings.smsPhone,
                defaultValue: '138****8888',
                disabled: !channelSettings.smsEnabled,
                placeholder: '请输入接收短信的手机号',
              },
              {
                id: 'channel_pushEnabled',
                label: '推送通知',
                description: '浏览器/APP 推送通知',
                type: 'switch',
                value: channelSettings.pushEnabled,
                defaultValue: true,
              },
              {
                id: 'channel_wechatEnabled',
                label: '企业微信',
                description: '通过企业微信发送通知',
                type: 'switch',
                value: channelSettings.wechatEnabled,
                defaultValue: false,
              },
              {
                id: 'channel_wechatCorpId',
                label: '企业微信 CorpID',
                description: '企业微信的 CorpID',
                type: 'text',
                value: channelSettings.wechatCorpId,
                defaultValue: '',
                disabled: !channelSettings.wechatEnabled,
                placeholder: '请输入企业微信 CorpID',
              },
            ],
          },
        ],
      },
      {
        id: 'message',
        label: '消息设置',
        icon: <MessageSquare size={18} />,
        sections: [
          {
            id: 'message-category',
            title: '消息分类',
            description: '配置消息展示和分类方式',
            color: 'primary',
            fields: [
              {
                id: 'message_enableCategory',
                label: '启用消息分类',
                description: '按类型分组显示消息',
                type: 'switch',
                value: messageSettings.enableCategory,
                defaultValue: true,
              },
              {
                id: 'message_groupByType',
                label: '按类型分组',
                description: '消息列表按类型分组展示',
                type: 'switch',
                value: messageSettings.groupByType,
                defaultValue: true,
                disabled: !messageSettings.enableCategory,
              },
              {
                id: 'message_showSenderAvatar',
                label: '显示发送者头像',
                description: '在消息列表中显示头像',
                type: 'switch',
                value: messageSettings.showSenderAvatar,
                defaultValue: true,
              },
            ],
          },
          {
            id: 'message-importance',
            title: '重要性等级',
            description: '配置消息重要性等级',
            color: 'warning',
            fields: [
              {
                id: 'message_defaultImportance',
                label: '默认重要性等级',
                description: '消息的默认重要性',
                type: 'select',
                value: messageSettings.defaultImportance,
                defaultValue: 'normal',
                options: [
                  { label: '低', value: 'low' },
                  { label: '普通', value: 'normal' },
                  { label: '高', value: 'high' },
                  { label: '紧急', value: 'urgent' },
                ],
              },
            ],
          },
          {
            id: 'message-auto-read',
            title: '自动已读',
            description: '配置消息自动标记已读行为',
            color: 'secondary',
            fields: [
              {
                id: 'message_autoReadEnabled',
                label: '自动标记已读',
                description: '查看一段时间后自动标记已读',
                type: 'switch',
                value: messageSettings.autoReadEnabled,
                defaultValue: false,
              },
              {
                id: 'message_autoReadDelay',
                label: '自动已读延迟（秒）',
                description: '消息显示多少秒后自动标记为已读',
                type: 'number',
                value: messageSettings.autoReadDelay,
                defaultValue: 5,
                disabled: !messageSettings.autoReadEnabled,
                helperText: '消息显示多少秒后自动标记为已读',
              },
              {
                id: 'message_markAsReadOnOpen',
                label: '打开即已读',
                description: '打开消息详情时自动标记已读',
                type: 'switch',
                value: messageSettings.markAsReadOnOpen,
                defaultValue: true,
              },
              {
                id: 'message_maxDisplayCount',
                label: '最大显示数量',
                description: '消息列表最多显示的消息数量',
                type: 'number',
                value: messageSettings.maxDisplayCount,
                defaultValue: 100,
                helperText: '消息列表最多显示的消息数量',
              },
            ],
          },
        ],
      },
      {
        id: 'subscription',
        label: '订阅设置',
        icon: <Bookmark size={18} />,
        sections: [
          {
            id: 'subscription-management',
            title: '订阅管理',
            description: '选择您想要接收的通知类型',
            color: 'primary',
            fields: [
              {
                id: 'subscription_securityAlert',
                label: '安全告警',
                description: '账户安全相关的重要通知',
                type: 'switch',
                value: subscriptionSettings.securityAlert,
                defaultValue: true,
              },
              {
                id: 'subscription_systemAnnouncement',
                label: '系统公告',
                description: '系统维护、升级等重要公告',
                type: 'switch',
                value: subscriptionSettings.systemAnnouncement,
                defaultValue: true,
              },
              {
                id: 'subscription_workflowNotification',
                label: '工作流通知',
                description: '审批流程相关的通知',
                type: 'switch',
                value: subscriptionSettings.workflowNotification,
                defaultValue: true,
              },
              {
                id: 'subscription_taskReminder',
                label: '任务提醒',
                description: '任务分配、截止提醒等',
                type: 'switch',
                value: subscriptionSettings.taskReminder,
                defaultValue: true,
              },
              {
                id: 'subscription_messageReply',
                label: '消息回复',
                description: '收到新消息回复时通知',
                type: 'switch',
                value: subscriptionSettings.messageReply,
                defaultValue: true,
              },
            ],
          },
          {
            id: 'subscription-preferences',
            title: '通知偏好',
            description: '可选的通知订阅',
            color: 'secondary',
            fields: [
              {
                id: 'subscription_weeklyReport',
                label: '周报订阅',
                description: '每周接收工作周报',
                type: 'switch',
                value: subscriptionSettings.weeklyReport,
                defaultValue: false,
              },
              {
                id: 'subscription_productUpdate',
                label: '产品更新',
                description: '新功能上线、版本更新通知',
                type: 'switch',
                value: subscriptionSettings.productUpdate,
                defaultValue: false,
              },
              {
                id: 'subscription_marketingMessage',
                label: '营销消息',
                description: '活动推广、优惠信息等',
                type: 'switch',
                value: subscriptionSettings.marketingMessage,
                defaultValue: false,
              },
            ],
          },
        ],
      },
      {
        id: 'advanced',
        label: '高级设置',
        icon: <Zap size={18} />,
        sections: [
          {
            id: 'advanced-retry',
            title: '重试策略',
            description: '配置通知发送失败后的重试策略',
            color: 'primary',
            fields: [
              {
                id: 'advanced_retryEnabled',
                label: '启用重试',
                description: '发送失败时自动重试',
                type: 'switch',
                value: advancedSettings.retryEnabled,
                defaultValue: true,
              },
              {
                id: 'advanced_maxRetryCount',
                label: '最大重试次数',
                description: '最多重试次数，0 表示不限制',
                type: 'number',
                value: advancedSettings.maxRetryCount,
                defaultValue: 3,
                disabled: !advancedSettings.retryEnabled,
                helperText: '最多重试次数，0 表示不限制',
              },
              {
                id: 'advanced_retryInterval',
                label: '重试间隔（分钟）',
                description: '每次重试之间的间隔时间',
                type: 'number',
                value: advancedSettings.retryInterval,
                defaultValue: 5,
                disabled: !advancedSettings.retryEnabled,
                helperText: '每次重试之间的间隔时间',
              },
            ],
          },
          {
            id: 'advanced-rate-limit',
            title: '限速配置',
            description: '配置通知发送频率限制',
            color: 'warning',
            fields: [
              {
                id: 'advanced_rateLimitEnabled',
                label: '启用限速',
                description: '限制通知发送频率',
                type: 'switch',
                value: advancedSettings.rateLimitEnabled,
                defaultValue: true,
              },
              {
                id: 'advanced_maxPerMinute',
                label: '每分钟上限',
                description: '每分钟最多发送条数',
                type: 'number',
                value: advancedSettings.maxPerMinute,
                defaultValue: 60,
                disabled: !advancedSettings.rateLimitEnabled,
                helperText: '每分钟最多发送条数',
              },
              {
                id: 'advanced_maxPerHour',
                label: '每小时上限',
                description: '每小时最多发送条数',
                type: 'number',
                value: advancedSettings.maxPerHour,
                defaultValue: 1000,
                disabled: !advancedSettings.rateLimitEnabled,
                helperText: '每小时最多发送条数',
              },
            ],
          },
          {
            id: 'advanced-webhook',
            title: 'Webhook 配置',
            description: '配置外部系统集成',
            color: 'info',
            fields: [
              {
                id: 'advanced_webhookEnabled',
                label: '启用 Webhook',
                description: '将通知推送到外部系统',
                type: 'switch',
                value: advancedSettings.webhookEnabled,
                defaultValue: false,
              },
              {
                id: 'advanced_webhookUrl',
                label: 'Webhook 地址',
                description: '接收通知的 Webhook URL',
                type: 'text',
                value: advancedSettings.webhookUrl,
                defaultValue: '',
                disabled: !advancedSettings.webhookEnabled,
                placeholder: 'https://example.com/webhook',
              },
              {
                id: 'advanced_webhookSecret',
                label: 'Webhook 密钥',
                description: '用于签名验证的密钥',
                type: 'password',
                value: advancedSettings.webhookSecret,
                defaultValue: '',
                disabled: !advancedSettings.webhookEnabled,
                placeholder: '用于签名验证的密钥',
              },
            ],
          },
        ],
      },
    ],
    [generalSettings, channelSettings, messageSettings, subscriptionSettings, advancedSettings]
  );

  return (
    <SettingsPageTemplate
      title='通知设置'
      subtitle='配置通知系统的各项参数'
      tabs={tabs}
      onSave={handleSave}
    />
  );
};

export default NotificationSettingsPage;
