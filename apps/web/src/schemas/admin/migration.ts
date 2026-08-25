import { designTokens } from '@topems/tokens';
/**
 * 数据迁移管理 Schema — 驱动 MigrationAdminPage 的服务列表
 */

import React from 'react';
import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const migrationSchema: EntitySchema = {
  entity: 'adminMigration',
  title: i18n.t('schema:admin.migration.meta.title'),
  description: i18n.t('schema:admin.migration.meta.description'),

  api: {
    module: 'migration',
    resource: 'services',
  },

  fields: [
    {
      name: 'name',
      label: i18n.t('schema:admin.migration.name.label'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 160,
      renderCell: (row: Record<string, unknown>) => {
        const name = String(row.name || '');
        return React.createElement('span', { style: { fontWeight: 500 } }, name);
      },
      validation: [{ type: 'maxLength', value: 256 }],
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
          {
            style: {
              fontFamily: 'monospace',
              fontSize: designTokens.typography.fontSize.scale['0.875rem'],
            },
          },
          String(row.schema || '')
        );
      },
    },
    {
      name: 'port',
      label: i18n.t('schema:admin.migration.port.label'),
      type: 'number',
      listWidth: 80,
    },
    {
      name: 'tables',
      label: i18n.t('schema:admin.migration.tables.label'),
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
      label: i18n.t('schema:admin.migration.description.label'),
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
  detailTitle: i18n.t('schema:admin.migration.meta.detailTitle'),
};
