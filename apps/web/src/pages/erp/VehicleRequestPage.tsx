import React from 'react';
import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import { vehicleRequestSchema } from '@/schemas/erp/vehicleRequest';
import { vehicleRequestApi } from '@/api/erp';

const vehicleRequestApiAdapter: CrudApiAdapter = {
  list: async (params) => {
    const response = await vehicleRequestApi.list({
      page: params?.page,
      pagesize: params?.pageSize,
      search: params?.search,
      status: params?.status as string | undefined,
    });
    if (!response.success) {
      throw new Error('加载车辆申请列表失败');
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
      throw new Error('创建车辆申请失败');
    }
    return response.data as unknown as Record<string, unknown>;
  },

  update: async (id, data) => {
    const response = await vehicleRequestApi.update(
      id,
      data as unknown as Parameters<typeof vehicleRequestApi.update>[1]
    );
    if (!response.success) {
      throw new Error('更新车辆申请失败');
    }
    return response.data as unknown as Record<string, unknown>;
  },

  delete: async (id) => {
    const response = await vehicleRequestApi.delete(id);
    if (!response.success) {
      throw new Error('删除车辆申请失败');
    }
  },
};

const VehicleRequestPage: React.FC = () => {
  return (
    <CrudPage
      schema={vehicleRequestSchema}
      apiAdapter={vehicleRequestApiAdapter}
      breadcrumbs={[
        { label: '首页', href: '/dashboard' },
        { label: 'ERP', href: '/erp' },
        { label: '车辆申请' },
      ]}
    />
  );
};

export default VehicleRequestPage;
