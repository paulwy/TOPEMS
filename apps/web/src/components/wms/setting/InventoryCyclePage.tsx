import React from 'react';
import i18n from '@/i18n';
import { WmsPolicySettings } from './WmsPolicySettings';

/** 盘点周期配置：读写 wms.cycle_count_configs，直接驱动循环盘点任务生成。 */
export const InventoryCyclePage: React.FC = () => (
  <WmsPolicySettings
    policyKey='cycle-count'
    title={i18n.t('pages.inventory_cycle_page.k0')}
    subtitle={i18n.t('pages.inventory_cycle_page.k1')}
    description={i18n.t('pages.inventory_cycle_page.k2')}
  />
);

export default InventoryCyclePage;
