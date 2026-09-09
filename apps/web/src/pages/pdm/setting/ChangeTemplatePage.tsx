import React, { useState, useEffect, useCallback } from 'react';
import { Settings } from 'lucide-react';
import { PageContainer } from '@/components/common';
import { SettingsPageTemplate } from '@/components/templates';
import type { SettingSection, SettingValueType } from '@/components/templates/SettingsPageTemplate';
import i18n from '@/i18n';
import { pdmSettingsApi } from '@/api/pdm/settings';

const CATEGORY = 'change_template';

const DEFAULT_SETTINGS: Record<string, string> = {
  default_change_type: 'design',
  default_priority: 'medium',
  auto_generate_change_no: 'true',
  change_no_prefix: 'ECN',
  require_impact_analysis: 'true',
  default_implementation_days: '14',
};

export const ChangeTemplatePage: React.FC = () => {
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
      console.error('[ChangeTemplate] 加载设置失败:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSave = useCallback(
    async (data: Record<string, SettingValueType>) => {
      setSaving(true);
      setSuccess('');
      try {
        const stringData: Record<string, string> = {};
        Object.entries(data).forEach(([k, v]) => {
          stringData[k] = String(v ?? '');
        });
        await pdmSettingsApi.updateSettings(CATEGORY, stringData);
        setSettings(stringData);
        setSuccess('变更模板设置保存成功');
        setTimeout(() => setSuccess(''), 3000);
      } catch (e) {
        console.error('[ChangeTemplate] 保存设置失败:', e);
        throw e;
      } finally {
        setSaving(false);
      }
    },
    [],
  );

  const sections: SettingSection[] = [
    {
      id: 'default',
      title: '默认属性',
      description: '变更单的默认类型、优先级与编号规则',
      fields: [
        {
          id: 'default_change_type',
          label: '默认变更类型',
          type: 'select',
          value: settings.default_change_type,
          options: [
            { label: '设计变更', value: 'design' },
            { label: '工艺变更', value: 'process' },
            { label: '紧急变更', value: 'emergency' },
          ],
        },
        {
          id: 'default_priority',
          label: '默认优先级',
          type: 'select',
          value: settings.default_priority,
          options: [
            { label: '高', value: 'high' },
            { label: '中', value: 'medium' },
            { label: '低', value: 'low' },
          ],
        },
        {
          id: 'auto_generate_change_no',
          label: '自动生成变更单号',
          type: 'switch',
          value: settings.auto_generate_change_no === 'true',
        },
        {
          id: 'change_no_prefix',
          label: '变更单号前缀',
          type: 'text',
          value: settings.change_no_prefix,
          placeholder: '如 ECN',
        },
      ],
    },
    {
      id: 'workflow',
      title: '流程控制',
      description: '变更影响分析与实施周期配置',
      fields: [
        {
          id: 'require_impact_analysis',
          label: '必须填写影响分析',
          type: 'switch',
          value: settings.require_impact_analysis === 'true',
        },
        {
          id: 'default_implementation_days',
          label: '默认实施周期（天）',
          type: 'number',
          value: Number(settings.default_implementation_days),
        },
      ],
    },
  ];

  return (
    <PageContainer
      title={i18n.t('pdm.change_template_page.k0')}
      subtitle={i18n.t('pdm.change_template_page.k1')}
      padding={false}
      maxWidth={false}
    >
      <SettingsPageTemplate
        title={i18n.t('pdm.change_template_page.k2')}
        description={i18n.t('pdm.setting_change_template_page.r1')}
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

export default ChangeTemplatePage;
