import React, { useState, useEffect, useCallback } from 'react';
import { Settings } from 'lucide-react';
import { PageContainer } from '@/components/common';
import { SettingsPageTemplate } from '@/components/templates';
import type { SettingSection, SettingValueType } from '@/components/templates/SettingsPageTemplate';
import i18n from '@/i18n';
import { mesSettingsApi } from '@/api/mes/settings';

const CATEGORY = 'equipment_threshold';

const DEFAULT_SETTINGS: Record<string, string> = {
  oee_warning_threshold: '75',
  oee_critical_threshold: '60',
  downtime_warning_minutes: '30',
  downtime_critical_minutes: '60',
  maintenance_interval_days: '90',
  calibration_interval_days: '180',
};

export const EquipmentThresholdPage: React.FC = () => {
  const [settings, setSettings] = useState<Record<string, string>>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const response = await mesSettingsApi.getSettings(CATEGORY);
      if (response.success && response.data?.settings) {
        setSettings({ ...DEFAULT_SETTINGS, ...response.data.settings });
      }
    } catch (e) {
      console.error('[EquipmentThreshold] 加载设置失败:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSave = useCallback(async (data: Record<string, SettingValueType>) => {
    setSaving(true);
    setSuccess('');
    try {
      const stringData: Record<string, string> = {};
      Object.entries(data).forEach(([k, v]) => {
        stringData[k] = String(v ?? '');
      });
      await mesSettingsApi.updateSettings(CATEGORY, stringData);
      setSettings(stringData);
      setSuccess(i18n.t('pages.equipment_threshold_page.save_success'));
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      console.error('[EquipmentThreshold] 保存设置失败:', e);
      throw e;
    } finally {
      setSaving(false);
    }
  }, []);

  const sections: SettingSection[] = [
    {
      id: 'oee',
      title: i18n.t('pages.equipment_threshold_page.oee_section'),
      description: i18n.t('pages.equipment_threshold_page.oee_desc'),
      fields: [
        {
          id: 'oee_warning_threshold',
          label: i18n.t('pages.equipment_threshold_page.oee_warning'),
          type: 'number',
          value: Number(settings.oee_warning_threshold),
        },
        {
          id: 'oee_critical_threshold',
          label: i18n.t('pages.equipment_threshold_page.oee_critical'),
          type: 'number',
          value: Number(settings.oee_critical_threshold),
        },
      ],
    },
    {
      id: 'downtime',
      title: i18n.t('pages.equipment_threshold_page.downtime_section'),
      description: i18n.t('pages.equipment_threshold_page.downtime_desc'),
      fields: [
        {
          id: 'downtime_warning_minutes',
          label: i18n.t('pages.equipment_threshold_page.downtime_warning'),
          type: 'number',
          value: Number(settings.downtime_warning_minutes),
        },
        {
          id: 'downtime_critical_minutes',
          label: i18n.t('pages.equipment_threshold_page.downtime_critical'),
          type: 'number',
          value: Number(settings.downtime_critical_minutes),
        },
      ],
    },
    {
      id: 'maintenance',
      title: i18n.t('pages.equipment_threshold_page.maintenance_section'),
      description: i18n.t('pages.equipment_threshold_page.maintenance_desc'),
      fields: [
        {
          id: 'maintenance_interval_days',
          label: i18n.t('pages.equipment_threshold_page.maintenance_interval'),
          type: 'number',
          value: Number(settings.maintenance_interval_days),
        },
        {
          id: 'calibration_interval_days',
          label: i18n.t('pages.equipment_threshold_page.calibration_interval'),
          type: 'number',
          value: Number(settings.calibration_interval_days),
        },
      ],
    },
  ];

  return (
    <PageContainer
      title={i18n.t('pages.equipment_threshold_page.k0')}
      subtitle={i18n.t('pages.equipment_threshold_page.k1')}
      padding={false}
      maxWidth={false}
    >
      <SettingsPageTemplate
        title={i18n.t('pages.equipment_threshold_page.k2')}
        description={i18n.t('pages.equipment_threshold_page.k0')}
        icon={<Settings size={24} />}
        sections={sections}
        loading={loading}
        saving={saving}
        success={success}
        onSave={handleSave}
        showResetButton={false}
      />
    </PageContainer>
  );
};

export default EquipmentThresholdPage;
