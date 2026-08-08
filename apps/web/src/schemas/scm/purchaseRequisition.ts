import type { EntitySchema } from '@/schema';
import type { SchemaExtensions } from '@/schema/schemaExtensions';
import { columnsFromFields } from '@/schema/schemaExtensions';

const itemFields = [
  {
    name: 'line_no',
    label: '行号',
    type: 'number' as const,
    listWidth: 80,
  },
  {
    name: 'material_code',
    label: '物料编码',
    type: 'text' as const,
    listWidth: 140,
  },
  {
    name: 'material_name',
    label: '物料名称',
    type: 'text' as const,
    listWidth: 160,
  },
  {
    name: 'qty',
    label: '数量',
    type: 'number' as const,
    listWidth: 100,
  },
  {
    name: 'unit',
    label: '单位',
    type: 'text' as const,
    listWidth: 80,
  },
  {
    name: 'price',
    label: '单价',
    type: 'number' as const,
    listWidth: 100,
  },
  {
    name: 'amount',
    label: '金额',
    type: 'number' as const,
    listWidth: 120,
  },
];

export const purchaseRequisitionSchema: EntitySchema & SchemaExtensions = {
  entity: 'purchaseRequisition',
  title: '采购申请',
  description: '管理采购申请单，包括申请创建、审批流转、转单等',

  api: {
    module: 'scm',
    resource: 'purchaseRequisitions',
  },

  fields: [
    {
      name: 'req_no',
      label: '申请单号',
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'title',
      label: '标题',
      type: 'text',
      required: true,
      listWidth: 180,
      validation: [{ type: 'maxLength', value: 200 }],
    },
    {
      name: 'requester',
      label: '申请人',
      type: 'text',
      listWidth: 100,
    },
    {
      name: 'department',
      label: '部门',
      type: 'text',
      listWidth: 120,
    },
    {
      name: 'reason',
      label: '申请原因',
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'priority',
      label: '优先级',
      type: 'select',
      defaultValue: 'medium',
      options: {
        type: 'static',
        options: [
          { value: 'low', label: '低' },
          { value: 'medium', label: '中' },
          { value: 'high', label: '高' },
          { value: 'urgent', label: '紧急' },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 20 }],
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
          { value: 'pending', label: '待审批' },
          { value: 'approved', label: '已审批' },
          { value: 'rejected', label: '已拒绝' },
          { value: 'cancelled', label: '已取消' },
          { value: 'converted', label: '已转单' },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 50 }],
    },
  ],

  list: {
    columns: ['req_no', 'title', 'requester', 'department', 'priority', 'status'],
    searchFields: ['req_no', 'title', 'requester'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        draft: 'default',
        pending: 'warning',
        approved: 'success',
        rejected: 'error',
        cancelled: 'default',
        converted: 'primary',
      },
      labelMap: {
        draft: '草稿',
        pending: '待审批',
        approved: '已审批',
        rejected: '已拒绝',
        cancelled: '已取消',
        converted: '已转单',
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
          { label: '待审批', value: 'pending' },
          { label: '已审批', value: 'approved' },
          { label: '已拒绝', value: 'rejected' },
          { label: '已取消', value: 'cancelled' },
          { label: '已转单', value: 'converted' },
        ],
      },
      {
        id: 'priority',
        label: '优先级',
        type: 'select',
        options: [
          { label: '全部优先级', value: 'all' },
          { label: '低', value: 'low' },
          { label: '中', value: 'medium' },
          { label: '高', value: 'high' },
          { label: '紧急', value: 'urgent' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['req_no', 'title', 'requester', 'department', 'priority', 'status'],
    },
    {
      title: '申请详情',
      fields: ['reason'],
    },
  ],

  formColCount: 2,
  createTitle: '新增采购申请',
  editTitle: '编辑采购申请',
  detailTitle: '采购申请详情',

  nestedTables: [
    {
      field: 'items',
      title: '申请明细',
      columns: columnsFromFields(itemFields),
      fields: itemFields,
      allowAdd: true,
      allowEdit: true,
      allowDelete: true,
      allowDuplicate: true,
      addButtonText: '新增明细',
      rowKeyField: 'line_no',
      minRows: 1,
      formColCount: 2,
    },
  ],
};
