import React from 'react';
import i18n from '@/i18n';
import { WmsPolicySettings } from './WmsPolicySettings';

/** 库位规则：读写 wms.slotting_rules，上架建议引擎按规则类型/优先级执行。 */
export const LocationRulePage: React.FC = () => (
  <WmsPolicySettings
    policyKey='slotting'
    title={i18n.t('pages.location_rule_page.k0')}
    subtitle={i18n.t('pages.location_rule_page.k1')}
    description={i18n.t('pages.location_rule_page.k2')}
  />
);

export default LocationRulePage;
