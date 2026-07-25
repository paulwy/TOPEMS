import type { EntitySchema } from '@/schema';

export const settingSchema: EntitySchema = {
  entity: 'rd_setting',
  title: '配置项',
  description: '管理研发系统配置项',

  api: {
    module: 'rd',
    resource: 'settings',
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
      name: 'name',
      label: '名称',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 200,
    },
    {
      name: 'description',
      label: '描述',
      type: 'text',
      listWidth: 300,
    },
    {
      name: 'enabled',
      label: '状态',
      type: 'switch',
      defaultValue: true,
      listWidth: 100,
    },
  ],

  list: {
    columns: ['name', 'description', 'enabled'],
    searchFields: ['name'],
    pageSize: 20,
    selectable: false,
  },

  formSections: [
    {
      title: '基本信息',
      fields: ['name', 'description', 'enabled'],
    },
  ],

  formColCount: 2,
  createTitle: '新增配置',
  editTitle: '编辑配置',
  detailTitle: '配置详情',

  actions: ['create', 'edit', 'detail', 'delete'],
};
