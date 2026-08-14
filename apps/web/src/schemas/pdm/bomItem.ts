import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const bomItemSchema: EntitySchema = {
  entity: 'pdm_bom_item',
  title: i18n.t('shared.bom_item.bom_0'),
  description: i18n.t('pdm.bom_item.k0'),

  api: {
    module: 'pdm',
    resource: 'bomItems',
  },

  fields: [
    {
      name: 'level',
      label: i18n.t('pdm.bom_item.k1'),
      type: 'number',
      defaultValue: 1,
      listWidth: 80,
    },
    {
      name: 'part_number',
      label: i18n.t('pdm.bom_item.k2'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'part_name',
      label: i18n.t('pdm.bom_item.k3'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 160,
    },
    {
      name: 'quantity',
      label: i18n.t('pdm.bom_item.k4'),
      type: 'number',
      defaultValue: 0,
      listWidth: 80,
      align: 'right',
    },
    {
      name: 'unit',
      label: i18n.t('pdm.bom_item.k5'),
      type: 'select',
      defaultValue: 'kg',
      options: {
        type: 'static',
        options: [
          { value: 'kg', label: 'kg' },
          { value: i18n.t('pdm.bom_item.k6'), label: i18n.t('pdm.bom_item.k7') },
          { value: i18n.t('pdm.bom_item.k8'), label: i18n.t('pdm.bom_item.k9') },
          { value: i18n.t('pdm.bom_item.k10'), label: i18n.t('pdm.bom_item.k11') },
        ],
      },
      listWidth: 80,
      align: 'center',
      validation: [{ type: 'maxLength', value: 32 }],
    },
    {
      name: 'unit_price',
      label: i18n.t('pdm.bom_item.k12'),
      type: 'number',
      defaultValue: 0,
      listWidth: 100,
      align: 'right',
    },
    {
      name: 'total_price',
      label: i18n.t('pdm.bom_item.k13'),
      type: 'number',
      readonly: true,
      listWidth: 100,
      align: 'right',
      hideInForm: true,
    },
    {
      name: 'item_no',
      label: i18n.t('pdm.bom_item.k14'),
      type: 'text',
      showInList: false,
    },
    {
      name: 'bom_version_id',
      label: i18n.t('shared.bom_item.bomid_1'),
      type: 'text',
      showInList: false,
    },
    {
      name: 'product_id',
      label: i18n.t('pdm.bom_item.id_15'),
      type: 'text',
      showInList: false,
    },
    {
      name: 'is_alternative',
      label: i18n.t('pdm.bom_item.k16'),
      type: 'switch',
      defaultValue: false,
      showInList: false,
    },
    {
      name: 'remarks',
      label: i18n.t('pdm.bom_item.k17'),
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'created_at',
      label: i18n.t('pdm.bom_item.k18'),
      type: 'datetime',
      readonly: true,
      sortable: true,
      listWidth: 160,
      hideInForm: true,
    },
    {
      name: 'updated_at',
      label: i18n.t('pdm.bom_item.k19'),
      type: 'datetime',
      readonly: true,
      hideInForm: true,
      showInList: false,
    },
  ],

  list: {
    columns: ['level', 'part_number', 'part_name', 'quantity', 'unit', 'unit_price', 'total_price'],
    searchFields: ['part_number', 'part_name'],
    pageSize: 10,
    filters: [
      {
        id: 'product',
        label: i18n.t('pdm.bom_item.k20'),
        type: 'select',
        options: [],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('pdm.bom_item.k21'),
      fields: ['part_number', 'part_name', 'level', 'item_no'],
    },
    {
      title: i18n.t('pdm.bom_item.k22'),
      fields: ['quantity', 'unit', 'unit_price', 'is_alternative'],
    },
    {
      title: i18n.t('pdm.bom_item.k23'),
      fields: ['bom_version_id', 'product_id'],
    },
    {
      title: i18n.t('pdm.bom_item.k24'),
      fields: ['remarks'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('pdm.bom_item.k25'),
  editTitle: i18n.t('pdm.bom_item.k26'),
  detailTitle: i18n.t('pdm.bom_item.k27'),
};
