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
      setSuccess('BOM模板设置保存成功');
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
      title: '基础配置',
      description: 'BOM模板的默认类型与编号规则',
      fields: [
        {
          id: 'default_bom_type',
          label: '默认BOM类型',
          type: 'select',
          value: settings.default_bom_type,
          options: [
            { label: '制造BOM', value: 'manufacturing' },
            { label: '工程BOM', value: 'engineering' },
            { label: '销售BOM', value: 'sales' },
          ],
        },
        {
          id: 'auto_number_prefix',
          label: '自动编号前缀',
          type: 'text',
          value: settings.auto_number_prefix,
          placeholder: '如 BOM',
        },
        {
          id: 'default_version',
          label: '默认初始版本',
          type: 'text',
          value: settings.default_version,
          placeholder: '如 1.0',
        },
      ],
    },
    {
      id: 'control',
      title: '版本与替代料控制',
      description: 'BOM版本管理及替代物料规则',
      fields: [
        {
          id: 'enable_version_control',
          label: '启用版本控制',
          type: 'switch',
          value: settings.enable_version_control === 'true',
        },
        {
          id: 'allow_alternative_items',
          label: '允许替代物料',
          type: 'switch',
          value: settings.allow_alternative_items === 'true',
        },
        {
          id: 'max_bom_levels',
          label: '最大BOM层级',
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
