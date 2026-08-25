import { designTokens } from '@topems/tokens';
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
import i18n from '@/i18n';
import { useInfiniteQuery } from '@tanstack/react-query';
import {
  Home,
  ListTodo,
  ScanLine,
  CheckSquare,
  User,
  Search,
  Clock,
  AlertCircle,
  CheckCircle2,
  PauseCircle,
  Calendar,
  ChevronRight,
  User as UserIcon,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BottomTabBar, PullToRefresh, MobileSkeleton } from '@/components/mobile';
import { SwipeAction, type SwipeActionItem } from '@/components/mobile';
import { mobileApi } from '@/api/mobile';
import { MOBILE_PATHS } from '@/modules/mobile/config';
import { MobilePageTemplate } from '@/components/templates';
import { QUERY_KEYS } from '@/lib/reactQuery';

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
    [i18n.t('pages.mobile_task_list_page.k0')]: 'pending',
    in_progress: 'in_progress',
    [i18n.t('pages.mobile_task_list_page.k1')]: 'in_progress',
    completed: 'completed',
    [i18n.t('pages.mobile_task_list_page.k2')]: 'completed',
    paused: 'paused',
    [i18n.t('pages.mobile_task_list_page.k3')]: 'paused',
  };
  const priorityMap: Record<string, Task['priority']> = {
    high: 'high',
    [i18n.t('pages.mobile_task_list_page.k4')]: 'high',
    medium: 'medium',
    [i18n.t('pages.mobile_task_list_page.k5')]: 'medium',
    low: 'low',
    [i18n.t('pages.mobile_task_list_page.k6')]: 'low',
  };
  return {
    id: apiTask.id || String(apiTask.task_no || apiTask.id),
    title:
      apiTask.title ||
      apiTask.task_name ||
      `${i18n.t('pages.mobile_task_list_page.k0')}${apiTask.id}`,
    description: apiTask.description || '',
    status: apiTask.status ? statusMap[apiTask.status] : 'pending',
    priority: apiTask.priority ? priorityMap[apiTask.priority] : 'medium',
    assignee:
      apiTask.assignee || apiTask.assigned_to_name || i18n.t('mobile.mobile_task_list_page.k0'),
    dueDate: apiTask.due_date ? new Date(apiTask.due_date).toLocaleDateString('zh-CN') : '',
    tag: apiTask.task_type || apiTask.tag || i18n.t('mobile.mobile_task_list_page.k1'),
  };
};
const pageSize = 10;
const MobileTaskListPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const tabs = [
    i18n.t('mobile.mobile_task_list_page.k5'),
    i18n.t('mobile.mobile_task_list_page.k4'),
    i18n.t('mobile.mobile_task_list_page.k3'),
    i18n.t('mobile.mobile_task_list_page.k2'),
  ];
  const tasksQuery = useInfiniteQuery({
    queryKey: [...QUERY_KEYS.AD_HOC.MOBILE_TASKS_BASE, activeTab],
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
          label: i18n.t('mobile.mobile_task_list_page.k6'),
          color: 'warning' as const,
          icon: <Clock style={{ width: 14, height: 14 }} />,
        };
      case 'in_progress':
        return {
          label: i18n.t('mobile.mobile_task_list_page.k7'),
          color: 'primary' as const,
          icon: <ListTodo style={{ width: 14, height: 14 }} />,
        };
      case 'completed':
        return {
          label: i18n.t('mobile.mobile_task_list_page.k8'),
          color: 'success' as const,
          icon: <CheckCircle2 style={{ width: 14, height: 14 }} />,
        };
      case 'paused':
        return {
          label: i18n.t('mobile.mobile_task_list_page.k9'),
          color: 'default' as const,
          icon: <PauseCircle style={{ width: 14, height: 14 }} />,
        };
    }
  };
  const getPriorityConfig = (priority: Task['priority']) => {
    switch (priority) {
      case 'high':
        return { label: i18n.t('mobile.mobile_task_list_page.k10'), color: 'error' as const };
      case 'medium':
        return { label: i18n.t('mobile.mobile_task_list_page.k11'), color: 'warning' as const };
      case 'low':
        return { label: i18n.t('mobile.mobile_task_list_page.k12'), color: 'success' as const };
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
      label: i18n.t('mobile.mobile_task_list_page.k13'),
      color: theme.palette.success.main,
      onClick: () => {},
    },
    {
      id: 'delete',
      icon: <AlertCircle style={{ width: 20, height: 20 }} />,
      label: i18n.t('mobile.mobile_task_list_page.k14'),
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
    {
      id: 'home',
      label: i18n.t('mobile.mobile_task_list_page.k15'),
      icon: <Home style={{ width: 22, height: 22 }} />,
    },
    {
      id: 'tasks',
      label: i18n.t('mobile.mobile_task_list_page.k16'),
      icon: <ListTodo style={{ width: 22, height: 22 }} />,
    },
    {
      id: 'scan',
      label: i18n.t('mobile.mobile_task_list_page.k17'),
      icon: <ScanLine style={{ width: 22, height: 22 }} />,
    },
    {
      id: 'approval',
      label: i18n.t('mobile.mobile_task_list_page.k18'),
      icon: <CheckSquare style={{ width: 22, height: 22 }} />,
      badge: 3,
    },
    {
      id: 'profile',
      label: i18n.t('mobile.mobile_task_list_page.k19'),
      icon: <User style={{ width: 22, height: 22 }} />,
    },
  ];
  return (
    <MobilePageTemplate
      title={i18n.t('mobile.mobile_task_list_page.k20')}
      bottomNav={
        <BottomTabBar
          tabs={bottomTabs}
          activeTab='tasks'
          onChange={handleBottomTabChange}
        />
      }
      headerProps={{
        showBack: false,
        showMenu: false,
        showSearch: true,
        showNotifications: true,
        notificationCount: 5,
      }}
    >
      <Box sx={{ px: 2, pt: 2 }}>
        <TextField
          fullWidth
          size='small'
          placeholder={i18n.t('mobile.mobile_task_list_page.k21')}
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
                    {i18n.t('pages.mobile_task_list_page.k7')}
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
            fontSize: designTokens.typography.fontSize.scale['0.875rem'],
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
              {i18n.t('pages.mobile_task_list_page.k8')}
            </Typography>
            <Typography
              variant='body2'
              color='text.secondary'
              sx={{ textAlign: 'center' }}
            >
              {searchQuery
                ? i18n.t('mobile.mobile_task_list_page.k23')
                : i18n.t('mobile.mobile_task_list_page.k22')}
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
                                  fontSize: designTokens.typography.fontSize.scale['0.7rem'],
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
                                  fontSize: designTokens.typography.fontSize.scale['0.7rem'],
                                  '& .MuiChip-label': { pl: 0.5, pr: 1 },
                                  '& .MuiChip-icon': { ml: 0.5, mr: 0 },
                                }}
                              />
                              <Chip
                                label={`${priorityConfig.label}${i18n.t('pages.mobile_task_list_page.k1')}`}
                                size='small'
                                color={priorityConfig.color}
                                variant='outlined'
                                sx={{
                                  height: 20,
                                  fontSize: designTokens.typography.fontSize.scale['0.7rem'],
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
                {i18n.t('pages.mobile_task_list_page.k9')}
              </Typography>
            </Box>
          )}
          {!hasMore && !loading && filteredTasks.length > 0 && (
            <Typography
              variant='caption'
              color='text.secondary'
            >
              {i18n.t('pages.mobile_task_list_page.k10')}
            </Typography>
          )}
        </Box>
      </PullToRefresh>
    </MobilePageTemplate>
  );
};
export default MobileTaskListPage;
