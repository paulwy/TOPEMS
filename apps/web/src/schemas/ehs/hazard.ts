import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const hazardSchema: EntitySchema = {
  entity: 'ehsHazard',
  title: i18n.t('ehs.hazard.k0'),
  description: i18n.t('ehs.hazard.k1'),

  api: {
    module: 'ehs',
    resource: 'hazards',
  },

  fields: [
    {
      name: 'hazard_no',
      label: i18n.t('ehs.hazard.k2'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      listWidth: 140,
      showInList: false,
      validation: [{ type: 'maxLength', value: 64 }],
    },
    {
      name: 'name',
      label: i18n.t('ehs.hazard.k3'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 160,
    },
    {
      name: 'category',
      label: i18n.t('ehs.hazard.k4'),
      type: 'select',
      required: true,
      defaultValue: 'equipment',
      options: {
        type: 'static',
        options: [
          { value: 'equipment', label: i18n.t('ehs.hazard.k5') },
          { value: 'chemical', label: i18n.t('ehs.hazard.k6') },
          { value: 'physical', label: i18n.t('ehs.hazard.k7') },
          { value: 'biological', label: i18n.t('ehs.hazard.k8') },
          { value: 'ergonomic', label: i18n.t('ehs.hazard.k9') },
          { value: 'environmental', label: i18n.t('ehs.hazard.k10') },
        ],
      },
      listWidth: 120,
      validation: [{ type: 'maxLength', value: 64 }],
    },
    {
      name: 'severity',
      label: i18n.t('ehs.hazard.k11'),
      type: 'select',
      required: true,
      defaultValue: 'medium',
      options: {
        type: 'static',
        options: [
          { value: 'high', label: i18n.t('ehs.hazard.k12') },
          { value: 'medium', label: i18n.t('ehs.hazard.k13') },
          { value: 'low', label: i18n.t('ehs.hazard.k14') },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'exposure',
      label: i18n.t('ehs.hazard.k15'),
      type: 'select',
      required: true,
      defaultValue: 'medium',
      options: {
        type: 'static',
        options: [
          { value: 'high', label: i18n.t('ehs.hazard.k16') },
          { value: 'medium', label: i18n.t('ehs.hazard.k17') },
          { value: 'low', label: i18n.t('ehs.hazard.k18') },
        ],
      },
      showInList: false,
    },
    {
      name: 'likelihood',
      label: i18n.t('ehs.hazard.k19'),
      type: 'select',
      required: true,
      defaultValue: 'medium',
      options: {
        type: 'static',
        options: [
          { value: 'high', label: i18n.t('ehs.hazard.k20') },
          { value: 'medium', label: i18n.t('ehs.hazard.k21') },
          { value: 'low', label: i18n.t('ehs.hazard.k22') },
        ],
      },
      showInList: false,
    },
    {
      name: 'level',
      label: i18n.t('ehs.hazard.k23'),
      type: 'select',
      defaultValue: 'medium',
      options: {
        type: 'static',
        options: [
          { value: 'extreme', label: i18n.t('ehs.hazard.k24') },
          { value: 'high', label: i18n.t('ehs.hazard.k25') },
          { value: 'medium', label: i18n.t('ehs.hazard.k26') },
          { value: 'low', label: i18n.t('ehs.hazard.k27') },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 32 }],
    },
    {
      name: 'location',
      label: i18n.t('ehs.hazard.k28'),
      type: 'text',
      listWidth: 140,
      renderCell: (row: Record<string, unknown>) => {
        const loc = row.location as string | null | undefined;
        return loc || '-';
      },
      validation: [{ type: 'maxLength', value: 128 }],
    },
    {
      name: 'status',
      label: i18n.t('ehs.hazard.k29'),
      type: 'select',
      defaultValue: 'active',
      options: {
        type: 'static',
        options: [
          { value: 'active', label: i18n.t('ehs.hazard.k30') },
          { value: 'controlled', label: i18n.t('ehs.hazard.k31') },
          { value: 'eliminated', label: i18n.t('ehs.hazard.k32') },
          { value: 'archived', label: i18n.t('ehs.hazard.k33') },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 32 }],
    },
    {
      name: 'description',
      label: i18n.t('ehs.hazard.k34'),
      type: 'textarea',
      showInList: false,
    },
  ],

  list: {
    columns: ['name', 'category', 'severity', 'level', 'location', 'status'],
    searchFields: ['name', 'location'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        active: 'error',
        controlled: 'warning',
        eliminated: 'success',
        archived: 'default',
      },
      labelMap: {
        active: i18n.t('ehs.hazard.k35'),
        controlled: i18n.t('ehs.hazard.k36'),
        eliminated: i18n.t('ehs.hazard.k37'),
        archived: i18n.t('ehs.hazard.k38'),
      },
    },
    filters: [
      {
        id: 'severity',
        label: i18n.t('ehs.hazard.k39'),
        type: 'select',
        options: [
          { label: i18n.t('ehs.hazard.k40'), value: 'all' },
          { label: i18n.t('ehs.hazard.k41'), value: 'high' },
          { label: i18n.t('ehs.hazard.k42'), value: 'medium' },
          { label: i18n.t('ehs.hazard.k43'), value: 'low' },
        ],
      },
      {
        id: 'status',
        label: i18n.t('ehs.hazard.k44'),
        type: 'select',
        options: [
          { label: i18n.t('ehs.hazard.k45'), value: 'all' },
          { label: i18n.t('ehs.hazard.k46'), value: 'active' },
          { label: i18n.t('ehs.hazard.k47'), value: 'controlled' },
          { label: i18n.t('ehs.hazard.k48'), value: 'eliminated' },
          { label: i18n.t('ehs.hazard.k49'), value: 'archived' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('ehs.hazard.k50'),
      fields: ['hazard_no', 'name', 'category', 'location'],
    },
    {
      title: i18n.t('ehs.hazard.k51'),
      fields: ['severity', 'exposure', 'likelihood', 'level'],
    },
    {
      title: i18n.t('ehs.hazard.k52'),
      fields: ['status', 'description'],
    },
  ],

  formColCount: 3,
  createTitle: i18n.t('ehs.hazard.k53'),
  editTitle: i18n.t('ehs.hazard.k54'),
  detailTitle: i18n.t('ehs.hazard.k55'),
};
