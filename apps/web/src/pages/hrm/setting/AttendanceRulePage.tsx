import React, { useEffect, useState } from 'react';
import { Settings } from 'lucide-react';
import { PageContainer } from '@/components/common';
import { SettingsPageTemplate, type SettingSection } from '@/components/templates';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { hrmApi } from '@/api/hrm';

const CATEGORY = 'attendance_rule';
const DEFAULT_SETTINGS: Record<string, string> = {
  work_start_time: '09:00',
  work_end_time: '18:00',
  lunch_break_minutes: '60',
  overtime_threshold_hours: '2',
  auto_deduct_late: 'true',
};

export const AttendanceRulePage: React.FC = () => {
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
      title: t('hrm.attendance_rule_page.k2'),
      fields: [
        {
          id: 'work_start_time',
          label: t('hrm.attendance_rule_page.k3'),
          type: 'text' as const,
          value: values.work_start_time,
          placeholder: 'HH:MM',
          onChange: (v) => setValues((p) => ({ ...p, work_start_time: String(v) })),
        },
        {
          id: 'work_end_time',
          label: t('hrm.attendance_rule_page.k4'),
          type: 'text' as const,
          value: values.work_end_time,
          placeholder: 'HH:MM',
          onChange: (v) => setValues((p) => ({ ...p, work_end_time: String(v) })),
        },
        {
          id: 'lunch_break_minutes',
          label: t('hrm.attendance_rule_page.k5'),
          type: 'number' as const,
          value: Number(values.lunch_break_minutes),
          onChange: (v) => setValues((p) => ({ ...p, lunch_break_minutes: String(v) })),
        },
        {
          id: 'overtime_threshold_hours',
          label: t('hrm.attendance_rule_page.k6'),
          type: 'number' as const,
          value: Number(values.overtime_threshold_hours),
          onChange: (v) => setValues((p) => ({ ...p, overtime_threshold_hours: String(v) })),
        },
        {
          id: 'auto_deduct_late',
          label: t('hrm.attendance_rule_page.k7'),
          type: 'switch' as const,
          value: values.auto_deduct_late === 'true',
          onChange: (v) => setValues((p) => ({ ...p, auto_deduct_late: String(v) })),
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
      setSuccess(t('hrm.attendance_rule_page.k8'));
    } catch {
      setError(t('hrm.attendance_rule_page.k9'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageContainer
      title={t('hrm.attendance_rule_page.k0')}
      subtitle={t('hrm.attendance_rule_page.k1')}
      padding={false}
      maxWidth={false}
    >
      <SettingsPageTemplate
        title={t('hrm.attendance_rule_page.k2')}
        description={i18n.t('hrm.setting_attendance_rule_page.r1')}
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
export default AttendanceRulePage;
