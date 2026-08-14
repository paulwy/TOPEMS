import React, { useCallback } from 'react';
import { Typography } from '@mui/material';
import { Copy, FileText } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import type { ColumnDef, RowAction } from '@/components/templates/list/types';
import { PageContainer } from '@/components/common';
import { useNotificationStore } from '@/store/notificationStore';
import { workflowDefinitionApi } from '@/api/workflow';
import type { Workflow } from '@/api/workflow';
import { workflowTemplateSchema, renderTemplateTypeBadge } from '@/schemas/workflow';
import i18n from '@/i18n';
// ============ 列定义（覆盖 Schema 自动生成的列，加入审计字段） ============
const customColumns: ColumnDef[] = [
  {
    id: 'name',
    label: i18n.t('workflow.workflow_template_page.k0'),
    width: 240,
    render: (row) =>
      React.createElement(
        Typography,
        { variant: 'body2', sx: { fontWeight: 500 } },
        String(row.name || '')
      ),
  },
  {
    id: 'type',
    label: i18n.t('workflow.workflow_template_page.k1'),
    width: 140,
    render: (row) => renderTemplateTypeBadge(String(row.type || 'approval')),
  },
  {
    id: 'scope',
    label: i18n.t('workflow.workflow_template_page.k2'),
    width: 140,
    render: (row) => String(row.scope || ''),
  },
  {
    id: 'usageCount',
    label: i18n.t('workflow.workflow_template_page.k3'),
    width: 120,
    render: (row) => String(row.usageCount ?? 0),
  },
  {
    id: 'creator',
    label: i18n.t('workflow.workflow_template_page.k4'),
    width: 140,
    render: (row) => String(row.creator || '-'),
  },
  {
    id: 'createdAt',
    label: i18n.t('workflow.workflow_template_page.k5'),
    width: 140,
    render: (row) => String(row.createdAt || '-'),
  },
];
// ============ API 适配器：在 Workflow API 与扁平 Schema 记录间转换 ============
interface FlowTemplateRecord {
  id: string;
  name: string;
  type: string;
  scope: string;
  usageCount: number;
  creator: string;
  createdAt: string;
}
function toRecord(w: Workflow): FlowTemplateRecord {
  return {
    id: w.id,
    name: w.name,
    type: String(w.data?.type || 'approval'),
    scope: String(w.data?.scope || i18n.t('workflow.workflow_template_page.k6')),
    usageCount: Number(w.data?.usageCount || 0),
    creator: w.created_by || '-',
    createdAt: w.created_at ? new Date(w.created_at).toISOString().split('T')[0] : '-',
  };
}
const apiAdapter: CrudApiAdapter<FlowTemplateRecord> = {
  list: async (params) => {
    const response = await workflowDefinitionApi.list({
      page: params?.page,
      pagesize: params?.pageSize,
      ...(params?.search ? { search: params.search } : {}),
    });
    if (response.success && response.data?.items) {
      const items = response.data.items.map(toRecord);
      // 客户端按类型筛选（API 不支持 data.type 嵌套字段过滤）
      const filtered = params?.type ? items.filter((i) => i.type === params.type) : items;
      return { data: filtered, total: filtered.length };
    }
    return { data: [], total: 0 };
  },
  create: async (data) => {
    const response = await workflowDefinitionApi.create({
      name: data.name as string,
      isactive: false,
      data: {
        type: data.type ?? 'approval',
        scope: data.scope ?? i18n.t('workflow.workflow_template_page.k7'),
        usageCount: 0,
      },
    } as Partial<Workflow>);
    if (response.success === false) {
      throw new Error(response.message || i18n.t('workflow.workflow_template_page.k8'));
    }
    return (response.data ?? {}) as unknown as FlowTemplateRecord;
  },
  update: async (id, data) => {
    const response = await workflowDefinitionApi.update(id, {
      name: data.name as string | undefined,
      data: {
        type: data.type ?? 'approval',
        scope: data.scope ?? i18n.t('workflow.workflow_template_page.k9'),
        usageCount: data.usageCount ?? 0,
      },
    } as Partial<Workflow>);
    if (response.success === false) {
      throw new Error(response.message || i18n.t('workflow.workflow_template_page.k10'));
    }
    return (response.data ?? {}) as unknown as FlowTemplateRecord;
  },
  delete: async (id) => {
    const response = await workflowDefinitionApi.delete(id);
    if (response.success === false) {
      throw new Error(response.message || i18n.t('workflow.workflow_template_page.k11'));
    }
  },
};
// ============ 页面组件 ============
const WorkflowTemplatePage: React.FC = () => {
  const queryClient = useQueryClient();
  const { addNotification } = useNotificationStore();
  const handleCopy = useCallback(
    async (row: Record<string, unknown>) => {
      const id = String(row.id);
      try {
        const response = await workflowDefinitionApi.get(id);
        if (response.success && response.data) {
          const workflow = response.data;
          await workflowDefinitionApi.create({
            name: `${workflow.name}${i18n.t('pages.workflow_template_page.k0')}`,
            description: workflow.description,
            definition: workflow.definition,
            isactive: false,
            data: workflow.data,
          } as Partial<Workflow>);
          queryClient.invalidateQueries({ queryKey: [workflowTemplateSchema.entity] ,
  exact: false,
  refetchType: 'active',
});
          addNotification({
            type: 'success',
            title: i18n.t('workflow.workflow_template_page.k12'),
            message: `${i18n.t('pages.workflow_template_page.k1')}${workflow.name}」`,
          });
        } else if (response.success === false) {
          throw new Error(response.message || i18n.t('workflow.workflow_template_page.k13'));
        }
      } catch (err) {
        addNotification({
          type: 'error',
          title: i18n.t('workflow.workflow_template_page.k14'),
          message: err instanceof Error ? err.message : '',
        });
      }
    },
    [queryClient, addNotification]
  );
  const customRowActions: RowAction[] = [
    {
      key: 'copy',
      label: i18n.t('workflow.workflow_template_page.k15'),
      icon: <Copy size={16} />,
      onClick: handleCopy,
    },
  ];
  return (
    <PageContainer headerProps={{ pageIcon: <FileText size={20} /> }}>
      <CrudPage
        schema={workflowTemplateSchema}
        apiAdapter={apiAdapter}
        customColumns={customColumns}
        customRowActions={customRowActions}
        breadcrumbs={[{ label: i18n.t('workflow.workflow_template_page.k18'), href: '/' }, { label: i18n.t('workflow.workflow_template_page.k17') }, { label: i18n.t('workflow.workflow_template_page.k16') }]}
      />
    </PageContainer>
  );
};
export default WorkflowTemplatePage;