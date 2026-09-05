/**
 * 仓库管理页面 — Schema 驱动的 CRUD 页面
 */

import type { CrudApiAdapter } from '@/components/templates/CrudPage';
import React from 'react';
import { ListPageTemplate } from '@/components/templates/ListPageTemplate';
import { SchemaForm } from '@/components/templates/list/SchemaForm';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { createListPageCrudApi } from '@/schema/listPageCrudAdapter';
import { getColumns } from '@/schema';
import { warehouseSchema } from '@/schemas/wms/warehouse';
import { wmsApi } from '@/api/wms';
import { WMS_PATHS } from '@/modules/wms/config';
import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

const warehouseApiAdapter = createCrudPageAdapter(wmsApi.warehouses);
const warehouseCrudApi = createListPageCrudApi<Record<string, unknown>>(
  warehouseApiAdapter as unknown as CrudApiAdapter<Record<string, unknown>>
);

const WarehouseManagementPage: React.FC = () => {
  const columns = React.useMemo(
    () =>
      getColumns<Record<string, unknown>>(
        warehouseSchema as unknown as EntitySchema<Record<string, unknown>>
      ),
    []
  );

  return (
    <ListPageTemplate<Record<string, unknown>>
      title={i18n.t('pages.warehouse_management_page.k6')}
      breadcrumbs={[
        { label: i18n.t('pages.warehouse_management_page.k4'), href: '/dashboard' },
        { label: i18n.t('pages.warehouse_management_page.k5'), href: WMS_PATHS.root },
        { label: i18n.t('pages.warehouse_management_page.k6') },
      ]}
      columns={columns}
      data={[]}
      crud={{
        api: warehouseCrudApi,
        queryKey: 'wms-warehouses',
        entityName: i18n.t('pages.warehouse_management_page.k6'),
        renderForm: ({ mode, record, onSubmit, onClose }) => (
          <SchemaForm<Record<string, unknown>>
            schema={warehouseSchema as unknown as EntitySchema<Record<string, unknown>>}
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

export default WarehouseManagementPage;
