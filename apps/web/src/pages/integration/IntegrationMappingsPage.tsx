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

const MOCK_MAPPINGS: Mapping[] = [
  {
    id: 'map-001',
    name: i18n.t('integration.integration_mappings_page.k0'),
    type: 'field',
    source: 'IAM用户表',
    target: 'CRM客户表',
    status: 'active',
    fieldCount: 15,
    lastSyncTime: '2024-01-15 14:30:00',
    description: i18n.t('integration.integration_mappings_page.iamcrm_1'),
  },
  {
    id: 'map-002',
    name: i18n.t('integration.integration_mappings_page.k2'),
    type: 'transform',
    source: 'ERP订单表',
    target: 'BI销售报表',
    status: 'active',
    fieldCount: 8,
    lastSyncTime: '2024-01-15 13:20:00',
    description: i18n.t('integration.integration_mappings_page.k3'),
  },
  {
    id: 'map-003',
    name: i18n.t('integration.integration_mappings_page.k4'),
    type: 'filter',
    source: 'WMS库存表',
    target: 'SCM供货表',
    status: 'inactive',
    fieldCount: 12,
    lastSyncTime: '2024-01-14 22:00:00',
    description: i18n.t('integration.integration_mappings_page.k5'),
  },
  {
    id: 'map-004',
    name: i18n.t('integration.integration_mappings_page.k6'),
    type: 'validate',
    source: 'QMS质检表',
    target: 'MES工序表',
    status: 'active',
    fieldCount: 20,
    lastSyncTime: '2024-01-15 10:15:00',
    description: i18n.t('integration.integration_mappings_page.k7'),
  },
  {
    id: 'map-005',
    name: i18n.t('integration.integration_mappings_page.k8'),
    type: 'field',
    source: 'SRM供应商表',
    target: 'ERP供应商表',
    status: 'draft',
    fieldCount: 25,
    lastSyncTime: '-',
    description: i18n.t('integration.integration_mappings_page.k9'),
  },
];

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
        // 切换映射状态（原页面直接修改 queryClient 缓存）
        const next: MappingStatus = mapping.status === 'active' ? 'inactive' : 'active';
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
    [addNotification, queryClient]
  );

  const handleExport = useCallback(async () => {
    try {
      const snapshot = queryClient.getQueryData<{ data: Mapping[] }>(CRUD_QUERY_KEY);
      const exportData = (snapshot?.data ?? []).map((m) => ({
        映射名称: m.name,
        映射类型: MAPPING_TYPE_LABELS[m.type],
        源表: m.source,
        目标表: m.target,
        状态: MAPPING_STATUS_LABELS[m.status],
        字段数: m.fieldCount,
        最后同步: m.lastSyncTime,
        描述: m.description,
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
  }, [addNotification, queryClient]);

  const apiAdapter = useMemo<CrudApiAdapter<Mapping>>(
    () => ({
      list: async () => {
        return { data: MOCK_MAPPINGS, total: MOCK_MAPPINGS.length };
      },
      create: async (data) => {
        const mapping: Mapping = {
          id: `map-${Date.now()}`,
          name: (data.name as string) ?? '',
          type: (data.type as MappingType) ?? 'field',
          source: (data.source as string) ?? '',
          target: (data.target as string) ?? '',
          status: (data.status as MappingStatus) ?? 'draft',
          fieldCount: (data.fieldCount as number) ?? 0,
          lastSyncTime: '-',
          description: (data.description as string) ?? '',
        };
        addNotification({
          title: t('integration.integration_mappings_page.k23'),
          message: i18n.t('integration.integration_mappings_page.e1', { v1: mapping.name }),
          type: 'success',
        });
        return mapping;
      },
      update: async (_id, data) => {
        addNotification({
          title: t('integration.integration_mappings_page.k24'),
          message: t('integration.integration_mappings_page.k25'),
          type: 'success',
        });
        return data as Mapping;
      },
      delete: async () => {
        addNotification({
          title: t('integration.integration_mappings_page.k26'),
          message: t('integration.integration_mappings_page.k27'),
          type: 'success',
        });
      },
    }),
    [addNotification]
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
    [handleToggleStatus]
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
