import React, { useState, useEffect, useCallback } from 'react';
import { Settings } from 'lucide-react';
import { PageContainer } from '@/components/common';
import { SettingsPageTemplate } from '@/components/templates';
import type { SettingSection, SettingValueType } from '@/components/templates/SettingsPageTemplate';
import i18n from '@/i18n';
import { pdmSettingsApi } from '@/api/pdm/settings';

const CATEGORY = 'category_rule';

const DEFAULT_SETTINGS: Record<string, string> = {
  category_code_prefix: 'CAT',
  auto_generate_category_code: 'true',
  default_category_status: 'active',
  allow_subcategory: 'true',
  max_category_depth: '5',
  category_naming_pattern: '{prefix}-{seq}',
};

export const CategoryRulePage: React.FC = () => {
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
      console.error('[CategoryRule] 加载设置失败:', e);
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
      setSuccess(i18n.t('pdm.category_rule.save_success'));
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      console.error('[CategoryRule] 保存设置失败:', e);
      throw e;
    } finally {
      setSaving(false);
    }
  }, []);

  const sections: SettingSection[] = [
    {
      id: 'coding',
      title: i18n.t('pdm.category_rule.sec_coding_title'),
      description: i18n.t('pdm.category_rule.sec_coding_desc'),
      fields: [
        {
          id: 'category_code_prefix',
          label: i18n.t('pdm.category_rule.fld_code_prefix'),
          type: 'text',
          value: settings.category_code_prefix,
          placeholder: i18n.t('pdm.category_rule.fld_code_prefix_ph'),
        },
        {
          id: 'auto_generate_category_code',
          label: i18n.t('pdm.category_rule.fld_auto_code'),
          type: 'switch',
          value: settings.auto_generate_category_code === 'true',
        },
        {
          id: 'category_naming_pattern',
          label: i18n.t('pdm.category_rule.fld_naming_template'),
          type: 'text',
          value: settings.category_naming_pattern,
          placeholder: i18n.t('pdm.category_rule.fld_naming_template_ph'),
        },
      ],
    },
    {
      id: 'hierarchy',
      title: i18n.t('pdm.category_rule.sec_hierarchy_title'),
      description: i18n.t('pdm.category_rule.sec_hierarchy_desc'),
      fields: [
        {
          id: 'default_category_status',
          label: i18n.t('pdm.category_rule.fld_default_status'),
          type: 'select',
          value: settings.default_category_status,
          options: [
            { label: i18n.t('pdm.category_rule.opt_status_active'), value: 'active' },
            { label: i18n.t('pdm.category_rule.opt_status_inactive'), value: 'inactive' },
          ],
        },
        {
          id: 'allow_subcategory',
          label: i18n.t('pdm.category_rule.fld_allow_subcategory'),
          type: 'switch',
          value: settings.allow_subcategory === 'true',
        },
        {
          id: 'max_category_depth',
          label: i18n.t('pdm.category_rule.fld_max_depth'),
          type: 'number',
          value: Number(settings.max_category_depth),
        },
      ],
    },
  ];

  return (
    <PageContainer
      title={i18n.t('pdm.category_rule_page.k0')}
      subtitle={i18n.t('pdm.category_rule_page.k1')}
      padding={false}
      maxWidth={false}
    >
      <SettingsPageTemplate
        title={i18n.t('pdm.category_rule_page.k2')}
        description={i18n.t('pdm.setting_category_rule_page.r1')}
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

export default CategoryRulePage;
