import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { apiLogger } from '@/utils/logger';
import { flowApi } from '@/api/flow';
import type { Workflow } from '@/api/flow';
import { useNotification } from '@/hooks/useNotification';
import { Box, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';
import { Button } from '@mui/material';
import { Eye, Edit, Copy, Trash2, Plus, FileText } from 'lucide-react';
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
  const { success, error } = useNotification();

  const [data, setData] = useState<FlowTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<FlowTemplate | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await flowApi.listWorkflows();
      if (res.success && res.data) {
        const workflows = res.data.items || [];
        const templates: FlowTemplate[] = workflows.map((w: Workflow) => ({
          id: w.id,
          name: w.name,
          type: w.data?.type || 'approval',
          scope: w.data?.scope || '全公司',
          usageCount: w.data?.usageCount || 0,
          creator: w.created_by || '-',
          createdAt: new Date(w.created_at).toISOString().split('T')[0],
        }));
        setData(templates);
      }
    } catch (err: unknown) {
      apiLogger.error('Error loading templates:', err);
      error('加载流程模板失败');
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
      const workflowRes = await flowApi.getWorkflow(template.id);
      if (workflowRes.success && workflowRes.data) {
        const workflow = workflowRes.data;
        await flowApi.createWorkflow({
          name: `${workflow.name} (副本)`,
          description: workflow.description,
          definition: workflow.definition,
          is_active: false,
        });
        success('模板复制成功');
        loadData();
      }
    } catch (err: unknown) {
      apiLogger.error('Error copying template:', err);
      error('复制模板失败');
    }
  };

  const handleDelete = (template: FlowTemplate) => {
    setSelectedTemplate(template);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!selectedTemplate) return;
    try {
      await flowApi.deleteWorkflow(selectedTemplate.id);
      setData((prev) => prev.filter((t) => t.id !== selectedTemplate.id));
      success('模板删除成功');
    } catch (err: unknown) {
      apiLogger.error('Error deleting template:', err);
      error('删除模板失败');
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
        render: (row) => row.usageCount,
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
        onClick: (row) => handleView(row),
      },
      {
        label: '编辑',
        icon: <Edit size={16} />,
        onClick: (row) => handleEdit(row),
      },
      {
        label: '复制',
        icon: <Copy size={16} />,
        onClick: (row) => handleCopy(row),
      },
      {
        label: '删除',
        icon: <Trash2 size={16} />,
        color: 'error',
        onClick: (row) => handleDelete(row),
      },
    ],
    []
  );

  const filters = useMemo<FilterConfig[]>(
    () => [
      {
        id: 'type',
        label: '模板类型',
        type: 'select',
        options: [
          { value: '', label: '全部' },
          { value: 'approval', label: '审批流程' },
          { value: 'reimbursement', label: '报销流程' },
          { value: 'purchase', label: '采购流程' },
          { value: 'contract', label: '合同流程' },
        ],
        value: typeFilter,
        onChange: (value) => {
          setTypeFilter(value as string);
        },
      },
    ],
    [typeFilter]
  );

  return (
    <>
      <ListPageTemplate<FlowTemplate>
        title='流程模板'
        subtitle='管理和使用流程模板'
        backButton={{
          href: '/dashboard',
        }}
        columns={columns}
        data={filteredData}
        loading={loading}
        searchable
        searchPlaceholder='搜索模板名称...'
        searchValue={searchTerm}
        onSearch={(value) => {
          setSearchTerm(value);
        }}
        filters={filters}
        rowActions={rowActions}
        actions={[
          {
            label: '新建模板',
            icon: <Plus size={18} />,
            onClick: () => {},
            variant: 'contained',
          },
        ]}
        onRefresh={loadData}
      />

      <Dialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
      >
        <DialogTitle>删除模板</DialogTitle>
        <DialogContent>
          <Typography>
            确定要删除模板 <strong>{selectedTemplate?.name}</strong> 吗？
          </Typography>
          <Typography
            variant='body2'
            sx={{ color: 'grey.500', mt: 1 }}
          >
            删除后无法恢复
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            color='inherit'
            onClick={() => setShowDeleteDialog(false)}
          >
            取消
          </Button>
          <Button
            variant='contained'
            color='error'
            onClick={confirmDelete}
          >
            确认删除
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default FlowTemplatePage;