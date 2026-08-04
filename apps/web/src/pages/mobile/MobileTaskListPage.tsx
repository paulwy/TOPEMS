import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
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
  TextField,
  InputAdornment,
  useTheme,
  CircularProgress,
  Button,
} from '@mui/material';
import { useInfiniteQuery } from '@tanstack/react-query';
import {
  Home,
  ListTodo,
  ScanLine,
  CheckSquare,
  User,
  Search,
  Filter,
  Clock,
  AlertCircle,
  CheckCircle2,
  PauseCircle,
  Calendar,
  ChevronRight,
  User as UserIcon,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MobileLayout, PullToRefresh, MobileSkeleton, MobileCard } from '@/components/mobile';
import { SwipeAction, type SwipeActionItem } from '@/components/mobile';
import { mobileApi } from '@/api/mobile';
import { apiLogger } from '@/utils/logger';
import { MOBILE_PATHS } from '@/modules/mobile/config';
import { PageContainer } from '@/components/common';

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'paused';
  priority: 'high' | 'medium' | 'low';
  assignee: string;
  dueDate: string;
  tag: string;
}

interface ApiTask {
  id?: string;
  task_no?: string;
  title?: string;
  task_name?: string;
  description?: string;
  status?: string;
  priority?: string;
  assignee?: string;
  assigned_to_name?: string;
  due_date?: string;
  task_type?: string;
  tag?: string;
}

const mapApiTaskToTask = (apiTask: ApiTask): Task => {
  const statusMap: Record<string, Task['status']> = {
    pending: 'pending',
    待办: 'pending',
    in_progress: 'in_progress',
    进行中: 'in_progress',
    completed: 'completed',
    已完成: 'completed',
    paused: 'paused',
    已暂停: 'paused',
  };
  const priorityMap: Record<string, Task['priority']> = {
    high: 'high',
    高: 'high',
    medium: 'medium',
    中: 'medium',
    low: 'low',
    低: 'low',
  };
  return {
    id: apiTask.id || String(apiTask.task_no || apiTask.id),
    title: apiTask.title || apiTask.task_name || `任务 ${apiTask.id}`,
    description: apiTask.description || '',
    status: apiTask.status ? statusMap[apiTask.status] : 'pending',
    priority: apiTask.priority ? priorityMap[apiTask.priority] : 'medium',
    assignee: apiTask.assignee || apiTask.assigned_to_name || '未知',
    dueDate: apiTask.due_date ? new Date(apiTask.due_date).toLocaleDateString('zh-CN') : '',
    tag: apiTask.task_type || apiTask.tag || '任务',
  };
};

const pageSize = 10;

const MobileTaskListPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const tabs = ['全部', '待办', '进行中', '已完成'];

  const tasksQuery = useInfiniteQuery({
    queryKey: ['mobile-tasks', activeTab],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await mobileApi.listMobileTasks({
        page: pageParam,
        pagesize: pageSize,
      });
      if (response.success && response.data) {
        const data = response.data as unknown as Record<string, unknown>;
        const apiTasks = (
          Array.isArray(data) ? data : (data.items as ApiTask[]) || []
        ) as ApiTask[];
        const tasks = apiTasks.map(mapApiTaskToTask);
        const total = (data.total as number) || apiTasks.length;
        return { tasks, total, page: pageParam };
      }
      return { tasks: [], total: 0, page: pageParam };
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const loadedCount = lastPage.page * pageSize;
      if (loadedCount < lastPage.total) {
        return lastPage.page + 1;
      }
      return;
    },
    staleTime: 30 * 1000,
    retry: 2,
  });

  const tasks = useMemo(
    () => tasksQuery.data?.pages.flatMap((page) => page.tasks) || [],
    [tasksQuery.data]
  );
  const hasMore = !!tasksQuery.hasNextPage;
  const loading = tasksQuery.isLoading;
  const loadingMore = tasksQuery.isFetchingNextPage;

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          tasksQuery.fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, tasksQuery]);

  const handleRefresh = useCallback(async () => {
    await tasksQuery.refetch();
  }, [tasksQuery]);

  const getStatusConfig = (status: Task['status']) => {
    switch (status) {
      case 'pending':
        return {
          label: '待办',
          color: 'warning' as const,
          icon: <Clock style={{ width: 14, height: 14 }} />,
        };
      case 'in_progress':
        return {
          label: '进行中',
          color: 'primary' as const,
          icon: <ListTodo style={{ width: 14, height: 14 }} />,
        };
      case 'completed':
        return {
          label: '已完成',
          color: 'success' as const,
          icon: <CheckCircle2 style={{ width: 14, height: 14 }} />,
        };
      case 'paused':
        return {
          label: '已暂停',
          color: 'default' as const,
          icon: <PauseCircle style={{ width: 14, height: 14 }} />,
        };
    }
  };

  const getPriorityConfig = (priority: Task['priority']) => {
    switch (priority) {
      case 'high':
        return { label: '高', color: 'error' as const };
      case 'medium':
        return { label: '中', color: 'warning' as const };
      case 'low':
        return { label: '低', color: 'success' as const };
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleTaskClick = (_task: Task) => {};

  const rightSwipeActions: SwipeActionItem[] = [
    {
      id: 'complete',
      icon: <CheckSquare style={{ width: 20, height: 20 }} />,
      label: '完成',
      color: theme.palette.success.main,
      onClick: () => {},
    },
    {
      id: 'delete',
      icon: <AlertCircle style={{ width: 20, height: 20 }} />,
      label: '删除',
      color: theme.palette.error.main,
      onClick: () => {},
    },
  ];

  const handleBottomTabChange = (tabId: string) => {
    switch (tabId) {
      case 'home':
        navigate(MOBILE_PATHS.home);
        break;
      case 'tasks':
        break;
      case 'scan':
        navigate(MOBILE_PATHS.scanPage);
        break;
      case 'approval':
        navigate(MOBILE_PATHS.approvals);
        break;
      case 'profile':
        navigate(MOBILE_PATHS.settings);
        break;
    }
  };

  const filteredTasks = tasks
    .filter((task) => {
      if (activeTab === 0) return true;
      if (activeTab === 1) return task.status === 'pending';
      if (activeTab === 2) return task.status === 'in_progress';
      if (activeTab === 3) return task.status === 'completed';
      return true;
    })
    .filter((task) => {
      if (!searchQuery) return true;
      return (
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.id.toLowerCase().includes(searchQuery.toLowerCase())
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

  return (
    <MobileLayout
      title='我的任务'
      showBack={false}
      showMenu={false}
      showSearch
      showNotifications
      notificationCount={5}
      showTabBar
      tabs={bottomTabs}
      activeTab='tasks'
      onTabChange={handleBottomTabChange}
    >
      <PageContainer
        autoTitle={false}
        autoBreadcrumbs={false}
        padding={false}
        maxWidth={false}
      >
        <Box sx={{ px: 2, pt: 2 }}>
          <TextField
            fullWidth
            size='small'
            placeholder='搜索任务编号或标题'
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
                endAdornment: searchQuery ? (
                  <InputAdornment position='end'>
                    <Button
                      size='small'
                      onClick={() => setSearchQuery('')}
                      sx={{ minWidth: 'auto', p: 0 }}
                    >
                      清除
                    </Button>
                  </InputAdornment>
                ) : undefined,
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
              label={tab}
            />
          ))}
        </Tabs>

        <PullToRefresh onRefresh={handleRefresh}>
          {loading ? (
            <MobileSkeleton
              type='list'
              count={8}
            />
          ) : filteredTasks.length === 0 ? (
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
                <ListTodo style={{ width: 32, height: 32, color: theme.palette.text.secondary }} />
              </Box>
              <Typography
                variant='subtitle1'
                sx={{ mb: 1, fontWeight: 500 }}
              >
                暂无任务
              </Typography>
              <Typography
                variant='body2'
                color='text.secondary'
                sx={{ textAlign: 'center' }}
              >
                {searchQuery ? '没有找到匹配的任务' : '当前分类下暂无任务'}
              </Typography>
            </Box>
          ) : (
            <List disablePadding>
              {filteredTasks.map((task, index) => {
                const statusConfig = getStatusConfig(task.status);
                const priorityConfig = getPriorityConfig(task.priority);

                return (
                  <React.Fragment key={task.id}>
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
                        onClick={() => handleTaskClick(task)}
                      >
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                              <Typography
                                variant='subtitle2'
                                sx={{
                                  fontWeight: 500,
                                  flex: 1,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {task.title}
                              </Typography>
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
                            <Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                <Chip
                                  label={task.id}
                                  size='small'
                                  variant='outlined'
                                  sx={{
                                    height: 20,
                                    fontSize: '0.7rem',
                                    '& .MuiChip-label': { px: 1 },
                                  }}
                                />
                                <Chip
                                  icon={statusConfig.icon}
                                  label={statusConfig.label}
                                  size='small'
                                  color={statusConfig.color}
                                  sx={{
                                    height: 20,
                                    fontSize: '0.7rem',
                                    '& .MuiChip-label': { pl: 0.5, pr: 1 },
                                    '& .MuiChip-icon': { ml: 0.5, mr: 0 },
                                  }}
                                />
                                <Chip
                                  label={`${priorityConfig.label}优先级`}
                                  size='small'
                                  color={priorityConfig.color}
                                  variant='outlined'
                                  sx={{
                                    height: 20,
                                    fontSize: '0.7rem',
                                    '& .MuiChip-label': { px: 1 },
                                  }}
                                />
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
                                    {task.assignee}
                                  </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <Calendar
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
                                    {task.dueDate}
                                  </Typography>
                                </Box>
                              </Box>
                            </Box>
                          }
                          sx={{ pr: 2 }}
                        />
                      </ListItem>
                    </SwipeAction>
                    {index < filteredTasks.length - 1 && <Divider component='li' />}
                  </React.Fragment>
                );
              })}
            </List>
          )}

          <Box
            ref={loadMoreRef}
            sx={{ py: 3, display: 'flex', justifyContent: 'center' }}
          >
            {loadingMore && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <CircularProgress
                  size={20}
                  thickness={3}
                />
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  加载更多...
                </Typography>
              </Box>
            )}
            {!hasMore && !loading && filteredTasks.length > 0 && (
              <Typography
                variant='caption'
                color='text.secondary'
              >
                没有更多了
              </Typography>
            )}
          </Box>
        </PullToRefresh>
      </PageContainer>
    </MobileLayout>
  );
};

export default MobileTaskListPage;
