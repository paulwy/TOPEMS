import type { EntitySchema } from '@/schema';
import { departmentApi, companyApi } from '@/api/hrm';

const STATUS_OPTIONS = [
  { value: 'active', label: '启用' },
  { value: 'inactive', label: '停用' },
];

const STATUS_COLOR_MAP: Record<
  string,
  'default' | 'primary' | 'success' | 'warning' | 'error' | 'info'
> = {
  active: 'success',
  inactive: 'default',
};

const STATUS_LABEL_MAP: Record<string, string> = {
  active: '启用',
  inactive: '停用',
};

export const departmentSchema: EntitySchema = {
  entity: 'hrm_department',
  title: '部门管理',
  description: '管理企业组织架构中的部门，包括层级关系、负责人和联系方式',

  api: {
    module: 'hrm',
    resource: 'departments',
  },

  fields: [
    {
      name: 'name',
      label: '部门名称',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 160,
      validation: [{ type: 'maxLength', value: 255 }],
    },
    {
      name: 'code',
      label: '部门编码',
      type: 'text',
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 120,
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'org_id',
      label: '所属公司',
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
      label: '上级部门',
      type: 'select',
      listWidth: 140,
      options: {
        type: 'dynamic',
        resolver: 'departments',
      },
      renderCell: (row: Record<string, unknown>) => {
        return (row.parent_name as string) || '顶级部门';
      },
    },
    {
      name: 'description',
      label: '部门描述',
      type: 'textarea',
      listWidth: 200,
    },
    {
      name: 'status',
      label: '状态',
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
        label: '状态',
        type: 'select',
        options: [{ label: '全部状态', value: 'all' }, ...STATUS_OPTIONS],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['name', 'code'],
    },
    {
      title: '组织关系',
      fields: ['org_id', 'parentId'],
    },
    {
      title: '其他',
      fields: ['description', 'status'],
    },
  ],

  formColCount: 2,
  createTitle: '新增部门',
  editTitle: '编辑部门',
  detailTitle: '部门详情',

  dynamicOptions: [
    {
      field: 'org_id',
      queryKey: ['hrm', 'companies'],
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
      queryKey: ['hrm', 'departments'],
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
