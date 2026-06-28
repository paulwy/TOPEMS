import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Stack,
  Typography,
  TextField,
  FormLabel,
  Chip,
  Button,
  Tabs,
  Tab,
  Avatar,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material';
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  User,
  Users,
  FileText,
  Eye,
  MessageSquare,
  Loader2,
  Send,
  Inbox,
  CheckCheck,
  ArrowRight,
  UserPlus,
  MoreHorizontal,
  SkipForward,
  Share2,
  AlertTriangle,
  Play,
  Pause,
  X,
  ChevronRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Approval, Task } from '@/api/workflow';
import { workflowApi } from '@/api/workflow';
import { useAppStore } from '../../store';
import { apiLogger } from '@/utils/logger';
import { PageContainer } from '@/components/common';
import { ListPageTemplate } from '@/components/templates/ListPageTemplate';
import type { ColumnDef, RowAction, FilterConfig } from '@/components/templates/ListPageTemplate';

type TabType = 'todo' | 'done' | 'sent' | 'cc';

const FlowApprovalPage: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);
  const user = useAppStore((state) => state.user);

  const [activeTab, setActiveTab] = useState<TabType>('todo');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'delegate' | 'transfer'>('approve');
  const [comment, setComment] = useState('');
  const [targetUser, setTargetUser] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [stats, setStats] = useState({
    todo: 0,
    done: 0,
    sent: 0,
    cc: 0,
  });
  const [actionMenuAnchor, setActionMenuAnchor] = useState<null | HTMLElement>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(undefined);

      let apiMethod;
      switch (activeTab) {
        case 'todo':
          apiMethod = workflowApi.tasks.getTodoTasks;
          break;
        case 'done':
          apiMethod = workflowApi.tasks.getDoneTasks;
          break;
        case 'sent':
          apiMethod = workflowApi.tasks.getSentTasks;
          break;
        case 'cc':
          apiMethod = workflowApi.tasks.getCcTasks;
          break;
        default:
          apiMethod = workflowApi.tasks.getTodoTasks;
      }

      const res = await apiMethod({ page: 1, page_size: 100 });
      if (res.success && res.data) {
        const data = res.data as any;
        const taskList = Array.isArray(data) ? data : data.items || [];
        setTasks(taskList);
      } else {
        setTasks([]);
      }

      const statsRes = await workflowApi.tasks.getTaskStats?.();
      if (statsRes?.success && statsRes?.data) {
        setStats(statsRes.data as any);
      }
    } catch (err: unknown) {
      apiLogger.error('加载数据失败:', err);
      setError('加载数据失败');
      addNotification({
        title: '错误',
        message: '加载数据失败',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [activeTab, addNotification]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleViewDetail = (task: Task) => {
    setSelectedTask(task);
    setShowDetailModal(true);
  };

  const openActionModal = (task: Task, action: 'approve' | 'reject' | 'delegate' | 'transfer') => {
    setSelectedTask(task);
    setActionType(action);
    setComment('');
    setTargetUser('');
    setShowActionModal(true);
  };

  const handleAction = async () => {
    if (!selectedTask) return;

    if (actionType === 'reject' && !comment.trim()) {
      addNotification({
        title: '提示',
        message: '请输入拒绝原因',
        type: 'info',
      });
      return;
    }

    if ((actionType === 'delegate' || actionType === 'transfer') && !targetUser.trim()) {
      addNotification({
        title: '提示',
        message: '请选择目标用户',
        type: 'info',
      });
      return;
    }

    try {
      setProcessing(true);
      let res;

      switch (actionType) {
        case 'approve':
          res = await workflowApi.tasks.completeTask(selectedTask.id, {
            comment,
            variables: { approved: true },
          });
          break;
        case 'reject':
          res = await workflowApi.tasks.rejectTask(selectedTask.id, {
            comment,
          });
          break;
        case 'delegate':
          res = await workflowApi.tasks.delegateTask(selectedTask.id, {
            delegate_to: targetUser,
            comment,
          });
          break;
        case 'transfer':
          res = await workflowApi.tasks.transferTask(selectedTask.id, {
            transfer_to: targetUser,
            comment,
          });
          break;
      }

      if (res?.success) {
        const actionText = {
          approve: '通过',
          reject: '拒绝',
          delegate: '委派',
          transfer: '转办',
        }[actionType];
        addNotification({
          title: '成功',
          message: `审批${actionText}成功`,
          type: 'success',
        });
        setShowActionModal(false);
        setSelectedTask(null);
        loadData();
      } else {
        addNotification({
          title: '失败',
          message: res?.message || '操作失败',
          type: 'error',
        });
      }
    } catch (err: unknown) {
      addNotification({
        title: '错误',
        message: '处理审批失败',
        type: 'error',
      });
      apiLogger.error('处理审批失败:', err);
    } finally {
      setProcessing(false);
    }
  };

  const handleClaim = async (task: Task) => {
    try {
      const res = await workflowApi.tasks.claimTask(task.id);
      if (res.success) {
        addNotification({ title: '成功', message: '任务已认领', type: 'success' });
        loadData();
      }
    } catch (err) {
      addNotification({ title: '错误', message: '认领失败', type: 'error' });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'approved':
        return <CheckCircle size={16} style={{ color: '#16a34a' }} />;
      case 'rejected':
        return <XCircle size={16} style={{ color: '#dc2626' }} />;
      case 'pending':
      case 'running':
        return <Clock size={16} style={{ color: '#ca8a04' }} />;
      case 'suspended':
        return <Pause size={16} style={{ color: '#6b7280' }} />;
      default:
        return <AlertCircle size={16} style={{ color: '#6b7280' }} />;
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: '待处理',
      running: '处理中',
      completed: '已完成',
      approved: '已通过',
      rejected: '已拒绝',
      suspended: '已挂起',
      claimed: '已认领',
      finished: '已结束',
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string): 'success' | 'error' | 'warning' | 'default' | 'info' => {
    switch (status) {
      case 'completed':
      case 'approved':
        return 'success';
      case 'rejected':
        return 'error';
      case 'pending':
      case 'running':
        return 'warning';
      case 'suspended':
        return 'default';
      default:
        return 'default';
    }
  };

  const getPriorityIcon = (priority?: number) => {
    if (!priority || priority === 2) return null;
    if (priority === 3) return <AlertTriangle size={14} style={{ color: '#dc2626' }} />;
    if (priority === 1) return <ChevronRight size={14} style={{ color: '#6b7280' }} />;
    return null;
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch =
        task.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.instance_name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
      const matchesPriority =
        priorityFilter === 'all' || String(task.priority || 2) === priorityFilter;
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [tasks, searchTerm, statusFilter, priorityFilter]);

  const columns = useMemo<ColumnDef<Task>[]>(
    () => [
      {
        id: 'task_name',
        label: '任务名称',
        width: 200,
        render: (row) => (
          <Stack direction='row' spacing={1.5} sx={{ alignItems: 'center' }}>
            <Avatar
              sx={{
                width: 36,
                height: 36,
                bgcolor: row.status === 'pending' ? 'warning.light' : 'grey.100',
              }}
            >
              <FileText size={18} color={row.status === 'pending' ? '#ca8a04' : '#6b7280'} />
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Stack direction='row' spacing={0.5} sx={{ alignItems: 'center' }}>
                {getPriorityIcon(row.priority)}
                <Typography
                  variant='body2'
                  sx={{ fontWeight: 600, color: 'text.primary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                >
                  {row.name}
                </Typography>
              </Stack>
              <Typography
                variant='caption'
                sx={{ color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}
              >
                {row.instance_name || row.process_definition_name || '流程实例'}
              </Typography>
            </Box>
          </Stack>
        ),
      },
      {
        id: 'status',
        label: '状态',
        width: 100,
        render: (row) => (
          <Chip
            size='small'
            label={getStatusText(row.status)}
            color={getStatusColor(row.status)}
            icon={getStatusIcon(row.status)}
          />
        ),
      },
      {
        id: 'node',
        label: '当前节点',
        width: 120,
        render: (row) => (
          <Typography variant='body2' sx={{ color: 'text.secondary' }}>
            {row.node_name || row.node_key || '-'}
          </Typography>
        ),
      },
      {
        id: 'initiator',
        label: '发起人',
        width: 100,
        render: (row) => (
          <Stack direction='row' spacing={0.5} sx={{ alignItems: 'center' }}>
            <User size={14} style={{ color: '#9ca3af' }} />
            <Typography variant='body2' sx={{ color: 'text.secondary' }}>
              {row.start_user_name || row.assignee || '-'}
            </Typography>
          </Stack>
        ),
      },
      {
        id: 'assignee',
        label: '处理人',
        width: 100,
        render: (row) => (
          <Stack direction='row' spacing={0.5} sx={{ alignItems: 'center' }}>
            <Users size={14} style={{ color: '#9ca3af' }} />
            <Typography variant='body2' sx={{ color: 'text.secondary' }}>
              {row.assignee_name || row.assignee || '-'}
            </Typography>
          </Stack>
        ),
      },
      {
        id: 'createTime',
        label: '创建时间',
        width: 160,
        render: (row) => (
          <Typography variant='body2' sx={{ color: 'text.secondary' }}>
            {row.create_time ? new Date(row.create_time).toLocaleString('zh-CN') : '-'}
          </Typography>
        ),
      },
      {
        id: 'dueTime',
        label: '到期时间',
        width: 160,
        render: (row) => {
          const isOverdue = row.due_time && new Date(row.due_time) < new Date() && row.status === 'pending';
          return (
            <Typography
              variant='body2'
              sx={{ color: isOverdue ? 'error.main' : 'text.secondary' }}
            >
              {row.due_time ? new Date(row.due_time).toLocaleDateString('zh-CN') : '-'}
            </Typography>
          );
        },
      },
    ],
    []
  );

  const rowActions = useMemo<RowAction<Task>[]>(
    () => [
      {
        label: '查看详情',
        icon: <Eye size={16} />,
        onClick: (row) => handleViewDetail(row),
      },
      ...(activeTab === 'todo'
        ? [
            {
              label: '通过',
              icon: <CheckCircle size={16} />,
              color: 'success' as const,
              onClick: (row: Task) => openActionModal(row, 'approve'),
            },
            {
              label: '拒绝',
              icon: <XCircle size={16} />,
              color: 'error' as const,
              onClick: (row: Task) => openActionModal(row, 'reject'),
            },
            {
              label: '转办',
              icon: <ArrowRight size={16} />,
              onClick: (row: Task) => openActionModal(row, 'transfer'),
            },
            {
              label: '委派',
              icon: <UserPlus size={16} />,
              onClick: (row: Task) => openActionModal(row, 'delegate'),
            },
          ]
        : []),
    ],
    [activeTab]
  );

  const filters = useMemo<FilterConfig[]>(
    () => [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { value: 'all', label: '全部状态' },
          { value: 'pending', label: '待处理' },
          { value: 'running', label: '处理中' },
          { value: 'completed', label: '已完成' },
          { value: 'rejected', label: '已拒绝' },
        ],
        value: statusFilter,
        onChange: (value) => setStatusFilter(value as string),
      },
      {
        id: 'priority',
        label: '优先级',
        type: 'select',
        options: [
          { value: 'all', label: '全部优先级' },
          { value: '3', label: '高' },
          { value: '2', label: '中' },
          { value: '1', label: '低' },
        ],
        value: priorityFilter,
        onChange: (value) => setPriorityFilter(value as string),
      },
    ],
    [statusFilter, priorityFilter]
  );

  const tabHeaders = useMemo(
    () => (
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              minHeight: 48,
              fontWeight: 500,
            },
          }}
        >
          <Tab
            icon={<Inbox size={16} />}
            iconPosition='start'
            label={`待我审批 (${stats.todo})`}
            value='todo'
          />
          <Tab
            icon={<CheckCheck size={16} />}
            iconPosition='start'
            label={`我已审批 (${stats.done})`}
            value='done'
          />
          <Tab
            icon={<Send size={16} />}
            iconPosition='start'
            label={`我发起的 (${stats.sent})`}
            value='sent'
          />
          <Tab
            icon={<Share2 size={16} />}
            iconPosition='start'
            label={`抄送我的 (${stats.cc})`}
            value='cc'
          />
        </Tabs>
      </Box>
    ),
    [activeTab, stats]
  );

  const getActionModalTitle = () => {
    const titles = {
      approve: '通过审批',
      reject: '拒绝审批',
      delegate: '委派任务',
      transfer: '转办任务',
    };
    return titles[actionType];
  };

  const getActionModalDescription = () => {
    const descriptions = {
      approve: '确认通过该审批任务',
      reject: '确认拒绝该审批任务',
      delegate: '将任务委派给其他处理人，处理后回到当前节点',
      transfer: '将任务转办给其他处理人，不再参与当前节点',
    };
    return descriptions[actionType];
  };

  return (
    <PageContainer
      title='审批中心'
      subtitle={activeTab === 'todo' && stats.todo > 0 ? `${stats.todo} 项待您处理` : '暂无待处理事项'}
    >
      {tabHeaders}

      <ListPageTemplate
        title=''
        subtitle=''
        columns={columns}
        data={filteredTasks}
        loading={loading}
        error={error}
        rowActions={rowActions}
        filters={filters}
        onRefresh={loadData}
        searchable
        searchPlaceholder='搜索任务名称、流程实例...'
        searchValue={searchTerm}
        onSearch={setSearchTerm}
      />

      <Dialog
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>
          <Stack direction='row' sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant='h6' sx={{ fontWeight: 600 }}>
              任务详情
            </Typography>
            <IconButton size='small' onClick={() => setShowDetailModal(false)}>
              <X size={20} />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          {selectedTask && (
            <Box sx={{ pt: 1 }}>
              <Stack direction='row' spacing={3} sx={{ mb: 3 }}>
                <Avatar
                  sx={{
                    width: 56,
                    height: 56,
                    bgcolor: selectedTask.status === 'pending' ? 'warning.light' : 'grey.100',
                  }}
                >
                  <FileText
                    size={28}
                    color={selectedTask.status === 'pending' ? '#ca8a04' : '#6b7280'}
                  />
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant='h6' sx={{ fontWeight: 600, mb: 0.5 }}>
                    {selectedTask.name}
                  </Typography>
                  <Stack direction='row' spacing={1} sx={{ flexWrap: 'wrap' }}>
                    <Chip
                      size='small'
                      label={getStatusText(selectedTask.status)}
                      color={getStatusColor(selectedTask.status)}
                    />
                    {selectedTask.priority === 3 && (
                      <Chip size='small' label='高优先级' color='error' variant='outlined' />
                    )}
                  </Stack>
                </Box>
              </Stack>

              <Divider sx={{ my: 2 }} />

              <Typography variant='subtitle2' sx={{ fontWeight: 600, mb: 1.5 }}>
                基本信息
              </Typography>
              <List dense sx={{ mb: 2 }}>
                <ListItem sx={{ px: 0, py: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 100 }}>
                    <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                      任务ID
                    </Typography>
                  </ListItemIcon>
                  <ListItemText primary={selectedTask.id} sx={{ my: 0 }} />
                </ListItem>
                <ListItem sx={{ px: 0, py: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 100 }}>
                    <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                      流程实例
                    </Typography>
                  </ListItemIcon>
                  <ListItemText
                    primary={selectedTask.instance_name || selectedTask.instance_id || '-'}
                    sx={{ my: 0 }}
                  />
                </ListItem>
                <ListItem sx={{ px: 0, py: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 100 }}>
                    <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                      当前节点
                    </Typography>
                  </ListItemIcon>
                  <ListItemText
                    primary={selectedTask.node_name || selectedTask.node_key || '-'}
                    sx={{ my: 0 }}
                  />
                </ListItem>
                <ListItem sx={{ px: 0, py: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 100 }}>
                    <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                      发起人
                    </Typography>
                  </ListItemIcon>
                  <ListItemText
                    primary={selectedTask.start_user_name || '-'}
                    sx={{ my: 0 }}
                  />
                </ListItem>
                <ListItem sx={{ px: 0, py: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 100 }}>
                    <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                      处理人
                    </Typography>
                  </ListItemIcon>
                  <ListItemText
                    primary={selectedTask.assignee_name || selectedTask.assignee || '-'}
                    sx={{ my: 0 }}
                  />
                </ListItem>
                <ListItem sx={{ px: 0, py: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 100 }}>
                    <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                      创建时间
                    </Typography>
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      selectedTask.create_time
                        ? new Date(selectedTask.create_time).toLocaleString('zh-CN')
                        : '-'
                    }
                    sx={{ my: 0 }}
                  />
                </ListItem>
                <ListItem sx={{ px: 0, py: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 100 }}>
                    <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                      到期时间
                    </Typography>
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      selectedTask.due_time
                        ? new Date(selectedTask.due_time).toLocaleString('zh-CN')
                        : '-'
                    }
                    sx={{ my: 0 }}
                  />
                </ListItem>
              </List>

              <Typography variant='subtitle2' sx={{ fontWeight: 600, mb: 1.5 }}>
                任务描述
              </Typography>
              <Box
                sx={{
                  p: 2,
                  bgcolor: 'grey.50',
                  borderRadius: 1,
                  minHeight: 80,
                }}
              >
                <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                  {selectedTask.description || '暂无描述'}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setShowDetailModal(false)}>关闭</Button>
          {selectedTask && activeTab === 'todo' && (
            <>
              <Button
                variant='outlined'
                color='error'
                startIcon={<XCircle size={16} />}
                onClick={() => {
                  setShowDetailModal(false);
                  openActionModal(selectedTask, 'reject');
                }}
              >
                拒绝
              </Button>
              <Button
                variant='contained'
                color='success'
                startIcon={<CheckCircle size={16} />}
                onClick={() => {
                  setShowDetailModal(false);
                  openActionModal(selectedTask, 'approve');
                }}
              >
                通过
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      <Dialog
        open={showActionModal}
        onClose={() => !processing && setShowActionModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>
          <Typography variant='h6' sx={{ fontWeight: 600 }}>
            {getActionModalTitle()}
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ pt: 1 }}>
            <Typography variant='body2' sx={{ mb: 2, color: 'text.secondary' }}>
              {getActionModalDescription()}
            </Typography>
            {selectedTask && (
              <Box
                sx={{
                  p: 2,
                  bgcolor: 'grey.50',
                  borderRadius: 1,
                  mb: 3,
                }}
              >
                <Typography variant='body2' sx={{ fontWeight: 500, mb: 0.5 }}>
                  {selectedTask.name}
                </Typography>
                <Typography variant='caption' sx={{ color: 'text.secondary' }}>
                  {selectedTask.instance_name || selectedTask.process_definition_name || ''}
                </Typography>
              </Box>
            )}

            {(actionType === 'delegate' || actionType === 'transfer') && (
              <FormControl size='small' fullWidth sx={{ mb: 2 }}>
                <InputLabel>
                  {actionType === 'delegate' ? '委派人' : '转办人'}
                </InputLabel>
                <Select
                  value={targetUser}
                  label={actionType === 'delegate' ? '委派人' : '转办人'}
                  onChange={(e) => setTargetUser(e.target.value)}
                >
                  <MenuItem value=''>请选择用户</MenuItem>
                  <MenuItem value='user1'>张三</MenuItem>
                  <MenuItem value='user2'>李四</MenuItem>
                  <MenuItem value='user3'>王五</MenuItem>
                </Select>
              </FormControl>
            )}

            <FormLabel>
              {actionType === 'reject' ? '拒绝原因 *' : '审批意见（可选）'}
            </FormLabel>
            <TextField
              size='small'
              fullWidth
              multiline
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={
                actionType === 'reject'
                  ? '请输入拒绝原因'
                  : '请输入审批意见（可选）'
              }
              sx={{ mt: 1 }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setShowActionModal(false)} disabled={processing}>
            取消
          </Button>
          <Button
            variant='contained'
            onClick={handleAction}
            disabled={
              processing ||
              (actionType === 'reject' && !comment.trim()) ||
              ((actionType === 'delegate' || actionType === 'transfer') && !targetUser.trim())
            }
            color={actionType === 'reject' ? 'error' : actionType === 'approve' ? 'success' : 'primary'}
            startIcon={
              processing ? (
                <Loader2 size={16} className='animate-spin' />
              ) : actionType === 'approve' ? (
                <CheckCircle size={16} />
              ) : actionType === 'reject' ? (
                <XCircle size={16} />
              ) : actionType === 'delegate' ? (
                <UserPlus size={16} />
              ) : (
                <ArrowRight size={16} />
              )
            }
          >
            {processing
              ? '处理中...'
              : actionType === 'approve'
                ? '确认通过'
                : actionType === 'reject'
                  ? '确认拒绝'
                  : actionType === 'delegate'
                    ? '确认委派'
                    : '确认转办'}
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default FlowApprovalPage;
