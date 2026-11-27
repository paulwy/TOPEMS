import React from 'react';
import type { EntitySchema } from '@/schema-dsl';
import i18n from '@/i18n';
import { localizedName } from '@/utils/i18n';
import { loadSrmSupplierOptions } from '@/schemas/dynamicLoaders';

export const contractSchema: EntitySchema = {
  entity: 'supplier_contract',
  title: i18n.t('srm.contract.k0'),
  description: i18n.t('srm.contract.k1'),

  api: {
    module: 'srm',
    resource: 'contracts',
  },

  dynamicOptions: [
    {
      field: 'supplier_id',
      queryKey: ['srm', 'suppliers', 'forContract'],
      loader: loadSrmSupplierOptions,
    },
  ],

  // 批 23：写权限资源前缀（DB 实查 create/update/delete 三码齐全）
  permissionResource: 'srm:contract',

  fields: [
    {
      name: 'contractNo',
      label: i18n.t('srm.contract.k2'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 150,
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'title',
      label: i18n.t('srm.contract.k3'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 200,
      validation: [{ type: 'maxLength', value: 200 }],
    },
    {
      name: 'supplier_id',
      label: i18n.t('srm.contract.k4'),
      // 供应商此前是裸文本框，要求手填 UUID，实际填不出合法值 → 下拉选择
      type: 'select',
      required: true,
      listWidth: 150,
      renderCell: (row, _index) => {
        const name = localizedName(
          row.supplier_name as string | null,
          row.supplier_name_en as string | null
        );
        const id = row.supplier_id as string | undefined;
        return React.createElement('span', {}, name || id || '-');
      },
    },
    {
      name: 'contract_type',
      label: i18n.t('srm.contract.k5'),
      type: 'select',
      required: true,
      options: {
        type: 'static',
        options: [
          { value: i18n.t('srm.contract.k6'), label: i18n.t('srm.contract.k7') },
          { value: i18n.t('srm.contract.k8'), label: i18n.t('srm.contract.k9') },
          { value: i18n.t('srm.contract.k10'), label: i18n.t('srm.contract.k11') },
          { value: i18n.t('srm.contract.k12'), label: i18n.t('srm.contract.k13') },
          { value: i18n.t('srm.contract.k14'), label: i18n.t('srm.contract.k15') },
        ],
      },
      listWidth: 120,
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'total_amount',
      label: i18n.t('srm.contract.k16'),
      type: 'number',
      sortable: true,
      listWidth: 130,
      renderCell: (row: Record<string, unknown>, _index: number) => {
        const amount = row.total_amount as number | undefined;
        const currency = row.currency as string | undefined;
        if (amount == null) return '-';
        return React.createElement(
          'span',
          { style: { fontWeight: 600 } },
          `${currency || '¥'} ${amount.toLocaleString()}`
        );
      },
    },
    {
      name: 'currency',
      label: i18n.t('srm.contract.k17'),
      type: 'select',
      defaultValue: 'CNY',
      options: {
        type: 'static',
        options: [
          { value: 'CNY', label: i18n.t('srm.contract.cny_18') },
          { value: 'USD', label: i18n.t('srm.contract.usd_19') },
          { value: 'EUR', label: i18n.t('srm.contract.eur_20') },
        ],
      },
      listWidth: 80,
      showInList: false,
      validation: [{ type: 'maxLength', value: 10 }],
    },
    {
      name: 'sign_date',
      label: i18n.t('srm.contract.k21'),
      type: 'date',
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'start_date',
      label: i18n.t('srm.contract.k22'),
      type: 'date',
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'end_date',
      label: i18n.t('srm.contract.k23'),
      type: 'date',
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'status',
      label: i18n.t('srm.contract.k24'),
      type: 'select',
      // 后端 SupplierContractStatus 唯一值集：draft / active / inactive / archived
      defaultValue: 'draft',
      options: {
        type: 'static',
        options: [
          { value: 'draft', label: i18n.t('srm.contract.k25') },
          { value: 'active', label: i18n.t('srm.contract.k26') },
          { value: 'inactive', label: i18n.t('srm.contract.k27') },
          { value: 'archived', label: i18n.t('srm.contract.k28') },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 20 }],
    },
    {
      name: 'remarks',
      label: i18n.t('srm.contract.k29'),
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'created_at',
      label: i18n.t('srm.contract.k30'),
      type: 'datetime',
      readonly: true,
      hideInForm: true,
      sortable: true,
      listWidth: 160,
    },
    {
      name: 'updated_at',
      label: i18n.t('srm.contract.k31'),
      type: 'datetime',
      readonly: true,
      hideInForm: true,
      sortable: true,
      listWidth: 160,
    },
  ],

  list: {
    columns: [
      'contractNo',
      'title',
      'supplier_id',
      'contract_type',
      'total_amount',
      'sign_date',
      'status',
    ],
    searchFields: ['contractNo', 'title'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        draft: 'warning',
        active: 'primary',
        inactive: 'default',
        archived: 'success',
      },
      labelMap: {
        draft: i18n.t('srm.contract.k32'),
        active: i18n.t('srm.contract.k33'),
        inactive: i18n.t('srm.contract.k34'),
        archived: i18n.t('srm.contract.k35'),
      },
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('srm.contract.k36'),
        type: 'select',
        options: [
          { label: i18n.t('srm.contract.k37'), value: 'all' },
          { label: i18n.t('srm.contract.k38'), value: 'draft' },
          { label: i18n.t('srm.contract.k39'), value: 'active' },
          { label: i18n.t('srm.contract.k40'), value: 'inactive' },
          { label: i18n.t('srm.contract.k41'), value: 'archived' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('srm.contract.k42'),
      fields: ['contractNo', 'title', 'supplier_id', 'contract_type', 'status'],
    },
    {
      title: i18n.t('srm.contract.k43'),
      fields: ['total_amount', 'currency', 'sign_date', 'start_date', 'end_date'],
    },
    {
      title: i18n.t('srm.contract.k44'),
      fields: ['remarks'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('srm.contract.k45'),
  editTitle: i18n.t('srm.contract.k46'),
  detailTitle: i18n.t('srm.contract.k47'),
};
