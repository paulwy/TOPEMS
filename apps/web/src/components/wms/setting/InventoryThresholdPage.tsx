import React from 'react';
import i18n from '@/i18n';
import { WmsPolicySettings } from './WmsPolicySettings';

/** 库存阈值配置：读写 wms.inventory_alert_rules 的第一条规则（真实落库）。 */
export const InventoryThresholdPage: React.FC = () => (
  <WmsPolicySettings
    policyKey='inventory-threshold'
    title={i18n.t('pages.inventory_threshold_page.k0')}
    subtitle={i18n.t('pages.inventory_threshold_page.k1')}
    description={i18n.t('pages.inventory_threshold_page.k2')}
  />
);

export default InventoryThresholdPage;
