import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { apiLogger } from '@/utils/logger';
import { workflowApi } from '@/api/workflow';
import type { Workflow } from '@/api/workflow';
import { useNotification } from '@/hooks/useNotification';
import {
  Box,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
  Button,
} from '@mui/material';
import { FileUpload, PageContainer } from '@/components/common';
import { Eye, Plus, Edit, Send, Ban, Upload, GitBranch } from 'lucide-react';
import { ListPageTemplate } from '@/components/templates';
import type { ColumnDef, RowAction, FilterConfig } from '@/components/templates';

const getStatusColor = (status: boolean): 'success' | 'default' | 'warning' => {
  if (status) return 'success';
  return 'default';
};

const getStatusText = (status: boolean) => {
  return status ? '已发布' : '已禁用';
};

const getTypeText = (type: string) => {
  switch (type) {
    case 'approval':
      return '审批流程';
    case 'reimbursement':
      return '报销流程';
    case 'contract':
      return '合同流程';
    case 'purchase':
      return '采购流程';
    case 'travel':
      return '差旅流程';
    default:
      return type;
  }
};

const FlowDefinitionPage: React.FC = () => {
  const { success, error } = useNotification();

  const [data, setData] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFlow, setSelectedFlow] = useState<Workflow | null>(null);
  const [attachments, setAttachments] = useState<string[]>([]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await workflowApi.listWorkflows();
      if (res.success && res.data) {
        setData(res.data.items || []);
      }
    } catch (err: unknown) {
      apiLogger.error('Error loading workflows:', err);
      error('加载流程定义失败');
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredData = data.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !typeFilter || item.data?.type === typeFilter;
    const matchesStatus = !statusFilter || String(item.is_active) === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const handleView = (flow: Workflow) => {
    setSelectedFlow(flow);
    setShowDetailModal(true);
  };

  const handleEdit = (flow: Workflow) => {
    apiLogger.info('编辑流程:', flow.id);
  };

  const handlePublish = async (flow: Workflow) => {
    try {
      await workflowApi.updateWorkflow(flow.id, { is_active: true });
      setData((prev) => prev.map((f) => (f.id === flow.id ? { ...f, is_active: true } : f)));
      success('流程已发布');
    } catch (err: unknown) {
      apiLogger.error('Error publishing workflow:', err);
      error('发布流程失败');
    }
  };

  const handleDisable = async (flow: Workflow) => {
    try {
      await workflowApi.updateWorkflow(flow.id, { is_active: false });
      setData((prev) => prev.map((f) => (f.id === flow.id ? { ...f, is_active: false } : f)));
      success('流程已禁用');
    } catch (err: unknown) {
      apiLogger.error('Error disabling workflow:', err);
      error('禁用流程失败');
    }
  };

  const columns = useMemo<ColumnDef<Workflow>[]>(
    () => [
      {
        id: 'name',
        label: '流程名称',
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
        label: '流程类型',
        render: (row) => getTypeText(row.data?.type || 'approval'),
      },
      {
        id: 'version',
        label: '版本',
        render: (row) => row.definition?.version || 'v1.0',
      },
      {
        id: 'status',
        label: '状态',
        render: (row) => (
          <Chip
            size='small'
            label={getStatusText(row.is_active)}
            color={getStatusColor(row.is_active)}
          />
        ),
      },
      {
        id: 'creator',
        label: '创建人',
        render: (row) => row.created_by || '-',
      },
      {
        id: 'createdAt',
        label: '创建时间',
        render: (row) => new Date(row.created_at).toLocaleString('zh-CN'),
      },
    ],
    []
  );

  const rowActions = useMemo<RowAction<Workflow>[]>(
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
        label: '发布',
        icon: <Send size={16} />,
        color: 'success',
        onClick: (row: Workflow) => handlePublish(row),
        condition: (row: Workflow) => !row.is_active,
      },
      {
        label: '禁用',
        icon: <Ban size={16} />,
        color: 'error',
        onClick: (row: Workflow) => handleDisable(row),
        condition: (row: Workflow) => row.is_active,
      },
    ],
    []
  );

  const filters = useMemo<FilterConfig[]>(
    () => [
      {
        id: 'type',
        label: '流程类型',
        type: 'select',
        options: [
          { value: '', label: '全部' },
          { value: 'approval', label: '审批流程' },
          { value: 'reimbursement', label: '报销流程' },
          { value: 'contract', label: '合同流程' },
          { value: 'purchase', label: '采购流程' },
          { value: 'travel', label: '差旅流程' },
        ],
        value: typeFilter,
        onChange: (value) => {
          setTypeFilter(value as string);
        },
      },
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { value: '', label: '全部' },
          { value: 'true', label: '已发布' },
          { value: 'false', label: '已禁用' },
        ],
        value: statusFilter,
        onChange: (value) => {
          setStatusFilter(value as string);
        },
      },
    ],
    [typeFilter, statusFilter]
  );

  return (
    <PageContainer
      title='流程定义'
      subtitle='管理所有流程的定义和配置'
    >
      <ListPageTemplate<Workflow>
        title=''
        subtitle=''
        backButton={{
          href: '/dashboard',
        }}
        columns={columns}
        data={filteredData}
        loading={loading}
        searchable
        searchPlaceholder='搜索流程名称...'
        searchValue={searchTerm}
        onSearch={(value) => {
          setSearchTerm(value);
        }}
        filters={filters}
        rowActions={rowActions}
        actions={[
          {
            label: '上传',
            icon: <Upload size={18} />,
            onClick: () => setShowUploadModal(true),
            variant: 'outlined',
          },
          {
            label: '新建流程',
            icon: <Plus size={18} />,
            onClick: () => {},
            variant: 'contained',
          },
        ]}
        onRefresh={loadData}
      />

      <Dialog
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>流程详情</DialogTitle>
        <DialogContent>
          {selectedFlow && (
            <Box sx={{ mt: 2 }}>
              <Box sx={{ mb: 2 }}>
                <Typography
                  variant='body2'
                  sx={{ color: 'grey.500' }}
                >
                  流程名称
                </Typography>
                <Typography variant='body1'>{selectedFlow.name}</Typography>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography
                  variant='body2'
                  sx={{ color: 'grey.500' }}
                >
                  流程类型
                </Typography>
                <Typography variant='body1'>
                  {getTypeText(selectedFlow.data?.type || 'approval')}
                </Typography>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography
                  variant='body2'
                  sx={{ color: 'grey.500' }}
                >
                  版本
                </Typography>
                <Typography variant='body1'>
                  {selectedFlow.definition?.version || 'v1.0'}
                </Typography>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography
                  variant='body2'
                  sx={{ color: 'grey.500' }}
                >
                  状态
                </Typography>
                <Chip
                  size='small'
                  label={getStatusText(selectedFlow.is_active)}
                  color={getStatusColor(selectedFlow.is_active)}
                />
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography
                  variant='body2'
                  sx={{ color: 'grey.500' }}
                >
                  创建人
                </Typography>
                <Typography variant='body1'>{selectedFlow.created_by || '-'}</Typography>
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'grey.500' }}
                >
                  创建时间
                </Typography>
                <Typography variant='body1'>
                  {new Date(selectedFlow.created_at).toLocaleString('zh-CN')}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>上传流程文件</DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2 }}>
            <FileUpload
              value={attachments}
              onChange={setAttachments}
              accept={['bpmn', 'xml', 'json']}
              maxCount={5}
              maxSize={10}
              maxTotalSize={50}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowUploadModal(false)}>关闭</Button>
          <Button
            variant='contained'
            sx={{ bgcolor: 'secondary.main' }}
            onClick={() => {
              apiLogger.info('上传的流程文件:', attachments);
              setShowUploadModal(false);
            }}
          >
            完成上传
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default FlowDefinitionPage;
