/**
 * OutboundOrderPage — Schema 驱动的出库订单管理页面
 */

import React from 'react';
import { wmsApi } from '@/api/wms';
import { WMS_PATHS } from '@/modules/wms/config';
import { ListPageTemplate } from '@/components/templates/ListPageTemplate';
import { SchemaForm } from '@/components/templates/list/SchemaForm';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { createListPageCrudApi } from '@/schema/listPageCrudAdapter';
import { getColumns } from '@/schema';
import { outboundOrderSchema } from '@/schemas/wms';
import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

const outboundOrderApiAdapter = createCrudPageAdapter(wmsApi.outboundOrders);
const outboundOrderCrudApi = createListPageCrudApi<Record<string, unknown>>(
  outboundOrderApiAdapter as unknown as import('@/components/templates/CrudPage').CrudApiAdapter<Record<string, unknown>>
);

const OutboundOrderPage: React.FC = () => {
  const columns = React.useMemo(
    () => getColumns<Record<string, unknown>>(outboundOrderSchema as unknown as EntitySchema<Record<string, unknown>>),
    []
  );

  return (
    <ListPageTemplate<Record<string, unknown>>
      title={i18n.t('pages.outbound_order_page.k2')}
      breadcrumbs={[
        { label: i18n.t('pages.outbound_order_page.k0'), href: '/dashboard' },
        { label: i18n.t('pages.outbound_order_page.k1'), href: WMS_PATHS.root },
        { label: i18n.t('pages.outbound_order_page.k2') },
      ]}
      columns={columns}
      data={[]}
      crud={{
        api: outboundOrderCrudApi,
        queryKey: 'wms-outbound-orders',
        entityName: i18n.t('pages.outbound_order_page.k2'),
        renderForm: ({ mode, record, onSubmit, onClose }) => (
          <SchemaForm<Record<string, unknown>>
            schema={outboundOrderSchema as unknown as EntitySchema<Record<string, unknown>>}
            mode={mode}
            record={record}
            onSubmit={onSubmit}
            onClose={onClose}
          />
        ),
      }}
    />
  );
};

export default OutboundOrderPage;
