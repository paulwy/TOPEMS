import type { EntitySchema } from '@/schema';
import type { SchemaExtensions } from '@/schema/schemaExtensions';
import i18n from '@/i18n';

export const organizationSchema: EntitySchema & SchemaExtensions = {
  entity: 'hrm_org_unit',
  title: i18n.t('hrm.organization.k0'),
  description: i18n.t('hrm.organization.k1'),

  api: {
    module: 'hrm',
    resource: 'organizations',
  },

  fields: [
    {
      name: 'name',
      label: i18n.t('hrm.organization.k2'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 160,
    },
    {
      name: 'code',
      label: i18n.t('hrm.organization.k3'),
      type: 'text',
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'type',
      label: i18n.t('hrm.organization.k4'),
      type: 'select',
      required: true,
      defaultValue: 'department',
      options: {
        type: 'static',
        options: [
          { value: 'company', label: i18n.t('hrm.organization.k5') },
          { value: 'department', label: i18n.t('hrm.organization.k6') },
          { value: 'team', label: i18n.t('hrm.organization.k7') },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'manager',
      label: i18n.t('hrm.organization.k8'),
      type: 'text',
      listWidth: 120,
    },
    {
      name: 'parentId',
      label: i18n.t('hrm.organization.k9'),
      type: 'text',
      showInList: false,
      showInDetail: false,
    },
    {
      name: 'description',
      label: i18n.t('hrm.organization.k10'),
      type: 'textarea',
      showInList: false,
    },
  ],

  list: {
    columns: ['name', 'code', 'type', 'manager', 'description'],
    searchFields: ['name', 'code'],
    pageSize: 10,
    statusBadge: {
      field: 'type',
      colorMap: {
        company: 'primary',
        department: 'success',
        team: 'info',
      },
      labelMap: {
        company: i18n.t('hrm.organization.k11'),
        department: i18n.t('hrm.organization.k12'),
        team: i18n.t('hrm.organization.k13'),
      },
    },
  },

  tree: {
    keyField: 'id',
    parentField: 'parentId',
    labelField: 'name',
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('hrm.organization.k14'),
      fields: ['name', 'code', 'type'],
    },
    {
      title: i18n.t('hrm.organization.k15'),
      fields: ['manager', 'parentId'],
    },
    {
      title: i18n.t('hrm.organization.k16'),
      fields: ['description'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('hrm.organization.k17'),
  editTitle: i18n.t('hrm.organization.k18'),
  detailTitle: i18n.t('hrm.organization.k19'),
};
