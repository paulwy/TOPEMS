import React, { useState, useMemo } from 'react';
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
} from '@mui/material';
import { Button } from '@mui/material';
import { Plus, Eye, Edit, Bug, User, CheckCircle } from 'lucide-react';
import { ListPageTemplate, type ColumnDef } from '@/components/templates';
import type { RowAction, FilterConfig } from '@/components/templates';

interface Bug {
  id: string;
  bug_no: string;
  bug_title: string;
  severity: string;
  priority: string;
  status: string;
  assignee: string;
  create_time: string;
  description: string;
}

const mockBugs: Bug[] = [
  {
    id: '1',
    bug_no: 'BUG-001',
    bug_title: '用户登录后页面空白',
    severity: 'critical',
    priority: 'high',
    status: 'open',
    assignee: '张三',
    create_time: '2024-06-15 10:30:00',
    description: '用户反馈登录成功后页面显示空白，需要刷新才能正常显示',
  },
  {
    id: '2',
    bug_no: 'BUG-002',
    bug_title: '数据导出功能报错',
    severity: 'major',
    priority: 'high',
    status: 'in_progress',
    assignee: '李四',
    create_time: '2024-06-14 14:20:00',
    description: 'Excel导出时遇到大数据量会抛出内存溢出错误',
  },
  {
    id: '3',
    bug_no: 'BUG-003',
    bug_title: '表单验证提示不准确',
    severity: 'minor',
    priority: 'medium',
    status: 'resolved',
    assignee: '王五',
    create_time: '2024-06-13 09:00:00',
    description: '邮箱格式验证未覆盖所有有效邮箱格式',
  },
  {
    id: '4',
    bug_no: 'BUG-004',
    bug_title: '移动端显示错位',
    severity: 'major',
    priority: 'high',
    status: 'open',
    assignee: '赵六',
    create_time: '2024-06-12 16:45:00',
    description: '在iOS Safari上某些页面元素位置偏移',
  },
  {
    id: '5',
    bug_no: 'BUG-005',
    bug_title: '权限验证绕过',
    severity: 'critical',
    priority: 'high',
    status: 'in_progress',
    assignee: '孙七',
    create_time: '2024-06-11 11:20:00',
    description: '普通用户可以访问管理员专属页面',
  },
];

const RsBugPage: React.FC = () => {
  const [bugs, setBugs] = useState<Bug[]>(mockBugs);
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

  const filteredBugs = bugs.filter((bug) => {
    const matchesSearch =
      bug.bug_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bug.bug_title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeverity = !severityFilter || bug.severity === severityFilter;
    const matchesPriority = !priorityFilter || bug.priority === priorityFilter;
    const matchesStatus = !statusFilter || bug.status === statusFilter;
    const matchesAssignee = !assigneeFilter || bug.assignee === assigneeFilter;
    return matchesSearch && matchesSeverity && matchesPriority && matchesStatus && matchesAssignee;
  });

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

  const handleCloseBug = (bug: Bug) => {
    setBugs(bugs.map((b) => (b.id === bug.id ? { ...b, status: 'closed' } : b)));
  };

  const handleCreateBug = () => {
    const newBug: Bug = {
      id: String(Date.now()),
      bug_no: `BUG-${String(bugs.length + 1).padStart(3, '0')}`,
      bug_title: newBugForm.bug_title,
      severity: newBugForm.severity,
      priority: newBugForm.priority,
      status: 'open',
      assignee: '未分配',
      create_time: new Date().toLocaleString(),
      description: newBugForm.description,
    };
    setBugs([newBug, ...bugs]);
    setNewBugDialogOpen(false);
    setNewBugForm({
      bug_title: '',
      severity: 'medium',
      priority: 'medium',
      description: '',
    });
  };

  const columns = useMemo<ColumnDef<Bug>[]>(
    () => [
      {
        id: 'bug_no',
        label: '缺陷编号',
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Bug
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    <>
      <ListPageTemplate<Bug>
        title='缺陷管理'
        subtitle='管理项目缺陷和 Bug 追踪'
        backButton={{
          href: '/dashboard',
        }}
        columns={columns}
        data={filteredBugs}
        searchable
        searchPlaceholder='搜索缺陷编号、标题...'
        searchValue={searchTerm}
        onSearch={(value) => setSearchTerm(value)}
        filters={filters}
        rowActions={rowActions}
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
    </>
  );
};

export default RsBugPage;
