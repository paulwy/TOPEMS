/**
 * ERP 集成概览页面
 *
 * @module pages/integration
 * @path /integration/erp-overview
 */

import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  Button,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Avatar,
  IconButton,
  Divider,
} from '@mui/material';
import {
  Building2,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Settings,
  Database,
  GitMerge,
  AlertCircle,
  CheckCircle2,
  Clock,
  TrendingUp,
  TrendingDown,
  ExternalLink,
  Bell,
} from 'lucide-react';

import { PageContainer } from '@/components/common';
import {
  DashboardTemplate,
  type StatCard,
  type ChartCard,
  type QuickAction,
  type RecentItem,
} from '@/components/templates';
import { useAppStore } from '../../store';

type SyncStatus = 'success' | 'syncing' | 'error' | 'pending';

interface SyncTask {
  id: string;
  name: string;
  type: string;
  status: SyncStatus;
  lastSyncTime: string;
  records: number;
  progress?: number;
}

interface SyncLog {
  id: string;
  action: string;
  module: string;
  user: string;
  time: string;
  status: 'success' | 'error';
}

const MOCK_SYNC_TASKS: SyncTask[] = [
  {
    id: 'sync-001',
    name: '用户数据同步',
    type: 'IAM',
    status: 'success',
    lastSyncTime: '2024-01-15 14:30:00',
    records: 1250,
  },
  {
    id: 'sync-002',
    name: '库存数据同步',
    type: 'WMS',
    status: 'syncing',
    lastSyncTime: '2024-01-15 14:25:00',
    records: 856,
    progress: 65,
  },
  {
    id: 'sync-003',
    name: '订单数据同步',
    type: 'ERP',
    status: 'success',
    lastSyncTime: '2024-01-15 14:20:00',
    records: 342,
  },
  {
    id: 'sync-004',
    name: '财务数据同步',
    type: 'FIN',
    status: 'error',
    lastSyncTime: '2024-01-15 14:15:00',
    records: 0,
  },
  {
    id: 'sync-005',
    name: '客户数据同步',
    type: 'CRM',
    status: 'pending',
    lastSyncTime: '-',
    records: 0,
  },
];

const MOCK_SYNC_LOGS: SyncLog[] = [
  {
    id: 'log-001',
    action: '数据同步完成',
    module: '用户管理',
    user: '系统',
    time: '14:30:00',
    status: 'success',
  },
  {
    id: 'log-002',
    action: '同步失败',
    module: '财务管理',
    user: '系统',
    time: '14:15:00',
    status: 'error',
  },
  {
    id: 'log-003',
    action: '开始同步',
    module: '库存管理',
    user: '系统',
    time: '14:25:00',
    status: 'success',
  },
  {
    id: 'log-004',
    action: '数据同步完成',
    module: '订单管理',
    user: '系统',
    time: '14:20:00',
    status: 'success',
  },
  {
    id: 'log-005',
    action: '数据同步完成',
    module: '客户管理',
    user: '系统',
    time: '14:10:00',
    status: 'success',
  },
];

const getStatusIcon = (status: SyncStatus) => {
  switch (status) {
    case 'success':
      return (
        <CheckCircle2
          size={16}
          color='#4caf50'
        />
      );
    case 'syncing':
      return (
        <RefreshCw
          size={16}
          color='#1976d2'
          className='spin'
        />
      );
    case 'error':
      return (
        <AlertCircle
          size={16}
          color='#f44336'
        />
      );
    case 'pending':
      return (
        <Clock
          size={16}
          color='#9e9e9e'
        />
      );
  }
};

const getStatusLabel = (status: SyncStatus) => {
  const labels: Record<SyncStatus, string> = {
    success: '成功',
    syncing: '同步中',
    error: '失败',
    pending: '待执行',
  };
  return labels[status];
};

const getStatusColor = (status: SyncStatus) => {
  const colors: Record<SyncStatus, string> = {
    success: 'success',
    syncing: 'primary',
    error: 'error',
    pending: 'default',
  };
  return colors[status];
};

