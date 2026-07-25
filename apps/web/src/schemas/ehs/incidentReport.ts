import React from 'react';
import type { EntitySchema } from '@/schema';

export const incidentReportSchema: EntitySchema = {
  entity: 'ehsIncident',
  title: '事故报告',
  description: '管理企业事故报告信息，包括事故类型、严重程度、状态等',

  api: {
    module: 'ehs',
    resource: 'incidents',
  },

  fields: [
    {
      name: 'incident_no',
      label: '事故编号',
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      listWidth: 140,
    },
    {
      name: 'title',
      label: '事故标题',
      type: 'text',
      required: true,
      listWidth: 180,
    },
    {
      name: 'type',
      label: '事故类型',
      type: 'select',
      required: true,
      defaultValue: 'injury',
      options: {
        type: 'static',
        options: [
          { value: 'injury', label: '伤害事故' },
          { value: 'illness', label: '职业病' },
          { value: 'environment', label: '环境事故' },
          { value: 'property', label: '财产损失' },
          { value: 'near_miss', label: '未遂事件' },
        ],
      },
      listWidth: 120,
    },
    {
      name: 'severity',
      label: '严重程度',
      type: 'select',
      required: true,
      defaultValue: 'minor',
      options: {
        type: 'static',
        options: [
          { value: 'minor', label: '轻微' },
          { value: 'serious', label: '严重' },
          { value: 'critical', label: '重大' },
          { value: 'fatal', label: '致命' },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'location',
      label: '发生地点',
      type: 'text',
      listWidth: 160,
    },
    {
      name: 'department_id',
      label: '所属部门',
      type: 'text',
      showInList: false,
    },
    {
      name: 'reporter',
      label: '报告人',
      type: 'text',
      showInList: false,
    },
    {
      name: 'report_date',
      label: '报告日期',
      type: 'date',
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
          { value: 'submitted', label: '已提交' },
          { value: 'investigating', label: '调查中' },
          { value: 'closed', label: '已结案' },
          { value: 'escalated', label: '已升级' },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'description',
      label: '描述',
      type: 'textarea',
      showInList: false,
    },
  ],

  list: {
    columns: ['incident_no', 'title', 'type', 'severity', 'location', 'report_date', 'status'],
    searchFields: ['incident_no', 'title'],
    pageSize: 10,
    statusBadge: {
      field: 'severity',
      colorMap: {
        minor: 'success',
        serious: 'warning',
        critical: 'error',
        fatal: 'error',
      },
      labelMap: {
        minor: '轻微',
        serious: '严重',
        critical: '重大',
        fatal: '致命',
      },
    },
    filters: [
      {
        id: 'type',
        label: '事故类型',
        type: 'select',
        options: [
          { label: '全部', value: 'all' },
          { label: '伤害事故', value: 'injury' },
          { label: '职业病', value: 'illness' },
          { label: '环境事故', value: 'environment' },
          { label: '财产损失', value: 'property' },
          { label: '未遂事件', value: 'near_miss' },
        ],
      },
      {
        id: 'severity',
        label: '严重程度',
        type: 'select',
        options: [
          { label: '全部', value: 'all' },
          { label: '轻微', value: 'minor' },
          { label: '严重', value: 'serious' },
          { label: '重大', value: 'critical' },
          { label: '致命', value: 'fatal' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['incident_no', 'title', 'type', 'severity'],
    },
    {
      title: '发生地点',
      fields: ['location', 'department_id', 'reporter', 'report_date'],
    },
    {
      title: '状态与描述',
      fields: ['status', 'description'],
    },
  ],

  formColCount: 2,
  createTitle: '新建事故报告',
  editTitle: '编辑事故报告',
  detailTitle: '事故报告详情',
};
