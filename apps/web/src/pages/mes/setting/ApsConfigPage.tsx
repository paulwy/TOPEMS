import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Settings } from 'lucide-react';
import { PageContainer } from '@/components/common';
import { SettingsPageTemplate } from '@/components/templates';
import i18n from '@/i18n';
import { mesApi } from '@/api/mes';

export const ApsConfigPage: React.FC = () => {
  const { data: backendData, isLoading } = useQuery({
    queryKey: ['mes-aps-config'],
    queryFn: async () => {
      try {
        const m = mesApi as any;
        const tryFn = async (fn?: () => Promise<unknown>) => {
          if (typeof fn !== 'function') return null;
          try { return await fn(); } catch { return null; }
        };
        const r1 = await tryFn(m.aps?.health);
        if (r1) return (r1 as { data?: unknown })?.data ?? {};
        const r2 = await tryFn(m.health);
        if (r2) return (r2 as { data?: unknown })?.data ?? {};
        return {};
      } catch (e) {
        return {};
      }
    },
  });
  return (
    <PageContainer
      title={i18n.t('pages.aps_config_page.aps_0')}
      subtitle={i18n.t('pages.aps_config_page.k0')}
      padding={false}
      maxWidth={false}
    >
      <SettingsPageTemplate
        title={i18n.t('pages.aps_config_page.aps_1')}
        description={i18n.t('pages.aps_config_page.k2')}
        icon={<Settings size={24} />}
        sections={[]}
        actions={[]}
      />
    </PageContainer>
  );
};

export default ApsConfigPage;
