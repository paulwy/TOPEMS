import React from 'react';
import { Box, Chip, Typography } from '@mui/material';
import { Clock } from 'lucide-react';
import type { EntitySchema } from '@/schema';

// ============ 分类与等级配色 ============

const categoryColorMap: Record<string, 'error' | 'warning' | 'secondary' | 'info'> = {
  易燃: 'error',
  易爆: 'warning',
  有毒: 'secondary',
  腐蚀: 'info',
  氧化: 'warning',
  放射性: 'secondary',
};

function renderCategoryCell(row: Record<string, unknown>, _index: number) {
  const category = row.category as string | null | undefined;
  if (!category) return '-';
  const color = categoryColorMap[category];
  if (!color) {
    return React.createElement(Chip, {
      label: category,
      size: 'small',
      variant: 'outlined',
    });
  }
  return React.createElement(Chip, {
    label: category,
    size: 'small',
    color,
    variant: 'filled',
    sx: { fontWeight: 500 },
  });
}

function renderCasNoCell(row: Record<string, unknown>, _index: number) {
  const v = row.cas_no as string | null | undefined;
  if (!v) return '-';
  return React.createElement(Typography, {
    sx: { fontFamily: 'monospace', fontSize: '0.8rem' },
    children: v,
  });
}

function renderQuantityCell(row: Record<string, unknown>, _index: number) {
  const q = row.quantity as number | null | undefined;
  const u = row.unit as string | null | undefined;
  return React.createElement(Typography, {
    sx: { fontWeight: 500 },
    children: `${q ?? 0} ${u || ''}`.trim(),
  });
}

function renderMaterialCodeCell(row: Record<string, unknown>, _index: number) {
  const v = row.material_code as string | null | undefined;
  if (!v) return '-';
  return React.createElement(Typography, {
    sx: { fontFamily: 'monospace', fontSize: '0.875rem' },
    children: v,
  });
}

function renderNameCell(row: Record<string, unknown>, _index: number) {
  const v = row.name as string | null | undefined;
  return React.createElement(Typography, { sx: { fontWeight: 500 }, children: v || '-' });
}

function renderStorageLocationCell(row: Record<string, unknown>, _index: number) {
  const v = row.storage_location as string | null | undefined;
  return v || '-';
}

// ============ 有效期状态 ============

function getExpiryStatus(
  expiryDate: string | null | undefined
): { text: string; color: 'error' | 'warning' } | null {
  if (!expiryDate) return null;
  const now = new Date();
  const expiry = new Date(expiryDate);
  if (Number.isNaN(expiry.getTime())) return null;
  const daysDiff = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysDiff <= 0) return { text: '已过期', color: 'error' };
  if (daysDiff <= 30) return { text: '即将过期', color: 'warning' };
  return null;
}

function renderExpiryCell(row: Record<string, unknown>, _index: number) {
  const expiryDate = row.expiry_date as string | null | undefined;
  const status = getExpiryStatus(expiryDate);
  const dateText = expiryDate ? new Date(expiryDate).toLocaleDateString('zh-CN') : '-';

  const children: React.ReactNode[] = [
    React.createElement(Clock, {
      key: 'icon',
      style: { width: 14, height: 14 },
    }),
    React.createElement(Typography, { key: 'date', sx: { fontSize: '0.875rem' } }, dateText),
  ];

  if (status) {
    children.push(
      React.createElement(Chip, {
        key: 'status',
        label: status.text,
        size: 'small',
        color: status.color,
        sx: { height: 20, fontSize: '0.7rem', fontWeight: 500 },
      })
    );
  }

  return React.createElement(
    Box,
    { sx: { display: 'flex', alignItems: 'center', gap: 0.5 } },
    ...children
  );
}

// ============ Schema 定义 ============

