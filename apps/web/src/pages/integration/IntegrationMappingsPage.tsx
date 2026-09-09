/**
 * 数据映射管理页面 - V4.0 标准化改造
 *
 * 使用 CrudPage 组件实现 schema 驱动的数据映射管理，
 * 支持列表展示、创建、编辑、删除、启停、导入导出等操作。
 *
 * @module pages/integration
 * @path /integration/mappings
 */

import React, { useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { GitMerge, Play, ArrowRight, Copy } from 'lucide-react';
import { Box, Typography, Paper, Stack } from '@mui/material';

import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import type { RowAction } from '@/components/templates/list/types';
import { PageContainer } from '@/components/common';
import { useNotificationStore } from '@/store';
import { extractErrorMessage } from '@/utils/errors';
import { INTEGRATION_PATHS } from '@/modules/integration/config';
import {
  integrationMappingSchema,
  MAPPING_TYPE_LABELS,
  MAPPING_STATUS_LABELS,
  type MappingType,
  type MappingStatus,
} from '@/schemas/integration';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { mappingApi } from '@/api/integration/mapping';
import type {
  ErpMapping,
  CreateErpMappingRequest,
  UpdateErpMappingRequest,
} from '@/api/integration/types';

interface Mapping {
  id: string;
  name: string;
  type: MappingType;
  source: string;
  target: string;
  status: MappingStatus;
  fieldCount: number;
  lastSyncTime: string;
  description: string;
}

// ===== ErpMapping ↔ Mapping 双向适配器 =====
// 页面使用通用 Mapping 模型（name/type/source/target/status/fieldCount/lastSyncTime/description），
// 后端使用 ErpMapping 模型（local_code/local_name/external_code/external_name/mapping_type/isactive/condition）。
// 通过适配器在 apiAdapter 层做双向转换，保持页面 UI/schema 不变。

const TYPE_TO_ERP: Record<string, string> = {
  field: 'customer',
  transform: 'supplier',
  filter: 'account',
  validate: 'project',
};

const ERP_TO_TYPE: Record<string, MappingType> = {
  account: 'filter',
  customer: 'field',
  supplier: 'transform',
  project: 'validate',
  department: 'field',
  employee: 'field',
};

function erpMappingToMapping(erp: ErpMapping): Mapping {
  return {
    id: erp.id,
    name: erp.local_name || erp.local_code,
    type: ERP_TO_TYPE[erp.mapping_type] ?? 'field',
    source: erp.local_code,
    target: erp.external_code,
    status: erp.isactive ? 'active' : 'inactive',
    fieldCount: erp.condition ? (erp.condition.match(/,/g)?.length ?? 0) + 1 : 0,
    lastSyncTime: erp.updated_at ? new Date(erp.updated_at).toLocaleString('zh-CN') : '-',
    description: erp.condition ?? '',
  };
}

function mappingToCreateRequest(data: Record<string, unknown>): CreateErpMappingRequest {
  const type = (data.type as string) ?? 'field';
  return {
    mapping_type: (TYPE_TO_ERP[type] ?? 'customer') as CreateErpMappingRequest['mapping_type'],
    local_id: crypto.randomUUID(),
    local_code: (data.source as string) ?? '',
    local_name: (data.name as string) ?? '',
    external_code: (data.target as string) ?? '',
    external_name: (data.name as string) ?? '',
    direction: 'bidirectional',
    priority: 0,
    condition: (data.description as string) ?? undefined,
  };
}

function mappingToUpdateRequest(data: Record<string, unknown>): UpdateErpMappingRequest {
  const req: UpdateErpMappingRequest = {};
  if (data.name !== undefined) req.local_name = data.name as string;
  if (data.source !== undefined) req.local_code = data.source as string;
  if (data.target !== undefined) req.external_code = data.target as string;
  if (data.description !== undefined) req.condition = data.description as string;
  if (data.status !== undefined) req.isactive = (data.status as string) === 'active';
  if (data.type !== undefined) {
    req.priority = 0; // no direct mapping_type update in UpdateErpMappingRequest, keep priority
  }
  return req;
}

const CRUD_QUERY_KEY = ['crud', 'integration_mapping'];

const renderStatsCards = (rows: Record<string, unknown>[]) => {
  const mappings = rows as unknown as Mapping[];
  const stats = [
    {
      id: 'total',
      title: i18n.t('integration.integration_mappings_page.k10'),
      value: mappings.length,
      icon: <GitMerge size={20} />,
      color: 'primary' as const,
    },
    {
      id: 'active',
      title: i18n.t('integration.integration_mappings_page.k11'),
      value: mappings.filter((m) => m.status === 'active').length,
      icon: <Play size={20} />,
      color: 'success' as const,
    },
    {
      id: 'field',
      title: i18n.t('integration.integration_mappings_page.k12'),
      value: mappings.filter((m) => m.type === 'field').length,
      icon: <ArrowRight size={20} />,
      color: 'info' as const,
    },
    {
      id: 'transform',
      title: i18n.t('integration.integration_mappings_page.k13'),
      value: mappings.filter((m) => m.type === 'transform').length,
      icon: <Copy size={20} />,
      color: 'warning' as const,
    },
  ];

  return (
    <Stack
      direction='row'
      spacing={2}
      sx={{ mb: 2, flexWrap: 'wrap' }}
    >
      {stats.map((s) => (
        <Paper
          key={s.id}
          sx={{
            p: 2,
            flex: '1 1 200px',
            minWidth: 180,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            borderRadius: 2,
          }}
        >
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2,
              bgcolor: `${s.color}.light`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: `${s.color}.main`,
            }}
          >
            {s.icon}
          </Box>
          <Box>
            <Typography
              variant='caption'
              color='text.secondary'
            >
              {s.title}
            </Typography>
            <Typography
              variant='h5'
              sx={{ fontWeight: 700 }}
            >
              {s.value}
            </Typography>
          </Box>
        </Paper>
      ))}
    </Stack>
  );
};

