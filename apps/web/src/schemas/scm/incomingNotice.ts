import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

/**
 * 到货通知（incoming_notices）Schema
 * 契约：GET/POST /incoming-notices，GET/PUT /incoming-notices/{id}（权限 PurchaseOrderRead）
 * 状态流转：pending（待收货）→ arrived（已到货）；notice_number 由后端生成（ASN+时间戳）
 */
export const incomingNoticeSchema: EntitySchema = {
  entity: 'incomingNotice',
  title: i18n.t('scm.incoming_notice.k0'),
  description: i18n.t('scm.incoming_notice.k1'),

  api: {
    module: 'scm',
    resource: 'incomingNotices',
  },

  fields: [
    {
      name: 'notice_number',
      label: i18n.t('scm.incoming_notice.id_2'),
      type: 'text',
      sortable: true,
      listWidth: 170,
      hideInForm: true,
    },
    {
      name: 'purchase_order_number',
      label: i18n.t('scm.incoming_notice.k3'),
      type: 'text',
      sortable: true,
      listWidth: 150,
      readonlyOnEdit: true,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'supplier_name',
      label: i18n.t('scm.incoming_notice.k4'),
      type: 'text',
      sortable: true,
      listWidth: 150,
      readonlyOnEdit: true,
      validation: [{ type: 'maxLength', value: 200 }],
    },
    {
      name: 'warehouse_name',
      label: i18n.t('scm.incoming_notice.k5'),
      type: 'text',
      sortable: true,
      listWidth: 140,
      readonlyOnEdit: true,
      validation: [{ type: 'maxLength', value: 200 }],
    },
    {
      name: 'expected_arrival_date',
      label: i18n.t('scm.incoming_notice.k6'),
      type: 'date',
      sortable: true,
      listWidth: 120,
      readonlyOnEdit: true,
    },
    {
      name: 'actual_arrival_date',
      label: i18n.t('scm.incoming_notice.k7'),
      type: 'date',
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'status',
      label: i18n.t('scm.incoming_notice.k8'),
      type: 'select',
      defaultValue: 'pending',
      sortable: true,
      listWidth: 100,
      options: {
        type: 'static',
        options: [
          { label: i18n.t('scm.incoming_notice.k17'), value: 'pending' },
          { label: i18n.t('scm.incoming_notice.k18'), value: 'arrived' },
        ],
      },
    },
    {
      name: 'total_quantity',
      label: i18n.t('scm.incoming_notice.k9'),
      type: 'number',
      defaultValue: 0,
      sortable: true,
      align: 'right',
      listWidth: 100,
      readonlyOnEdit: true,
    },
    {
      name: 'inspection_required',
      label: i18n.t('scm.incoming_notice.k10'),
      type: 'switch',
      defaultValue: false,
      listWidth: 110,
      readonlyOnEdit: true,
    },
    {
      name: 'remarks',
      label: i18n.t('scm.incoming_notice.k11'),
      type: 'textarea',
      listWidth: 200,
      validation: [{ type: 'maxLength', value: 500 }],
    },
  ],

  list: {
    columns: [
      'notice_number',
      'purchase_order_number',
      'supplier_name',
      'warehouse_name',
      'expected_arrival_date',
      'actual_arrival_date',
      'status',
      'total_quantity',
      'inspection_required',
      'remarks',
    ],
    searchFields: ['notice_number', 'purchase_order_number', 'supplier_name'],
    pageSize: 10,
    filters: [
      {
        id: 'status',
        label: i18n.t('scm.incoming_notice.k8'),
        type: 'select',
        options: [
          { label: i18n.t('scm.incoming_notice.k19'), value: 'all' },
          { label: i18n.t('scm.incoming_notice.k17'), value: 'pending' },
          { label: i18n.t('scm.incoming_notice.k18'), value: 'arrived' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail'],

  formSections: [
    {
      title: i18n.t('scm.incoming_notice.k12'),
      fields: ['purchase_order_number', 'supplier_name', 'warehouse_name', 'expected_arrival_date'],
    },
    {
      title: i18n.t('scm.incoming_notice.k13'),
      fields: ['total_quantity', 'inspection_required', 'status', 'actual_arrival_date', 'remarks'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('scm.incoming_notice.k14'),
  editTitle: i18n.t('scm.incoming_notice.k15'),
  detailTitle: i18n.t('scm.incoming_notice.k16'),
};
