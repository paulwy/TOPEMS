import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const wipSchema: EntitySchema = {
  entity: 'mes_wip',
  title: i18n.t('mes.wip.k0'),
  description: i18n.t('mes.wip.k1'),

  api: {
    module: 'mes',
    resource: 'wip',
  },

  fields: [
    {
      name: 'order_id',
      label: i18n.t('mes.wip.id_2'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'order_number',
      label: i18n.t('mes.wip.k3'),
      type: 'text',
      readonly: true,
      listWidth: 140,
    },
    {
      name: 'product_name',
      label: i18n.t('mes.wip.k4'),
      type: 'text',
      showInList: false,
      validation: [{ type: 'maxLength', value: 256 }],
    },
    {
      name: 'process_name',
      label: i18n.t('mes.wip.k5'),
      type: 'text',
      readonly: true,
      listWidth: 120,
    },
    {
      name: 'work_station_name',
      label: i18n.t('mes.wip.k6'),
      type: 'text',
      readonly: true,
      listWidth: 120,
    },
    {
      name: 'quantity',
      label: i18n.t('mes.wip.k7'),
      type: 'number',
      required: true,
      align: 'right',
      listWidth: 100,
    },
    {
      name: 'completed_quantity',
      label: i18n.t('mes.wip.k8'),
      type: 'number',
      align: 'right',
      showInList: false,
    },
    {
      name: 'wip_quantity',
      label: i18n.t('mes.wip.k9'),
      type: 'number',
      align: 'right',
      showInList: false,
    },
    {
      name: 'unit',
      label: i18n.t('mes.wip.k10'),
      type: 'text',
      showInList: false,
    },
    {
      name: 'batch_no',
      label: i18n.t('mes.wip.k11'),
      type: 'text',
      listWidth: 120,
      validation: [{ type: 'maxLength', value: 64 }],
    },
    {
      name: 'operator',
      label: i18n.t('mes.wip.k12'),
      type: 'text',
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 128 }],
    },
    {
      name: 'status',
      label: i18n.t('mes.wip.k13'),
      type: 'select',
      defaultValue: 'pending',
      options: {
        type: 'static',
        options: [
          { value: 'pending', label: i18n.t('mes.wip.k14') },
          { value: 'in_progress', label: i18n.t('mes.wip.k15') },
          { value: 'completed', label: i18n.t('mes.wip.k16') },
          { value: 'transferred', label: i18n.t('mes.wip.k17') },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 32 }],
    },
    {
      name: 'inbound_time',
      label: i18n.t('mes.wip.k18'),
      type: 'datetime',
      showInList: false,
    },
    {
      name: 'outbound_time',
      label: i18n.t('mes.wip.k19'),
      type: 'datetime',
      showInList: false,
    },
    {
      name: 'created_at',
      label: i18n.t('mes.wip.k20'),
      type: 'datetime',
      readonly: true,
      listWidth: 160,
      renderCell: (row: Record<string, unknown>) =>
        row.created_at ? new Date(row.created_at as string).toLocaleString('zh-CN') : '-',
    },
    {
      name: 'remarks',
      label: i18n.t('mes.wip.k21'),
      type: 'textarea',
      showInList: false,
    },
  ],

  list: {
    columns: [
      'order_number',
      'process_name',
      'work_station_name',
      'quantity',
      'batch_no',
      'operator',
      'status',
      'created_at',
    ],
    searchFields: ['order_number', 'batch_no', 'operator'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        in_progress: 'warning',
        completed: 'success',
        pending: 'default',
        transferred: 'primary',
      },
      labelMap: {
        in_progress: i18n.t('mes.wip.k22'),
        completed: i18n.t('mes.wip.k23'),
        pending: i18n.t('mes.wip.k24'),
        transferred: i18n.t('mes.wip.k25'),
      },
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('mes.wip.k26'),
        type: 'select',
        options: [
          { label: i18n.t('mes.wip.k27'), value: 'all' },
          { label: i18n.t('mes.wip.k28'), value: 'pending' },
          { label: i18n.t('mes.wip.k29'), value: 'in_progress' },
          { label: i18n.t('mes.wip.k30'), value: 'transferred' },
          { label: i18n.t('mes.wip.k31'), value: 'completed' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('mes.wip.k32'),
      fields: [
        'order_id',
        'product_name',
        'quantity',
        'completed_quantity',
        'wip_quantity',
        'unit',
        'batch_no',
      ],
    },
    {
      title: i18n.t('mes.wip.k33'),
      fields: [
        'process_name',
        'work_station_name',
        'operator',
        'status',
        'inbound_time',
        'outbound_time',
      ],
    },
    {
      title: i18n.t('mes.wip.k34'),
      fields: ['order_number', 'created_at', 'remarks'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('mes.wip.k35'),
  editTitle: i18n.t('mes.wip.k36'),
  detailTitle: i18n.t('mes.wip.k37'),
};
