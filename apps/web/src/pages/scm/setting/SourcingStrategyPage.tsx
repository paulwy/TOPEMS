import React, { useEffect, useState } from 'react';
import { Settings } from 'lucide-react';
import { PageContainer } from '@/components/common';
import { SettingsPageTemplate, type SettingSection } from '@/components/templates';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { scmApi } from '@/api/scm';

const CATEGORY = 'sourcing_strategy';

const DEFAULT_SETTINGS: Record<string, string> = {
  default_sourcing_method: 'rfq',
  auto_convert_requisition: 'false',
  min_suppliers_for_rfq: '3',
  default_quote_validity_days: '30',
};

export const SourcingStrategyPage: React.FC = () => {
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
      title: t('scm.sourcing_strategy_page.k2'),
      fields: [
        {
          id: 'default_sourcing_method',
          label: t('scm.sourcing_strategy_page.k3'),
          type: 'select',
          value: values.default_sourcing_method,
          options: [
            { label: t('scm.sourcing_strategy_page.k4'), value: 'rfq' },
            { label: t('scm.sourcing_strategy_page.k5'), value: 'tender' },
            { label: t('scm.sourcing_strategy_page.k6'), value: 'direct_purchase' },
          ],
          onChange: (v) => setValues((p) => ({ ...p, default_sourcing_method: String(v) })),
        },
        {
          id: 'auto_convert_requisition',
          label: t('scm.sourcing_strategy_page.k7'),
          type: 'switch',
          value: values.auto_convert_requisition === 'true',
          onChange: (v) => setValues((p) => ({ ...p, auto_convert_requisition: String(v) })),
        },
        {
          id: 'min_suppliers_for_rfq',
          label: t('scm.sourcing_strategy_page.k8'),
          type: 'number',
          value: Number(values.min_suppliers_for_rfq),
          onChange: (v) => setValues((p) => ({ ...p, min_suppliers_for_rfq: String(v) })),
        },
        {
          id: 'default_quote_validity_days',
          label: t('scm.sourcing_strategy_page.k9'),
          type: 'number',
          value: Number(values.default_quote_validity_days),
          onChange: (v) => setValues((p) => ({ ...p, default_quote_validity_days: String(v) })),
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
      setSuccess(t('scm.sourcing_strategy_page.k10'));
    } catch (_e) {
      setError(t('scm.sourcing_strategy_page.k11'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageContainer
      title={t('scm.sourcing_strategy_page.k0')}
      subtitle={t('scm.sourcing_strategy_page.k1')}
      padding={false}
      maxWidth={false}
    >
      <SettingsPageTemplate
        title={t('scm.sourcing_strategy_page.k2')}
        description={i18n.t('scm.setting_sourcing_strategy_page.r1')}
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

export default SourcingStrategyPage;
