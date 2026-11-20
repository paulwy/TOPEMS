/**
 * InboundOrderPage — Schema 驱动的入库订单管理页面
 *
 * 从 ~550 行手动 CRUD 代码缩减为配置化代码。
 * 列表列、表单字段、详情展示、行操作全部由 inboundOrderSchema 驱动。
 */

import type { CrudApiAdapter } from '@/components/templates/CrudPage';
import React from 'react';
import { wmsApi } from '@/api/wms';
import i18n from '@/i18n';
import { WMS_PATHS } from '@/module-configs/wms/config';
// P3 批7：新建操作权限约束（BE-only 码补前端落点，见 docs/audit/P3-3_*.md）
import { useOptionalPermission } from '@/hooks/useOptionalPermission';
import { ListPageTemplate } from '@/components/templates/ListPageTemplate';
import { SchemaForm } from '@/components/templates/list/SchemaForm';
import { createCrudPageAdapter } from '@/schema-dsl/crudPageAdapter';
import { createListPageCrudApi } from '@/schema-dsl/listPageCrudAdapter';
import { getColumns } from '@/schema-dsl';
import { inboundOrderSchema } from '@/schemas/wms/inboundOrder';
import type { EntitySchema } from '@/schema-dsl';

// 后端列表响应体为 { data: { orders: [...] , total } }（见 svc/wms GET /inbound-orders），
// normalizeListResponse 默认只认 items/materials/data 字段，需显式 itemsField='orders'，
// 否则列表 items 恒为空（total 正常 → 表格空 + 分页有数）。
const inboundOrderApiAdapter = createCrudPageAdapter(wmsApi.inboundOrders, {
  itemsField: 'orders',
});
const inboundOrderCrudApi = createListPageCrudApi<Record<string, unknown>>(
  inboundOrderApiAdapter as unknown as CrudApiAdapter<Record<string, unknown>>
);

const InboundOrderPage: React.FC = () => {
  // 批 14：改为无 Provider 依赖判定（无权限信息时放行）
  const checkPermission = useOptionalPermission();
  const canCreate = checkPermission('wms:inbound_order:write');
  const columns = React.useMemo(
    () =>
      getColumns<Record<string, unknown>>(
        inboundOrderSchema as unknown as EntitySchema<Record<string, unknown>>
      ),
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
      crud={{
        api: inboundOrderCrudApi,
        showCreateButton: canCreate,
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
