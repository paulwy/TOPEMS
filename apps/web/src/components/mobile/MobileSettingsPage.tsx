import React, { useEffect } from 'react';
import styles from './MobileSettingsPage.module.css';
import { useNotificationStore } from '../../store';
import { Smartphone, Shield, RefreshCw } from 'lucide-react';
import {
  SettingsPageTemplate,
  type SettingSection,
  type SettingValueType,
} from '@/components/templates';
import i18n from '@/i18n';
import { logger } from '@/utils/logger';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mobileApi } from '@/api/mobile';
import { QUERY_KEYS } from '@/lib/reactQuery';

interface MobileSetting {
  key: string;
  label: string;
  value: boolean | string;
  description: string;
  type: 'switch' | 'text' | 'number';
}
// 无持久化记录时的默认展示（configured=false，页面提示尚未配置）
const defaultMobileSettings: MobileSetting[] = [
  {
    key: 'force_update',
    label: i18n.t('mobile.mobile_settings_page.k0'),
    value: false,
    description: i18n.t('mobile.mobile_settings_page.k1'),
    type: 'switch',
  },
  {
    key: 'auto_update',
    label: i18n.t('mobile.mobile_settings_page.k2'),
    value: true,
    description: i18n.t('mobile.mobile_settings_page.k3'),
    type: 'switch',
  },
  {
    key: 'version_min',
    label: i18n.t('mobile.mobile_settings_page.k4'),
    value: '',
    description: i18n.t('mobile.mobile_settings_page.k5'),
    type: 'text',
  },
  {
    key: 'app_key',
    label: i18n.t('mobile.mobile_settings_page.key_6'),
    value: '',
    description: i18n.t('mobile.mobile_settings_page.k7'),
    type: 'text',
  },
];
const MobileSettingsPage: React.FC = () => {
  const addNotification = useNotificationStore((state) => state.addNotification);
  const queryClient = useQueryClient();
  const settingsQuery = useQuery<MobileSetting[]>({
    queryKey: QUERY_KEYS.AD_HOC.MOBILE_SETTINGS_BASE,
    queryFn: async () => {
      const response = await mobileApi.getAppSettings();
      const settings = response?.data;
      if (!settings) {
        return defaultMobileSettings;
      }
      return [
        { ...defaultMobileSettings[0], value: settings.force_update },
        { ...defaultMobileSettings[1], value: settings.auto_update },
        { ...defaultMobileSettings[2], value: settings.min_version },
        { ...defaultMobileSettings[3], value: settings.app_key },
      ];
    },
    staleTime: 60 * 1000,
  });
  const mobileSettings = settingsQuery.data ?? defaultMobileSettings;
  const loading = settingsQuery.isLoading;
  useEffect(() => {
    if (settingsQuery.isError) {
      logger.error('Error loading mobile settings:', settingsQuery.error);
      addNotification({
        title: i18n.t('mobile.mobile_settings_page.k9'),
        message: i18n.t('mobile.mobile_settings_page.k8'),
        type: 'error',
      });
    }
  }, [settingsQuery.isError, settingsQuery.error, addNotification]);
  const toPayload = (settings: MobileSetting[]) => ({
    force_update: Boolean(settings.find((s) => s.key === 'force_update')?.value),
    auto_update: Boolean(settings.find((s) => s.key === 'auto_update')?.value),
    min_version: String(settings.find((s) => s.key === 'version_min')?.value ?? ''),
    app_key: String(settings.find((s) => s.key === 'app_key')?.value ?? ''),
  });
  const saveMutation = useMutation({
    mutationFn: async (settings: MobileSetting[]) => {
      const response = await mobileApi.updateAppSettings(toPayload(settings));
      if (!response?.success) {
        throw new Error(response?.message || 'save failed');
      }
      return settings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.MOBILE_SETTINGS_BASE,
        exact: false,
        refetchType: 'active',
      });
      addNotification({
        title: i18n.t('mobile.mobile_settings_page.k11'),
        message: i18n.t('mobile.mobile_settings_page.k10'),
        type: 'success',
      });
    },
    onError: (err: unknown) => {
      logger.error('Error saving mobile settings:', err);
      addNotification({
        title: i18n.t('mobile.mobile_settings_page.k13'),
        message: i18n.t('mobile.mobile_settings_page.k12'),
        type: 'error',
      });
    },
  });
  const saving = saveMutation.isPending;
  const handleSave = (data: Record<string, SettingValueType>) => {
    const updatedSettings = mobileSettings.map((s) => ({
      ...s,
      value: data[s.key] !== undefined ? (data[s.key] as boolean | string) : s.value,
    }));
    saveMutation.mutate(updatedSettings);
  };
  const resetMutation = useMutation({
    mutationFn: async () => {
      const response = await mobileApi.updateAppSettings({
        force_update: false,
        auto_update: true,
        min_version: '',
        app_key: '',
      });
      if (!response?.success) {
        throw new Error(response?.message || 'reset failed');
      }
      return defaultMobileSettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.MOBILE_SETTINGS_BASE,
        exact: false,
        refetchType: 'active',
      });
      addNotification({
        title: i18n.t('mobile.mobile_settings_page.k15'),
        message: i18n.t('mobile.mobile_settings_page.k14'),
        type: 'info',
      });
    },
    onError: (err: unknown) => {
      logger.error('Error resetting mobile settings:', err);
      addNotification({
        title: i18n.t('mobile.mobile_settings_page.k17'),
        message: i18n.t('mobile.mobile_settings_page.k16'),
        type: 'error',
      });
    },
  });
  const handleReset = () => {
    resetMutation.mutate();
  };
  const sections: SettingSection[] = [
    {
      id: 'app',
      title: i18n.t('mobile.mobile_settings_page.k18'),
      icon: <Smartphone className={styles.il1} />,
      color: 'primary',
      fields: [
        {
          id: 'force_update',
          label: i18n.t('mobile.mobile_settings_page.k19'),
          type: 'switch',
          value: mobileSettings.find((s) => s.key === 'force_update')?.value as boolean,
          description: i18n.t('mobile.mobile_settings_page.k20'),
        },
        {
          id: 'auto_update',
          label: i18n.t('mobile.mobile_settings_page.k21'),
          type: 'switch',
          value: mobileSettings.find((s) => s.key === 'auto_update')?.value as boolean,
          description: i18n.t('mobile.mobile_settings_page.k22'),
        },
        {
          id: 'version_min',
          label: i18n.t('mobile.mobile_settings_page.k23'),
          type: 'text',
          value: mobileSettings.find((s) => s.key === 'version_min')?.value as string,
          description: i18n.t('mobile.mobile_settings_page.k24'),
        },
      ],
    },
    {
      id: 'security',
      title: i18n.t('mobile.mobile_settings_page.k25'),
      icon: <Shield className={styles.il2} />,
      color: 'success',
      fields: [
        {
          id: 'app_key',
          label: i18n.t('mobile.mobile_settings_page.key_26'),
          type: 'text',
          value: mobileSettings.find((s) => s.key === 'app_key')?.value as string,
          description: i18n.t('mobile.mobile_settings_page.k27'),
        },
      ],
    },
    {
      id: 'other',
      title: i18n.t('mobile.mobile_settings_page.k28'),
      icon: <RefreshCw className={styles.il3} />,
      color: 'info',
      fields: [],
    },
  ];
  return (
    <SettingsPageTemplate
      title={i18n.t('mobile.mobile_settings_page.k29')}
      subtitle={i18n.t('mobile.mobile_settings_page.k30')}
      sections={sections}
      loading={loading}
      saving={saving}
      onSave={handleSave}
      onReset={handleReset}
      saveButtonText={i18n.t('mobile.mobile_settings_page.k31')}
      resetButtonText={i18n.t('mobile.mobile_settings_page.k32')}
    />
  );
};
export default MobileSettingsPage;
