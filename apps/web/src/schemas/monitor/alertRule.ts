/**
 * 告警规则 Schema — 驱动 AlertRulesPage 的完整 CRUD
 *
 * 使用 CrudPage 组件实现 schema 驱动的告警规则管理，
 * 支持列表展示、创建、编辑、删除等操作。
 */

import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const alertRuleSchema: EntitySchema = {
  entity: 'monitor_alert_rule',
  title: i18n.t('monitor.alert_rule.k0'),
  description: i18n.t('monitor.alert_rule.k1'),

  api: {
    module: 'monitor',
    resource: 'alertRules',
  },

  fields: [
    {
      name: 'name',
      label: i18n.t('monitor.alert_rule.k2'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 200,
    },
    {
      name: 'description',
      label: i18n.t('monitor.alert_rule.k3'),
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'service_name',
      label: i18n.t('monitor.alert_rule.k4'),
      type: 'text',
      listWidth: 120,
    },
    {
      name: 'severity',
      label: i18n.t('monitor.alert_rule.k5'),
      type: 'select',
      required: true,
      defaultValue: 'warning',
      options: {
        type: 'static',
        options: [
          { value: 'critical', label: i18n.t('monitor.alert_rule.k6') },
          { value: 'error', label: i18n.t('monitor.alert_rule.k7') },
          { value: 'warning', label: i18n.t('monitor.alert_rule.k8') },
          { value: 'info', label: i18n.t('monitor.alert_rule.k9') },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'enabled',
      label: i18n.t('monitor.alert_rule.k10'),
      type: 'switch',
      defaultValue: true,
      listWidth: 80,
    },
    {
      name: 'updated_at',
      label: i18n.t('monitor.alert_rule.k11'),
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
        label: i18n.t('monitor.alert_rule.k12'),
        type: 'select',
        options: [
          { label: i18n.t('monitor.alert_rule.k13'), value: 'all' },
          { label: i18n.t('monitor.alert_rule.k14'), value: 'critical' },
          { label: i18n.t('monitor.alert_rule.k15'), value: 'error' },
          { label: i18n.t('monitor.alert_rule.k16'), value: 'warning' },
          { label: i18n.t('monitor.alert_rule.k17'), value: 'info' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('monitor.alert_rule.k18'),
      fields: ['name', 'description', 'service_name', 'severity'],
    },
    {
      title: i18n.t('monitor.alert_rule.k19'),
      fields: ['enabled'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('monitor.alert_rule.k20'),
  editTitle: i18n.t('monitor.alert_rule.k21'),
  detailTitle: i18n.t('monitor.alert_rule.k22'),
};
