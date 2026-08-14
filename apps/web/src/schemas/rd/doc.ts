import React from 'react';
import { Box, Chip } from '@mui/material';
import { File, FileText, BookOpen, Folder } from 'lucide-react';
import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

const DOC_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: i18n.t('rd.doc.k0'), label: i18n.t('rd.doc.k1') },
  { value: i18n.t('rd.doc.k2'), label: i18n.t('rd.doc.k3') },
  { value: i18n.t('rd.doc.k4'), label: i18n.t('rd.doc.k5') },
  { value: i18n.t('rd.doc.k6'), label: i18n.t('rd.doc.k7') },
  { value: i18n.t('rd.doc.k8'), label: i18n.t('rd.doc.k9') },
];

const STATUS_COLOR_MAP: Record<string, 'success' | 'warning' | 'default'> = {
  published: 'success',
  draft: 'warning',
};

const STATUS_LABEL_MAP: Record<string, string> = {
  published: i18n.t('rd.doc.k10'),
  draft: i18n.t('rd.doc.k11'),
};

const getDocTypeIcon = (type: string) => {
  switch (type) {
    case i18n.t('rd.doc.k12'):
      return React.createElement(File, { size: 16, color: 'primary.main' });
    case i18n.t('rd.doc.k13'):
      return React.createElement(FileText, { size: 16, color: 'primary.main' });
    case i18n.t('rd.doc.k14'):
      return React.createElement(BookOpen, { size: 16, color: 'primary.main' });
    default:
      return React.createElement(Folder, { size: 16, color: 'primary.main' });
  }
};

export const docSchema: EntitySchema = {
  entity: 'rd_doc',
  title: i18n.t('rd.doc.k15'),
  description: i18n.t('rd.doc.k16'),

  api: {
    module: 'rd',
    resource: 'docs',
  },

  fields: [
    {
      name: 'doc_name',
      label: i18n.t('rd.doc.k17'),
      type: 'text',
      required: true,
      listWidth: 250,
      renderCell: (row: Record<string, unknown>) => {
        const type = String(row.doc_type ?? '');
        return React.createElement(
          Box,
          { sx: { display: 'flex', alignItems: 'center', gap: 1 } },
          getDocTypeIcon(type),
          String(row.doc_name ?? '')
        );
      },
    },
    {
      name: 'doc_type',
      label: i18n.t('rd.doc.k18'),
      type: 'select',
      defaultValue: i18n.t('rd.doc.k19'),
      options: { type: 'static', options: DOC_TYPE_OPTIONS },
      listWidth: 120,
    },
    {
      name: 'version',
      label: i18n.t('rd.doc.k20'),
      type: 'text',
      listWidth: 100,
      hideInForm: true,
      renderCell: (row: Record<string, unknown>) =>
        React.createElement(Chip, {
          label: String(row.version ?? ''),
          size: 'small',
          variant: 'outlined',
        }),
      validation: [{ type: 'maxLength', value: 20 }],
    },
    {
      name: 'author',
      label: i18n.t('rd.doc.k21'),
      type: 'text',
      listWidth: 120,
      hideInForm: true,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'update_time',
      label: i18n.t('rd.doc.k22'),
      type: 'datetime',
      listWidth: 160,
      hideInForm: true,
    },
    {
      name: 'status',
      label: i18n.t('rd.doc.k23'),
      type: 'select',
      defaultValue: 'draft',
      options: {
        type: 'static',
        options: [
          { value: 'published', label: i18n.t('rd.doc.k24') },
          { value: 'draft', label: i18n.t('rd.doc.k25') },
        ],
      },
      listWidth: 110,
      validation: [{ type: 'maxLength', value: 20 }],
    },
    {
      name: 'description',
      label: i18n.t('rd.doc.k26'),
      type: 'textarea',
      showInList: false,
    },
  ],

  list: {
    columns: ['doc_name', 'doc_type', 'version', 'author', 'update_time', 'status'],
    searchFields: ['doc_name', 'author'],
    pageSize: 10,
    filters: [
      {
        id: 'doc_type',
        label: i18n.t('rd.doc.k27'),
        type: 'select',
        options: [{ label: i18n.t('rd.doc.k28'), value: 'all' }, ...DOC_TYPE_OPTIONS],
        defaultValue: 'all',
      },
      {
        id: 'status',
        label: i18n.t('rd.doc.k29'),
        type: 'select',
        options: [
          { label: i18n.t('rd.doc.k30'), value: 'all' },
          { label: i18n.t('rd.doc.k31'), value: 'published' },
          { label: i18n.t('rd.doc.k32'), value: 'draft' },
        ],
        defaultValue: 'all',
      },
    ],
    statusBadge: {
      field: 'status',
      colorMap: STATUS_COLOR_MAP,
      labelMap: STATUS_LABEL_MAP,
    },
  },

  formSections: [
    {
      title: i18n.t('rd.doc.k33'),
      fields: ['doc_name', 'doc_type', 'status'],
    },
    {
      title: i18n.t('rd.doc.k34'),
      fields: ['description'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('rd.doc.k35'),
  editTitle: i18n.t('rd.doc.k36'),
  detailTitle: i18n.t('rd.doc.k37'),

  actions: ['create', 'edit', 'detail', 'delete'],
};
