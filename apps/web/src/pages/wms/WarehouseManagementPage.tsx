/**
 * 仓库管理页面 — Schema 驱动的 CRUD 页面
 */

import React from 'react';
import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import { warehouseSchema } from '@/schemas/wms/warehouse';
import { wmsApi } from '@/api/wms';
import { WMS_PATHS } from '@/modules/wms/config';
import i18n from '@/i18n';

const warehouseApiAdapter: CrudApiAdapter = {
  list: async (params) => {
    const response = await wmsApi.warehouses.list({
      page: params?.page,
      pagesize: params?.pageSize,
      search: params?.search,
      status: params?.status as string | undefined,
    } as Parameters<typeof wmsApi.warehouses.list>[0]);
    if (!response.success) {
      throw new Error(i18n.t('pages.warehouse_management_page.k0'));
    }
    return {
      data: (response.data?.items || []) as unknown as Record<string, unknown>[],
      total: response.data?.total || 0,
    };
  },

  create: async (data) => {
    const response = await wmsApi.warehouses.create(
      data as unknown as Parameters<typeof wmsApi.warehouses.create>[0]
    );
    if (!response.success) {
      throw new Error(i18n.t('pages.warehouse_management_page.k1'));
    }
    return response.data as unknown as Record<string, unknown>;
  },

  update: async (id, data) => {
    const response = await wmsApi.warehouses.update(
      id,
      data as unknown as Parameters<typeof wmsApi.warehouses.update>[1]
    );
    if (!response.success) {
      throw new Error(i18n.t('pages.warehouse_management_page.k2'));
    }
    return response.data as unknown as Record<string, unknown>;
  },

  delete: async (id) => {
    const response = await wmsApi.warehouses.delete(id);
    if (!response.success) {
      throw new Error(i18n.t('pages.warehouse_management_page.k3'));
    }
  },
};

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
