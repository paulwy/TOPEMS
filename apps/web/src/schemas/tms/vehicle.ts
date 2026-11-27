import type { EntitySchema } from '@/schema-dsl';
import i18n from '@/i18n';
import { carrierApi } from '@/api/tms/carrier';

export const vehicleSchema: EntitySchema = {
  entity: 'vehicle',
  title: i18n.t('tms.vehicle_management_page.k15'),
  description: i18n.t('tms.vehicle_management_page.k16'),

  api: {
    module: 'tms',
    resource: 'vehicles',
    listMethod: 'list',
    getMethod: 'get',
    createMethod: 'create',
    updateMethod: 'update',
    deleteMethod: 'delete',
  },

  dynamicOptions: [
    {
      field: 'carrier_id',
      queryKey: ['tms', 'carriers', 'forVehicle'],
      loader: async () => {
        const res = await carrierApi.list({ page: 1, page_size: 200 });
        const payload: unknown = res?.data;
        const rows = Array.isArray(payload)
          ? payload
          : ((payload as { carriers?: unknown[]; items?: unknown[] })?.carriers ??
            (payload as { items?: unknown[] })?.items ??
            []);
        return rows
          .filter((c) => c.id)
          .map((c) => ({ value: c.id, label: c.name || c.carrier_no || c.id }));
      },
    },
  ],

  // 批 23：写权限资源前缀（DB 实查 create/update/delete 三码齐全）
  permissionResource: 'tms:vehicle',

  fields: [
    {
      name: 'vehicle_no',
      label: i18n.t('tms.vehicle_management_page.k31'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'plate_number',
      label: i18n.t('tms.vehicle_management_page.k32'),
      type: 'text',
      listWidth: 140,
    },
    {
      name: 'vehicle_type',
      label: i18n.t('tms.vehicle_management_page.k33'),
      type: 'text',
      listWidth: 120,
    },
    {
      name: 'capacity',
      label: i18n.t('tms.vehicle_management_page.k34'),
      type: 'number',
      listWidth: 100,
    },
    {
      name: 'carrier_id',
      label: i18n.t('tms.vehicle_management_page.id_35'),
      // 承运商同样从裸 UUID 文本框改为下拉（可选字段，列表为空时不阻塞创建）
      type: 'select',
      listWidth: 140,
    },
    {
      name: 'status',
      label: i18n.t('tms.vehicle_management_page.k36'),
      type: 'select',
      defaultValue: 'active',
      options: {
        type: 'static',
        options: [
          { value: 'active', label: i18n.t('tms.vehicle_management_page.k0') },
          { value: 'inactive', label: i18n.t('tms.vehicle_management_page.k1') },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'notes',
      label: i18n.t('tms.vehicle_management_page.k37'),
      type: 'textarea',
      showInList: false,
    },
  ],

  list: {
    columns: ['vehicle_no', 'plate_number', 'vehicle_type', 'capacity', 'carrier_id', 'status'],
    searchFields: ['vehicle_no', 'plate_number', 'vehicle_type'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: { active: 'success', inactive: 'default', maintenance: 'warning' },
      labelMap: {
        active: i18n.t('tms.vehicle_management_page.k2'),
        inactive: i18n.t('tms.vehicle_management_page.k3'),
        maintenance: i18n.t('tms.vehicle_management_page.k4'),
      },
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('tms.vehicle_management_page.k24'),
        type: 'select',
        options: [
          { label: i18n.t('tms.vehicle_management_page.k0'), value: 'active' },
          { label: i18n.t('tms.vehicle_management_page.k1'), value: 'inactive' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],
  formColCount: 2,
  createTitle: i18n.t('tms.vehicle_management_page.k30'),
  editTitle: i18n.t('tms.vehicle_management_page.k29'),
};
