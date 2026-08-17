import React from 'react';
import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import { vehicleRequestSchema } from '@/schemas/erp/vehicleRequest';
import { vehicleRequestApi } from '@/api/erp';
import i18n from '@/i18n';

const vehicleRequestApiAdapter: CrudApiAdapter = {
  list: async (params) => {
    const response = await vehicleRequestApi.list({
      page: params?.page,
      pagesize: params?.pageSize,
      search: params?.search,
      status: params?.status as string | undefined,
    });
    if (!response.success) {
      throw new Error(i18n.t('erp.vehicle_request_page.k0'));
    }
    const data = response.data;
    return {
      data: (data?.items || []) as unknown as Record<string, unknown>[],
      total: data?.total || 0,
    };
  },
  create: async (data) => {
    const response = await vehicleRequestApi.create(
      data as unknown as Parameters<typeof vehicleRequestApi.create>[0]
    );
    if (!response.success) {
      throw new Error(i18n.t('erp.vehicle_request_page.k1'));
    }
    return response.data as unknown as Record<string, unknown>;
  },
  update: async (id, data) => {
    const response = await vehicleRequestApi.update(
      id,
      data as unknown as Parameters<typeof vehicleRequestApi.update>[1]
    );
    if (!response.success) {
      throw new Error(i18n.t('erp.vehicle_request_page.k2'));
    }
    return response.data as unknown as Record<string, unknown>;
  },
  delete: async (id) => {
    const response = await vehicleRequestApi.delete(id);
    if (!response.success) {
      throw new Error(i18n.t('erp.vehicle_request_page.k3'));
    }
  },
};
const VehicleRequestPage: React.FC = () => {
  return (
    <CrudPage
      schema={vehicleRequestSchema}
      apiAdapter={vehicleRequestApiAdapter}
      breadcrumbs={[
        { label: i18n.t('erp.vehicle_request_page.k4'), href: '/dashboard' },
        { label: 'ERP', href: '/erp' },
        { label: i18n.t('erp.vehicle_request_page.k5') },
      ]}
    />
  );
};
export default VehicleRequestPage;
