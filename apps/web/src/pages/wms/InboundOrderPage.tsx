/**
 * InboundOrderPage — Schema 驱动的入库订单管理页面
 *
 * 从 ~550 行手动 CRUD 代码缩减为 ~50 行配置化代码。
 * 列表列、表单字段、详情展示、行操作全部由 inboundOrderSchema 驱动。
 */

import React from 'react';
import { wmsApi } from '@/api/wms';
import i18n from '@/i18n';
import { WMS_PATHS } from '@/modules/wms/config';
import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { inboundOrderSchema } from '@/schemas/wms/inboundOrder';

const inboundOrderApiAdapter = createCrudPageAdapter(wmsApi.inboundOrders);

const InboundOrderPage: React.FC = () => {
  return (
    <CrudPage
      schema={inboundOrderSchema}
      apiAdapter={inboundOrderApiAdapter}
      breadcrumbs={[
        { label: i18n.t('pages.inbound_order_page.k0'), href: '/dashboard' },
        { label: i18n.t('pages.inbound_order_page.k1'), href: WMS_PATHS.root },
        { label: i18n.t('pages.inbound_order_page.k2') },
      ]}
    />
  );
};

export default InboundOrderPage;
