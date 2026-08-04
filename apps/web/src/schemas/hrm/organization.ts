import type { EntitySchema } from '@/schema';
import type { SchemaExtensions } from '@/schema/schemaExtensions';

export const organizationSchema: EntitySchema & SchemaExtensions = {
  entity: 'hrm_org_unit',
  title: '组织架构',
  description: '管理企业组织架构，包括公司、部门、团队等层级结构',

  api: {
    module: 'hrm',
    resource: 'organizations',
  },

  fields: [
    {
      name: 'name',
      label: '名称',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 160,
    },
    {
      name: 'code',
      label: '编码',
      type: 'text',
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'type',
      label: '类型',
      type: 'select',
      required: true,
      defaultValue: 'department',
      options: {
        type: 'static',
        options: [
          { value: 'company', label: '公司' },
          { value: 'department', label: '部门' },
          { value: 'team', label: '团队' },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'manager',
      label: '负责人',
      type: 'text',
      listWidth: 120,
    },
    {
      name: 'parentId',
      label: '上级组织',
      type: 'text',
      showInList: false,
      showInDetail: false,
    },
    {
      name: 'description',
      label: '描述',
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
        company: '公司',
        department: '部门',
        team: '团队',
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
      title: '基本信息',
      fields: ['name', 'code', 'type'],
    },
    {
      title: '组织关系',
      fields: ['manager', 'parentId'],
    },
    {
      title: '其他',
      fields: ['description'],
    },
  ],

  formColCount: 2,
  createTitle: '新增组织',
  editTitle: '编辑组织',
  detailTitle: '组织详情',
};
