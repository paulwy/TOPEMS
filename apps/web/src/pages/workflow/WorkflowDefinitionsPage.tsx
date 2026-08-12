/**
 * 流程定义页面 - 基于 CrudPage 的标准化实现
 *
 * @module pages/workflow
 * @path /workflow/definitions
 */

import React, { useCallback } from 'react';
import { Box, Typography } from '@mui/material';
import { FileCode, Layers, Play } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import type { RowAction } from '@/components/templates/list/types';
import { PageContainer } from '@/components/common';
import { useNotificationStore } from '@/store';
import { workflowDefinitionApi } from '@/api/workflow';
import { workflowDefinitionSchema } from '@/schemas/workflow';
import { WORKFLOW_PATHS } from '@/modules/workflow/config';

// ============ 类型定义 ============

interface WorkflowDefinition {
  id: string;
  name: string;
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

// ============ Mock 数据（保留原页面数据源） ============

const mockDefinitions: WorkflowDefinition[] = [
  {
    id: '1',
    name: '采购订单审批',
    code: 'purchase-order-approval',
    category: 'approval',
    version: 'v2.3',
    status: 'active',
    description: '采购订单多级审批流程',
    node_count: 8,
    instance_count: 245,
    created_at: '2024-01-01',
    updated_at: '2024-01-15',
    created_by: '张三',
  },
  {
    id: '2',
    name: '请假审批',
    code: 'leave-approval',
    category: 'approval',
    version: 'v1.5',
    status: 'active',
    description: '员工请假申请审批流程',
    node_count: 5,
    instance_count: 1280,
    created_at: '2024-01-02',
    updated_at: '2024-01-10',
    created_by: '李四',
  },
  {
    id: '3',
    name: '费用报销',
    code: 'expense-reimbursement',
    category: 'approval',
    version: 'v3.0',
    status: 'active',
    description: '差旅及日常费用报销',
    node_count: 6,
    instance_count: 890,
    created_at: '2024-01-03',
    updated_at: '2024-01-12',
    created_by: '王五',
  },
  {
    id: '4',
    name: '合同审批',
    code: 'contract-approval',
    category: 'approval',
    version: 'v1.2',
    status: 'draft',
    description: '供应商合同审批流程',
    node_count: 10,
    instance_count: 0,
    created_at: '2024-01-14',
    updated_at: '2024-01-14',
    created_by: '赵六',
  },
];

// ============ API 适配器：基于 mock 数据实现标准 CRUD 接口 ============

const apiAdapter: CrudApiAdapter<WorkflowDefinition> = {
  list: async (params) => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    let items = [...mockDefinitions];

    if (params?.search) {
      const q = params.search.toLowerCase();
      items = items.filter(
        (d) => d.name.toLowerCase().includes(q) || d.code.toLowerCase().includes(q)
      );
    }
    if (typeof params?.category === 'string' && params.category !== 'all') {
      items = items.filter((d) => d.category === params.category);
    }
    if (typeof params?.status === 'string' && params.status !== 'all') {
      items = items.filter((d) => d.status === params.status);
    }

    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 10;
    const start = (page - 1) * pageSize;
    const paged = items.slice(start, start + pageSize);

    return { data: paged, total: items.length };
  },
  create: async (data) => {
    const newDef: WorkflowDefinition = {
      id: String(Date.now()),
      name: String(data.name || ''),
      code: String(data.code || ''),
      category: String(data.category || 'approval'),
      version: String(data.version || 'v1.0'),
      status: String(data.status || 'draft'),
      description: data.description as string | undefined,
      node_count: Number(data.node_count || 0),
      instance_count: Number(data.instance_count || 0),
      created_at: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString().split('T')[0],
      created_by: '当前用户',
    };
    mockDefinitions.push(newDef);
    return newDef;
  },
  update: async (id, data) => {
    const idx = mockDefinitions.findIndex((d) => d.id === id);
    if (idx === -1) throw new Error('流程不存在');
    mockDefinitions[idx] = {
      ...mockDefinitions[idx],
      ...data,
      id: mockDefinitions[idx].id,
      updated_at: new Date().toISOString().split('T')[0],
    } as WorkflowDefinition;
    return mockDefinitions[idx];
  },
  delete: async (id) => {
    const idx = mockDefinitions.findIndex((d) => d.id === id);
    if (idx !== -1) mockDefinitions.splice(idx, 1);
  },
};

// ============ 页面组件 ============

export const WorkflowDefinitionsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((state) => state.addNotification);

  const handleActivate = useCallback(
    async (row: Record<string, unknown>) => {
      const id = String(row.id);
      try {
        await workflowDefinitionApi.activate(id);
        queryClient.invalidateQueries({ queryKey: [workflowDefinitionSchema.entity] ,
  exact: false,
  refetchType: 'active',
});
        addNotification({
          type: 'success',
          title: '启动成功',
          message: `流程「${row.name}」已启动`,
        });
      } catch (err) {
        addNotification({
          type: 'error',
          title: '启动失败',
          message: err instanceof Error ? err.message : '',
        });
      }
    },
    [queryClient, addNotification]
  );

  const customRowActions: RowAction[] = [
    {
      key: 'activate',
      label: '启动流程',
      icon: <Play size={16} />,
      color: 'success',
      onClick: handleActivate,
      show: (row) => row.status !== 'active',
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
                    流程总数
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
                    已发布
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
                    总实例数
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
