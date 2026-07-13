import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Typography,
  Chip,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  Divider,
  Avatar,
  useTheme,
  Paper,
  Button,
  TextField,
  InputAdornment,
  IconButton,
} from '@mui/material';
import {
  Home,
  ListTodo,
  ScanLine,
  CheckSquare,
  User,
  Search,
  Clock,
  User as UserIcon,
  ChevronRight,
  Check,
  X,
  FileText,
  DollarSign,
  Package,
  Users,
  AlertCircle,
  Filter,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MobileLayout, PullToRefresh, MobileSkeleton, MobileButton } from '@/components/mobile';
import { SwipeAction, type SwipeActionItem } from '@/components/mobile';
import { useNotificationStore, useAuthStore } from '@/store';
import { approvalTaskApi } from '@/api/workflow/approval';
import { apiLogger } from '@/utils/logger';
import { MOBILE_PATHS } from '@/modules/mobile/config';

interface ApprovalItem {
  id: string;
  title: string;
  type: 'purchase' | 'leave' | 'expense' | 'contract' | 'other';
  applicant: string;
  department: string;
  submitTime: string;
  amount?: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'approved' | 'rejected';
  description: string;
  steps: {
    name: string;
    status: 'completed' | 'current' | 'pending';
    time?: string;
  }[];
}

interface ApiApproval {
  id?: string;
  task_id?: string;
  title?: string;
  task_name?: string;
  type?: string;
  applicant_name?: string;
  assignee_name?: string;
  applicant?: string;
  department?: string;
  department_name?: string;
  created_at?: string;
  amount?: string | number;
  priority?: string;
  status?: string;
  description?: string;
  remarks?: string;
  steps?: Array<{
    name: string;
    status: 'completed' | 'current' | 'pending';
    time?: string;
  }>;
}

const mapApiApprovalToApprovalItem = (apiApproval: ApiApproval): ApprovalItem => {
  const typeMap: Record<string, ApprovalItem['type']> = {
    purchase: 'purchase',
    采购: 'purchase',
    leave: 'leave',
    请假: 'leave',
    expense: 'expense',
    报销: 'expense',
    contract: 'contract',
    合同: 'contract',
  };
  const priorityMap: Record<string, ApprovalItem['priority']> = {
    high: 'high',
    高: 'high',
    medium: 'medium',
    中: 'medium',
    low: 'low',
    低: 'low',
  };
  const statusMap: Record<string, ApprovalItem['status']> = {
    pending: 'pending',
    待审批: 'pending',
    approved: 'approved',
    已通过: 'approved',
    rejected: 'rejected',
    已驳回: 'rejected',
  };
  return {
    id: apiApproval.id || String(apiApproval.task_id || apiApproval.id),
    title: apiApproval.title || apiApproval.task_name || `审批 ${apiApproval.id}`,
    type: apiApproval.type ? typeMap[apiApproval.type] : 'other',
    applicant:
      apiApproval.applicant_name || apiApproval.assignee_name || apiApproval.applicant || '未知',
    department: apiApproval.department || apiApproval.department_name || '',
    submitTime: apiApproval.created_at
      ? new Date(apiApproval.created_at).toLocaleString('zh-CN')
      : '',
    amount: apiApproval.amount ? `¥${Number(apiApproval.amount).toFixed(2)}` : undefined,
    priority: apiApproval.priority ? priorityMap[apiApproval.priority] : 'medium',
    status: apiApproval.status ? statusMap[apiApproval.status] : 'pending',
    description: apiApproval.description || apiApproval.remarks || '',
    steps: apiApproval.steps || [
      { name: '提交申请', status: 'completed' },
      { name: '审批中', status: 'current' },
    ],
  };
};

const MobileApprovalPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { addNotification } = useNotificationStore();
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [selectedApproval, setSelectedApproval] = useState<ApprovalItem | null>(null);
  const [approvalComment, setApprovalComment] = useState('');
  const [processing, setProcessing] = useState(false);

  const tabs = ['待审批', '已审批', '我发起的'];

  const loadApprovals = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = {};
      if (searchQuery) {
        params.search = searchQuery;
      }

      if (activeTab === 0) {
        params.status = 'pending';
        params.assignee_id = user?.id;
      } else if (activeTab === 1) {
        params.status = 'completed';
        params.assignee_id = user?.id;
      } else if (activeTab === 2) {
        params.initiator_id = user?.id;
      }

      const response = await approvalTaskApi.listApprovalTasks(params as any);
      if (response.success && response.data) {
        const data = response.data as any;
        const apiApprovals = Array.isArray(data) ? data : data.items || [];
        const mappedApprovals = apiApprovals.map(mapApiApprovalToApprovalItem);
        setApprovals(mappedApprovals);
      } else {
        setApprovals([]);
      }
    } catch (err) {
      apiLogger.error('加载审批列表失败:', err);
      setApprovals([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchQuery, user?.id]);

  useEffect(() => {
    loadApprovals();
  }, [loadApprovals]);

  const handleRefresh = useCallback(async () => {
    await loadApprovals();
  }, [loadApprovals]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    loadApprovals();
  };

  const getTypeIcon = (type: ApprovalItem['type']) => {
    switch (type) {
      case 'purchase':
        return <Package style={{ width: 20, height: 20 }} />;
      case 'leave':
        return <Users style={{ width: 20, height: 20 }} />;
      case 'expense':
        return <DollarSign style={{ width: 20, height: 20 }} />;
      case 'contract':
        return <FileText style={{ width: 20, height: 20 }} />;
      default:
        return <FileText style={{ width: 20, height: 20 }} />;
    }
  };

  const getTypeColor = (type: ApprovalItem['type']) => {
    switch (type) {
      case 'purchase':
        return 'primary';
      case 'leave':
        return 'success';
      case 'expense':
        return 'warning';
      case 'contract':
        return 'info';
      default:
        return 'default';
    }
  };

  const getPriorityColor = (priority: ApprovalItem['priority']) => {
    switch (priority) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'success';
    }
  };

  const getPriorityLabel = (priority: ApprovalItem['priority']) => {
    switch (priority) {
      case 'high':
        return '紧急';
      case 'medium':
        return '普通';
      case 'low':
        return '低';
    }
  };

  const handleBottomTabChange = (tabId: string) => {
    switch (tabId) {
      case 'home':
        navigate(MOBILE_PATHS.home);
        break;
      case 'tasks':
        navigate(MOBILE_PATHS.tasks);
        break;
      case 'scan':
        navigate(MOBILE_PATHS.scanPage);
        break;
      case 'approval':
        break;
      case 'profile':
        navigate(MOBILE_PATHS.settings);
        break;
    }
  };

  const handleApprove = async (approval: ApprovalItem) => {
    setProcessing(true);
    try {
      await approvalTaskApi.approveTask(approval.id, { comment: approvalComment });
      setApprovals((prev) => prev.filter((a) => a.id !== approval.id));
      setSelectedApproval(null);
      setApprovalComment('');
      addNotification({
        title: '审批通过',
        message: `${approval.title} 已通过`,
        type: 'success',
      });
    } catch (err) {
      apiLogger.error('审批通过失败:', err);
      addNotification({
        title: '操作失败',
        message: '审批通过操作失败，请重试',
        type: 'error',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (approval: ApprovalItem) => {
    setProcessing(true);
    try {
      await approvalTaskApi.rejectTask(approval.id, { comment: approvalComment });
      setApprovals((prev) => prev.filter((a) => a.id !== approval.id));
      setSelectedApproval(null);
      setApprovalComment('');
      addNotification({
        title: '已驳回',
        message: `${approval.title} 已驳回`,
        type: 'warning',
      });
    } catch (err) {
      apiLogger.error('审批驳回失败:', err);
      addNotification({
        title: '操作失败',
        message: '审批驳回操作失败，请重试',
        type: 'error',
      });
    } finally {
      setProcessing(false);
    }
  };

  const rightSwipeActions: SwipeActionItem[] = [
    {
      id: 'approve',
      icon: <Check style={{ width: 20, height: 20 }} />,
      label: '通过',
      color: theme.palette.success.main,
      onClick: () => {},
    },
    {
      id: 'reject',
      icon: <X style={{ width: 20, height: 20 }} />,
      label: '驳回',
      color: theme.palette.error.main,
      onClick: () => {},
    },
  ];

  const filteredApprovals = approvals.filter((approval) => {
    if (!searchQuery) return true;
    return (
      approval.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      approval.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      approval.applicant.includes(searchQuery)
    );
  });

  const bottomTabs = [
    { id: 'home', label: '首页', icon: <Home style={{ width: 22, height: 22 }} /> },
    { id: 'tasks', label: '任务', icon: <ListTodo style={{ width: 22, height: 22 }} /> },
    { id: 'scan', label: '扫码', icon: <ScanLine style={{ width: 22, height: 22 }} /> },
    {
      id: 'approval',
      label: '审批',
      icon: <CheckSquare style={{ width: 22, height: 22 }} />,
      badge: 3,
    },
    { id: 'profile', label: '我的', icon: <User style={{ width: 22, height: 22 }} /> },
  ];

  if (selectedApproval) {
    return (
      <MobileLayout
        title='审批详情'
        showBack
        onBackClick={() => setSelectedApproval(null)}
        showTabBar={false}
      >
        <Box sx={{ p: 2, pb: 3 }}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 2,
              mb: 2,
              border: 1,
              borderColor: 'divider',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: `${getTypeColor(selectedApproval.type)}.lighter`,
                  color: `${getTypeColor(selectedApproval.type)}.main`,
                }}
              >
                {getTypeIcon(selectedApproval.type)}
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography
                  variant='h6'
                  sx={{ fontWeight: 600, mb: 0.5 }}
                >
                  {selectedApproval.title}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip
                    label={selectedApproval.id}
                    size='small'
                    variant='outlined'
                    sx={{ height: 20, fontSize: '0.7rem' }}
                  />
                  <Chip
                    label={getPriorityLabel(selectedApproval.priority)}
                    size='small'
                    color={getPriorityColor(selectedApproval.priority) as any}
                    sx={{ height: 20, fontSize: '0.7rem' }}
                  />
                </Box>
              </Box>
            </Box>

            {selectedApproval.amount && (
              <Box
                sx={{
                  py: 2,
                  borderTop: 1,
                  borderColor: 'divider',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  申请金额
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700, color: 'primary.main' }}
                >
                  {selectedApproval.amount}
                </Typography>
              </Box>
            )}
          </Paper>

          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 2,
              mb: 2,
              border: 1,
              borderColor: 'divider',
            }}
          >
            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600, mb: 2 }}
            >
              申请人信息
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ width: 44, height: 44 }}>
                <UserIcon style={{ width: 22, height: 22 }} />
              </Avatar>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ fontWeight: 500 }}
                >
                  {selectedApproval.applicant}
                </Typography>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  {selectedApproval.department}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Clock style={{ width: 14, height: 14, color: theme.palette.text.secondary }} />
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  提交时间：{selectedApproval.submitTime}
                </Typography>
              </Box>
            </Box>
          </Paper>

          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 2,
              mb: 2,
              border: 1,
              borderColor: 'divider',
            }}
          >
            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600, mb: 2 }}
            >
              审批说明
            </Typography>
            <Typography
              variant='body2'
              color='text.secondary'
            >
              {selectedApproval.description}
            </Typography>
          </Paper>

          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 2,
              mb: 2,
              border: 1,
              borderColor: 'divider',
            }}
          >
            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600, mb: 2 }}
            >
              审批流程
            </Typography>
            <Box sx={{ position: 'relative', pl: 2 }}>
              {selectedApproval.steps.map((step, index) => (
                <Box
                  key={index}
                  sx={{
                    display: 'flex',
                    gap: 2,
                    pb: index < selectedApproval.steps.length - 1 ? 3 : 0,
                  }}
                >
                  <Box sx={{ position: 'relative' }}>
                    <Box
                      sx={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor:
                          step.status === 'completed'
                            ? 'success.main'
                            : step.status === 'current'
                              ? 'primary.main'
                              : 'grey.300',
                        color: 'white',
                        flexShrink: 0,
                        zIndex: 1,
                      }}
                    >
                      {step.status === 'completed' ? (
                        <Check style={{ width: 14, height: 14 }} />
                      ) : (
                        <Typography
                          variant='caption'
                          sx={{ fontWeight: 600 }}
                        >
                          {index + 1}
                        </Typography>
                      )}
                    </Box>
                    {index < selectedApproval.steps.length - 1 && (
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 24,
                          left: '50%',
                          transform: 'translateX(-50%)',
                          width: 2,
                          height: 'calc(100% + 12px)',
                          bgcolor: step.status === 'completed' ? 'success.main' : 'grey.200',
                        }}
                      />
                    )}
                  </Box>
                  <Box sx={{ flex: 1, pt: 0.5 }}>
                    <Typography
                      variant='body2'
                      sx={{
                        fontWeight: step.status === 'current' ? 600 : 500,
                        color: step.status === 'pending' ? 'text.secondary' : 'text.primary',
                      }}
                    >
                      {step.name}
                    </Typography>
                    {step.time && (
                      <Typography
                        variant='caption'
                        color='text.secondary'
                      >
                        {step.time}
                      </Typography>
                    )}
                    {step.status === 'current' && (
                      <Chip
                        label='待审批'
                        size='small'
                        color='primary'
                        sx={{ mt: 0.5, height: 20, fontSize: '0.7rem' }}
                      />
                    )}
                  </Box>
                </Box>
              ))}
            </Box>
          </Paper>

          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 2,
              mb: 3,
              border: 1,
              borderColor: 'divider',
            }}
          >
            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600, mb: 2 }}
            >
              审批意见
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={3}
              placeholder='请输入审批意见（选填）'
              value={approvalComment}
              onChange={(e) => setApprovalComment(e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                },
              }}
            />
          </Paper>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <MobileButton
              fullWidth
              variant='outlined'
              color='error'
              startIcon={processing ? null : <X style={{ width: 20, height: 20 }} />}
              onClick={() => handleReject(selectedApproval)}
              disabled={processing}
            >
              {processing ? '处理中...' : '驳回'}
            </MobileButton>
            <MobileButton
              fullWidth
              variant='contained'
              color='success'
              startIcon={processing ? null : <Check style={{ width: 20, height: 20 }} />}
              onClick={() => handleApprove(selectedApproval)}
              disabled={processing}
            >
              {processing ? '处理中...' : '通过'}
            </MobileButton>
          </Box>
        </Box>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout
      title='审批中心'
      showBack={false}
      showMenu={false}
      showNotifications
      notificationCount={5}
      showTabBar
      tabs={bottomTabs}
      activeTab='approval'
      onTabChange={handleBottomTabChange}
      rightActions={
        <IconButton
          size='large'
          sx={{ minWidth: 44, minHeight: 44 }}
        >
          <Filter style={{ width: 20, height: 20 }} />
        </IconButton>
      }
    >
      <Box sx={{ px: 2, pt: 2 }}>
        <TextField
          fullWidth
          size='small'
          placeholder='搜索审批编号、标题或申请人'
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{
            mb: 2,
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              minHeight: 44,
            },
          }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position='start'>
                  <Search style={{ width: 20, height: 20 }} />
                </InputAdornment>
              ),
            },
          }}
        />
      </Box>

      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        variant='fullWidth'
        sx={{
          px: 2,
          mb: 1,
          '& .MuiTab-root': {
            minHeight: 44,
            fontSize: '0.875rem',
          },
        }}
      >
        {tabs.map((tab, index) => (
          <Tab
            key={index}
            label={
              index === 0 ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {tab}
                  <Chip
                    label={approvals.length}
                    size='small'
                    color='error'
                    sx={{ height: 18, fontSize: '0.65rem', minWidth: 18 }}
                  />
                </Box>
              ) : (
                tab
              )
            }
          />
        ))}
      </Tabs>

      <PullToRefresh onRefresh={handleRefresh}>
        {loading ? (
          <MobileSkeleton
            type='list'
            count={6}
          />
        ) : filteredApprovals.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              py: 10,
              px: 4,
            }}
          >
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                bgcolor: 'grey.100',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 2,
              }}
            >
              <CheckSquare style={{ width: 32, height: 32, color: theme.palette.text.secondary }} />
            </Box>
            <Typography
              variant='subtitle1'
              sx={{ mb: 1, fontWeight: 500 }}
            >
              暂无待审批
            </Typography>
            <Typography
              variant='body2'
              color='text.secondary'
              sx={{ textAlign: 'center' }}
            >
              {searchQuery ? '没有找到匹配的审批' : '当前没有待您审批的事项'}
            </Typography>
          </Box>
        ) : (
          <List disablePadding>
            {filteredApprovals.map((approval, index) => {
              const typeColor = getTypeColor(approval.type);

              return (
                <React.Fragment key={approval.id}>
                  <SwipeAction rightActions={rightSwipeActions}>
                    <ListItem
                      sx={{
                        px: 2,
                        py: 2,
                        cursor: 'pointer',
                        '&:hover': {
                          bgcolor: 'action.hover',
                        },
                      }}
                      onClick={() => setSelectedApproval(approval)}
                    >
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <Box
                              sx={{
                                width: 36,
                                height: 36,
                                borderRadius: 1.5,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                bgcolor: `${typeColor}.lighter`,
                                color: `${typeColor}.main`,
                                flexShrink: 0,
                              }}
                            >
                              {getTypeIcon(approval.type)}
                            </Box>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography
                                variant='subtitle2'
                                sx={{
                                  fontWeight: 500,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {approval.title}
                              </Typography>
                              <Typography
                                variant='caption'
                                color='text.secondary'
                              >
                                {approval.id}
                              </Typography>
                            </Box>
                            <ChevronRight
                              style={{
                                width: 18,
                                height: 18,
                                color: theme.palette.text.secondary,
                                flexShrink: 0,
                              }}
                            />
                          </Box>
                        }
                        secondary={
                          <Box sx={{ ml: 0, mt: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                              <Chip
                                label={getPriorityLabel(approval.priority)}
                                size='small'
                                color={getPriorityColor(approval.priority) as any}
                                sx={{ height: 20, fontSize: '0.7rem' }}
                              />
                              {approval.amount && (
                                <Chip
                                  label={approval.amount}
                                  size='small'
                                  variant='outlined'
                                  sx={{ height: 20, fontSize: '0.7rem' }}
                                />
                              )}
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <UserIcon
                                  style={{
                                    width: 14,
                                    height: 14,
                                    color: theme.palette.text.secondary,
                                  }}
                                />
                                <Typography
                                  variant='caption'
                                  color='text.secondary'
                                >
                                  {approval.applicant}
                                </Typography>
                              </Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Clock
                                  style={{
                                    width: 14,
                                    height: 14,
                                    color: theme.palette.text.secondary,
                                  }}
                                />
                                <Typography
                                  variant='caption'
                                  color='text.secondary'
                                >
                                  {approval.submitTime.split(' ')[0]}
                                </Typography>
                              </Box>
                            </Box>
                          </Box>
                        }
                        sx={{ pr: 2 }}
                      />
                    </ListItem>
                  </SwipeAction>
                  {index < filteredApprovals.length - 1 && <Divider component='li' />}
                </React.Fragment>
              );
            })}
          </List>
        )}
      </PullToRefresh>
    </MobileLayout>
  );
};

export default MobileApprovalPage;
