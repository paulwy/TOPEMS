import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const purchaseItemSchema: EntitySchema = {
  entity: 'purchaseItem',
  title: i18n.t('scm.purchase_item.k0'),
  description: i18n.t('scm.purchase_item.k1'),

  api: {
    module: 'scm',
    resource: 'purchaseItems',
  },

  fields: [
    {
      name: 'order_id',
      label: i18n.t('scm.purchase_item.id_2'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 160,
    },
    {
      name: 'product_code',
      label: i18n.t('scm.purchase_item.k3'),
      type: 'text',
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'product_name',
      label: i18n.t('scm.purchase_item.k4'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 160,
    },
    {
      name: 'specification',
      label: i18n.t('scm.purchase_item.k5'),
      type: 'text',
      listWidth: 120,
      validation: [{ type: 'maxLength', value: 200 }],
    },
    {
      name: 'unit',
      label: i18n.t('scm.purchase_item.k6'),
      type: 'text',
      listWidth: 80,
      validation: [{ type: 'maxLength', value: 20 }],
    },
    {
      name: 'quantity',
      label: i18n.t('scm.purchase_item.k7'),
      type: 'number',
      required: true,
      defaultValue: 0,
      sortable: true,
      align: 'right',
      listWidth: 100,
    },
    {
      name: 'unit_price',
      label: i18n.t('scm.purchase_item.k8'),
      type: 'number',
      defaultValue: 0,
      align: 'right',
      listWidth: 100,
    },
    {
      name: 'amount',
      label: i18n.t('scm.purchase_item.k9'),
      type: 'number',
      defaultValue: 0,
      align: 'right',
      listWidth: 120,
    },
  ],

  list: {
    columns: [
      'order_id',
      'product_code',
      'product_name',
      'specification',
      'unit',
      'quantity',
      'unit_price',
      'amount',
    ],
    searchFields: ['order_id', 'product_code', 'product_name'],
    pageSize: 10,
  },

  actions: ['create', 'edit', 'detail'],

  formSections: [
    {
      title: i18n.t('scm.purchase_item.k10'),
      fields: ['order_id', 'product_code', 'product_name', 'specification'],
    },
    {
      title: i18n.t('scm.purchase_item.k11'),
      fields: ['unit', 'quantity', 'unit_price', 'amount'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('scm.purchase_item.k12'),
  editTitle: i18n.t('scm.purchase_item.k13'),
  detailTitle: i18n.t('scm.purchase_item.k14'),
};
