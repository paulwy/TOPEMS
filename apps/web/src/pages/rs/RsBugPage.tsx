import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiLogger } from '@/utils/logger';
import {
  Box,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  Typography,
  Paper,
  Button,
} from '@mui/material';
import { Plus, Eye, Edit, Bug as BugIcon, User, CheckCircle } from 'lucide-react';
import { ListPageTemplate } from '@/components/templates';

import type { RowAction, FilterConfig, ColumnDef } from '@/components/templates';
import { PageContainer } from '@/components/common';
import { rsApi } from '@/api/rs';
import { useNotificationStore } from '@/store';
import type { Bug, CreateBugRequest, UpdateBugRequest } from '@/api/rs';

const RsBugPage: React.FC = () => {
  const { addNotification } = useNotificationStore();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('');
  const [newBugDialogOpen, setNewBugDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedBug, setSelectedBug] = useState<Bug | null>(null);
  const [newBugForm, setNewBugForm] = useState({
    bug_title: '',
    severity: 'medium',
    priority: 'medium',
    description: '',
  });

  const bugListQuery = useQuery({
    queryKey: ['rs-bugs', page, rowsPerPage, searchTerm, severityFilter, priorityFilter, statusFilter, assigneeFilter],
    queryFn: async () => {
      const params: Record<string, unknown> = {
        page: page + 1,
        pagesize: rowsPerPage,
      };
      if (searchTerm) params.search = searchTerm;
      if (severityFilter) params.severity = severityFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (statusFilter) params.status = statusFilter;
      if (assigneeFilter) params.assignee = assigneeFilter;

      const response = await rsApi.listBugs(params);
      if (!response.success || !response.data) {
        throw new Error(response.message || '加载缺陷列表失败');
      }
      return {
        bugs: response.data.bugs || [],
        total: response.data.total || 0,
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  const createBugMutation = useMutation({
    mutationFn: async (data: CreateBugRequest) => {
      const response = await rsApi.createBug(data);
      if (!response.success) {
        throw new Error(response.message || '创建缺陷失败');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rs-bugs'] });
      addNotification({
        type: 'success',
        title: '创建成功',
        message: '新缺陷已创建',
      });
    },
    onError: (error: any) => {
      apiLogger.error('创建缺陷失败:', error);
      addNotification({
        type: 'error',
        title: '创建失败',
        message: error.message || '无法创建缺陷',
      });
    },
  });

  const updateBugMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateBugRequest }) => {
      const response = await rsApi.updateBug(id, data);
      if (!response.success) {
        throw new Error(response.message || '更新缺陷失败');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rs-bugs'] });
    },
    onError: (error: any) => {
      apiLogger.error('更新缺陷失败:', error);
      addNotification({
        type: 'error',
        title: '操作失败',
        message: error.message || '更新缺陷失败',
      });
    },
  });

  const bugs = bugListQuery.data?.bugs || [];
  const total = bugListQuery.data?.total || 0;
  const loading = bugListQuery.isLoading || createBugMutation.isPending || updateBugMutation.isPending;

  const uniqueAssignees = useMemo(() => [...new Set(bugs.map((b) => b.assignee))], [bugs]);

  const getSeverityLabel = (severity: string): string => {
    switch (severity) {
      case 'critical':
        return '严重';
      case 'major':
        return '主要';
      case 'minor':
        return '次要';
      default:
        return severity;
    }
  };

  const getSeverityColor = (severity: string): 'error' | 'warning' | 'default' => {
    switch (severity) {
      case 'critical':
        return 'error';
      case 'major':
        return 'warning';
      case 'minor':
        return 'default';
      default:
        return 'default';
    }
  };

  const getPriorityLabel = (priority: string): string => {
    switch (priority) {
      case 'high':
        return '高';
      case 'medium':
        return '中';
      case 'low':
        return '低';
      default:
        return priority;
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'open':
        return '待处理';
      case 'in_progress':
        return '处理中';
      case 'resolved':
        return '已解决';
      case 'closed':
        return '已关闭';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string): 'default' | 'info' | 'success' | 'warning' | 'error' => {
    switch (status) {
      case 'open':
        return 'info';
      case 'in_progress':
        return 'warning';
      case 'resolved':
        return 'success';
      case 'closed':
        return 'default';
      default:
        return 'default';
    }
  };

  const handleViewDetail = (bug: Bug) => {
    setSelectedBug(bug);
    setDetailDialogOpen(true);
  };

  const handleEdit = (bug: Bug) => {
    apiLogger.info('编辑缺陷:', bug.id);
  };

  const handleCloseBug = async (bug: Bug) => {
    try {
      const updateData: UpdateBugRequest = { status: 'closed' };
      await updateBugMutation.mutateAsync({ id: bug.id, data: updateData });
      addNotification({
        type: 'success',
        title: '操作成功',
        message: '缺陷已关闭',
      });
    } catch {
    }
  };

  const handleCreateBug = async () => {
    try {
      const createData: CreateBugRequest = {
        bug_title: newBugForm.bug_title,
        severity: newBugForm.severity,
        priority: newBugForm.priority,
        description: newBugForm.description,
      };
      await createBugMutation.mutateAsync(createData);
      setNewBugDialogOpen(false);
      setNewBugForm({
        bug_title: '',
        severity: 'medium',
        priority: 'medium',
        description: '',
      });
    } catch {
    }
  };

  const columns = useMemo<ColumnDef<Bug>[]>(
    () => [
      {
        id: 'bug_no',
        label: '缺陷编号',
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <BugIcon
              size={16}
              color='primary.main'
            />
            <Typography
              variant='body2'
              sx={{ fontWeight: 500 }}
            >
              {row.bug_no}
            </Typography>
          </Box>
        ),
      },
      {
        id: 'bug_title',
        label: '缺陷标题',
        render: (row) => (
          <Tooltip title={row.bug_title}>
            <Typography
              variant='body2'
              sx={{
                maxWidth: 250,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {row.bug_title}
            </Typography>
          </Tooltip>
        ),
      },
      {
        id: 'severity',
        label: '严重程度',
        render: (row) => (
          <Chip
            label={getSeverityLabel(row.severity)}
            size='small'
            color={getSeverityColor(row.severity)}
          />
        ),
      },
      {
        id: 'priority',
        label: '优先级',
        render: (row) => (
          <Chip
            label={getPriorityLabel(row.priority)}
            size='small'
            variant='outlined'
          />
        ),
      },
      {
        id: 'status',
        label: '状态',
        render: (row) => (
          <Chip
            label={getStatusLabel(row.status)}
            size='small'
            color={getStatusColor(row.status)}
          />
        ),
      },
      {
        id: 'assignee',
        label: '指派给',
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <User size={14} />
            {row.assignee}
          </Box>
        ),
      },
      {
        id: 'create_time',
        label: '创建时间',
        render: (row) => row.create_time,
      },
    ],
    []
  );

  const rowActions = useMemo<RowAction<Bug>[]>(
    () => [
      {
        label: '详情',
        icon: <Eye size={16} />,
        onClick: (row) => handleViewDetail(row),
      },
      {
        label: '编辑',
        icon: <Edit size={16} />,
        onClick: (row) => handleEdit(row),
      },
      {
        label: '关闭',
        icon: <CheckCircle size={16} />,
        color: 'success',
        onClick: (row) => handleCloseBug(row),
        condition: (row: Bug) => row.status !== 'closed',
      },
    ],
    []
  );

  const filters = useMemo<FilterConfig[]>(
    () => [
      {
        id: 'severity',
        label: '严重程度',
        type: 'select',
        options: [
          { value: '', label: '全部' },
          { value: 'critical', label: '严重' },
          { value: 'major', label: '主要' },
          { value: 'minor', label: '次要' },
        ],
        value: severityFilter,
        onChange: (value) => setSeverityFilter(value as string),
      },
      {
        id: 'priority',
        label: '优先级',
        type: 'select',
        options: [
          { value: '', label: '全部' },
          { value: 'high', label: '高' },
          { value: 'medium', label: '中' },
          { value: 'low', label: '低' },
        ],
        value: priorityFilter,
        onChange: (value) => setPriorityFilter(value as string),
      },
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { value: '', label: '全部' },
          { value: 'open', label: '待处理' },
          { value: 'in_progress', label: '处理中' },
          { value: 'resolved', label: '已解决' },
          { value: 'closed', label: '已关闭' },
        ],
        value: statusFilter,
        onChange: (value) => setStatusFilter(value as string),
      },
      {
        id: 'assignee',
        label: '指派人',
        type: 'select',
        options: [
          { value: '', label: '全部' },
          ...uniqueAssignees.map((assignee) => ({
            value: assignee,
            label: assignee,
          })),
        ],
        value: assigneeFilter,
        onChange: (value) => setAssigneeFilter(value as string),
      },
    ],
    [severityFilter, priorityFilter, statusFilter, assigneeFilter, uniqueAssignees]
  );

  return (
    <PageContainer
      title='缺陷管理'
      subtitle='管理项目缺陷和 Bug 追踪'
    >
      <ListPageTemplate<Bug>
        title=''
        subtitle=''
        backButton={{
          href: '/dashboard',
        }}
        columns={columns}
        data={bugs}
        loading={loading}
        searchable
        searchPlaceholder='搜索缺陷编号、标题...'
        searchValue={searchTerm}
        onSearch={(value) => setSearchTerm(value)}
        filters={filters}
        rowActions={rowActions}
        pagination={{
          page,
          pageSize: rowsPerPage,
          total,
          onPageChange: setPage,
          onPageSizeChange: setRowsPerPage,
        }}
        actions={[
          {
            label: '新建缺陷',
            icon: <Plus size={18} />,
            onClick: () => setNewBugDialogOpen(true),
            variant: 'contained',
          },
        ]}
      />

      <Dialog
        open={newBugDialogOpen}
        onClose={() => setNewBugDialogOpen(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>新建缺陷</DialogTitle>
        <DialogContent>
          <Stack
            spacing={2}
            sx={{ mt: 2 }}
          >
            <TextField
              label='缺陷标题'
              fullWidth
              value={newBugForm.bug_title}
              onChange={(e) => setNewBugForm({ ...newBugForm, bug_title: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel>严重程度</InputLabel>
              <Select
                value={newBugForm.severity}
                label='严重程度'
                onChange={(e) => setNewBugForm({ ...newBugForm, severity: e.target.value })}
              >
                <MenuItem value='critical'>严重</MenuItem>
                <MenuItem value='major'>主要</MenuItem>
                <MenuItem value='minor'>次要</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>优先级</InputLabel>
              <Select
                value={newBugForm.priority}
                label='优先级'
                onChange={(e) => setNewBugForm({ ...newBugForm, priority: e.target.value })}
              >
                <MenuItem value='high'>高</MenuItem>
                <MenuItem value='medium'>中</MenuItem>
                <MenuItem value='low'>低</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label='缺陷描述'
              fullWidth
              multiline
              rows={4}
              value={newBugForm.description}
              onChange={(e) => setNewBugForm({ ...newBugForm, description: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewBugDialogOpen(false)}>取消</Button>
          <Button
            variant='contained'
            sx={{ bgcolor: 'primary.main' }}
            onClick={handleCreateBug}
          >
            创建
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>缺陷详情</DialogTitle>
        <DialogContent>
          {selectedBug && (
            <Box sx={{ py: 2 }}>
              <Typography
                variant='h6'
                sx={{ fontWeight: 'bold' }}
              >
                {selectedBug.bug_no} - {selectedBug.bug_title}
              </Typography>
              <Stack
                direction='row'
                spacing={2}
                sx={{ mt: 2 }}
              >
                <Chip
                  label={getSeverityLabel(selectedBug.severity)}
                  size='small'
                  color={getSeverityColor(selectedBug.severity)}
                />
                <Chip
                  label={getPriorityLabel(selectedBug.priority)}
                  size='small'
                  variant='outlined'
                />
                <Chip
                  label={getStatusLabel(selectedBug.status)}
                  size='small'
                  color={getStatusColor(selectedBug.status)}
                />
              </Stack>
              <Stack
                direction='row'
                spacing={4}
                sx={{ mt: 3 }}
              >
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    指派人
                  </Typography>
                  <Typography
                    variant='body1'
                    sx={{ fontWeight: 'bold' }}
                  >
                    {selectedBug.assignee}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    创建时间
                  </Typography>
                  <Typography
                    variant='body1'
                    sx={{ fontWeight: 'bold' }}
                  >
                    {selectedBug.create_time}
                  </Typography>
                </Box>
              </Stack>
              <Box sx={{ mt: 3 }}>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  缺陷描述
                </Typography>
                <Paper sx={{ p: 2, mt: 1, bgcolor: 'grey.100' }}>
                  <Typography variant='body2'>{selectedBug.description || '无描述'}</Typography>
                </Paper>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default RsBugPage;