export const hazardousMaterialSchema: EntitySchema = {
  entity: 'ehsHazardousMaterial',
  title: '危化品管理',
  description: '管理企业危险物料信息，包括编码、分类、危险等级、库存、有效期等',

  api: {
    module: 'ehs',
    resource: 'hazardousMaterials',
  },

  fields: [
    {
      name: 'material_code',
      label: '编码',
      type: 'text',
      readonlyOnEdit: true,
      listWidth: 130,
      renderCell: renderMaterialCodeCell,
    },
    {
      name: 'name',
      label: '名称',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 150,
      renderCell: renderNameCell,
    },
    {
      name: 'category',
      label: '分类',
      type: 'select',
      required: true,
      defaultValue: '易燃',
      options: {
        type: 'static',
        options: [
          { value: '易燃', label: '易燃' },
          { value: '易爆', label: '易爆' },
          { value: '有毒', label: '有毒' },
          { value: '腐蚀', label: '腐蚀' },
          { value: '氧化', label: '氧化' },
          { value: '放射性', label: '放射性' },
        ],
      },
      listWidth: 100,
      align: 'center',
      renderCell: renderCategoryCell,
    },
    {
      name: 'cas_no',
      label: 'CAS号',
      type: 'text',
      listWidth: 120,
      renderCell: renderCasNoCell,
    },
    {
      name: 'quantity',
      label: '库存量',
      type: 'number',
      listWidth: 100,
      align: 'right',
      renderCell: renderQuantityCell,
    },
    {
      name: 'unit',
      label: '单位',
      type: 'select',
      defaultValue: 'kg',
      options: {
        type: 'static',
        options: [
          { value: 'kg', label: 'kg' },
          { value: 'L', label: 'L' },
          { value: '瓶', label: '瓶' },
          { value: '桶', label: '桶' },
          { value: '箱', label: '箱' },
          { value: '袋', label: '袋' },
        ],
      },
      showInList: false,
    },
    {
      name: 'storage_location',
      label: '存放位置',
      type: 'text',
      required: true,
      listWidth: 140,
      renderCell: renderStorageLocationCell,
    },
    {
      name: 'danger_level',
      label: '危险等级',
      type: 'select',
      defaultValue: '三级',
      options: {
        type: 'static',
        options: [
          { value: '一级', label: '一级' },
          { value: '二级', label: '二级' },
          { value: '三级', label: '三级' },
          { value: '四级', label: '四级' },
        ],
      },
      listWidth: 100,
      align: 'center',
    },
    {
      name: 'expiry_date',
      label: '有效期',
      type: 'date',
      listWidth: 130,
      sortable: true,
      renderCell: renderExpiryCell,
    },
    {
      name: 'hazard_class',
      label: '危险类别',
      type: 'text',
      showInList: false,
    },
    {
      name: 'description',
      label: '描述',
      type: 'textarea',
      showInList: false,
    },
  ],

  list: {
    columns: [
      'material_code',
      'name',
      'category',
      'cas_no',
      'quantity',
      'storage_location',
      'danger_level',
      'expiry_date',
    ],
    searchFields: ['material_code', 'name', 'cas_no', 'storage_location'],
    pageSize: 10,
    statusBadge: {
      field: 'danger_level',
      colorMap: {
        一级: 'error',
        二级: 'warning',
        三级: 'primary',
        四级: 'success',
      },
      labelMap: {
        一级: '一级',
        二级: '二级',
        三级: '三级',
        四级: '四级',
      },
    },
    filters: [
      {
        id: 'category',
        label: '分类',
        type: 'select',
        options: [
          { label: '全部', value: 'all' },
          { label: '易燃', value: '易燃' },
          { label: '易爆', value: '易爆' },
          { label: '有毒', value: '有毒' },
          { label: '腐蚀', value: '腐蚀' },
          { label: '氧化', value: '氧化' },
          { label: '放射性', value: '放射性' },
        ],
      },
      {
        id: 'danger_level',
        label: '危险等级',
        type: 'select',
        options: [
          { label: '全部', value: 'all' },
          { label: '一级', value: '一级' },
          { label: '二级', value: '二级' },
          { label: '三级', value: '三级' },
          { label: '四级', value: '四级' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['material_code', 'name', 'category', 'hazard_class'],
    },
    {
      title: '库存信息',
      fields: ['cas_no', 'quantity', 'unit', 'storage_location'],
    },
    {
      title: '安全信息',
      fields: ['danger_level', 'expiry_date'],
    },
    {
      title: '描述',
      fields: ['description'],
    },
  ],

  formColCount: 2,
  createTitle: '入库登记',
  editTitle: '编辑危化品',
  detailTitle: '危化品详情',
};
