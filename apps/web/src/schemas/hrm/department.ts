import type { EntitySchema } from '@/schema';
import { departmentApi, companyApi } from '@/api/hrm';

import { QUERY_KEYS } from '@/lib/reactQuery';
import i18n from '@/i18n';

const STATUS_OPTIONS = [
  { value: 'active', label: i18n.t('hrm.department.k0') },
  { value: 'inactive', label: i18n.t('hrm.department.k1') },
];

const STATUS_COLOR_MAP: Record<
  string,
  'default' | 'primary' | 'success' | 'warning' | 'error' | 'info'
> = {
  active: 'success',
  inactive: 'default',
};

const STATUS_LABEL_MAP: Record<string, string> = {
  active: i18n.t('hrm.department.k2'),
  inactive: i18n.t('hrm.department.k3'),
};

export const departmentSchema: EntitySchema = {
  entity: 'hrm_department',
  title: i18n.t('hrm.department.k4'),
  description: i18n.t('hrm.department.k5'),

  api: {
    module: 'hrm',
    resource: 'departments',
  },

  fields: [
    {
      name: 'name',
      label: i18n.t('hrm.department.k6'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 160,
      validation: [{ type: 'maxLength', value: 255 }],
    },
    {
      name: 'code',
      label: i18n.t('hrm.department.k7'),
      type: 'text',
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 120,
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'org_id',
      label: i18n.t('hrm.department.k8'),
      type: 'select',
      listWidth: 140,
      options: {
        type: 'dynamic',
        resolver: 'companies',
      },
      renderCell: (row: Record<string, unknown>) => {
        return (row.company_name as string) || (row.org_id as string) || '-';
      },
    },
    {
      name: 'parentId',
      label: i18n.t('hrm.department.k9'),
      type: 'select',
      listWidth: 140,
      options: {
        type: 'dynamic',
        resolver: 'departments',
      },
      renderCell: (row: Record<string, unknown>) => {
        return (row.parent_name as string) || i18n.t('hrm.department.k10');
      },
    },
    {
      name: 'description',
      label: i18n.t('hrm.department.k11'),
      type: 'textarea',
      listWidth: 200,
    },
    {
      name: 'status',
      label: i18n.t('hrm.department.k12'),
      type: 'select',
      defaultValue: 'active',
      options: {
        type: 'static',
        options: STATUS_OPTIONS,
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 20 }],
    },
  ],

  list: {
    columns: ['name', 'code', 'org_id', 'parentId', 'description', 'status'],
    searchFields: ['name', 'code', 'description'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: STATUS_COLOR_MAP,
      labelMap: STATUS_LABEL_MAP,
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('hrm.department.k13'),
        type: 'select',
        options: [{ label: i18n.t('hrm.department.k14'), value: 'all' }, ...STATUS_OPTIONS],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('hrm.department.k15'),
      fields: ['name', 'code'],
    },
    {
      title: i18n.t('hrm.department.k16'),
      fields: ['org_id', 'parentId'],
    },
    {
      title: i18n.t('hrm.department.k17'),
      fields: ['description', 'status'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('hrm.department.k18'),
  editTitle: i18n.t('hrm.department.k19'),
  detailTitle: i18n.t('hrm.department.k20'),

  dynamicOptions: [
    {
      field: 'org_id',
      queryKey: QUERY_KEYS.AD_HOC.HRM_COMPANIES_BASE,
      loader: async () => {
        const res = await companyApi.list({ pagesize: 100 });
        if (res.success && res.data) {
          return (res.data.items || []).map((c: { id: string; name: string }) => ({
            value: c.id,
            label: c.name,
          }));
        }
        return [];
      },
    },
    {
      field: 'parentId',
      queryKey: QUERY_KEYS.AD_HOC.HRM_DEPARTMENTS_BASE,
      loader: async () => {
        const res = await departmentApi.list({ pagesize: 200 });
        if (res.success && res.data) {
          return (res.data.items || []).map((d: { id: string; name: string }) => ({
            value: d.id,
            label: d.name,
          }));
        }
        return [];
      },
    },
  ],
};

export { STATUS_OPTIONS, STATUS_COLOR_MAP, STATUS_LABEL_MAP };
