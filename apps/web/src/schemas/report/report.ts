import React from 'react';
import { Chip } from '@mui/material';
import type { EntitySchema } from '@/schema';

const REPORT_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'rs_project_progress', label: '研发项目进度' },
  { value: 'rs_experiment_record', label: '研发实验记录' },
  { value: 'lims_inspection_stats', label: '检验统计' },
  { value: 'lims_sample_summary', label: '样品汇总' },
  { value: 'qms_quality_analysis', label: '质量分析' },
  { value: 'qms_defect_stats', label: '缺陷统计' },
  { value: 'ehs_safety_check', label: '安全检查' },
  { value: 'ehs_risk_assessment', label: '风险评估' },
  { value: 'srm_supplier_eval', label: '供应商评估' },
  { value: 'srm_purchase_stats', label: '采购统计' },
  { value: 'pdm_production_stats', label: '生产统计' },
  { value: 'pdm_process_summary', label: '工艺汇总' },
];

function getConfig(row: Record<string, unknown>): {
  title?: string;
  report_type?: string;
} {
  const config = row.config as { title?: string; report_type?: string } | undefined;
  return config ?? {};
}

export const reportSchema: EntitySchema = {
  entity: 'report',
  title: '报表管理',
  description: '统一报表管理平台，支持多种报表类型和导出格式',

  api: {
    module: 'report',
    resource: 'reports',
  },

  fields: [
    {
      name: 'id',
      label: '报表ID',
      type: 'text',
      readonly: true,
      sortable: true,
      listWidth: 100,
      hideInForm: true,
    },
    {
      name: 'title',
      label: '报表名称',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 220,
      renderCell: (row: Record<string, unknown>) => {
        const title = getConfig(row).title ?? '-';
        return React.createElement('span', null, title);
      },
    },
    {
      name: 'report_type',
      label: '报表类型',
      type: 'select',
      required: true,
      defaultValue: 'rs_project_progress',
      options: { type: 'static', options: REPORT_TYPE_OPTIONS },
      listWidth: 150,
      renderCell: (row: Record<string, unknown>) => {
        const reportType = getConfig(row).report_type ?? '';
        const label = REPORT_TYPE_OPTIONS.find((o) => o.value === reportType)?.label || reportType;
        return React.createElement(Chip, {
          label,
          size: 'small',
          variant: 'outlined',
        });
      },
    },
    {
      name: 'row_count',
      label: '数据行数',
      type: 'number',
      sortable: true,
      listWidth: 100,
      hideInForm: true,
      renderCell: (row: Record<string, unknown>) => {
        const val = row.row_count as number | undefined;
        return val != null ? String(val) : '-';
      },
    },
    {
      name: 'created_at',
      label: '创建时间',
      type: 'datetime',
      readonly: true,
      sortable: true,
      listWidth: 180,
      hideInForm: true,
    },
  ],

  list: {
    columns: ['id', 'title', 'report_type', 'row_count', 'created_at'],
    searchFields: ['title'],
    pageSize: 10,
    filters: [
      {
        id: 'report_type',
        label: '报表类型',
        type: 'select',
        options: [{ label: '全部类型', value: 'all' }, ...REPORT_TYPE_OPTIONS],
        defaultValue: 'all',
      },
    ],
  },

  actions: ['detail', 'delete'],

  createTitle: '新建报表',
  editTitle: '编辑报表',
  detailTitle: '报表详情',
};
