/**
 * 条码管理 Schema — 驱动 BarcodePage 的完整 CRUD
 */

import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

const statusColorMap: Record<
  string,
  'default' | 'primary' | 'success' | 'warning' | 'error' | 'info'
> = {
  [i18n.t('schemas.barcode.k0')]: 'success',
  [i18n.t('schemas.barcode.k1')]: 'info',
  [i18n.t('schemas.barcode.k2')]: 'primary',
  [i18n.t('schemas.barcode.k3')]: 'default',
  normal: 'success',
  printed: 'info',
  scanned: 'primary',
  disabled: 'default',
};

const statusLabelMap: Record<string, string> = {
  [i18n.t('schemas.barcode.k4')]: i18n.t('lims.barcode.k0'),
  [i18n.t('schemas.barcode.k5')]: i18n.t('lims.barcode.k1'),
  [i18n.t('schemas.barcode.k6')]: i18n.t('lims.barcode.k2'),
  [i18n.t('schemas.barcode.k7')]: i18n.t('lims.barcode.k3'),
  normal: i18n.t('lims.barcode.k4'),
  printed: i18n.t('lims.barcode.k5'),
  scanned: i18n.t('lims.barcode.k6'),
  disabled: i18n.t('lims.barcode.k7'),
};

export const barcodeSchema: EntitySchema = {
  entity: 'limsBarcode',
  title: i18n.t('lims.barcode.k8'),
  description: i18n.t('lims.barcode.k9'),

  api: {
    module: 'lims',
    resource: 'barcodes',
  },

  fields: [
    {
      name: 'barcode',
      label: i18n.t('lims.barcode.k10'),
      type: 'text',
      sortable: true,
      listWidth: 160,
    },
    {
      name: 'barcode_type',
      label: i18n.t('lims.barcode.k11'),
      type: 'text',
      listWidth: 120,
    },
    {
      name: 'format',
      label: i18n.t('lims.barcode.k12'),
      type: 'select',
      defaultValue: 'CODE128',
      options: {
        type: 'static',
        options: [
          { value: 'CODE128', label: 'CODE128' },
          { value: 'CODE39', label: 'CODE39' },
          { value: 'EAN13', label: 'EAN13' },
          { value: 'EAN8', label: 'EAN8' },
          { value: 'UPC', label: 'UPC' },
          { value: 'QR_CODE', label: i18n.t('lims.barcode.k13') },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'sample_name',
      label: i18n.t('lims.barcode.k14'),
      type: 'text',
      listWidth: 140,
      renderCell: (row: Record<string, unknown>) => String(row.sample_name || '-'),
    },
    {
      name: 'status',
      label: i18n.t('lims.barcode.k15'),
      type: 'select',
      defaultValue: i18n.t('lims.barcode.k16'),
      options: {
        type: 'static',
        options: [
          { value: i18n.t('lims.barcode.k17'), label: i18n.t('lims.barcode.k18') },
          { value: i18n.t('lims.barcode.k19'), label: i18n.t('lims.barcode.k20') },
          { value: i18n.t('lims.barcode.k21'), label: i18n.t('lims.barcode.k22') },
          { value: i18n.t('lims.barcode.k23'), label: i18n.t('lims.barcode.k24') },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'content',
      label: i18n.t('lims.barcode.k25'),
      type: 'text',
      showInList: false,
    },
    {
      name: 'generated_at',
      label: i18n.t('lims.barcode.k26'),
      type: 'date',
      listWidth: 130,
      renderCell: (row: Record<string, unknown>) => {
        const value = row.generated_at;
        if (!value) return '-';
        return new Date(value as string).toLocaleDateString('zh-CN');
      },
    },
    {
      name: 'printed_at',
      label: i18n.t('lims.barcode.k27'),
      type: 'date',
      listWidth: 130,
      renderCell: (row: Record<string, unknown>) => {
        const value = row.printed_at;
        if (!value) return '-';
        return new Date(value as string).toLocaleDateString('zh-CN');
      },
    },
    {
      name: 'scanned_at',
      label: i18n.t('lims.barcode.k28'),
      type: 'date',
      showInList: false,
    },
    {
      name: 'created_by',
      label: i18n.t('lims.barcode.k29'),
      type: 'text',
      showInList: false,
    },
    {
      name: 'created_at',
      label: i18n.t('lims.barcode.k30'),
      type: 'date',
      showInList: false,
    },
    {
      name: 'quantity',
      label: i18n.t('lims.barcode.k31'),
      type: 'number',
      defaultValue: 1,
      showInList: false,
    },
    {
      name: 'prefix',
      label: i18n.t('lims.barcode.k32'),
      type: 'text',
      showInList: false,
    },
    {
      name: 'sample_id',
      label: i18n.t('lims.barcode.id_33'),
      type: 'text',
      showInList: false,
    },
  ],

  list: {
    columns: [
      'barcode',
      'barcode_type',
      'format',
      'sample_name',
      'status',
      'generated_at',
      'printed_at',
    ],
    searchFields: ['barcode', 'sample_name'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: statusColorMap,
      labelMap: statusLabelMap,
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('lims.barcode.k34'),
        type: 'select',
        options: [
          { label: i18n.t('lims.barcode.k35'), value: 'all' },
          { label: i18n.t('lims.barcode.k36'), value: i18n.t('lims.barcode.k37') },
          { label: i18n.t('lims.barcode.k38'), value: i18n.t('lims.barcode.k39') },
          { label: i18n.t('lims.barcode.k40'), value: i18n.t('lims.barcode.k41') },
          { label: i18n.t('lims.barcode.k42'), value: i18n.t('lims.barcode.k43') },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('lims.barcode.k44'),
      fields: ['barcode_type', 'format', 'quantity', 'prefix'],
    },
    {
      title: i18n.t('lims.barcode.k45'),
      fields: ['sample_id', 'content'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('lims.barcode.k46'),
  editTitle: i18n.t('lims.barcode.k47'),
  detailTitle: i18n.t('lims.barcode.k48'),
};
