/**
 * OutboundOrderPage — Schema 驱动的出库订单管理页面
 */

import React from 'react';
import { wmsApi } from '@/api/wms';
import { WMS_PATHS } from '@/modules/wms/config';
import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { outboundOrderSchema } from '@/schemas/wms';
import i18n from '@/i18n';

const outboundOrderApiAdapter = createCrudPageAdapter(wmsApi.outboundOrders);

const OutboundOrderPage: React.FC = () => {
  return (
    <CrudPage
      schema={outboundOrderSchema}
      apiAdapter={outboundOrderApiAdapter}
      breadcrumbs={[
        { label: i18n.t('pages.outbound_order_page.k0'), href: '/dashboard' },
        { label: i18n.t('pages.outbound_order_page.k1'), href: WMS_PATHS.root },
        { label: i18n.t('pages.outbound_order_page.k2') },
      ]}
    />
  );
};

export default OutboundOrderPage;
