import React from 'react';
import { Chip } from '@mui/material';
import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

function renderVersionCell(row: Record<string, unknown>) {
  const version = row.version as string | null | undefined;
  return React.createElement(Chip, {
    label: `v${version || ''}`,
    size: 'small',
    sx: { backgroundColor: 'secondary.100', color: 'secondary.dark' },
  });
}

function renderDateCell(row: Record<string, unknown>) {
  const val = row.created_at as string | null | undefined;
  if (!val) return '-';
  return new Date(val).toLocaleString('zh-CN');
}

export const standardRevisionSchema: EntitySchema = {
  entity: 'qmsStandardRevision',
  title: i18n.t('qms.revision.k0'),
  description: i18n.t('qms.revision.k1'),

  api: {
    module: 'qms',
    resource: 'revisions',
  },

  fields: [
    {
      name: 'id',
      label: 'ID',
      type: 'text',
      readonly: true,
      hideInForm: true,
      showInList: false,
    },
    {
      name: 'version',
      label: i18n.t('qms.revision.k2'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 120,
      renderCell: renderVersionCell,
    },
    {
      name: 'description',
      label: i18n.t('qms.revision.k3'),
      type: 'text',
      listWidth: 300,
    },
    {
      name: 'created_at',
      label: i18n.t('qms.revision.k4'),
      type: 'datetime',
      readonly: true,
      sortable: true,
      listWidth: 160,
      renderCell: renderDateCell,
    },
    {
      name: 'created_by',
      label: i18n.t('qms.revision.k5'),
      type: 'text',
      readonly: true,
      listWidth: 120,
    },
  ],

  list: {
    columns: ['version', 'description', 'created_at', 'created_by'],
    pageSize: 10,
    selectable: false,
  },

  formSections: [
    {
      title: i18n.t('qms.revision.k6'),
      fields: ['version', 'description'],
    },
  ],

  formColCount: 1,
  createTitle: i18n.t('qms.revision.k7'),
  editTitle: i18n.t('qms.revision.k8'),
  detailTitle: i18n.t('qms.revision.k9'),

  actions: ['detail'],
};
