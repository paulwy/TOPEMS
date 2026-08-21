/**
 * 仓库管理页面 — Schema 驱动的 CRUD 页面
 */

import React from 'react';
import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { warehouseSchema } from '@/schemas/wms/warehouse';
import { wmsApi } from '@/api/wms';
import { WMS_PATHS } from '@/modules/wms/config';
import i18n from '@/i18n';

const warehouseApiAdapter = createCrudPageAdapter(wmsApi.warehouses);

const WarehouseManagementPage: React.FC = () => {
  return (
    <CrudPage
      schema={warehouseSchema}
      apiAdapter={warehouseApiAdapter}
      breadcrumbs={[
        { label: i18n.t('pages.warehouse_management_page.k4'), href: '/dashboard' },
        { label: i18n.t('pages.warehouse_management_page.k5'), href: WMS_PATHS.root },
        { label: i18n.t('pages.warehouse_management_page.k6') },
      ]}
    />
  );
};

export default WarehouseManagementPage;
