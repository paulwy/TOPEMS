import React, { useEffect, useState } from 'react';
import { Settings } from 'lucide-react';
import { PageContainer } from '@/components/common';
import { SettingsPageTemplate, type SettingSection } from '@/components/templates';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { hrmApi } from '@/api/hrm';

const CATEGORY = 'recruitment_flow';
const DEFAULT_SETTINGS: Record<string, string> = {
  default_approval_required: 'true',
  auto_reject_after_days: '30',
  interview_rounds: '3',
  background_check_required: 'false',
  offer_validity_days: '7',
};

export const RecruitmentFlowPage: React.FC = () => {
  const { t } = useTranslation('hrm');
  const [values, setValues] = useState<Record<string, string>>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [success, setSuccess] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await hrmApi.settings.get(CATEGORY);
        if (!cancelled && res?.data?.settings)
          setValues({ ...DEFAULT_SETTINGS, ...res.data.settings });
      } catch {
        /* default */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const sections: SettingSection[] = [
    {
      id: 'basic',
      title: t('hrm.recruitment_flow_page.k2'),
      fields: [
        {
          id: 'default_approval_required',
          label: t('hrm.recruitment_flow_page.k3'),
          type: 'switch' as const,
          value: values.default_approval_required === 'true',
          onChange: (v) => setValues((p) => ({ ...p, default_approval_required: String(v) })),
        },
        {
          id: 'auto_reject_after_days',
          label: t('hrm.recruitment_flow_page.k4'),
          type: 'number' as const,
          value: Number(values.auto_reject_after_days),
          onChange: (v) => setValues((p) => ({ ...p, auto_reject_after_days: String(v) })),
        },
        {
          id: 'interview_rounds',
          label: t('hrm.recruitment_flow_page.k5'),
          type: 'number' as const,
          value: Number(values.interview_rounds),
          onChange: (v) => setValues((p) => ({ ...p, interview_rounds: String(v) })),
        },
        {
          id: 'background_check_required',
          label: t('hrm.recruitment_flow_page.k6'),
          type: 'switch' as const,
          value: values.background_check_required === 'true',
          onChange: (v) => setValues((p) => ({ ...p, background_check_required: String(v) })),
        },
        {
          id: 'offer_validity_days',
          label: t('hrm.recruitment_flow_page.k7'),
          type: 'number' as const,
          value: Number(values.offer_validity_days),
          onChange: (v) => setValues((p) => ({ ...p, offer_validity_days: String(v) })),
        },
      ],
    },
  ];

  const handleSave = async () => {
    setSaving(true);
    setError(undefined);
    setSuccess(undefined);
    try {
      await hrmApi.settings.update(CATEGORY, values);
      setSuccess(t('hrm.recruitment_flow_page.k8'));
    } catch {
      setError(t('hrm.recruitment_flow_page.k9'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageContainer
      title={t('hrm.recruitment_flow_page.k0')}
      subtitle={t('hrm.recruitment_flow_page.k1')}
      padding={false}
      maxWidth={false}
    >
      <SettingsPageTemplate
        title={t('hrm.recruitment_flow_page.k2')}
        description={i18n.t('hrm.setting_recruitment_flow_page.r1')}
        icon={<Settings size={24} />}
        sections={sections}
        loading={loading}
        saving={saving}
        error={error}
        success={success}
        showSaveButton
        onSave={handleSave}
      />
    </PageContainer>
  );
};
export default RecruitmentFlowPage;
