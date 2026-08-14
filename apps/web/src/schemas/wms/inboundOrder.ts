/**
 * 入库订单 Schema — 驱动 InboundOrderPage 的完整 CRUD
 *
 * 一个文件定义列表列、表单字段、筛选、状态徽章，
 * 不再需要在页面组件中重复定义。
 */

import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const inboundOrderSchema: EntitySchema = {
  entity: 'inbound_order',
  title: i18n.t('wms.inbound_order.k0'),
  description: i18n.t('wms.inbound_order.k1'),

  api: {
    module: 'wms',
    resource: 'inboundOrders',
  },

  fields: [
    {
      name: 'order_number',
      label: i18n.t('wms.inbound_order.k2'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 160,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'order_type',
      label: i18n.t('wms.inbound_order.k3'),
      type: 'select',
      defaultValue: 'purchase_in',
      options: {
        type: 'static',
        options: [
          { value: 'purchase_in', label: i18n.t('wms.inbound_order.k4') },
          { value: 'return_in', label: i18n.t('wms.inbound_order.k5') },
          { value: 'transfer_in', label: i18n.t('wms.inbound_order.k6') },
          { value: 'other_in', label: i18n.t('wms.inbound_order.k7') },
        ],
      },
      renderCell: (row: Record<string, unknown>) => {
        const map: Record<string, string> = {
          purchase_in: i18n.t('wms.inbound_order.k8'),
          return_in: i18n.t('wms.inbound_order.k9'),
          transfer_in: i18n.t('wms.inbound_order.k10'),
          other_in: i18n.t('wms.inbound_order.k11'),
        };
        return map[row.order_type as string] || String(row.order_type || '-');
      },
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'warehouse_id',
      label: i18n.t('wms.inbound_order.k12'),
      type: 'text',
    },
    {
      name: 'supplier_id',
      label: i18n.t('wms.inbound_order.id_13'),
      type: 'text',
      showInList: false,
      showInDetail: false,
    },
    {
      name: 'supplier_name',
      label: i18n.t('wms.inbound_order.k14'),
      type: 'text',
      validation: [{ type: 'maxLength', value: 255 }],
    },
    {
      name: 'expected_date',
      label: i18n.t('wms.inbound_order.k15'),
      type: 'date',
      renderCell: (row: Record<string, unknown>) =>
        row.expected_date ? new Date(row.expected_date as string).toLocaleDateString('zh-CN') : '-',
    },
    {
      name: 'total_amount',
      label: i18n.t('wms.inbound_order.k16'),
      type: 'number',
      showInDetail: true,
      readonly: true,
    },
    {
      name: 'status',
      label: i18n.t('wms.inbound_order.k17'),
      type: 'select',
      readonly: true,
      options: {
        type: 'static',
        options: [
          { value: 'pending', label: i18n.t('wms.inbound_order.k18') },
          { value: 'confirmed', label: i18n.t('wms.inbound_order.k19') },
          { value: 'receiving', label: i18n.t('wms.inbound_order.k20') },
          { value: 'completed', label: i18n.t('wms.inbound_order.k21') },
          { value: 'cancelled', label: i18n.t('wms.inbound_order.k22') },
        ],
      },
      validation: [{ type: 'maxLength', value: 20 }],
    },
  ],

  list: {
    columns: [
      'order_number',
      'order_type',
      'warehouse_id',
      'supplier_name',
      'expected_date',
      'total_amount',
      'status',
    ],
    searchFields: ['order_number', 'supplier_name'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        pending: 'warning',
        confirmed: 'info',
        receiving: 'primary',
        completed: 'success',
        cancelled: 'error',
      },
      labelMap: {
        pending: i18n.t('wms.inbound_order.k23'),
        confirmed: i18n.t('wms.inbound_order.k24'),
        receiving: i18n.t('wms.inbound_order.k25'),
        completed: i18n.t('wms.inbound_order.k26'),
        cancelled: i18n.t('wms.inbound_order.k27'),
      },
    },
  },

  actions: ['create', 'edit', 'detail', 'delete'],
  formColCount: 2,
  createTitle: i18n.t('wms.inbound_order.k28'),
  editTitle: i18n.t('wms.inbound_order.k29'),
  detailTitle: i18n.t('wms.inbound_order.k30'),
};
