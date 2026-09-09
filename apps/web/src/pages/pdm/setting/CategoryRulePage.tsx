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
      setSuccess('分类规则设置保存成功');
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
      title: '编码规则',
      description: '物料/产品分类的编码生成规则',
      fields: [
        {
          id: 'category_code_prefix',
          label: '分类编码前缀',
          type: 'text',
          value: settings.category_code_prefix,
          placeholder: '如 CAT',
        },
        {
          id: 'auto_generate_category_code',
          label: '自动生成分类编码',
          type: 'switch',
          value: settings.auto_generate_category_code === 'true',
        },
        {
          id: 'category_naming_pattern',
          label: '编码命名模板',
          type: 'text',
          value: settings.category_naming_pattern,
          placeholder: '如 {prefix}-{seq}',
        },
      ],
    },
    {
      id: 'hierarchy',
      title: '层级与状态',
      description: '分类层级深度及默认状态配置',
      fields: [
        {
          id: 'default_category_status',
          label: '默认分类状态',
          type: 'select',
          value: settings.default_category_status,
          options: [
            { label: '启用', value: 'active' },
            { label: '停用', value: 'inactive' },
          ],
        },
        {
          id: 'allow_subcategory',
          label: '允许创建子分类',
          type: 'switch',
          value: settings.allow_subcategory === 'true',
        },
        {
          id: 'max_category_depth',
          label: '最大分类层级',
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
