import type { EntitySchema } from '@/schema';

export const bomItemSchema: EntitySchema = {
  entity: 'pdm_bom_item',
  title: 'BOM 物料',
  description: '管理 BOM 物料清单，包括物料编号、名称、数量、单价等',

  api: {
    module: 'pdm',
    resource: 'bomItems',
  },

  fields: [
    {
      name: 'level',
      label: '层级',
      type: 'number',
      defaultValue: 1,
      listWidth: 80,
    },
    {
      name: 'part_number',
      label: '物料编号',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'part_name',
      label: '物料名称',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 160,
    },
    {
      name: 'quantity',
      label: '数量',
      type: 'number',
      defaultValue: 0,
      listWidth: 80,
      align: 'right',
    },
    {
      name: 'unit',
      label: '单位',
      type: 'select',
      defaultValue: 'kg',
      options: {
        type: 'static',
        options: [
          { value: 'kg', label: 'kg' },
          { value: '个', label: '个' },
          { value: '米', label: '米' },
          { value: '升', label: '升' },
        ],
      },
      listWidth: 80,
      align: 'center',
      validation: [{ type: 'maxLength', value: 32 }],
    },
    {
      name: 'unit_price',
      label: '单价',
      type: 'number',
      defaultValue: 0,
      listWidth: 100,
      align: 'right',
    },
    {
      name: 'total_price',
      label: '总价',
      type: 'number',
      readonly: true,
      listWidth: 100,
      align: 'right',
      hideInForm: true,
    },
    {
      name: 'item_no',
      label: '项次号',
      type: 'text',
      showInList: false,
    },
    {
      name: 'bom_version_id',
      label: 'BOM 版本 ID',
      type: 'text',
      showInList: false,
    },
    {
      name: 'product_id',
      label: '产品 ID',
      type: 'text',
      showInList: false,
    },
    {
      name: 'is_alternative',
      label: '是否替代件',
      type: 'switch',
      defaultValue: false,
      showInList: false,
    },
    {
      name: 'remarks',
      label: '备注',
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'created_at',
      label: '创建时间',
      type: 'datetime',
      readonly: true,
      sortable: true,
      listWidth: 160,
      hideInForm: true,
    },
    {
      name: 'updated_at',
      label: '更新时间',
      type: 'datetime',
      readonly: true,
      hideInForm: true,
      showInList: false,
    },
  ],

  list: {
    columns: ['level', 'part_number', 'part_name', 'quantity', 'unit', 'unit_price', 'total_price'],
    searchFields: ['part_number', 'part_name'],
    pageSize: 10,
    filters: [
      {
        id: 'product',
        label: '选择产品',
        type: 'select',
        options: [],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['part_number', 'part_name', 'level', 'item_no'],
    },
    {
      title: '数量与价格',
      fields: ['quantity', 'unit', 'unit_price', 'is_alternative'],
    },
    {
      title: '关联信息',
      fields: ['bom_version_id', 'product_id'],
    },
    {
      title: '备注',
      fields: ['remarks'],
    },
  ],

  formColCount: 2,
  createTitle: '添加物料',
  editTitle: '编辑物料',
  detailTitle: '物料详情',
};
