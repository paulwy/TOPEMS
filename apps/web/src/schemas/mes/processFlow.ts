import type { EntitySchema } from '@/schema';

export const processFlowSchema: EntitySchema = {
  entity: 'processFlow',
  title: '工艺流程',
  api: {
    module: 'mes',
    resource: 'processFlows',
  },
  fields: [
    {
      name: 'code',
      label: '流程编号',
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      listWidth: 140,
      sortable: true,
    },
    {
      name: 'name',
      label: '流程名称',
      type: 'text',
      required: true,
      listWidth: 180,
      sortable: true,
    },
    {
      name: 'production_line',
      label: '生产线',
      type: 'text',
      listWidth: 140,
      sortable: true,
    },
    {
      name: 'capacity',
      label: '产能',
      type: 'number',
      listWidth: 120,
      renderCell: (row): React.ReactNode => {
        const cap = row.capacity as number | undefined;
        const unit = row.unit as string | undefined;
        return cap ? `${cap} ${unit || '件/小时'}` : '-';
      },
    },
    {
      name: 'unit',
      label: '单位',
      type: 'select',
      showInList: false,
      options: {
        type: 'static',
        options: [
          { value: '件/小时', label: '件/小时' },
          { value: '台/小时', label: '台/小时' },
          { value: '套/小时', label: '套/小时' },
        ],
      },
    },
    {
      name: 'version',
      label: '版本',
      type: 'text',
      listWidth: 80,
      showInList: false,
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      listWidth: 100,
      options: {
        type: 'static',
        options: [
          { value: 'active', label: '启用' },
          { value: 'inactive', label: '停用' },
          { value: 'draft', label: '草稿' },
        ],
      },
    },
    {
      name: 'description',
      label: '描述',
      type: 'textarea',
      colSpan: 2,
      showInList: false,
    },
  ],
  list: {
    searchFields: ['code', 'name', 'production_line'],
    filters: [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '启用', value: 'active' },
          { label: '停用', value: 'inactive' },
          { label: '草稿', value: 'draft' },
        ],
        defaultValue: 'all',
      },
    ],
    statusBadge: {
      field: 'status',
      colorMap: {
        active: 'success',
        inactive: 'default',
        draft: 'warning',
      },
      labelMap: {
        active: '启用',
        inactive: '停用',
        draft: '草稿',
      },
    },
    pageSize: 10,
  },
  formSections: [
    {
      title: '基本信息',
      fields: ['code', 'name', 'version', 'status'],
    },
    {
      title: '生产参数',
      fields: ['production_line', 'capacity', 'unit'],
    },
    {
      title: '描述',
      fields: ['description'],
    },
  ],
  formColCount: 2,
  actions: ['create', 'edit', 'detail', 'delete'],
};
