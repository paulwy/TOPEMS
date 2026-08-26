/**
 * 检测方法管理 Schema — 驱动 LimsTestMethodPage 的完整 CRUD
 */

import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const testMethodSchema: EntitySchema = {
  entity: 'test_method',
  title: i18n.t('lims.test_method.k0'),
  description: i18n.t('lims.test_method.k1'),

  api: {
    module: 'lims',
    resource: 'testMethods',
  },

  fields: [
    {
      name: 'method_code',
      label: i18n.t('lims.test_method.k2'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'method_name',
      label: i18n.t('lims.test_method.k3'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 160,
    },
    {
      name: 'category_id',
      label: i18n.t('lims.test_method.k4'),
      type: 'select',
      defaultValue: '',
      options: {
        type: 'static',
        options: [
          { value: '', label: i18n.t('lims.test_method.k5') },
          { value: i18n.t('lims.test_method.k6'), label: i18n.t('lims.test_method.k7') },
          { value: i18n.t('lims.test_method.k8'), label: i18n.t('lims.test_method.k9') },
          { value: i18n.t('lims.test_method.k10'), label: i18n.t('lims.test_method.k11') },
          { value: i18n.t('lims.test_method.k12'), label: i18n.t('lims.test_method.k13') },
        ],
      },
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        return row.category_name ? String(row.category_name) : String(row.category_id || '-');
      },
    },
    {
      name: 'standard',
      label: i18n.t('lims.test_method.k14'),
      type: 'text',
      listWidth: 140,
    },
    {
      name: 'version',
      label: i18n.t('lims.test_method.k15'),
      type: 'text',
      listWidth: 80,
    },
    {
      name: 'status',
      label: i18n.t('lims.test_method.k16'),
      type: 'select',
      defaultValue: i18n.t('lims.test_method.k17'),
      options: {
        type: 'static',
        options: [
          { value: i18n.t('lims.test_method.k18'), label: i18n.t('lims.test_method.k19') },
          { value: i18n.t('lims.test_method.k20'), label: i18n.t('lims.test_method.k21') },
          { value: i18n.t('lims.test_method.k22'), label: i18n.t('lims.test_method.k23') },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'description',
      label: i18n.t('lims.test_method.k24'),
      type: 'textarea',
      showInList: false,
    },
  ],

  list: {
    columns: ['method_code', 'method_name', 'category_id', 'standard', 'status', 'version'],
    searchFields: ['method_code', 'method_name'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        [i18n.t('schemas.test_method.k0')]: 'default',
        [i18n.t('schemas.test_method.k1')]: 'success',
        [i18n.t('schemas.test_method.k2')]: 'primary',
      },
      labelMap: {
        [i18n.t('schemas.test_method.k3')]: i18n.t('lims.test_method.k25'),
        [i18n.t('schemas.test_method.k4')]: i18n.t('lims.test_method.k26'),
        [i18n.t('schemas.test_method.k5')]: i18n.t('lims.test_method.k27'),
      },
    },
    filters: [
      {
        id: 'category',
        label: i18n.t('lims.test_method.k28'),
        type: 'select',
        options: [
          { label: i18n.t('lims.test_method.k29'), value: 'all' },
          { label: i18n.t('lims.test_method.k30'), value: i18n.t('lims.test_method.k31') },
          { label: i18n.t('lims.test_method.k32'), value: i18n.t('lims.test_method.k33') },
          { label: i18n.t('lims.test_method.k34'), value: i18n.t('lims.test_method.k35') },
          { label: i18n.t('lims.test_method.k36'), value: i18n.t('lims.test_method.k37') },
        ],
      },
      {
        id: 'status',
        label: i18n.t('lims.test_method.k38'),
        type: 'select',
        options: [
          { label: i18n.t('lims.test_method.k39'), value: 'all' },
          { label: i18n.t('lims.test_method.k40'), value: i18n.t('lims.test_method.k41') },
          { label: i18n.t('lims.test_method.k42'), value: i18n.t('lims.test_method.k43') },
          { label: i18n.t('lims.test_method.k44'), value: i18n.t('lims.test_method.k45') },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('lims.test_method.k46'),
      fields: ['method_code', 'method_name', 'category_id', 'standard'],
    },
    {
      title: i18n.t('lims.test_method.k47'),
      fields: ['status', 'description'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('lims.test_method.k48'),
  editTitle: i18n.t('lims.test_method.k49'),
  detailTitle: i18n.t('lims.test_method.k50'),
};
