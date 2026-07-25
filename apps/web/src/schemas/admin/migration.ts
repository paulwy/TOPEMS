/**
 * 数据迁移管理 Schema — 驱动 MigrationAdminPage 的服务列表
 */

import React from 'react';
import type { EntitySchema } from '@/schema';

export const migrationSchema: EntitySchema = {
  entity: 'adminMigration',
  title: '数据迁移管理',
  description: '管理各服务的数据迁移，支持执行迁移、回滚和查看迁移状态',

  api: {
    module: 'migration',
    resource: 'services',
  },

  fields: [
    {
      name: 'name',
      label: '服务名称',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 160,
      renderCell: (row: Record<string, unknown>) => {
        const name = String(row.name || '');
        return React.createElement('span', { style: { fontWeight: 500 } }, name);
      },
    },
    {
      name: 'schema',
      label: 'Schema',
      type: 'text',
      sortable: true,
      listWidth: 140,
      renderCell: (row: Record<string, unknown>) => {
        return React.createElement(
          'span',
          { style: { fontFamily: 'monospace', fontSize: '0.875rem' } },
          String(row.schema || '')
        );
      },
    },
    {
      name: 'port',
      label: '端口',
      type: 'number',
      listWidth: 80,
    },
    {
      name: 'tables',
      label: '表数量',
      type: 'number',
      listWidth: 90,
      renderCell: (row: Record<string, unknown>) => {
        const tables = row.tables;
        if (tables === undefined || tables === null) return '-';
        return React.createElement('span', { style: { fontWeight: 500 } }, String(tables));
      },
    },
    {
      name: 'description',
      label: '描述',
      type: 'text',
      listWidth: 250,
    },
  ],

  list: {
    columns: ['name', 'schema', 'port', 'tables', 'description'],
    searchFields: ['name', 'schema', 'description'],
    pageSize: 20,
  },

  actions: ['detail'],

  formColCount: 2,
  detailTitle: '服务详情',
};
