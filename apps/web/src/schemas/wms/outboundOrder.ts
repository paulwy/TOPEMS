/**
 * 出库订单 Schema
 */

import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const outboundOrderSchema: EntitySchema = {
  entity: 'outbound_order',
  title: i18n.t('wms.outbound_order.k0'),
  description: i18n.t('wms.outbound_order.k1'),

  api: {
    module: 'wms',
    resource: 'outboundOrders',
  },

  fields: [
    {
      name: 'order_number',
      label: i18n.t('wms.outbound_order.k2'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 160,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'warehouse_id',
      label: i18n.t('wms.outbound_order.k3'),
      type: 'text',
    },
    {
      name: 'customer_id',
      label: i18n.t('wms.outbound_order.id_4'),
      type: 'text',
      showInList: false,
    },
    {
      name: 'customer_name',
      label: i18n.t('wms.outbound_order.k5'),
      type: 'text',
      validation: [{ type: 'maxLength', value: 255 }],
    },
    {
      name: 'order_date',
      label: i18n.t('wms.outbound_order.k6'),
      type: 'date',
      required: true,
      renderCell: (row: Record<string, unknown>) =>
        row.order_date ? new Date(row.order_date as string).toLocaleDateString('zh-CN') : '-',
    },
    {
      name: 'expected_delivery',
      label: i18n.t('wms.outbound_order.k7'),
      type: 'date',
      renderCell: (row: Record<string, unknown>) =>
        row.expected_delivery
          ? new Date(row.expected_delivery as string).toLocaleDateString('zh-CN')
          : '-',
    },
    {
      name: 'total_amount',
      label: i18n.t('wms.outbound_order.k8'),
      type: 'number',
    },
    {
      name: 'status',
      label: i18n.t('wms.outbound_order.k9'),
      type: 'text',
      readonly: true,
      renderCell: (row: Record<string, unknown>) => {
        const statusMap: Record<string, string> = {
          pending: i18n.t('wms.outbound_order.k10'),
          confirmed: i18n.t('wms.outbound_order.k11'),
          picking: i18n.t('wms.outbound_order.k12'),
          packing: i18n.t('wms.outbound_order.k13'),
          shipped: i18n.t('wms.outbound_order.k14'),
          completed: i18n.t('wms.outbound_order.k15'),
          cancelled: i18n.t('wms.outbound_order.k16'),
        };
        return statusMap[row.status as string] || String(row.status || '-');
      },
      validation: [{ type: 'maxLength', value: 32 }],
    },
    {
      name: 'remarks',
      label: i18n.t('wms.outbound_order.k17'),
      type: 'textarea',
      showInList: false,
    },
  ],

  list: {
    columns: [
      'order_number',
      'warehouse_id',
      'customer_name',
      'order_date',
      'expected_delivery',
      'total_amount',
      'status',
    ],
    searchFields: ['order_number', 'customer_name'],
    pageSize: 10,
  },

  actions: ['create', 'edit', 'detail', 'delete'],
  formColCount: 2,
  createTitle: i18n.t('wms.outbound_order.k18'),
  editTitle: i18n.t('wms.outbound_order.k19'),
  detailTitle: i18n.t('wms.outbound_order.k20'),
};
