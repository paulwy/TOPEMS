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
      setSuccess(i18n.t('pdm.doc_approval.save_success'));
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
      title: i18n.t('pdm.doc_approval.sec_levels_title'),
      description: i18n.t('pdm.doc_approval.sec_levels_desc'),
      fields: [
        {
          id: 'default_approval_levels',
          label: i18n.t('pdm.doc_approval.fld_approval_levels'),
          type: 'number',
          value: Number(settings.default_approval_levels),
        },
        {
          id: 'default_approver_role',
          label: i18n.t('pdm.doc_approval.fld_approver_role'),
          type: 'select',
          value: settings.default_approver_role,
          options: [
            { label: i18n.t('pdm.doc_approval.opt_role_manager'), value: 'manager' },
            { label: i18n.t('pdm.doc_approval.opt_role_tech_lead'), value: 'tech_lead' },
            { label: i18n.t('pdm.doc_approval.opt_role_qa_lead'), value: 'qa_lead' },
            { label: i18n.t('pdm.doc_approval.opt_role_pm'), value: 'pm' },
          ],
        },
        {
          id: 'require_parallel_approval',
          label: i18n.t('pdm.doc_approval.fld_parallel'),
          type: 'switch',
          value: settings.require_parallel_approval === 'true',
        },
      ],
    },
    {
      id: 'timeout',
      title: i18n.t('pdm.doc_approval.sec_timeout_title'),
      description: i18n.t('pdm.doc_approval.sec_timeout_desc'),
      fields: [
        {
          id: 'auto_approve_on_timeout',
          label: i18n.t('pdm.doc_approval.fld_auto_approve_timeout'),
          type: 'switch',
          value: settings.auto_approve_on_timeout === 'true',
        },
        {
          id: 'approval_timeout_hours',
          label: i18n.t('pdm.doc_approval.fld_timeout_hours'),
          type: 'number',
          value: Number(settings.approval_timeout_hours),
        },
        {
          id: 'allow_delegation',
          label: i18n.t('pdm.doc_approval.fld_allow_delegation'),
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
