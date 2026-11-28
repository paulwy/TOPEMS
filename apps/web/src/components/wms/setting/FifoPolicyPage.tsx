import React from 'react';
import i18n from '@/i18n';
import { WmsPolicySettings } from './WmsPolicySettings';

/** 先进先出策略：读写 wms.picking_policy，出库发货分配批次时按此排序。 */
export const FifoPolicyPage: React.FC = () => (
  <WmsPolicySettings
    policyKey='picking-sequence'
    title={i18n.t('pages.fifo_policy_page.k0')}
    subtitle={i18n.t('pages.fifo_policy_page.k1')}
    description={i18n.t('pages.fifo_policy_page.k2')}
  />
);

export default FifoPolicyPage;