export const IntegrationMappingsPage: React.FC = () => {
  const { t } = useTranslation('integration');
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((state) => state.addNotification);

  const handleToggleStatus = useCallback(
    async (mapping: Mapping) => {
      try {
        const nextIsActive = mapping.status !== 'active';
        await mappingApi.updateMapping(mapping.id, { isactive: nextIsActive });
        const next: MappingStatus = nextIsActive ? 'active' : 'inactive';
        queryClient.setQueryData<{ data: Mapping[] } | undefined>(CRUD_QUERY_KEY, (old) =>
          old
            ? {
                ...old,
                data: old.data.map((m) => (m.id === mapping.id ? { ...m, status: next } : m)),
              }
            : old
        );
        addNotification({
          title: t('integration.integration_mappings_page.k14'),
          message: i18n.t('integration.integration_mappings_page.r1', {
            v1: mapping.name,
            v2:
              mapping.status === 'active'
                ? t('integration.integration_mappings_page.k16')
                : t('integration.integration_mappings_page.k15'),
          }),
          type: 'success',
        });
      } catch (err) {
        addNotification({
          title: t('integration.integration_mappings_page.k17'),
          message:
            err instanceof Error ? err.message : t('integration.integration_mappings_page.k18'),
          type: 'error',
        });
      }
    },
    [addNotification, queryClient, t]
  );

  const handleExport = useCallback(async () => {
    try {
      const snapshot = queryClient.getQueryData<{ data: Mapping[] }>(CRUD_QUERY_KEY);
      const exportData = (snapshot?.data ?? []).map((m) => ({
        mapping_name: m.name,
        mapping_type: MAPPING_TYPE_LABELS[m.type],
        source_table: m.source,
        target_table: m.target,
        status: MAPPING_STATUS_LABELS[m.status],
        field_count: m.fieldCount,
        last_sync: m.lastSyncTime,
        description: m.description,
      }));

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mappings_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      addNotification({
        title: t('integration.integration_mappings_page.k19'),
        message: t('integration.integration_mappings_page.k20'),
        type: 'success',
      });
    } catch (err) {
      addNotification({
        title: t('integration.integration_mappings_page.k21'),
        message: extractErrorMessage(err, t('integration.integration_mappings_page.k22')),
        type: 'error',
      });
    }
  }, [addNotification, queryClient, t]);

  const apiAdapter = useMemo<CrudApiAdapter<Mapping>>(
    () => ({
      list: async () => {
        const res = await mappingApi.listMappings();
        const mappings = (res.data ?? []).map(erpMappingToMapping);
        return { data: mappings, total: mappings.length };
      },
      create: async (data) => {
        const req = mappingToCreateRequest(data);
        const res = await mappingApi.createMapping(req);
        const mapping = erpMappingToMapping(res.data);
        addNotification({
          title: t('integration.integration_mappings_page.k23'),
          message: i18n.t('integration.integration_mappings_page.e1', { v1: mapping.name }),
          type: 'success',
        });
        return mapping;
      },
      update: async (id, data) => {
        const req = mappingToUpdateRequest(data);
        const res = await mappingApi.updateMapping(id, req);
        const mapping = erpMappingToMapping(res.data);
        addNotification({
          title: t('integration.integration_mappings_page.k24'),
          message: t('integration.integration_mappings_page.k25'),
          type: 'success',
        });
        return mapping;
      },
      delete: async (id) => {
        await mappingApi.deleteMapping(id);
        addNotification({
          title: t('integration.integration_mappings_page.k26'),
          message: t('integration.integration_mappings_page.k27'),
          type: 'success',
        });
      },
    }),
    [addNotification, t]
  );

  const customRowActions = useMemo<RowAction[]>(
    () => [
      {
        label: t('integration.integration_mappings_page.k28'),
        icon: <Play size={16} />,
        onClick: (row) => {
          void handleToggleStatus(row as unknown as Mapping);
        },
      },
    ],
    [handleToggleStatus, t]
  );

  // 通过 schema.exportConfig 启用导出按钮
  const schemaWithExport = useMemo(
    () => ({
      ...integrationMappingSchema,
      exportConfig: {
        enabled: true,
        onExport: handleExport,
        fileName: `mappings_${new Date().toISOString().split('T')[0]}.json`,
      },
    }),
    [handleExport]
  );

  return (
    <PageContainer
      headerProps={{
        pageIcon: <GitMerge size={20} />,
        backButton: { href: INTEGRATION_PATHS.dashboard },
      }}
    >
      <CrudPage
        schema={schemaWithExport}
        apiAdapter={apiAdapter}
        customRowActions={customRowActions}
        headerContent={renderStatsCards}
        breadcrumbs={[
          { label: t('integration.integration_mappings_page.k30') },
          { label: t('integration.integration_mappings_page.k29') },
        ]}
      />
    </PageContainer>
  );
};

export default IntegrationMappingsPage;
