import React from 'react';
import { Chip } from '@mui/material';
import type { EntitySchema } from '@/schema';
import { pdmApi } from '@/api/pdm';

import { QUERY_KEYS } from '@/lib/reactQuery';
import i18n from '@/i18n';

const VERSION_TYPE_COLOR_MAP: Record<string, 'error' | 'warning' | 'success' | 'default'> = {
  major: 'error',
  minor: 'warning',
  patch: 'success',
};

const getVersionTypeLabelMap = (): Record<string, string> => ({
  major: i18n.t('pdm.version.k0'),
  minor: i18n.t('pdm.version.k1'),
  patch: i18n.t('pdm.version.k2'),
});

const STATUS_COLOR_MAP: Record<string, 'success' | 'warning' | 'error' | 'default' | 'info'> = {
  published: 'success',
  draft: 'warning',
  review: 'info',
  approved: 'default',
  deprecated: 'error',
};

const getStatusLabelMap = (): Record<string, string> => ({
  published: i18n.t('pdm.version.k3'),
  draft: i18n.t('pdm.version.k4'),
  review: i18n.t('pdm.version.k5'),
  approved: i18n.t('pdm.version.k6'),
  deprecated: i18n.t('pdm.version.k7'),
});

export const getVersionSchema = (): EntitySchema => {
  const VERSION_TYPE_LABEL_MAP = getVersionTypeLabelMap();
  const STATUS_LABEL_MAP = getStatusLabelMap();

  return {
    entity: 'pdm_version',
    title: i18n.t('pdm.version.k8'),
    description: i18n.t('pdm.version.k9'),

    api: {
      module: 'pdm',
      resource: 'versions',
    },

    fields: [
      {
        name: 'version_number',
        label: i18n.t('pdm.version.k10'),
        type: 'text',
        sortable: true,
        listWidth: 180,
      },
      {
        name: 'title',
        label: i18n.t('pdm.version.k11'),
        type: 'text',
        required: true,
        sortable: true,
        listWidth: 200,
      },
      {
        name: 'description',
        label: i18n.t('pdm.version.k12'),
        type: 'textarea',
        listWidth: 200,
      },
      {
        name: 'type',
        label: i18n.t('pdm.version.k13'),
        type: 'select',
        required: true,
        defaultValue: 'minor',
        options: {
          type: 'static',
          options: [
            { value: 'major', label: i18n.t('pdm.version.major_14') },
            { value: 'minor', label: i18n.t('pdm.version.minor_15') },
            { value: 'patch', label: i18n.t('pdm.version.patch_16') },
          ],
        },
        listWidth: 120,
        renderCell: (row: Record<string, unknown>) => {
          const val = String(row.type ?? '');
          const color = VERSION_TYPE_COLOR_MAP[val] || 'default';
          const label = VERSION_TYPE_LABEL_MAP[val] || val;
          return React.createElement(Chip, {
            label,
            size: 'small',
            color,
          });
        },
      },
      {
        name: 'status',
        label: i18n.t('pdm.version.k17'),
        type: 'select',
        defaultValue: 'draft',
        options: {
          type: 'static',
          options: [
            { value: 'draft', label: i18n.t('pdm.version.k18') },
            { value: 'review', label: i18n.t('pdm.version.k19') },
            { value: 'approved', label: i18n.t('pdm.version.k20') },
            { value: 'published', label: i18n.t('pdm.version.k21') },
          ],
        },
        listWidth: 110,
      },
      {
        name: 'changes',
        label: i18n.t('pdm.version.k22'),
        type: 'textarea',
        showInList: false,
      },
      {
        name: 'created_by',
        label: i18n.t('pdm.version.k23'),
        type: 'text',
        listWidth: 100,
      },
      {
        name: 'created_at',
        label: i18n.t('pdm.version.k24'),
        type: 'datetime',
        readonly: true,
        sortable: true,
        listWidth: 130,
        hideInForm: true,
      },
      {
        name: 'updated_at',
        label: i18n.t('pdm.version.k25'),
        type: 'datetime',
        readonly: true,
        hideInForm: true,
        showInList: false,
      },
      {
        name: 'document_id',
        label: i18n.t('pdm.version.k26'),
        type: 'select',
        required: true,
        showInList: false,
        showInDetail: false,
        options: {
          type: 'static',
          options: [],
        },
      },
    ],

    list: {
      pageSize: 20,
      searchFields: ['version_number', 'title', 'description'],
      filters: [
        {
          id: 'document',
          label: i18n.t('pdm.version.k27'),
          type: 'select',
          options: [{ label: i18n.t('pdm.version.k28'), value: 'all' }],
          defaultValue: 'all',
        },
        {
          id: 'type',
          label: i18n.t('pdm.version.k29'),
          type: 'select',
          options: [
            { label: i18n.t('pdm.version.k30'), value: 'all' },
            { label: i18n.t('pdm.version.k31'), value: 'major' },
            { label: i18n.t('pdm.version.k32'), value: 'minor' },
            { label: i18n.t('pdm.version.k33'), value: 'patch' },
          ],
          defaultValue: 'all',
        },
      ],
      statusBadge: {
        field: 'status',
        colorMap: {
          draft: 'warning',
          review: 'info',
          approved: 'default',
          published: 'success',
        },
        labelMap: {
          draft: i18n.t('pdm.version.k34'),
          review: i18n.t('pdm.version.k35'),
          approved: i18n.t('pdm.version.k36'),
          published: i18n.t('pdm.version.k37'),
        },
      },
    },

    dynamicOptions: [
      {
        field: 'document_id',
        loader: async () => {
          const response = await pdmApi.listDocuments();
          if (response.success && response.data) {
            const data = response.data as unknown as Record<string, unknown>;
            const docs = (Array.isArray(data) ? data : data.documents || []) as Array<{
              id: string;
              name: string;
            }>;
            return docs.map((d) => ({ value: d.id, label: d.name }));
          }
          return [];
        },
        queryKey: QUERY_KEYS.AD_HOC.PDM_DOCUMENTS_VERSION_FORM_BASE,
      },
    ],

    formSections: [
      {
        title: i18n.t('pdm.version.k38'),
        fields: ['document_id', 'version_number', 'title', 'type', 'status'],
      },
      {
        title: i18n.t('pdm.version.k39'),
        fields: ['description', 'changes'],
      },
    ],

    formColCount: 2,
    createTitle: i18n.t('pdm.version.k40'),
    editTitle: i18n.t('pdm.version.k41'),
    detailTitle: i18n.t('pdm.version.k42'),

    actions: ['create', 'edit', 'detail', 'delete'],
  };
};
