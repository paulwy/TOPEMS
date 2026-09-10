import React, { useState, useEffect, useCallback } from 'react';
import { Settings } from 'lucide-react';
import { PageContainer } from '@/components/common';
import { SettingsPageTemplate } from '@/components/templates';
import type { SettingSection, SettingValueType } from '@/components/templates/SettingsPageTemplate';
import i18n from '@/i18n';
import { pdmSettingsApi } from '@/api/pdm/settings';

const CATEGORY = 'doc_approval_flow';

const DEFAULT_SETTINGS: Record<string, string> = {
  default_approval_levels: '2',
  require_parallel_approval: 'false',
  auto_approve_on_timeout: 'false',
  approval_timeout_hours: '48',
  default_approver_role: 'manager',
  allow_delegation: 'true',
};

export const DocApprovalFlowPage: React.FC = () => {
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
      console.error('[DocApprovalFlow] 加载设置失败:', e);
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
      setSuccess('文档审批流程设置保存成功');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      console.error('[DocApprovalFlow] 保存设置失败:', e);
      throw e;
    } finally {
      setSaving(false);
    }
  }, []);

  const sections: SettingSection[] = [
    {
      id: 'levels',
      title: '审批层级',
      description: '文档审批的默认层级与审批人配置',
      fields: [
        {
          id: 'default_approval_levels',
          label: '默认审批层级数',
          type: 'number',
          value: Number(settings.default_approval_levels),
        },
        {
          id: 'default_approver_role',
          label: '默认审批人角色',
          type: 'select',
          value: settings.default_approver_role,
          options: [
            { label: '部门经理', value: 'manager' },
            { label: '技术负责人', value: 'tech_lead' },
            { label: '质量负责人', value: 'qa_lead' },
            { label: '项目经理', value: 'pm' },
          ],
        },
        {
          id: 'require_parallel_approval',
          label: '启用并行审批',
          type: 'switch',
          value: settings.require_parallel_approval === 'true',
        },
      ],
    },
    {
      id: 'timeout',
      title: '超时与委托',
      description: '审批超时处理及委托权限配置',
      fields: [
        {
          id: 'auto_approve_on_timeout',
          label: '超时自动通过',
          type: 'switch',
          value: settings.auto_approve_on_timeout === 'true',
        },
        {
          id: 'approval_timeout_hours',
          label: '审批超时时间（小时）',
          type: 'number',
          value: Number(settings.approval_timeout_hours),
        },
        {
          id: 'allow_delegation',
          label: '允许审批委托',
          type: 'switch',
          value: settings.allow_delegation === 'true',
        },
      ],
    },
  ];

  return (
    <PageContainer
      title={i18n.t('pdm.doc_approval_flow_page.k0')}
      subtitle={i18n.t('pdm.doc_approval_flow_page.k1')}
      padding={false}
      maxWidth={false}
    >
      <SettingsPageTemplate
        title={i18n.t('pdm.doc_approval_flow_page.k2')}
        description={i18n.t('pdm.setting_doc_approval_flow_page.r1')}
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

export default DocApprovalFlowPage;
