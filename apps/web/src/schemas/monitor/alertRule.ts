/**
 * 告警规则 Schema — 驱动 AlertRulesPage 的完整 CRUD
 *
 * 使用 CrudPage 组件实现 schema 驱动的告警规则管理，
 * 支持列表展示、创建、编辑、删除等操作。
 */

import type { EntitySchema } from '@/schema';

export const alertRuleSchema: EntitySchema = {
  entity: 'monitor_alert_rule',
  title: '告警规则',
  description: '管理系统告警规则，配置监控指标、触发条件和通知方式',

  api: {
    module: 'monitor',
    resource: 'alertRules',
  },

  fields: [
    {
      name: 'name',
      label: '规则名称',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 200,
    },
    {
      name: 'description',
      label: '描述',
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'service_name',
      label: '服务',
      type: 'text',
      listWidth: 120,
    },
    {
      name: 'severity',
      label: '严重级别',
      type: 'select',
      required: true,
      defaultValue: 'warning',
      options: {
        type: 'static',
        options: [
          { value: 'critical', label: '严重' },
          { value: 'error', label: '错误' },
          { value: 'warning', label: '警告' },
          { value: 'info', label: '信息' },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'enabled',
      label: '启用状态',
      type: 'switch',
      defaultValue: true,
      listWidth: 80,
    },
    {
      name: 'updated_at',
      label: '更新时间',
      type: 'datetime',
      hideInForm: true,
      sortable: true,
      listWidth: 160,
    },
  ],

  list: {
    searchFields: ['name', 'description', 'service_name'],
    pageSize: 10,
    filters: [
      {
        id: 'severity',
        label: '严重级别',
        type: 'select',
        options: [
          { label: '全部级别', value: 'all' },
          { label: '严重', value: 'critical' },
          { label: '错误', value: 'error' },
          { label: '警告', value: 'warning' },
          { label: '信息', value: 'info' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['name', 'description', 'service_name', 'severity'],
    },
    {
      title: '启用状态',
      fields: ['enabled'],
    },
  ],

  formColCount: 2,
  createTitle: '新建告警规则',
  editTitle: '编辑告警规则',
  detailTitle: '告警规则详情',
};
