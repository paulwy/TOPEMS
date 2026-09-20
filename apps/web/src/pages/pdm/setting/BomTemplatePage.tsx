import React, { useState, useEffect, useCallback } from 'react';
import { Settings } from 'lucide-react';
import { PageContainer } from '@/components/common';
import { SettingsPageTemplate } from '@/components/templates';
import type { SettingSection, SettingValueType } from '@/components/templates/SettingsPageTemplate';
import i18n from '@/i18n';
import { pdmSettingsApi } from '@/api/pdm/settings';

const CATEGORY = 'bom_template';

const DEFAULT_SETTINGS: Record<string, string> = {
  default_bom_type: 'manufacturing',
  auto_number_prefix: 'BOM',
  enable_version_control: 'true',
  default_version: '1.0',
  allow_alternative_items: 'true',
  max_bom_levels: '10',
};

export const BomTemplatePage: React.FC = () => {
  const [settings, setSettings] = useState<Record<string, string>>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const response = await pdmSettingsApi.getSettings(CATEGORY);
      if (response.success && response.data?.settings) {
        setSettings({ ...DEFAULT_SETTINGS, ...response.data.settings });
      }
    } catch (e) {
      console.error('[BomTemplate] 加载设置失败:', e);
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
      await pdmSettingsApi.updateSettings(CATEGORY, stringData);
      setSettings(stringData);
      setSuccess(i18n.t('pdm.bom_template.save_success'));
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      console.error('[BomTemplate] 保存设置失败:', e);
      throw e;
    } finally {
      setSaving(false);
    }
  }, []);

  const sections: SettingSection[] = [
    {
      id: 'basic',
      title: i18n.t('pdm.bom_template.sec_basic_title'),
      description: i18n.t('pdm.bom_template.sec_basic_desc'),
      fields: [
        {
          id: 'default_bom_type',
          label: i18n.t('pdm.bom_template.fld_bom_type'),
          type: 'select',
          value: settings.default_bom_type,
          options: [
            { label: i18n.t('pdm.bom_template.opt_bom_manufacturing'), value: 'manufacturing' },
            { label: i18n.t('pdm.bom_template.opt_bom_engineering'), value: 'engineering' },
            { label: i18n.t('pdm.bom_template.opt_bom_sales'), value: 'sales' },
          ],
        },
        {
          id: 'auto_number_prefix',
          label: i18n.t('pdm.bom_template.fld_no_prefix'),
          type: 'text',
          value: settings.auto_number_prefix,
          placeholder: i18n.t('pdm.bom_template.fld_no_prefix_ph'),
        },
        {
          id: 'default_version',
          label: i18n.t('pdm.bom_template.fld_init_version'),
          type: 'text',
          value: settings.default_version,
          placeholder: i18n.t('pdm.bom_template.fld_init_version_ph'),
        },
      ],
    },
    {
      id: 'control',
      title: i18n.t('pdm.bom_template.sec_control_title'),
      description: i18n.t('pdm.bom_template.sec_control_desc'),
      fields: [
        {
          id: 'enable_version_control',
          label: i18n.t('pdm.bom_template.fld_version_control'),
          type: 'switch',
          value: settings.enable_version_control === 'true',
        },
        {
          id: 'allow_alternative_items',
          label: i18n.t('pdm.bom_template.fld_allow_substitute'),
          type: 'switch',
          value: settings.allow_alternative_items === 'true',
        },
        {
          id: 'max_bom_levels',
          label: i18n.t('pdm.bom_template.fld_max_levels'),
          type: 'number',
          value: Number(settings.max_bom_levels),
        },
      ],
    },
  ];

  return (
    <PageContainer
      title={i18n.t('pdm.setting_bom_template_page.m1')}
      subtitle={i18n.t('pdm.bom_template_page.k0')}
      padding={false}
      maxWidth={false}
    >
      <SettingsPageTemplate
        title={i18n.t('pdm.setting_bom_template_page.m1')}
        description={i18n.t('pdm.setting_bom_template_page.r1')}
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

export default BomTemplatePage;
