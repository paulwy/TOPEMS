import React, { useEffect, useState } from 'react';
import { Settings } from 'lucide-react';
import { PageContainer } from '@/components/common';
import { SettingsPageTemplate, type SettingSection } from '@/components/templates';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { scmApi } from '@/api/scm';

const CATEGORY = 'purchase_threshold';

const DEFAULT_SETTINGS: Record<string, string> = {
  min_purchase_amount: '100',
  max_amount_per_order: '1000000',
  require_approval_above: '50000',
  auto_approve_below: '5000',
};

export const PurchaseThresholdPage: React.FC = () => {
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
      id: 'thresholds',
      title: t('scm.purchase_threshold_page.k2'),
      fields: [
        {
          id: 'min_purchase_amount',
          label: t('scm.purchase_threshold_page.k3'),
          type: 'number',
          value: Number(values.min_purchase_amount),
          onChange: (v) => setValues((p) => ({ ...p, min_purchase_amount: String(v) })),
        },
        {
          id: 'max_amount_per_order',
          label: t('scm.purchase_threshold_page.k4'),
          type: 'number',
          value: Number(values.max_amount_per_order),
          onChange: (v) => setValues((p) => ({ ...p, max_amount_per_order: String(v) })),
        },
        {
          id: 'require_approval_above',
          label: t('scm.purchase_threshold_page.k5'),
          type: 'number',
          value: Number(values.require_approval_above),
          onChange: (v) => setValues((p) => ({ ...p, require_approval_above: String(v) })),
        },
        {
          id: 'auto_approve_below',
          label: t('scm.purchase_threshold_page.k6'),
          type: 'number',
          value: Number(values.auto_approve_below),
          onChange: (v) => setValues((p) => ({ ...p, auto_approve_below: String(v) })),
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
      setSuccess(t('scm.purchase_threshold_page.k7'));
    } catch {
      setError(t('scm.purchase_threshold_page.k8'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageContainer
      title={t('scm.purchase_threshold_page.k0')}
      subtitle={t('scm.purchase_threshold_page.k1')}
      padding={false}
      maxWidth={false}
    >
      <SettingsPageTemplate
        title={t('scm.purchase_threshold_page.k2')}
        description={i18n.t('scm.setting_purchase_threshold_page.r1')}
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

export default PurchaseThresholdPage;
