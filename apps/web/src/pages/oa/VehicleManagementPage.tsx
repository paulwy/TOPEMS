import React from 'react';
import { useTranslation } from 'react-i18next';
import { ListPageTemplate } from '@/components/templates';
import type { ColumnDef } from '@/components/templates';
import type { CrudOperations } from '@/hooks';

interface VehicleRecord {
  id: string;
  plate_number: string;
  brand: string;
  model: string;
  status: string;
  driver: string;
}

export const VehicleManagementPage: React.FC = () => {
  const { t } = useTranslation('oa');

  // TODO: oaApi.vehicle.list 方法不存在，当前使用空数组占位；等待后端 OA 服务（svc 无 oa 模块，mobile 仅有 announcements 接口）就绪后替换为真实 API 调用
  const crudApi: CrudOperations<VehicleRecord> = {
    list: async () => ({
      success: true,
      code: 0,
      message: '',
      data: { items: [], total: 0 },
    }),
    get: async () => ({ success: true, code: 0, message: '', data: undefined }),
    create: async () => ({ success: true, code: 0, message: '', data: undefined }),
    update: async () => ({ success: true, code: 0, message: '', data: undefined }),
    delete: async () => ({ success: true, code: 0, message: '', data: '' }),
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
