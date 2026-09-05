import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Settings } from 'lucide-react';
import { PageContainer } from '@/components/common';
import { SettingsPageTemplate } from '@/components/templates';
import i18n from '@/i18n';
import { wmsApi } from '@/api/wms';

export const InventoryCyclePage: React.FC = () => {
  useQuery({
    queryKey: ['wms-inventory-cycle'],
    queryFn: async () => {
      try {
        const res = await wmsApi.cycleCounts.listConfigs();
        return res?.data ?? {};
      } catch {
        return {};
      }
    },
  });
  return (
    <PageContainer
      title={i18n.t('pages.inventory_cycle_page.k0')}
      subtitle={i18n.t('pages.inventory_cycle_page.k1')}
      padding={false}
      maxWidth={false}
    >
      <SettingsPageTemplate
        title={i18n.t('pages.inventory_cycle_page.k2')}
        description={i18n.t('pages.inventory_cycle_page.k0')}
        icon={<Settings size={24} />}
        sections={[]}
        actions={[]}
      />
    </PageContainer>
  );
};

export default InventoryCyclePage;
