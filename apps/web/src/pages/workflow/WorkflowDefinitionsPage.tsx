/**
 * 流程定义页面 - 基于 CrudPage 的标准化实现
 *
 * @module pages/workflow
 * @path /workflow/definitions
 */
import React, { useCallback } from 'react';
import { Box, Typography } from '@mui/material';
import { FileCode, History, Layers, Play } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import type { RowAction } from '@/components/templates/list/types';
import { PageContainer } from '@/components/common';
import { useNotificationStore } from '@/store';
import { workflowDefinitionApi } from '@/api/workflow';
import { workflowDefinitionSchema } from '@/schemas/workflow';
import { WORKFLOW_PATHS } from '@/modules/workflow/config';
import i18n from '@/i18n';
import { localizedName } from '@/utils/i18n';
// ============ 类型定义 ============
interface WorkflowDefinition {
  id: string;
  name: string;
  name_en?: string | null;
  code: string;
  category: string;
  version: string;
  status: string;
  description?: string;
  node_count: number;
  instance_count: number;
  created_at: string;
  updated_at: string;
  created_by: string;
}
// ============ API 适配器：真实 unified-core flow API（2026-09-17 接入） ============
type FlowWorkflowRow = {
  id: string;
  name: string;
  name_en?: string | null;
  description?: string | null;
  status?: string;
  version?: number;
  code?: string;
  definition?: { nodes?: Array<unknown> } | null;
  created_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  published_at?: string | null;
};

function toDefinition(w: FlowWorkflowRow): WorkflowDefinition {
  return {
    id: w.id,
    name: w.name,
    name_en: w.name_en ?? null,
    code: String(w.code ?? ''),
    category: 'approval',
    version: `v${String(w.version ?? 1)}`,
    status: String(w.status ?? 'draft'),
    description: w.description ?? '',
    node_count: Array.isArray(w.definition?.nodes) ? w.definition.nodes.length : 0,
    instance_count: 0,
    created_at: w.created_at?.slice(0, 10) ?? '',
    updated_at: w.updated_at?.slice(0, 10) ?? '',
    created_by: w.created_by ?? '',
  };
}

const apiAdapter: CrudApiAdapter<WorkflowDefinition> = {
  list: async (params) => {
    const res = await workflowDefinitionApi.listWorkflows({
      page: params?.page ?? 1,
      page_size: params?.pageSize ?? 20,
      search: params?.search || undefined,
      status: params?.status && params.status !== 'all' ? String(params.status) : undefined,
    });
    const page = res.data;
    const items = (page?.items ?? []) as unknown as FlowWorkflowRow[];
    return { data: items.map(toDefinition), total: page?.total ?? items.length };
  },
  create: async (data) => {
    const res = await workflowDefinitionApi.createWorkflow({
      name: String(data.name ?? ''),
      description: data.description ? String(data.description) : undefined,
      status: String(data.status ?? 'draft'),
    });
    return toDefinition((res.data ?? {}) as unknown as FlowWorkflowRow);
  },
  update: async (id, data) => {
    const res = await workflowDefinitionApi.updateWorkflow(id, {
      name: data.name ? String(data.name) : undefined,
      description: data.description ? String(data.description) : undefined,
      status: data.status ? String(data.status) : undefined,
    });
    return toDefinition((res.data ?? {}) as unknown as FlowWorkflowRow);
  },
  delete: async (id) => {
    await workflowDefinitionApi.deleteWorkflow(id);
  },
};
// ============ 页面组件 ============
export const WorkflowDefinitionsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const handleActivate = useCallback(
    async (row: Record<string, unknown>) => {
      const id = String(row.id);
      try {
        await workflowDefinitionApi.activate(id);
        queryClient.invalidateQueries({
          queryKey: [workflowDefinitionSchema.entity],
          exact: false,
          refetchType: 'active',
        });
        addNotification({
          type: 'success',
          title: i18n.t('workflow.workflow_definitions_page.k14'),
          message: `${i18n.t('pages.workflow_definitions_page.k0')}${localizedName(row.name as string | null | undefined, row.name_en as string | null | undefined)}${i18n.t('pages.workflow_definitions_page.k1')}`,
        });
      } catch (err) {
        addNotification({
          type: 'error',
          title: i18n.t('workflow.workflow_definitions_page.k15'),
          message: err instanceof Error ? err.message : '',
        });
      }
    },
    [queryClient, addNotification]
  );
  const customRowActions: RowAction[] = [
    {
      key: 'activate',
      label: i18n.t('workflow.workflow_definitions_page.k16'),
      icon: <Play size={16} />,
      color: 'success',
      onClick: handleActivate,
      show: (row) => row.status !== 'active',
    },
    {
      key: 'version-history',
      label: i18n.t('pages.workflow_definitions_page.k3'),
      icon: <History size={16} />,
      color: 'info',
      onClick: (row) => navigate(`/workflow/version-history/${String(row.id)}`),
    },
  ];
  return (
    <PageContainer
      headerProps={{
        pageIcon: <FileCode size={20} />,
        backButton: {
          href: WORKFLOW_PATHS.dashboard,
        },
      }}
    >
      <CrudPage
        schema={workflowDefinitionSchema}
        apiAdapter={apiAdapter}
        customRowActions={customRowActions}
        headerContent={(rows, total) => {
          const activeCount = rows.filter((r) => r.status === 'active').length;
          const totalInstances = rows.reduce((sum, r) => sum + (Number(r.instance_count) || 0), 0);
          return (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'repeat(1, 1fr)', md: 'repeat(3, 1fr)' },
                gap: 2,
                mb: 3,
              }}
            >
              <Box sx={{ p: 2, bgcolor: 'primary.100', borderRadius: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Layers size={18} />
                  <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary' }}
                  >
                    {i18n.t('pages.workflow_definitions_page.k0')}
                  </Typography>
                </Box>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700 }}
                >
                  {total}
                </Typography>
              </Box>
              <Box sx={{ p: 2, bgcolor: 'success.100', borderRadius: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <FileCode size={18} />
                  <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary' }}
                  >
                    {i18n.t('pages.workflow_definitions_page.k1')}
                  </Typography>
                </Box>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700 }}
                >
                  {activeCount}
                </Typography>
              </Box>
              <Box sx={{ p: 2, bgcolor: 'info.100', borderRadius: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Play size={18} />
                  <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary' }}
                  >
                    {i18n.t('pages.workflow_definitions_page.k2')}
                  </Typography>
                </Box>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700 }}
                >
                  {totalInstances.toLocaleString()}
                </Typography>
              </Box>
            </Box>
          );
        }}
      />
    </PageContainer>
  );
};
export default WorkflowDefinitionsPage;
