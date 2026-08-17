import React, { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Settings, Bell, MessageSquare, Zap, Bookmark } from 'lucide-react';
import { useNotificationStore } from '@/store';
import {
  SettingsPageTemplate,
  type SettingTab,
  type SettingValueType,
} from '@/components/templates';
import i18n from '@/i18n';
import { notificationApi } from '@/api/notification';
export const NotificationSettingsPage: React.FC = () => {
  const { data: backendData } = useQuery({
    queryKey: ['notification', 'settings'],
    queryFn: async () => {
      try {
        return await notificationApi.listChannels();
      } catch {
        return {};
      }
    },
  });
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
        title: i18n.t('notification.notification_settings_page.k0'),
        message: i18n.t('notification.notification_settings_page.k1'),
        type: 'success',
      });
    },
    [addNotification]
  );
  const tabs: SettingTab[] = useMemo(
    () => [
      {
        id: 'general',
        label: i18n.t('notification.notification_settings_page.k2'),
        icon: <Settings size={18} />,
        sections: [
          {
            id: 'general-notification',
            title: i18n.t('notification.notification_settings_page.k3'),
            description: i18n.t('notification.notification_settings_page.k4'),
            color: 'primary',
            fields: [
              {
                id: 'general_notificationEnabled',
                label: i18n.t('notification.notification_settings_page.k5'),
                description: i18n.t('notification.notification_settings_page.k6'),
                type: 'switch',
                value: generalSettings.notificationEnabled,
                defaultValue: true,
              },
              {
                id: 'general_soundEnabled',
                label: i18n.t('notification.notification_settings_page.k7'),
                description: i18n.t('notification.notification_settings_page.k8'),
                type: 'switch',
                value: generalSettings.soundEnabled,
                defaultValue: true,
                disabled: !generalSettings.notificationEnabled,
              },
              {
                id: 'general_vibrationEnabled',
                label: i18n.t('notification.notification_settings_page.k9'),
                description: i18n.t('notification.notification_settings_page.k10'),
                type: 'switch',
                value: generalSettings.vibrationEnabled,
                defaultValue: false,
                disabled: !generalSettings.notificationEnabled,
              },
              {
                id: 'general_badgeEnabled',
                label: i18n.t('notification.notification_settings_page.k11'),
                description: i18n.t('notification.notification_settings_page.k12'),
                type: 'switch',
                value: generalSettings.badgeEnabled,
                defaultValue: true,
                disabled: !generalSettings.notificationEnabled,
              },
            ],
          },
          {
            id: 'general-dnd',
            title: i18n.t('notification.notification_settings_page.k13'),
            description: i18n.t('notification.notification_settings_page.k14'),
            color: 'warning',
            fields: [
              {
                id: 'general_doNotDisturbEnabled',
                label: i18n.t('notification.notification_settings_page.k15'),
                description: i18n.t('notification.notification_settings_page.k16'),
                type: 'switch',
                value: generalSettings.doNotDisturbEnabled,
                defaultValue: false,
              },
              {
                id: 'general_doNotDisturbStart',
                label: i18n.t('notification.notification_settings_page.k17'),
                description: i18n.t('notification.notification_settings_page.k18'),
                type: 'text',
                value: generalSettings.doNotDisturbStart,
                defaultValue: '22:00',
                disabled: !generalSettings.doNotDisturbEnabled,
                placeholder: 'HH:mm',
              },
              {
                id: 'general_doNotDisturbEnd',
                label: i18n.t('notification.notification_settings_page.k19'),
                description: i18n.t('notification.notification_settings_page.k20'),
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
        label: i18n.t('notification.notification_settings_page.k21'),
        icon: <Bell size={18} />,
        sections: [
          {
            id: 'channel-settings',
            title: i18n.t('notification.notification_settings_page.k22'),
            description: i18n.t('notification.notification_settings_page.k23'),
            color: 'primary',
            fields: [
              {
                id: 'channel_inAppEnabled',
                label: i18n.t('notification.notification_settings_page.k24'),
                description: i18n.t('notification.notification_settings_page.k25'),
                type: 'switch',
                value: channelSettings.inAppEnabled,
                defaultValue: true,
              },
              {
                id: 'channel_emailEnabled',
                label: i18n.t('notification.notification_settings_page.k26'),
                description: i18n.t('notification.notification_settings_page.k27'),
                type: 'switch',
                value: channelSettings.emailEnabled,
                defaultValue: true,
              },
              {
                id: 'channel_emailAddress',
                label: i18n.t('notification.notification_settings_page.k28'),
                description: i18n.t('notification.notification_settings_page.k29'),
                type: 'text',
                value: channelSettings.emailAddress,
                defaultValue: 'user@example.com',
                disabled: !channelSettings.emailEnabled,
                placeholder: i18n.t('notification.notification_settings_page.k30'),
              },
              {
                id: 'channel_smsEnabled',
                label: i18n.t('notification.notification_settings_page.k31'),
                description: i18n.t('notification.notification_settings_page.k32'),
                type: 'switch',
                value: channelSettings.smsEnabled,
                defaultValue: false,
              },
              {
                id: 'channel_smsPhone',
                label: i18n.t('notification.notification_settings_page.k33'),
                description: i18n.t('notification.notification_settings_page.k34'),
                type: 'text',
                value: channelSettings.smsPhone,
                defaultValue: '138****8888',
                disabled: !channelSettings.smsEnabled,
                placeholder: i18n.t('notification.notification_settings_page.k35'),
              },
              {
                id: 'channel_pushEnabled',
                label: i18n.t('notification.notification_settings_page.k36'),
                description: i18n.t('notification.notification_settings_page.app_37'),
                type: 'switch',
                value: channelSettings.pushEnabled,
                defaultValue: true,
              },
              {
                id: 'channel_wechatEnabled',
                label: i18n.t('notification.notification_settings_page.k38'),
                description: i18n.t('notification.notification_settings_page.k39'),
                type: 'switch',
                value: channelSettings.wechatEnabled,
                defaultValue: false,
              },
              {
                id: 'channel_wechatCorpId',
                label: i18n.t('notification.notification_settings_page.corpid_40'),
                description: i18n.t('notification.notification_settings_page.corpid_41'),
                type: 'text',
                value: channelSettings.wechatCorpId,
                defaultValue: '',
                disabled: !channelSettings.wechatEnabled,
                placeholder: i18n.t('notification.notification_settings_page.corpid_42'),
              },
            ],
          },
        ],
      },
      {
        id: 'message',
        label: i18n.t('notification.notification_settings_page.k43'),
        icon: <MessageSquare size={18} />,
        sections: [
          {
            id: 'message-category',
            title: i18n.t('notification.notification_settings_page.k44'),
            description: i18n.t('notification.notification_settings_page.k45'),
            color: 'primary',
            fields: [
              {
                id: 'message_enableCategory',
                label: i18n.t('notification.notification_settings_page.k46'),
                description: i18n.t('notification.notification_settings_page.k47'),
                type: 'switch',
                value: messageSettings.enableCategory,
                defaultValue: true,
              },
              {
                id: 'message_groupByType',
                label: i18n.t('notification.notification_settings_page.k48'),
                description: i18n.t('notification.notification_settings_page.k49'),
                type: 'switch',
                value: messageSettings.groupByType,
                defaultValue: true,
                disabled: !messageSettings.enableCategory,
              },
              {
                id: 'message_showSenderAvatar',
                label: i18n.t('notification.notification_settings_page.k50'),
                description: i18n.t('notification.notification_settings_page.k51'),
                type: 'switch',
                value: messageSettings.showSenderAvatar,
                defaultValue: true,
              },
            ],
          },
          {
            id: 'message-importance',
            title: i18n.t('notification.notification_settings_page.k52'),
            description: i18n.t('notification.notification_settings_page.k53'),
            color: 'warning',
            fields: [
              {
                id: 'message_defaultImportance',
                label: i18n.t('notification.notification_settings_page.k54'),
                description: i18n.t('notification.notification_settings_page.k55'),
                type: 'select',
                value: messageSettings.defaultImportance,
                defaultValue: 'normal',
                options: [
                  { label: i18n.t('notification.notification_settings_page.k56'), value: 'low' },
                  { label: i18n.t('notification.notification_settings_page.k57'), value: 'normal' },
                  { label: i18n.t('notification.notification_settings_page.k58'), value: 'high' },
                  { label: i18n.t('notification.notification_settings_page.k59'), value: 'urgent' },
                ],
              },
            ],
          },
          {
            id: 'message-auto-read',
            title: i18n.t('notification.notification_settings_page.k60'),
            description: i18n.t('notification.notification_settings_page.k61'),
            color: 'secondary',
            fields: [
              {
                id: 'message_autoReadEnabled',
                label: i18n.t('notification.notification_settings_page.k62'),
                description: i18n.t('notification.notification_settings_page.k63'),
                type: 'switch',
                value: messageSettings.autoReadEnabled,
                defaultValue: false,
              },
              {
                id: 'message_autoReadDelay',
                label: i18n.t('notification.notification_settings_page.k64'),
                description: i18n.t('notification.notification_settings_page.k65'),
                type: 'number',
                value: messageSettings.autoReadDelay,
                defaultValue: 5,
                disabled: !messageSettings.autoReadEnabled,
                helperText: i18n.t('notification.notification_settings_page.k66'),
              },
              {
                id: 'message_markAsReadOnOpen',
                label: i18n.t('notification.notification_settings_page.k67'),
                description: i18n.t('notification.notification_settings_page.k68'),
                type: 'switch',
                value: messageSettings.markAsReadOnOpen,
                defaultValue: true,
              },
              {
                id: 'message_maxDisplayCount',
                label: i18n.t('notification.notification_settings_page.k69'),
                description: i18n.t('notification.notification_settings_page.k70'),
                type: 'number',
                value: messageSettings.maxDisplayCount,
                defaultValue: 100,
                helperText: i18n.t('notification.notification_settings_page.k71'),
              },
            ],
          },
        ],
      },
      {
        id: 'subscription',
        label: i18n.t('notification.notification_settings_page.k72'),
        icon: <Bookmark size={18} />,
        sections: [
          {
            id: 'subscription-management',
            title: i18n.t('notification.notification_settings_page.k73'),
            description: i18n.t('notification.notification_settings_page.k74'),
            color: 'primary',
            fields: [
              {
                id: 'subscription_securityAlert',
                label: i18n.t('notification.notification_settings_page.k75'),
                description: i18n.t('notification.notification_settings_page.k76'),
                type: 'switch',
                value: subscriptionSettings.securityAlert,
                defaultValue: true,
              },
              {
                id: 'subscription_systemAnnouncement',
                label: i18n.t('notification.notification_settings_page.k77'),
                description: i18n.t('notification.notification_settings_page.k78'),
                type: 'switch',
                value: subscriptionSettings.systemAnnouncement,
                defaultValue: true,
              },
              {
                id: 'subscription_workflowNotification',
                label: i18n.t('notification.notification_settings_page.k79'),
                description: i18n.t('notification.notification_settings_page.k80'),
                type: 'switch',
                value: subscriptionSettings.workflowNotification,
                defaultValue: true,
              },
              {
                id: 'subscription_taskReminder',
                label: i18n.t('notification.notification_settings_page.k81'),
                description: i18n.t('notification.notification_settings_page.k82'),
                type: 'switch',
                value: subscriptionSettings.taskReminder,
                defaultValue: true,
              },
              {
                id: 'subscription_messageReply',
                label: i18n.t('notification.notification_settings_page.k83'),
                description: i18n.t('notification.notification_settings_page.k84'),
                type: 'switch',
                value: subscriptionSettings.messageReply,
                defaultValue: true,
              },
            ],
          },
          {
            id: 'subscription-preferences',
            title: i18n.t('notification.notification_settings_page.k85'),
            description: i18n.t('notification.notification_settings_page.k86'),
            color: 'secondary',
            fields: [
              {
                id: 'subscription_weeklyReport',
                label: i18n.t('notification.notification_settings_page.k87'),
                description: i18n.t('notification.notification_settings_page.k88'),
                type: 'switch',
                value: subscriptionSettings.weeklyReport,
                defaultValue: false,
              },
              {
                id: 'subscription_productUpdate',
                label: i18n.t('notification.notification_settings_page.k89'),
                description: i18n.t('notification.notification_settings_page.k90'),
                type: 'switch',
                value: subscriptionSettings.productUpdate,
                defaultValue: false,
              },
              {
                id: 'subscription_marketingMessage',
                label: i18n.t('notification.notification_settings_page.k91'),
                description: i18n.t('notification.notification_settings_page.k92'),
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
        label: i18n.t('notification.notification_settings_page.k93'),
        icon: <Zap size={18} />,
        sections: [
          {
            id: 'advanced-retry',
            title: i18n.t('notification.notification_settings_page.k94'),
            description: i18n.t('notification.notification_settings_page.k95'),
            color: 'primary',
            fields: [
              {
                id: 'advanced_retryEnabled',
                label: i18n.t('notification.notification_settings_page.k96'),
                description: i18n.t('notification.notification_settings_page.k97'),
                type: 'switch',
                value: advancedSettings.retryEnabled,
                defaultValue: true,
              },
              {
                id: 'advanced_maxRetryCount',
                label: i18n.t('notification.notification_settings_page.k98'),
                description: i18n.t('notification.notification_settings_page.0_99'),
                type: 'number',
                value: advancedSettings.maxRetryCount,
                defaultValue: 3,
                disabled: !advancedSettings.retryEnabled,
                helperText: i18n.t('notification.notification_settings_page.0_100'),
              },
              {
                id: 'advanced_retryInterval',
                label: i18n.t('notification.notification_settings_page.k101'),
                description: i18n.t('notification.notification_settings_page.k102'),
                type: 'number',
                value: advancedSettings.retryInterval,
                defaultValue: 5,
                disabled: !advancedSettings.retryEnabled,
                helperText: i18n.t('notification.notification_settings_page.k103'),
              },
            ],
          },
          {
            id: 'advanced-rate-limit',
            title: i18n.t('notification.notification_settings_page.k104'),
            description: i18n.t('notification.notification_settings_page.k105'),
            color: 'warning',
            fields: [
              {
                id: 'advanced_rateLimitEnabled',
                label: i18n.t('notification.notification_settings_page.k106'),
                description: i18n.t('notification.notification_settings_page.k107'),
                type: 'switch',
                value: advancedSettings.rateLimitEnabled,
                defaultValue: true,
              },
              {
                id: 'advanced_maxPerMinute',
                label: i18n.t('notification.notification_settings_page.k108'),
                description: i18n.t('notification.notification_settings_page.k109'),
                type: 'number',
                value: advancedSettings.maxPerMinute,
                defaultValue: 60,
                disabled: !advancedSettings.rateLimitEnabled,
                helperText: i18n.t('notification.notification_settings_page.k110'),
              },
              {
                id: 'advanced_maxPerHour',
                label: i18n.t('notification.notification_settings_page.k111'),
                description: i18n.t('notification.notification_settings_page.k112'),
                type: 'number',
                value: advancedSettings.maxPerHour,
                defaultValue: 1000,
                disabled: !advancedSettings.rateLimitEnabled,
                helperText: i18n.t('notification.notification_settings_page.k113'),
              },
            ],
          },
          {
            id: 'advanced-webhook',
            title: i18n.t('pages.notification_settings_page.webhook_0'),
            description: i18n.t('notification.notification_settings_page.k114'),
            color: 'info',
            fields: [
              {
                id: 'advanced_webhookEnabled',
                label: i18n.t('notification.notification_settings_page.webhook_115'),
                description: i18n.t('notification.notification_settings_page.k116'),
                type: 'switch',
                value: advancedSettings.webhookEnabled,
                defaultValue: false,
              },
              {
                id: 'advanced_webhookUrl',
                label: i18n.t('pages.notification_settings_page.webhook_1'),
                description: i18n.t('notification.notification_settings_page.webhookurl_117'),
                type: 'text',
                value: advancedSettings.webhookUrl,
                defaultValue: '',
                disabled: !advancedSettings.webhookEnabled,
                placeholder: 'https://example.com/webhook',
              },
              {
                id: 'advanced_webhookSecret',
                label: i18n.t('pages.notification_settings_page.webhook_2'),
                description: i18n.t('notification.notification_settings_page.k118'),
                type: 'password',
                value: advancedSettings.webhookSecret,
                defaultValue: '',
                disabled: !advancedSettings.webhookEnabled,
                placeholder: i18n.t('notification.notification_settings_page.k119'),
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
      title={i18n.t('notification.notification_settings_page.k120')}
      subtitle={i18n.t('notification.notification_settings_page.k121')}
      tabs={tabs}
      onSave={handleSave}
    />
  );
};
export default NotificationSettingsPage;