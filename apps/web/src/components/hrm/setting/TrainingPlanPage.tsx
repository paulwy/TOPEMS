import React, { useEffect, useState } from 'react';
import { Settings } from 'lucide-react';
import { PageContainer } from '@/components/common';
import { SettingsPageTemplate, type SettingSection } from '@/components/templates';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { hrmApi } from '@/api/hrm';

const CATEGORY = 'training_plan';
const DEFAULT_SETTINGS: Record<string, string> = {
  default_hours_per_year: '40',
  auto_enroll_new_employees: 'true',
  certification_reminder_days: '30',
  budget_per_employee: '2000',
  external_training_approval: 'true',
};

export const TrainingPlanPage: React.FC = () => {
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
      title: t('hrm.training_plan_page.k2'),
      fields: [
        {
          id: 'default_hours_per_year',
          label: t('hrm.training_plan_page.k3'),
          type: 'number' as const,
          value: Number(values.default_hours_per_year),
          onChange: (v) => setValues((p) => ({ ...p, default_hours_per_year: String(v) })),
        },
        {
          id: 'auto_enroll_new_employees',
          label: t('hrm.training_plan_page.k4'),
          type: 'switch' as const,
          value: values.auto_enroll_new_employees === 'true',
          onChange: (v) => setValues((p) => ({ ...p, auto_enroll_new_employees: String(v) })),
        },
        {
          id: 'certification_reminder_days',
          label: t('hrm.training_plan_page.k5'),
          type: 'number' as const,
          value: Number(values.certification_reminder_days),
          onChange: (v) => setValues((p) => ({ ...p, certification_reminder_days: String(v) })),
        },
        {
          id: 'budget_per_employee',
          label: t('hrm.training_plan_page.k6'),
          type: 'number' as const,
          value: Number(values.budget_per_employee),
          onChange: (v) => setValues((p) => ({ ...p, budget_per_employee: String(v) })),
        },
        {
          id: 'external_training_approval',
          label: t('hrm.training_plan_page.k7'),
          type: 'switch' as const,
          value: values.external_training_approval === 'true',
          onChange: (v) => setValues((p) => ({ ...p, external_training_approval: String(v) })),
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
      setSuccess(t('hrm.training_plan_page.k8'));
    } catch {
      setError(t('hrm.training_plan_page.k9'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageContainer
      title={t('hrm.training_plan_page.k0')}
      subtitle={t('hrm.training_plan_page.k1')}
      padding={false}
      maxWidth={false}
    >
      <SettingsPageTemplate
        title={t('hrm.training_plan_page.k2')}
        description={i18n.t('hrm.setting_training_plan_page.r1')}
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
export default TrainingPlanPage;
