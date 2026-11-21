import React from 'react';
import { useTranslation } from 'react-i18next';
import { ListPageTemplate } from '@/components/templates';
import type { ColumnDef } from '@/components/templates';
import type { CrudOperations } from '@/hooks';
import { vehicleApi } from '@/api/erp/core';
import type { PaginationParams } from '@/api/erp/core/types';

interface VehicleRecord {
  id: string;
  plate_number: string;
  brand?: string;
  model?: string;
  status: string;
  driver?: string;
}

export const VehicleManagementPage: React.FC = () => {
  const { t } = useTranslation('oa');

  const crudApi: CrudOperations<VehicleRecord> = {
    list: async (params) => {
      const r = await vehicleApi.list(params as PaginationParams);
      return { success: r.success, code: r.code, message: r.message, data: r.data };
    },
    get: async (id) => {
      const r = await vehicleApi.get(id);
      return { success: r.success, code: r.code, message: r.message, data: r.data };
    },
    create: async (data) => {
      const r = await vehicleApi.create(data as Parameters<typeof vehicleApi.create>[0]);
      return { success: r.success, code: r.code, message: r.message, data: r.data };
    },
    update: async (id, data) => {
      const r = await vehicleApi.update(id, data as Parameters<typeof vehicleApi.update>[1]);
      return { success: r.success, code: r.code, message: r.message, data: r.data };
    },
    delete: async (id) => {
      const r = await vehicleApi.delete(id);
      return { success: r.success, code: r.code, message: r.message, data: r.data };
    },
  };

  const columns: ColumnDef<VehicleRecord>[] = [
    { id: 'id', label: t('oa.vehicle_management_page.k1'), width: 120 },
    { id: 'plate_number', label: t('oa.vehicle_management_page.k2'), width: 140 },
    { id: 'brand', label: t('oa.vehicle_management_page.k3'), width: 120 },
    { id: 'model', label: t('oa.vehicle_management_page.k4'), width: 140 },
    { id: 'status', label: t('oa.vehicle_management_page.k5'), width: 120 },
    { id: 'driver', label: t('oa.vehicle_management_page.k6'), width: 120 },
  ];

  return (
    <ListPageTemplate<VehicleRecord>
      title={t('oa.vehicle_management_page.k0')}
      data={[]}
      crud={{
        api: crudApi,
        queryKey: 'oa-vehicles',
      }}
      columns={columns}
      emptyMessage={t('oa.vehicle_management_page.k8')}
    />
  );
};

export default VehicleManagementPage;
