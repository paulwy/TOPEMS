/**
 * 检验任务 Schema — 驱动 InspectionTaskPage 的完整 CRUD
 */

import type { EntitySchema } from '@/schema-dsl';
import i18n from '@/i18n';
import { loadLimsSampleOptions } from '@/schemas/dynamicLoaders';

const statusColorMap: Record<
  string,
  'default' | 'primary' | 'success' | 'warning' | 'error' | 'info'
> = {
  [i18n.t('schemas.inspection_task.k0')]: 'warning',
  [i18n.t('schemas.inspection_task.k1')]: 'info',
  [i18n.t('schemas.inspection_task.k2')]: 'primary',
  [i18n.t('schemas.inspection_task.k3')]: 'success',
  [i18n.t('schemas.inspection_task.k4')]: 'error',
  pending: 'warning',
  assigned: 'info',
  in_progress: 'primary',
  completed: 'success',
  cancelled: 'error',
};

const statusLabelMap: Record<string, string> = {
  [i18n.t('schemas.inspection_task.k5')]: i18n.t('lims.inspection_task.k0'),
  [i18n.t('schemas.inspection_task.k6')]: i18n.t('lims.inspection_task.k1'),
  [i18n.t('schemas.inspection_task.k7')]: i18n.t('lims.inspection_task.k2'),
  [i18n.t('schemas.inspection_task.k8')]: i18n.t('lims.inspection_task.k3'),
  [i18n.t('schemas.inspection_task.k9')]: i18n.t('lims.inspection_task.k4'),
  pending: i18n.t('lims.inspection_task.k5'),
  assigned: i18n.t('lims.inspection_task.k6'),
  in_progress: i18n.t('lims.inspection_task.k7'),
  completed: i18n.t('lims.inspection_task.k8'),
  cancelled: i18n.t('lims.inspection_task.k9'),
};

export const inspectionTaskSchema: EntitySchema = {
  entity: 'limsInspectionTask',
  title: i18n.t('lims.inspection_task.k10'),
  description: i18n.t('lims.inspection_task.k11'),

  api: {
    module: 'lims',
    resource: 'inspection-tasks',
  },

  // 批 23：写权限资源前缀（DB 实查 create/update/delete 三码齐全）
  permissionResource: 'lims:task',

  // 样品下拉：sample_id 是 uuid 外键，裸文本框填任何非 UUID 必 422
  dynamicOptions: [
    { field: 'sample_id', queryKey: ['lims', 'samples', 'forTask'], loader: loadLimsSampleOptions },
  ],

  fields: [
    {
      name: 'task_no',
      label: i18n.t('lims.inspection_task.k12'),
      type: 'text',
      // 后端 TK-日期-随机码 自动生成，前端不再要求填写
      readonly: true,
      hideInForm: true,
      sortable: true,
      listWidth: 140,
      renderCell: (row: Record<string, unknown>, _index: number) =>
        String(row.task_no || row.id || '-'),
    },
    {
      name: 'sample_id',
      label: i18n.t('lims.inspection_task.k13'),
      type: 'select',
      required: true,
      listWidth: 150,
    },
    {
      name: 'sample_no',
      label: i18n.t('lims.inspection_task.k54'),
      type: 'text',
      readonly: true,
      hideInForm: true,
      listWidth: 140,
      renderCell: (row: Record<string, unknown>, _index: number) =>
        String(row.sample_no || row.sample_id || '-'),
    },
    {
      name: 'test_items',
      label: i18n.t('lims.inspection_task.k49'),
      type: 'checkbox-group',
      required: true,
      showInList: false,
      options: {
        type: 'static',
        options: [
          { value: i18n.t('lims.inspection_task.k50'), label: i18n.t('lims.inspection_task.k50') },
          { value: i18n.t('lims.inspection_task.k51'), label: i18n.t('lims.inspection_task.k51') },
          { value: i18n.t('lims.inspection_task.k52'), label: i18n.t('lims.inspection_task.k52') },
          { value: i18n.t('lims.inspection_task.k53'), label: i18n.t('lims.inspection_task.k53') },
        ],
      },
    },
    {
      name: 'status',
      label: i18n.t('lims.inspection_task.k16'),
      type: 'select',
      defaultValue: 'pending',
      options: {
        type: 'static',
        options: [
          { value: 'pending', label: i18n.t('lims.inspection_task.k19') },
          { value: 'assigned', label: i18n.t('lims.inspection_task.k21') },
          { value: 'in_progress', label: i18n.t('lims.inspection_task.k23') },
          { value: 'completed', label: i18n.t('lims.inspection_task.k25') },
          { value: 'cancelled', label: i18n.t('lims.inspection_task.k27') },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'assigned_to',
      label: i18n.t('lims.inspection_task.k28'),
      type: 'text',
      listWidth: 120,
    },
    {
      name: 'actual_start_date',
      label: i18n.t('lims.inspection_task.k29'),
      type: 'datetime',
      readonly: true,
      hideInForm: true,
      listWidth: 160,
      renderCell: (row: Record<string, unknown>, _index: number) => {
        const value = row.actual_start_date;
        if (!value) return '-';
        return new Date(value as string).toLocaleDateString('zh-CN');
      },
    },
    {
      name: 'created_at',
      label: i18n.t('lims.inspection_task.k31'),
      type: 'datetime',
      readonly: true,
      hideInForm: true,
      showInList: false,
    },
  ],

  list: {
    columns: ['task_no', 'sample_no', 'test_items', 'status', 'assigned_to', 'actual_start_date'],
    searchFields: ['task_no', 'sample_no'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: statusColorMap,
      labelMap: statusLabelMap,
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('lims.inspection_task.k32'),
        type: 'select',
        options: [
          { label: i18n.t('lims.inspection_task.k33'), value: 'all' },
          { label: i18n.t('lims.inspection_task.k34'), value: i18n.t('lims.inspection_task.k35') },
          { label: i18n.t('lims.inspection_task.k36'), value: i18n.t('lims.inspection_task.k37') },
          { label: i18n.t('lims.inspection_task.k38'), value: i18n.t('lims.inspection_task.k39') },
          { label: i18n.t('lims.inspection_task.k40'), value: i18n.t('lims.inspection_task.k41') },
          { label: i18n.t('lims.inspection_task.k42'), value: i18n.t('lims.inspection_task.k43') },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('lims.inspection_task.k44'),
      fields: ['sample_id', 'test_items'],
    },
    {
      title: i18n.t('lims.inspection_task.k45'),
      fields: ['assigned_to'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('lims.inspection_task.k46'),
  editTitle: i18n.t('lims.inspection_task.k47'),
  detailTitle: i18n.t('lims.inspection_task.k48'),
};
