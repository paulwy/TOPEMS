import type { EntitySchema } from '@/schema-dsl';
import i18n from '@/i18n';
import { loadPdmProcessOptions } from '@/schemas/dynamicLoaders';

export const stepSchema: EntitySchema = {
  entity: 'pdm_step',
  title: i18n.t('pdm.step.k0'),
  description: i18n.t('pdm.step.k1'),

  api: {
    module: 'pdm',
    resource: 'steps',
  },

  // 批 23：写权限资源前缀（DB 实查 create/update/delete 三码齐全）
  permissionResource: 'pdm:step',

  // 工序下拉：process_id 是 uuid，裸文本填任何非 UUID 必 422
  dynamicOptions: [
    {
      field: 'process_id',
      queryKey: ['pdm', 'processes', 'forStep'],
      loader: loadPdmProcessOptions,
    },
  ],

  fields: [
    {
      // 后端 step_no 是 i32，此前按文本填会 422 "invalid type: string"
      name: 'step_no',
      label: i18n.t('pdm.step.k2'),
      type: 'number',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'name',
      label: i18n.t('pdm.step.k3'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 180,
    },
    {
      name: 'process_id',
      label: i18n.t('pdm.step.k4'),
      type: 'select',
      required: true,
      showInList: false,
    },
    {
      // 后端字段名 standard_time（numeric），原先的 sort_order / duration_hours
      // 在 pdm_production_steps 里根本没有对应列，提交后被静默丢弃
      name: 'standard_time',
      label: i18n.t('pdm.step.k7'),
      type: 'number',
      listWidth: 120,
    },
    {
      name: 'equipment_requirement',
      label: i18n.t('pdm.step.k8'),
      type: 'text',
      listWidth: 160,
    },
    {
      name: 'status',
      label: i18n.t('pdm.step.k9'),
      type: 'select',
      defaultValue: 'active',
      options: {
        type: 'static',
        options: [
          { value: 'active', label: i18n.t('pdm.step.k10') },
          { value: 'inactive', label: i18n.t('pdm.step.k11') },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'description',
      label: i18n.t('pdm.step.k12'),
      type: 'textarea',
      showInList: false,
    },
  ],

  list: {
    columns: ['step_no', 'name', 'standard_time', 'equipment_requirement', 'status'],
    searchFields: ['step_no', 'name'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        active: 'success',
        inactive: 'error',
      },
      labelMap: {
        active: i18n.t('pdm.step.k14'),
        inactive: i18n.t('pdm.step.k15'),
      },
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('pdm.step.k16'),
        type: 'select',
        options: [
          { label: i18n.t('pdm.step.k17'), value: 'all' },
          { label: i18n.t('pdm.step.k18'), value: 'active' },
          { label: i18n.t('pdm.step.k19'), value: 'inactive' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('pdm.step.k20'),
      fields: ['process_id', 'step_no', 'name'],
    },
    {
      title: i18n.t('pdm.step.k21'),
      fields: ['standard_time', 'equipment_requirement', 'status'],
    },
    {
      title: i18n.t('pdm.step.k22'),
      fields: ['description'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('pdm.step.k23'),
  editTitle: i18n.t('pdm.step.k24'),
  detailTitle: i18n.t('pdm.step.k25'),
};
