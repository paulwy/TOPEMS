import React, { useState, useMemo } from 'react';
import { apiLogger } from '@/utils/logger';
import {
  Box,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';
import { Button } from '@mui/material';
import { FileUpload } from '@/components/common';
import { Eye, Plus, Edit, Send, Ban, Upload, GitBranch } from 'lucide-react';
import { ListPageTemplate } from '@/components/templates';
import type { ColumnDef, RowAction, FilterConfig } from '@/components/templates';

interface FlowDefinition {
  id: string;
  name: string;
  type: string;
  version: string;
  status: 'active' | 'inactive' | 'draft';
  creator: string;
  createdAt: string;
}

const mockFlowDefinitions: FlowDefinition[] = [
  {
    id: '1',
    name: '请假审批流程',
    type: 'approval',
    version: 'v1.2',
    status: 'active',
    creator: '张三',
    createdAt: '2024-01-15 10:30',
  },
  {
    id: '2',
    name: '费用报销流程',
    type: 'reimbursement',
    version: 'v2.0',
    status: 'active',
    creator: '李四',
    createdAt: '2024-02-20 14:20',
  },
  {
    id: '3',
    name: '合同审批流程',
    type: 'contract',
    version: 'v1.0',
    status: 'draft',
    creator: '王五',
    createdAt: '2024-03-05 09:15',
  },
  {
    id: '4',
    name: '采购申请流程',
    type: 'purchase',
    version: 'v1.1',
    status: 'active',
    creator: '赵六',
    createdAt: '2024-03-10 16:45',
  },
  {
    id: '5',
    name: '加班申请流程',
    type: 'approval',
    version: 'v1.0',
    status: 'inactive',
    creator: '张三',
    createdAt: '2024-03-12 11:00',
  },
  {
    id: '6',
    name: '设备借用流程',
    type: 'approval',
    version: 'v1.0',
    status: 'active',
    creator: '李四',
    createdAt: '2024-03-15 13:30',
  },
  {
    id: '7',
    name: '差旅申请流程',
    type: 'travel',
    version: 'v2.1',
    status: 'active',
    creator: '王五',
    createdAt: '2024-03-18 08:00',
  },
  {
    id: '8',
    name: '入职审批流程',
    type: 'approval',
    version: 'v1.0',
    status: 'draft',
    creator: '赵六',
    createdAt: '2024-03-20 10:15',
  },
];

const getStatusColor = (status: FlowDefinition['status']): 'success' | 'default' | 'warning' => {
  switch (status) {
    case 'active':
      return 'success';
    case 'inactive':
      return 'default';
    case 'draft':
      return 'warning';
  }
};

const getStatusText = (status: FlowDefinition['status']) => {
  switch (status) {
    case 'active':
      return '已发布';
    case 'inactive':
      return '已禁用';
    case 'draft':
      return '草稿';
  }
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
  const [data, setData] = useState<FlowDefinition[]>(mockFlowDefinitions);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFlow, setSelectedFlow] = useState<FlowDefinition | null>(null);
  const [attachments, setAttachments] = useState<string[]>([]);

  const filteredData = data.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !typeFilter || item.type === typeFilter;
    const matchesStatus = !statusFilter || item.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const handleView = (flow: FlowDefinition) => {
    setSelectedFlow(flow);
    setShowDetailModal(true);
  };

  const handleEdit = (flow: FlowDefinition) => {
    apiLogger.info('编辑流程:', flow.id);
  };

  const handlePublish = (flow: FlowDefinition) => {
    setData((prev) =>
      prev.map((f) => (f.id === flow.id ? { ...f, status: 'active' as const } : f))
    );
  };

  const handleDisable = (flow: FlowDefinition) => {
    setData((prev) =>
      prev.map((f) => (f.id === flow.id ? { ...f, status: 'inactive' as const } : f))
    );
  };

  const columns = useMemo<ColumnDef<FlowDefinition>[]>(
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
        render: (row) => getTypeText(row.type),
      },
      {
        id: 'version',
        label: '版本',
        render: (row) => row.version,
      },
      {
        id: 'status',
        label: '状态',
        render: (row) => (
          <Chip
            size='small'
            label={getStatusText(row.status)}
            color={getStatusColor(row.status)}
          />
        ),
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

  const rowActions = useMemo<RowAction<FlowDefinition>[]>(
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
        onClick: (row: FlowDefinition) => handlePublish(row),
        condition: (row: FlowDefinition) => row.status !== 'active',
      },
      {
        label: '禁用',
        icon: <Ban size={16} />,
        color: 'error',
        onClick: (row: FlowDefinition) => handleDisable(row),
        condition: (row: FlowDefinition) => row.status === 'active',
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
          { value: 'active', label: '已发布' },
          { value: 'draft', label: '草稿' },
          { value: 'inactive', label: '已禁用' },
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
    <>
      <ListPageTemplate<FlowDefinition>
        title='流程定义'
        subtitle='管理所有流程的定义和配置'
        backButton={{
          href: '/dashboard',
        }}
        columns={columns}
        data={filteredData}
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
                <Typography variant='body1'>{getTypeText(selectedFlow.type)}</Typography>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography
                  variant='body2'
                  sx={{ color: 'grey.500' }}
                >
                  版本
                </Typography>
                <Typography variant='body1'>{selectedFlow.version}</Typography>
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
                  label={getStatusText(selectedFlow.status)}
                  color={getStatusColor(selectedFlow.status)}
                />
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography
                  variant='body2'
                  sx={{ color: 'grey.500' }}
                >
                  创建人
                </Typography>
                <Typography variant='body1'>{selectedFlow.creator}</Typography>
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'grey.500' }}
                >
                  创建时间
                </Typography>
                <Typography variant='body1'>{selectedFlow.createdAt}</Typography>
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
    </>
  );
};

export default FlowDefinitionPage;
