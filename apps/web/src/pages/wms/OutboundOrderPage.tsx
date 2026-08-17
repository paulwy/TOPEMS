/**
 * OutboundOrderPage — Schema 驱动的出库订单管理页面
 */

import React from 'react';
import { wmsApi } from '@/api/wms';
import type { OutboundOrder, CreateOutboundOrderRequest } from '@/api/wms';
import { WMS_PATHS } from '@/modules/wms/config';
import CrudPage from '@/components/templates/CrudPage';
import type { CrudApiAdapter } from '@/components/templates/CrudPage';
import { outboundOrderSchema } from '@/schemas/wms';
import i18n from '@/i18n';

const outboundOrderApiAdapter: CrudApiAdapter = {
  list: async (params) => {
    const response = await wmsApi.outboundOrders.list({
      page: params?.page,
      pagesize: params?.pageSize,
      search: params?.search,
    });
    if (!response.success) throw new Error('Failed to fetch outbound orders');
    return {
      data: response.data.items as unknown as Record<string, unknown>[],
      total: response.data.total,
    };
  },
  create: async (data) => {
    const response = await wmsApi.outboundOrders.create({
      ...data,
      order_type: 'sales_out',
      items: [],
    } as unknown as CreateOutboundOrderRequest);
    if (!response.success) throw new Error('Failed to create outbound order');
    return response.data as unknown as Record<string, unknown>;
  },
  update: async (id, data) => {
    const response = await wmsApi.outboundOrders.update(
      id,
      data as unknown as Partial<OutboundOrder>
    );
    if (!response.success) throw new Error('Failed to update outbound order');
    return response.data as unknown as Record<string, unknown>;
  },
  delete: async (id) => {
    const response = await wmsApi.outboundOrders.delete(id);
    if (!response.success) throw new Error('Failed to delete outbound order');
  },
};

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
