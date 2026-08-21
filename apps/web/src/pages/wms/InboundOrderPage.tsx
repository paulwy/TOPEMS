/**
 * InboundOrderPage — Schema 驱动的入库订单管理页面
 *
 * 从 ~550 行手动 CRUD 代码缩减为配置化代码。
 * 列表列、表单字段、详情展示、行操作全部由 inboundOrderSchema 驱动。
 */

import React from 'react';
import { wmsApi } from '@/api/wms';
import i18n from '@/i18n';
import { WMS_PATHS } from '@/modules/wms/config';
import { ListPageTemplate } from '@/components/templates/ListPageTemplate';
import { SchemaForm } from '@/components/templates/list/SchemaForm';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { createListPageCrudApi } from '@/schema/listPageCrudAdapter';
import { getColumns } from '@/schema';
import { inboundOrderSchema } from '@/schemas/wms/inboundOrder';
import type { EntitySchema } from '@/schema';

const inboundOrderApiAdapter = createCrudPageAdapter(wmsApi.inboundOrders);
const inboundOrderCrudApi = createListPageCrudApi<Record<string, unknown>>(
  inboundOrderApiAdapter as unknown as import('@/components/templates/CrudPage').CrudApiAdapter<Record<string, unknown>>
);

const InboundOrderPage: React.FC = () => {
  const columns = React.useMemo(
    () => getColumns<Record<string, unknown>>(inboundOrderSchema as unknown as EntitySchema<Record<string, unknown>>),
    []
  );

  return (
    <ListPageTemplate<Record<string, unknown>>
      title={i18n.t('pages.inbound_order_page.k2')}
      breadcrumbs={[
        { label: i18n.t('pages.inbound_order_page.k0'), href: '/dashboard' },
        { label: i18n.t('pages.inbound_order_page.k1'), href: WMS_PATHS.root },
        { label: i18n.t('pages.inbound_order_page.k2') },
      ]}
      columns={columns}
      data={[]}
      crud={{
        api: inboundOrderCrudApi,
        queryKey: 'wms-inbound-orders',
        entityName: i18n.t('pages.inbound_order_page.k2'),
        renderForm: ({ mode, record, onSubmit, onClose }) => (
          <SchemaForm<Record<string, unknown>>
            schema={inboundOrderSchema as unknown as EntitySchema<Record<string, unknown>>}
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

export default InboundOrderPage;
