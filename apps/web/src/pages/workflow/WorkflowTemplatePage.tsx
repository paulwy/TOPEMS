import React, { useState, useCallback, useMemo } from 'react';
import { apiLogger } from '@/utils/logger';
import { workflowDefinitionApi } from '@/api/workflow';
import type { Workflow } from '@/api/workflow';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNotification } from '@/hooks/useNotification';
import {
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
  Button,
} from '@mui/material';
import { Eye, Edit, Copy, Trash2, Plus, FileText } from 'lucide-react';
import { PageContainer } from '@/components/common';
import { ListPageTemplate } from '@/components/templates';
import type { ColumnDef, RowAction, FilterConfig } from '@/components/templates';

interface FlowTemplate {
  id: string;
  name: string;
  type: string;
  scope: string;
  usageCount: number;
  creator: string;
  createdAt: string;
}

const getTypeText = (type: string) => {
  switch (type) {
    case 'approval':
      return '审批流程';
    case 'reimbursement':
      return '报销流程';
    case 'purchase':
      return '采购流程';
    case 'contract':
      return '合同流程';
    default:
      return type;
  }
};

const FlowTemplatePage: React.FC = () => {
  const { success, error: notifyError } = useNotification();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<FlowTemplate | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  const { data: workflows = [], isLoading: loading } = useQuery({
    queryKey: ['workflow-templates', page, pageSize, searchTerm, typeFilter],
    queryFn: async () => {
      const response = await workflowDefinitionApi.list({
        page,
        pagesize: pageSize,
        ...(searchTerm ? { search: searchTerm } : {}),
        ...(typeFilter ? { type: typeFilter } : {}),
      });
      if (response.success && response.data?.items) {
        return response.data.items;
      }
      return [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => workflowDefinitionApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-templates'] });
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<Workflow>) => workflowDefinitionApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-templates'] });
    },
  });

  const data: FlowTemplate[] = useMemo(() => {
    return workflows.map((w: Workflow) => {
      const wData = (w as any).data || {};
      return {
        id: w.id,
        name: w.name,
        type: String(wData.type || 'approval'),
        scope: String(wData.scope || '全公司'),
        usageCount: Number(wData.usageCount || 0),
        creator: (w as any).created_by || '-',
        createdAt: new Date((w as any).created_at).toISOString().split('T')[0],
      };
    });
  }, [workflows]);

  const filteredData = data.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !typeFilter || item.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const handleView = (template: FlowTemplate) => {
    apiLogger.info('查看模板:', template.id);
  };

  const handleEdit = (template: FlowTemplate) => {
    apiLogger.info('编辑模板:', template.id);
  };

  const handleCopy = async (template: FlowTemplate) => {
    try {
      const response = await workflowDefinitionApi.get(template.id);
      if (response.success && response.data) {
        const workflow = response.data;
        await createMutation.mutateAsync({
          name: `${workflow.name} (副本)`,
          description: (workflow as any).description,
          definition: (workflow as any).definition,
          isactive: false,
        } as Partial<Workflow>);
        success('模板复制成功');
      }
    } catch (err: unknown) {
      apiLogger.error('Error copying template:', err);
      notifyError('复制模板失败');
    }
  };

  const handleDelete = (template: FlowTemplate) => {
    setSelectedTemplate(template);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!selectedTemplate) return;
    try {
      await deleteMutation.mutateAsync(selectedTemplate.id);
      success('模板删除成功');
    } catch (err: unknown) {
      apiLogger.error('Error deleting template:', err);
      notifyError('删除模板失败');
    } finally {
      setShowDeleteDialog(false);
      setSelectedTemplate(null);
    }
  };

  const columns = useMemo<ColumnDef<FlowTemplate>[]>(
    () => [
      {
        id: 'name',
        label: '模板名称',
        render: (row) => (
          <Typography
            variant='body2'
            sx={{ fontWeight: 500 }}
          >
            {row.name}
          </Typography>
        ),
      },
      {
        id: 'type',
        label: '模板类型',
        render: (row) => getTypeText(row.type),
      },
      {
        id: 'scope',
        label: '适用范围',
        render: (row) => row.scope,
      },
      {
        id: 'usageCount',
        label: '使用次数',
        render: (row) => row.usageCount.toString(),
      },
      {
        id: 'creator',
        label: '创建人',
        render: (row) => row.creator,
      },
      {
        id: 'createdAt',
        label: '创建时间',
        render: (row) => row.createdAt,
      },
    ],
    []
  );

  const rowActions = useMemo<RowAction<FlowTemplate>[]>(
    () => [
      {
        label: '查看',
        icon: <Eye size={16} />,
        onClick: handleView,
      },
      {
        label: '编辑',
        icon: <Edit size={16} />,
        onClick: handleEdit,
      },
      {
        label: '复制',
        icon: <Copy size={16} />,
        onClick: handleCopy,
      },
      {
        label: '删除',
        icon: <Trash2 size={16} />,
        onClick: handleDelete,
        color: 'error',
      },
    ],
    [handleView, handleEdit, handleCopy, handleDelete]
  );

  const filters = useMemo<FilterConfig[]>(
    () => [
      {
        id: 'type',
        label: '类型',
        type: 'select',
        options: [
          { value: '', label: '全部类型' },
          { value: 'approval', label: '审批流程' },
          { value: 'reimbursement', label: '报销流程' },
          { value: 'purchase', label: '采购流程' },
          { value: 'contract', label: '合同流程' },
        ],
      },
    ],
    []
  );

  return (
    <PageContainer
      headerProps={{
        pageIcon: <FileText size={20} />,
      }}
    >
      <ListPageTemplate
        title='流程模板'
        subtitle='管理工作流模板定义'
        columns={columns}
        data={filteredData}
        loading={loading}
        getRowId={(row) => row.id}
        rowActions={rowActions}
        searchable
        searchPlaceholder='搜索模板名称...'
        searchValue={searchTerm}
        onSearch={(value) => {
          setSearchTerm(value);
          setPage(1);
        }}
        filters={filters}
        filtersValue={{ type: typeFilter }}
        onFilterChange={(filters) => {
          if (filters.type !== undefined) {
            setTypeFilter(filters.type);
            setPage(1);
          }
        }}
        pagination={{
          page: page - 1,
          pageSize,
          total: filteredData.length,
          onPageChange: (p) => setPage(p + 1),
        }}
        onRefresh={() => {
          queryClient.invalidateQueries({ queryKey: ['workflow-templates'] });
        }}
        actions={[
          {
            label: '新建模板',
            icon: <Plus size={16} />,
            onClick: () => apiLogger.info('新建模板'),
            variant: 'contained',
          },
        ]}
      />

      <Dialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
      >
        <DialogTitle>确认删除</DialogTitle>
        <DialogContent>
          <Typography>确定要删除模板「{selectedTemplate?.name}」吗？此操作不可恢复。</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteDialog(false)}>取消</Button>
          <Button
            onClick={confirmDelete}
            color='error'
            variant='contained'
          >
            删除
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default FlowTemplatePage;
