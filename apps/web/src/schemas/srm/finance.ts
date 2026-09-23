import React from 'react';
import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';
import { localizedName } from '@/utils/i18n';

export const financeSchema: EntitySchema = {
  entity: 'srmFinance',
  title: i18n.t('shared.finance.srm_0'),
  description: i18n.t('srm.finance.k0'),

  api: {
    module: 'srm',
    resource: 'finance',
  },

  fields: [
    {
      name: 'record_no',
      label: i18n.t('srm.finance.k1'),
      type: 'text',
      required: true,
      listWidth: 160,
    },
    {
      name: 'type',
      label: i18n.t('srm.finance.k2'),
      type: 'select',
      defaultValue: 'order',
      options: {
        type: 'static',
        options: [
          { value: 'order', label: i18n.t('srm.finance.k3') },
          { value: 'contract', label: i18n.t('srm.finance.k4') },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'supplier_name',
      label: i18n.t('srm.finance.k5'),
      type: 'text',
      listWidth: 150,
      renderCell: (row, _index) =>
        localizedName(row.supplier_name as string | null, row.supplier_name_en as string | null) ||
        '-',
    },
    {
      name: 'amount',
      label: i18n.t('srm.finance.k6'),
      type: 'number',
      listWidth: 140,
      align: 'right',
      renderCell: (row: Record<string, unknown>) => {
        const amount = (row as Record<string, unknown>).amount as number | undefined;
        const style: React.CSSProperties = { fontWeight: 600, color: 'grey.800' };
        return React.createElement('span', { style }, `¥${(amount || 0).toLocaleString()}`);
      },
    },
    {
      name: 'status',
      label: i18n.t('srm.finance.k7'),
      type: 'select',
      defaultValue: 'pending',
      options: {
        type: 'static',
        options: [
          { value: 'pending', label: i18n.t('srm.finance.k8') },
          { value: 'processing', label: i18n.t('srm.finance.k9') },
          { value: 'delivered', label: i18n.t('srm.finance.k10') },
          { value: 'completed', label: i18n.t('srm.finance.k11') },
          { value: 'active', label: i18n.t('srm.finance.k12') },
          { value: 'cancelled', label: i18n.t('srm.finance.k13') },
          { value: 'expired', label: i18n.t('srm.finance.k14') },
          { value: 'draft', label: i18n.t('srm.finance.k15') },
          { value: 'terminated', label: i18n.t('srm.finance.k16') },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'date',
      label: i18n.t('srm.finance.k17'),
      type: 'date',
      listWidth: 120,
    },
    {
      name: 'description',
      label: i18n.t('srm.finance.k18'),
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'supplier_id',
      label: i18n.t('srm.finance.id_19'),
      type: 'text',
      showInList: false,
    },
  ],

  list: {
    columns: ['record_no', 'type', 'supplier_name', 'amount', 'status', 'date', 'description'],
    searchFields: ['record_no', 'supplier_name', 'description'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        [i18n.t('schemas.finance.k0')]: 'warning',
        [i18n.t('schemas.finance.k1')]: 'primary',
        [i18n.t('schemas.finance.k2')]: 'success',
        [i18n.t('schemas.finance.k3')]: 'info',
        [i18n.t('schemas.finance.k4')]: 'default',
        [i18n.t('schemas.finance.k5')]: 'success',
        [i18n.t('schemas.finance.k6')]: 'error',
        [i18n.t('schemas.finance.k7')]: 'default',
        [i18n.t('schemas.finance.k8')]: 'warning',
      },
      labelMap: {
        [i18n.t('schemas.finance.k9')]: i18n.t('srm.finance.k20'),
        [i18n.t('schemas.finance.k10')]: i18n.t('srm.finance.k21'),
        [i18n.t('schemas.finance.k11')]: i18n.t('srm.finance.k22'),
        [i18n.t('schemas.finance.k12')]: i18n.t('srm.finance.k23'),
        [i18n.t('schemas.finance.k13')]: i18n.t('srm.finance.k24'),
        [i18n.t('schemas.finance.k14')]: i18n.t('srm.finance.k25'),
        [i18n.t('schemas.finance.k15')]: i18n.t('srm.finance.k26'),
        [i18n.t('schemas.finance.k16')]: i18n.t('srm.finance.k27'),
        [i18n.t('schemas.finance.k17')]: i18n.t('srm.finance.k28'),
      },
    },
  },

  actions: ['create', 'detail'],

  formSections: [
    {
      title: i18n.t('srm.finance.k29'),
      fields: ['type', 'record_no', 'supplier_id', 'supplier_name'],
    },
    {
      title: i18n.t('srm.finance.k30'),
      fields: ['amount', 'date', 'status'],
    },
    {
      title: i18n.t('srm.finance.k31'),
      fields: ['description'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('srm.finance.k32'),
  editTitle: i18n.t('srm.finance.k33'),
  detailTitle: i18n.t('srm.finance.k34'),
};
