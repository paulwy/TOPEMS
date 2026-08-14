import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const teamSchema: EntitySchema = {
  entity: 'team',
  title: i18n.t('mes.team.k0'),
  api: {
    module: 'mes',
    resource: 'teams',
  },
  fields: [
    {
      name: 'team_code',
      label: i18n.t('mes.team.k1'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      listWidth: 140,
      sortable: true,
    },
    {
      name: 'team_name',
      label: i18n.t('mes.team.k2'),
      type: 'text',
      required: true,
      listWidth: 160,
      sortable: true,
    },
    {
      name: 'team_type',
      label: i18n.t('mes.team.k3'),
      type: 'select',
      listWidth: 100,
      options: {
        type: 'static',
        options: [
          { value: 'production', label: i18n.t('mes.team.k4') },
          { value: 'maintenance', label: i18n.t('mes.team.k5') },
          { value: 'quality', label: i18n.t('mes.team.k6') },
          { value: 'logistics', label: i18n.t('mes.team.k7') },
        ],
      },
    },
    {
      name: 'work_station_id',
      label: i18n.t('mes.team.k8'),
      type: 'text',
      listWidth: 140,
      showInList: false,
    },
    {
      name: 'work_station_name',
      label: i18n.t('mes.team.k9'),
      type: 'text',
      listWidth: 140,
      showInForm: false,
    },
    {
      name: 'leader_id',
      label: i18n.t('mes.team.id_10'),
      type: 'text',
      showInList: false,
    },
    {
      name: 'leader_name',
      label: i18n.t('mes.team.k11'),
      type: 'text',
      listWidth: 120,
      showInForm: false,
    },
    {
      name: 'member_count',
      label: i18n.t('mes.team.k12'),
      type: 'number',
      listWidth: 80,
      showInForm: false,
      sortable: true,
    },
    {
      name: 'status',
      label: i18n.t('mes.team.k13'),
      type: 'select',
      listWidth: 100,
      options: {
        type: 'static',
        options: [
          { value: 'active', label: i18n.t('mes.team.k14') },
          { value: 'inactive', label: i18n.t('mes.team.k15') },
        ],
      },
      validation: [{ type: 'maxLength', value: 32 }],
    },
    {
      name: 'description',
      label: i18n.t('mes.team.k16'),
      type: 'textarea',
      colSpan: 2,
      showInList: false,
    },
  ],
  list: {
    searchFields: ['team_code', 'team_name'],
    filters: [
      {
        id: 'status',
        label: i18n.t('mes.team.k17'),
        type: 'select',
        options: [
          { label: i18n.t('mes.team.k18'), value: 'all' },
          { label: i18n.t('mes.team.k19'), value: 'active' },
          { label: i18n.t('mes.team.k20'), value: 'inactive' },
        ],
        defaultValue: 'all',
      },
    ],
    statusBadge: {
      field: 'status',
      colorMap: {
        active: 'success',
        inactive: 'default',
      },
      labelMap: {
        active: i18n.t('mes.team.k21'),
        inactive: i18n.t('mes.team.k22'),
      },
    },
    pageSize: 10,
  },
  formSections: [
    {
      title: i18n.t('mes.team.k23'),
      fields: ['team_code', 'team_name', 'team_type', 'status'],
    },
    {
      title: i18n.t('mes.team.k24'),
      fields: ['work_station_id', 'leader_id'],
    },
    {
      title: i18n.t('mes.team.k25'),
      fields: ['description'],
    },
  ],
  formColCount: 2,
  actions: ['create', 'edit', 'detail', 'delete'],
};
