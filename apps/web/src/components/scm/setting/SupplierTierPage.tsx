import React, { useEffect, useState } from 'react';
import { Settings } from 'lucide-react';
import { PageContainer } from '@/components/common';
import { SettingsPageTemplate, type SettingSection } from '@/components/templates';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { scmApi } from '@/api/scm';

const CATEGORY = 'supplier_tier';

const DEFAULT_SETTINGS: Record<string, string> = {
  tier_a_score_min: '90',
  tier_b_score_min: '75',
  tier_c_score_min: '60',
  auto_evaluate: 'true',
  evaluation_period_days: '90',
};

export const SupplierTierPage: React.FC = () => {
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
      id: 'tiers',
      title: t('scm.supplier_tier_page.k2'),
      fields: [
        {
          id: 'tier_a_score_min',
          label: t('scm.supplier_tier_page.k3'),
          type: 'number',
          value: Number(values.tier_a_score_min),
          onChange: (v) => setValues((p) => ({ ...p, tier_a_score_min: String(v) })),
        },
        {
          id: 'tier_b_score_min',
          label: t('scm.supplier_tier_page.k4'),
          type: 'number',
          value: Number(values.tier_b_score_min),
          onChange: (v) => setValues((p) => ({ ...p, tier_b_score_min: String(v) })),
        },
        {
          id: 'tier_c_score_min',
          label: t('scm.supplier_tier_page.k5'),
          type: 'number',
          value: Number(values.tier_c_score_min),
          onChange: (v) => setValues((p) => ({ ...p, tier_c_score_min: String(v) })),
        },
        {
          id: 'auto_evaluate',
          label: t('scm.supplier_tier_page.k6'),
          type: 'switch',
          value: values.auto_evaluate === 'true',
          onChange: (v) => setValues((p) => ({ ...p, auto_evaluate: String(v) })),
        },
        {
          id: 'evaluation_period_days',
          label: t('scm.supplier_tier_page.k7'),
          type: 'number',
          value: Number(values.evaluation_period_days),
          onChange: (v) => setValues((p) => ({ ...p, evaluation_period_days: String(v) })),
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
      setSuccess(t('scm.supplier_tier_page.k8'));
    } catch {
      setError(t('scm.supplier_tier_page.k9'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageContainer
      title={t('scm.supplier_tier_page.k0')}
      subtitle={t('scm.supplier_tier_page.k1')}
      padding={false}
      maxWidth={false}
    >
      <SettingsPageTemplate
        title={t('scm.supplier_tier_page.k2')}
        description={i18n.t('scm.setting_supplier_tier_page.r1')}
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

export default SupplierTierPage;
