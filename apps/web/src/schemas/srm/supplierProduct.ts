import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';
import { localizedName } from '@/utils/i18n';

export const supplierProductSchema: EntitySchema = {
  entity: 'supplier_product',
  title: i18n.t('srm.supplier_product.k0'),
  description: i18n.t('srm.supplier_product.k1'),

  api: {
    module: 'srm',
    resource: 'supplier-products',
  },

  fields: [
    {
      name: 'product_code',
      label: i18n.t('srm.supplier_product.k2'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'name',
      label: i18n.t('srm.supplier_product.k3'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 160,
      validation: [{ type: 'maxLength', value: 200 }],
      renderCell: (row, _index) =>
        localizedName(row.name as string | null, row.name_en as string | null) || '-',
    },
    {
      name: 'supplier',
      label: i18n.t('srm.supplier_product.k4'),
      type: 'text',
      required: true,
      listWidth: 140,
      renderCell: (row, _index) => {
        const zh = (row.supplier_name ?? row.supplier) as string | null | undefined;
        return localizedName(zh, row.supplier_name_en as string | null) || '-';
      },
    },
    {
      name: 'category',
      label: i18n.t('srm.supplier_product.k5'),
      type: 'select',
      options: {
        type: 'static',
        options: [
          { value: i18n.t('srm.supplier_product.k6'), label: i18n.t('srm.supplier_product.k7') },
          { value: i18n.t('srm.supplier_product.k8'), label: i18n.t('srm.supplier_product.k9') },
          { value: i18n.t('srm.supplier_product.k10'), label: i18n.t('srm.supplier_product.k11') },
          { value: i18n.t('srm.supplier_product.k12'), label: i18n.t('srm.supplier_product.k13') },
          { value: i18n.t('srm.supplier_product.k14'), label: i18n.t('srm.supplier_product.k15') },
          { value: i18n.t('srm.supplier_product.k16'), label: i18n.t('srm.supplier_product.k17') },
          { value: i18n.t('srm.supplier_product.k18'), label: i18n.t('srm.supplier_product.k19') },
          { value: i18n.t('srm.supplier_product.k20'), label: i18n.t('srm.supplier_product.k21') },
        ],
      },
      listWidth: 120,
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'price',
      label: i18n.t('srm.supplier_product.k22'),
      type: 'number',
      required: true,
      defaultValue: 0,
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const price = row.price as number | undefined;
        return price != null
          ? `¥${price.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`
          : '-';
      },
    },
    {
      name: 'unit',
      label: i18n.t('srm.supplier_product.k23'),
      type: 'text',
      defaultValue: i18n.t('srm.supplier_product.k24'),
      listWidth: 80,
      validation: [{ type: 'maxLength', value: 20 }],
    },
    {
      name: 'status',
      label: i18n.t('srm.supplier_product.k25'),
      type: 'select',
      required: true,
      defaultValue: 'active',
      options: {
        type: 'static',
        options: [
          { value: 'active', label: i18n.t('srm.supplier_product.k26') },
          { value: 'inactive', label: i18n.t('srm.supplier_product.k27') },
          { value: 'pending', label: i18n.t('srm.supplier_product.k28') },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 20 }],
    },
    {
      name: 'created_at',
      label: i18n.t('srm.supplier_product.k29'),
      type: 'datetime',
      readonly: true,
      hideInForm: true,
      sortable: true,
      listWidth: 160,
    },
    {
      name: 'updated_at',
      label: i18n.t('srm.supplier_product.k30'),
      type: 'datetime',
      readonly: true,
      hideInForm: true,
      sortable: true,
      listWidth: 160,
    },
  ],

  list: {
    columns: ['product_code', 'name', 'supplier', 'category', 'price', 'unit', 'status'],
    searchFields: ['product_code', 'name', 'supplier'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        active: 'success',
        inactive: 'error',
        pending: 'warning',
      },
      labelMap: {
        active: i18n.t('srm.supplier_product.k31'),
        inactive: i18n.t('srm.supplier_product.k32'),
        pending: i18n.t('srm.supplier_product.k33'),
      },
    },
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('srm.supplier_product.k34'),
      fields: ['product_code', 'name', 'supplier', 'category'],
    },
    {
      title: i18n.t('srm.supplier_product.k35'),
      fields: ['price', 'unit'],
    },
    {
      title: i18n.t('srm.supplier_product.k36'),
      fields: ['status'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('srm.supplier_product.k37'),
  editTitle: i18n.t('srm.supplier_product.k38'),
  detailTitle: i18n.t('srm.supplier_product.k39'),
};
