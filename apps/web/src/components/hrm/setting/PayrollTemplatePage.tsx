import React, { useEffect, useState } from 'react';
import { Settings } from 'lucide-react';
import { PageContainer } from '@/components/common';
import { SettingsPageTemplate, type SettingSection } from '@/components/templates';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { hrmApi } from '@/api/hrm';

const CATEGORY = 'payroll_template';
const DEFAULT_SETTINGS: Record<string, string> = {
  default_currency: 'CNY',
  payroll_day: '15',
  auto_generate_payslip: 'true',
  include_allowances: 'true',
  tax_calculation_method: 'cumulative',
};

export const PayrollTemplatePage: React.FC = () => {
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
      title: t('hrm.payroll_template_page.k2'),
      fields: [
        {
          id: 'default_currency',
          label: t('hrm.payroll_template_page.k3'),
          type: 'text' as const,
          value: values.default_currency,
          onChange: (v) => setValues((p) => ({ ...p, default_currency: String(v) })),
        },
        {
          id: 'payroll_day',
          label: t('hrm.payroll_template_page.k4'),
          type: 'number' as const,
          value: Number(values.payroll_day),
          onChange: (v) => setValues((p) => ({ ...p, payroll_day: String(v) })),
        },
        {
          id: 'auto_generate_payslip',
          label: t('hrm.payroll_template_page.k5'),
          type: 'switch' as const,
          value: values.auto_generate_payslip === 'true',
          onChange: (v) => setValues((p) => ({ ...p, auto_generate_payslip: String(v) })),
        },
        {
          id: 'include_allowances',
          label: t('hrm.payroll_template_page.k6'),
          type: 'switch' as const,
          value: values.include_allowances === 'true',
          onChange: (v) => setValues((p) => ({ ...p, include_allowances: String(v) })),
        },
        {
          id: 'tax_calculation_method',
          label: t('hrm.payroll_template_page.k7'),
          type: 'select' as const,
          value: values.tax_calculation_method,
          options: [
            { label: t('hrm.payroll_template_page.k8'), value: 'cumulative' },
            { label: t('hrm.payroll_template_page.k9'), value: 'monthly' },
          ],
          onChange: (v) => setValues((p) => ({ ...p, tax_calculation_method: String(v) })),
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
      setSuccess(t('hrm.payroll_template_page.k10'));
    } catch {
      setError(t('hrm.payroll_template_page.k11'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageContainer
      title={t('hrm.payroll_template_page.k0')}
      subtitle={t('hrm.payroll_template_page.k1')}
      padding={false}
      maxWidth={false}
    >
      <SettingsPageTemplate
        title={t('hrm.payroll_template_page.k2')}
        description={i18n.t('hrm.setting_payroll_template_page.r1')}
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
export default PayrollTemplatePage;
