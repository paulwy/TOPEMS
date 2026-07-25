import type { EntitySchema } from '@/schema';

export const productConfigSchema: EntitySchema = {
  entity: 'pdm_product_config',
  title: '产品配置',
  description: '管理产品配置信息，包括名称、编码、状态、属性、选项等',

  api: {
    module: 'pdm',
    resource: 'productConfigs',
  },

  fields: [
    {
      name: 'name',
      label: '配置名称',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'code',
      label: '配置编码',
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: 'draft',
      options: {
        type: 'static',
        options: [
          { value: 'draft', label: '草稿' },
          { value: 'active', label: '启用' },
          { value: 'archived', label: '归档' },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'color',
      label: '颜色',
      type: 'select',
      options: {
        type: 'static',
        options: [
          { value: '红色', label: '红色' },
          { value: '蓝色', label: '蓝色' },
          { value: '绿色', label: '绿色' },
          { value: '黑色', label: '黑色' },
          { value: '白色', label: '白色' },
        ],
      },
      listWidth: 80,
    },
    {
      name: 'size',
      label: '尺寸',
      type: 'select',
      options: {
        type: 'static',
        options: [
          { value: 'S', label: 'S' },
          { value: 'M', label: 'M' },
          { value: 'L', label: 'L' },
          { value: 'XL', label: 'XL' },
          { value: 'XXL', label: 'XXL' },
        ],
      },
      listWidth: 80,
    },
    {
      name: 'material',
      label: '材质',
      type: 'select',
      options: {
        type: 'static',
        options: [
          { value: '塑料', label: '塑料' },
          { value: '金属', label: '金属' },
          { value: '玻璃', label: '玻璃' },
          { value: '木材', label: '木材' },
        ],
      },
      listWidth: 80,
    },
    {
      name: 'grade',
      label: '等级',
      type: 'select',
      options: {
        type: 'static',
        options: [
          { value: 'A级', label: 'A级' },
          { value: 'B级', label: 'B级' },
          { value: 'C级', label: 'C级' },
        ],
      },
      listWidth: 80,
    },
    {
      name: 'options',
      label: '可选服务',
      type: 'checkbox-group',
      options: {
        type: 'static',
        options: [
          { value: '快速发货', label: '快速发货' },
          { value: '免费配送', label: '免费配送' },
          { value: '质量保证', label: '质量保证' },
          { value: '专属客服', label: '专属客服' },
        ],
      },
      showInList: false,
    },
  ],

  list: {
    columns: ['name', 'code', 'color', 'size', 'material', 'grade', 'status'],
    searchFields: ['name', 'code'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        active: 'success',
        draft: 'warning',
        archived: 'error',
      },
      labelMap: {
        active: '启用',
        draft: '草稿',
        archived: '归档',
      },
    },
    filters: [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '草稿', value: 'draft' },
          { label: '启用', value: 'active' },
          { label: '归档', value: 'archived' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['name', 'code', 'status'],
    },
    {
      title: '属性配置',
      fields: ['color', 'size', 'material', 'grade'],
    },
    {
      title: '可选服务',
      fields: ['options'],
    },
  ],

  formColCount: 2,
  createTitle: '创建产品配置',
  editTitle: '编辑产品配置',
  detailTitle: '产品配置详情',
};
