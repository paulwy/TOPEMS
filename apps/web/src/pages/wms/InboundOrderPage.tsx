/**
 * InboundOrderPage — Schema 驱动的入库订单管理页面
 *
 * 从 ~550 行手动 CRUD 代码缩减为 ~50 行配置化代码。
 * 列表列、表单字段、详情展示、行操作全部由 inboundOrderSchema 驱动。
 */

import React from 'react';
import { wmsApi } from '@/api/wms';
import type { InboundOrder, CreateInboundOrderRequest } from '@/api/wms';
import i18n from '@/i18n';
import { WMS_PATHS } from '@/modules/wms/config';
import CrudPage from '@/components/templates/CrudPage';
import type { CrudApiAdapter } from '@/components/templates/CrudPage';
import { inboundOrderSchema } from '@/schemas/wms/inboundOrder';

const inboundOrderApiAdapter: CrudApiAdapter = {
  list: async (params) => {
    const response = await wmsApi.inboundOrders.list({
      page: params?.page,
      pagesize: params?.pageSize,
      search: params?.search,
    });
    if (!response.success) throw new Error('Failed to fetch inbound orders');
    return {
      data: response.data.items as unknown as Record<string, unknown>[],
      total: response.data.total,
    };
  },
  create: async (data) => {
    const response = await wmsApi.inboundOrders.create({
      ...data,
      items: [],
    } as unknown as CreateInboundOrderRequest);
    if (!response.success) throw new Error('Failed to create inbound order');
    return response.data as unknown as Record<string, unknown>;
  },
  update: async (id, data) => {
    const response = await wmsApi.inboundOrders.update(
      id,
      data as unknown as Partial<InboundOrder>
    );
    if (!response.success) throw new Error('Failed to update inbound order');
    return response.data as unknown as Record<string, unknown>;
  },
  delete: async (id) => {
    const response = await wmsApi.inboundOrders.delete(id);
    if (!response.success) throw new Error('Failed to delete inbound order');
  },
};

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
