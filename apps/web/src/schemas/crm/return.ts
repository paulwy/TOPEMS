import type { EntitySchema } from '@/schema-dsl';
import i18n from '@/i18n';
import {
  loadCrmCustomerOptions,
  loadWmsWarehouseOptions,
} from '@/schemas/dynamicLoaders';

export const returnSchema: EntitySchema = {
  entity: 'return',
  title: i18n.t('shared.return.k0'),

  api: {
    module: 'crm',
    resource: 'returns',
  },

  // 批 23：写权限资源前缀（DB 实查 create/update/delete 三码齐全）
  permissionResource: 'crm:return',

  // 客户/仓库都是 uuid 外键：裸文本框填任何非 UUID 必 422 UUID parsing failed
  dynamicOptions: [
    { field: 'customer_id', queryKey: ['crm', 'customers', 'forReturn'], loader: loadCrmCustomerOptions },
    { field: 'warehouse_id', queryKey: ['wms', 'warehouses', 'forReturn'], loader: loadWmsWarehouseOptions },
  ],

  fields: [
    {
      name: 'return_no',
      label: i18n.t('shared.return.k1'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      listWidth: 140,
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'customer_id',
      label: i18n.t('shared.return.id_2'),
      type: 'select',
      required: true,
      listWidth: 150,
    },
    {
      name: 'order_id',
      label: i18n.t('shared.return.id_3'),
      type: 'text',
      showInList: false,
      // CRM 未暴露客户订单读取端点（crm.customer_orders 只由事件写入），
      // 下拉无数据源；该字段本身可选，先移出新建表单，避免手填 UUID 才 422。
      hideInForm: true,
    },
    {
      name: 'return_type',
      label: i18n.t('shared.return.k4'),
      type: 'select',
      required: true,
      options: {
        type: 'static',
        options: [
          { value: 'return', label: i18n.t('shared.return.k5') },
          { value: 'exchange', label: i18n.t('shared.return.k6') },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 20 }],
    },
    {
      name: 'reason',
      label: i18n.t('shared.return.k7'),
      type: 'text',
      required: true,
      listWidth: 160,
    },
    {
      name: 'reason_detail',
      label: i18n.t('shared.return.k8'),
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'status',
      label: i18n.t('shared.return.k9'),
      type: 'select',
      defaultValue: 'pending',
      options: {
        type: 'static',
        options: [
          { value: 'pending', label: i18n.t('shared.return.k10') },
          { value: 'accepted', label: i18n.t('shared.return.status_accepted') },
          { value: 'approved', label: i18n.t('shared.return.k11') },
          { value: 'rejected', label: i18n.t('shared.return.k12') },
          { value: 'processing', label: i18n.t('shared.return.status_processing') },
          { value: 'completed', label: i18n.t('shared.return.k14') },
          { value: 'cancelled', label: i18n.t('shared.return.k15') },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 20 }],
    },
    {
      name: 'refund_amount',
      label: i18n.t('shared.return.k16'),
      type: 'number',
      listWidth: 120,
    },
    {
      name: 'warehouse_id',
      label: i18n.t('shared.return.id_17'),
      type: 'select',
      showInList: false,
    },
    {
      name: 'created_at',
      label: i18n.t('shared.return.k18'),
      type: 'datetime',
      readonlyOnEdit: true,
      showInForm: false,
      listWidth: 160,
    },
  ],

  list: {
    columns: [
      'return_no',
      'customer_id',
      'return_type',
      'reason',
      'status',
      'refund_amount',
      'created_at',
    ],
    searchFields: ['return_no', 'reason'],
    pageSize: 20,
    statusBadge: {
      field: 'status',
      colorMap: {
        pending: 'warning',
        accepted: 'info',
        approved: 'success',
        rejected: 'error',
        processing: 'info',
        completed: 'success',
        cancelled: 'default',
      },
      labelMap: {
        pending: i18n.t('shared.return.k19'),
        accepted: i18n.t('shared.return.status_accepted'),
        approved: i18n.t('shared.return.k20'),
        rejected: i18n.t('shared.return.k21'),
        processing: i18n.t('shared.return.status_processing'),
        completed: i18n.t('shared.return.k23'),
        cancelled: i18n.t('shared.return.k24'),
      },
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('shared.return.k25'),
        type: 'select',
        options: [
          { label: i18n.t('shared.return.k26'), value: 'all' },
          { label: i18n.t('shared.return.k27'), value: 'pending' },
          { label: i18n.t('shared.return.status_accepted'), value: 'accepted' },
          { label: i18n.t('shared.return.k28'), value: 'approved' },
          { label: i18n.t('shared.return.k29'), value: 'rejected' },
          { label: i18n.t('shared.return.status_processing'), value: 'processing' },
          { label: i18n.t('shared.return.k31'), value: 'completed' },
          { label: i18n.t('shared.return.k32'), value: 'cancelled' },
        ],
      },
      {
        id: 'return_type',
        label: i18n.t('shared.return.k33'),
        type: 'select',
        options: [
          { label: i18n.t('shared.return.k34'), value: 'all' },
          { label: i18n.t('shared.return.k35'), value: 'return' },
          { label: i18n.t('shared.return.k36'), value: 'exchange' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('shared.return.k37'),
      fields: ['return_no', 'customer_id', 'order_id', 'return_type'],
    },
    {
      title: i18n.t('shared.return.k38'),
      fields: ['reason', 'reason_detail', 'refund_amount'],
    },
    {
      title: i18n.t('shared.return.k39'),
      fields: ['status', 'warehouse_id'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('shared.return.k40'),
  editTitle: i18n.t('shared.return.k41'),
  detailTitle: i18n.t('shared.return.k42'),
};
