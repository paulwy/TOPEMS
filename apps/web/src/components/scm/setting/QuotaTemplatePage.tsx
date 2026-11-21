import React, { useEffect, useState } from 'react';
import { Settings } from 'lucide-react';
import { PageContainer } from '@/components/common';
import { SettingsPageTemplate, type SettingSection } from '@/components/templates';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { scmApi } from '@/api/scm';

const CATEGORY = 'quota_template';

const DEFAULT_SETTINGS: Record<string, string> = {
  default_allocation_method: 'proportional',
  min_quota_percentage: '10',
  auto_balance_quota: 'true',
};

export const QuotaTemplatePage: React.FC = () => {
  const { t } = useTranslation('scm');
  const [values, setValues] = useState<Record<string, string>>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [success, setSuccess] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await scmApi.settings.get(CATEGORY);
        if (!cancelled && res?.data?.settings) {
          setValues({ ...DEFAULT_SETTINGS, ...res.data.settings });
        }
      } catch {
        // 首次无数据时使用默认值
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
      title: t('scm.quota_template_page.k2'),
      fields: [
        {
          id: 'default_allocation_method',
          label: t('scm.quota_template_page.k3'),
          type: 'select',
          value: values.default_allocation_method,
          options: [
            { label: t('scm.quota_template_page.k4'), value: 'proportional' },
            { label: t('scm.quota_template_page.k5'), value: 'fixed' },
            { label: t('scm.quota_template_page.k6'), value: 'manual' },
          ],
          onChange: (v) => setValues((p) => ({ ...p, default_allocation_method: String(v) })),
        },
        {
          id: 'min_quota_percentage',
          label: t('scm.quota_template_page.k7'),
          type: 'number',
          value: Number(values.min_quota_percentage),
          onChange: (v) => setValues((p) => ({ ...p, min_quota_percentage: String(v) })),
        },
        {
          id: 'auto_balance_quota',
          label: t('scm.quota_template_page.k8'),
          type: 'switch',
          value: values.auto_balance_quota === 'true',
          onChange: (v) => setValues((p) => ({ ...p, auto_balance_quota: String(v) })),
        },
      ],
    },
  ];

  const handleSave = async () => {
    setSaving(true);
    setError(undefined);
    setSuccess(undefined);
    try {
      await scmApi.settings.update(CATEGORY, values);
      setSuccess(t('scm.quota_template_page.k9'));
    } catch {
      setError(t('scm.quota_template_page.k10'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageContainer
      title={t('scm.quota_template_page.k0')}
      subtitle={t('scm.quota_template_page.k1')}
      padding={false}
      maxWidth={false}
    >
      <SettingsPageTemplate
        title={t('scm.quota_template_page.k2')}
        description={i18n.t('scm.setting_quota_template_page.r1')}
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

export default QuotaTemplatePage;