export const IntegrationErpOverviewPage: React.FC = () => {
  const addNotification = useAppStore((state) => state.addNotification);
  const [loading, setLoading] = useState(false);

  const stats: StatCard[] = useMemo(
    () => [
      {
        id: 'total-syncs',
        title: '同步任务',
        value: '12',
        icon: <GitMerge size={20} />,
        change: 2,
        changeLabel: '较上周',
        color: 'primary',
      },
      {
        id: 'success-rate',
        title: '成功率',
        value: '96.5%',
        icon: <TrendingUp size={20} />,
        change: 1.2,
        changeLabel: '较上周',
        color: 'success',
      },
      {
        id: 'total-records',
        title: '同步记录',
        value: '12,580',
        icon: <Database size={20} />,
        change: 1250,
        changeLabel: '较上周',
        color: 'info',
      },
      {
        id: 'errors',
        title: '错误数',
        value: '3',
        icon: <AlertCircle size={20} />,
        change: -2,
        changeLabel: '较上周',
        color: 'error',
      },
    ],
    []
  );

  const quickActions: QuickAction[] = useMemo(
    () => [
      {
        id: 'new-sync',
        label: '新建同步',
        icon: <RefreshCw size={20} />,
        onClick: () =>
          addNotification({
            title: '新建同步任务',
            message: '创建新的数据同步任务',
            type: 'info',
          }),
      },
      {
        id: 'view-logs',
        label: '查看日志',
        icon: <Clock size={20} />,
        onClick: () =>
          addNotification({
            title: '同步日志',
            message: '查看所有同步操作日志',
            type: 'info',
          }),
      },
      {
        id: 'settings',
        label: '同步设置',
        icon: <Settings size={20} />,
        onClick: () =>
          addNotification({
            title: '同步设置',
            message: '配置ERP同步参数',
            type: 'info',
          }),
      },
    ],
    [addNotification]
  );

  const recentItems: RecentItem[] = useMemo(
    () =>
      MOCK_SYNC_LOGS.slice(0, 5).map((log) => ({
        id: log.id,
        title: log.action,
        description: `${log.module} · ${log.user}`,
        time: log.time,
        icon: log.status === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />,
        iconColor: log.status === 'success' ? 'success.main' : 'error.main',
      })),
    []
  );

  const syncTasksList = useMemo(
    () =>
      MOCK_SYNC_TASKS.map((task) => (
        <ListItem
          key={task.id}
          sx={{
            px: 2,
            py: 1.5,
            '&:hover': { bgcolor: 'action.hover' },
          }}
        >
          <ListItemIcon sx={{ minWidth: 36 }}>
            <Avatar
              sx={{
                width: 32,
                height: 32,
                bgcolor: `${getStatusColor(task.status)}.main`,
                opacity: task.status === 'syncing' ? 0.7 : 1,
              }}
            >
              {getStatusIcon(task.status)}
            </Avatar>
          </ListItemIcon>
          <ListItemText
            primary={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography
                  variant='body2'
                  sx={{ fontWeight: 500 }}
                >
                  {task.name}
                </Typography>
                <Chip
                  size='small'
                  label={task.type}
                  variant='outlined'
                  sx={{ height: 18, fontSize: '0.65rem' }}
                />
              </Box>
            }
            secondary={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 0.5 }}>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  {task.lastSyncTime}
                </Typography>
                {task.records > 0 && (
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    {task.records} 条记录
                  </Typography>
                )}
                {task.progress !== undefined && (
                  <Box sx={{ width: 60 }}>
                    <LinearProgress
                      variant='determinate'
                      value={task.progress}
                      sx={{ height: 4, borderRadius: 3 }}
                    />
                  </Box>
                )}
              </Box>
            }
          />
          <Chip
            size='small'
            label={getStatusLabel(task.status)}
            color={getStatusColor(task.status) as any}
            variant={task.status === 'syncing' ? 'outlined' : 'filled'}
          />
        </ListItem>
      )),
    []
  );

  return (
    <PageContainer
      title='ERP 集成概览'
      subtitle='管理 ERP 系统数据同步'
    >
      <DashboardTemplate
        title='ERP 集成概览'
        stats={stats}
        quickActions={quickActions}
        recentItems={recentItems}
        charts={[]}
      />

      {/* Sync Tasks Section */}
      <Card
        variant='outlined'
        sx={{ mt: 3 }}
      >
        <CardContent>
          <Box
            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Building2 size={20} />
              <Typography
                variant='subtitle1'
                sx={{ fontWeight: 600 }}
              >
                同步任务
              </Typography>
            </Box>
            <Button
              size='small'
              variant='outlined'
              startIcon={<RefreshCw size={14} />}
              onClick={() =>
                addNotification({
                  title: '刷新同步任务',
                  message: '正在刷新同步任务列表',
                  type: 'info',
                })
              }
            >
              刷新
            </Button>
          </Box>
          <Divider sx={{ mb: 1 }} />
          <List disablePadding>{syncTasksList}</List>
        </CardContent>
      </Card>

      {/* Connection Status */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 2 }}>
        <Box sx={{ flex: 1, minWidth: { xs: '100%', md: 'calc(50% - 8px)' } }}>
          <Card variant='outlined'>
            <CardContent>
              <Typography
                variant='subtitle2'
                sx={{ fontWeight: 600, mb: 2 }}
              >
                ERP 连接状态
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box
                  sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Database size={16} />
                    <Typography variant='body2'>主数据库</Typography>
                  </Box>
                  <Chip
                    size='small'
                    label='已连接'
                    color='success'
                  />
                </Box>
                <Box
                  sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <GitMerge size={16} />
                    <Typography variant='body2'>实时同步服务</Typography>
                  </Box>
                  <Chip
                    size='small'
                    label='运行中'
                    color='success'
                  />
                </Box>
                <Box
                  sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Bell size={16} />
                    <Typography variant='body2'>告警服务</Typography>
                  </Box>
                  <Chip
                    size='small'
                    label='正常'
                    color='success'
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ flex: 1, minWidth: { xs: '100%', md: 'calc(50% - 8px)' } }}>
          <Card variant='outlined'>
            <CardContent>
              <Typography
                variant='subtitle2'
                sx={{ fontWeight: 600, mb: 2 }}
              >
                同步统计
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ flex: 1, minWidth: 'calc(50% - 8px)' }}>
                  <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'success.50', borderRadius: 1 }}>
                    <Typography
                      variant='h5'
                      sx={{ fontWeight: 600, color: 'success.main' }}
                    >
                      1,250
                    </Typography>
                    <Typography
                      variant='caption'
                      color='text.secondary'
                    >
                      今日同步
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ flex: 1, minWidth: 'calc(50% - 8px)' }}>
                  <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'primary.50', borderRadius: 1 }}>
                    <Typography
                      variant='h5'
                      sx={{ fontWeight: 600, color: 'primary.main' }}
                    >
                      3.2s
                    </Typography>
                    <Typography
                      variant='caption'
                      color='text.secondary'
                    >
                      平均延迟
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ flex: 1, minWidth: 'calc(50% - 8px)' }}>
                  <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'warning.50', borderRadius: 1 }}>
                    <Typography
                      variant='h5'
                      sx={{ fontWeight: 600, color: 'warning.main' }}
                    >
                      99.2%
                    </Typography>
                    <Typography
                      variant='caption'
                      color='text.secondary'
                    >
                      可用率
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ flex: 1, minWidth: 'calc(50% - 8px)' }}>
                  <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'info.50', borderRadius: 1 }}>
                    <Typography
                      variant='h5'
                      sx={{ fontWeight: 600, color: 'info.main' }}
                    >
                      15
                    </Typography>
                    <Typography
                      variant='caption'
                      color='text.secondary'
                    >
                      活跃连接
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </PageContainer>
  );
};

export default IntegrationErpOverviewPage;
