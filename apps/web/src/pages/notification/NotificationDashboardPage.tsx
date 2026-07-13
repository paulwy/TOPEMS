import React, { useState, useMemo } from 'react';
import {
  Bell,
  Inbox,
  Calendar,
  CheckCheck,
  Layers,
  FileText,
  TrendingUp,
  BarChart3,
  PieChart,
  Eye,
  Settings,
  AlertCircle,
  CheckCircle,
  Info,
  MessageSquare,
} from 'lucide-react';
import { Box, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { NOTIFICATION_PATHS } from '@/modules/notification/config';

import { PageContainer } from '@/components/common';
import {
  DashboardTemplate,
  type StatCard,
  type ChartCard,
  type QuickAction,
  type RecentItem,
} from '@/components/templates';
import { useNotificationStore } from '@/store';
import { logError } from '@/utils/errors';
import { designTokens } from '@/theme/tokens';

const ct = designTokens.colors;

export const NotificationDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const [loading, setLoading] = useState(false);

  const stats: StatCard[] = useMemo(
    () => [
      {
        id: 'unread',
        title: '未读消息',
        value: '23',
        icon: <Bell size={20} />,
        change: 5,
        changeLabel: '较昨日',
        color: 'error',
      },
      {
        id: 'today',
        title: '今日通知',
        value: '42',
        icon: <Inbox size={20} />,
        change: 8,
        changeLabel: '较昨日',
        color: 'primary',
      },
      {
        id: 'week',
        title: '本周通知',
        value: '256',
        icon: <Calendar size={20} />,
        change: 12,
        changeLabel: '环比增长',
        color: 'info',
      },
      {
        id: 'read-rate',
        title: '已读率',
        value: '87.5',
        unit: '%',
        icon: <CheckCheck size={20} />,
        change: 3.2,
        changeLabel: '较上周',
        color: 'success',
      },
      {
        id: 'channels',
        title: '通知渠道数',
        value: '4',
        icon: <Layers size={20} />,
        change: 0,
        changeLabel: '渠道类型',
        color: 'warning',
      },
      {
        id: 'templates',
        title: '模板数量',
        value: '18',
        icon: <FileText size={20} />,
        change: 2,
        changeLabel: '较上月',
        color: 'secondary',
      },
    ],
    []
  );

  const charts: ChartCard[] = useMemo(
    () => [
      {
        id: 'trend',
        title: '通知趋势',
        subtitle: '近7天发送与已读趋势',
        icon: <TrendingUp size={18} />,
        type: 'line',
        chart: (
          <Box
            sx={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <NotificationTrendChart />
          </Box>
        ),
        height: 300,
        span: 2,
      },
      {
        id: 'type-distribution',
        title: '类型分布',
        subtitle: '系统/审批/任务/消息',
        icon: <PieChart size={18} />,
        type: 'pie',
        chart: (
          <Box
            sx={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <TypeDistributionChart />
          </Box>
        ),
        height: 300,
        span: 1,
      },
      {
        id: 'channel-distribution',
        title: '渠道分布',
        subtitle: '邮件/短信/站内信/推送',
        icon: <BarChart3 size={18} />,
        type: 'bar',
        chart: (
          <Box
            sx={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ChannelDistributionChart />
          </Box>
        ),
        height: 300,
        span: 1,
      },
    ],
    []
  );

  const quickActions: QuickAction[] = useMemo(
    () => [
      {
        id: 'view-unread',
        label: '查看未读',
        icon: <Eye size={20} />,
        color: 'primary.light',
        onClick: () => {
          navigate(`${NOTIFICATION_PATHS.list}?filter=unread`);
          addNotification({
            message: '正在跳转到未读消息列表',
            type: 'info',
            duration: 2000,
          });
        },
      },
      {
        id: 'mark-all-read',
        label: '全部已读',
        icon: <CheckCheck size={20} />,
        color: 'success.light',
        onClick: () => {
          addNotification({
            message: '所有消息已标记为已读',
            type: 'success',
            duration: 2000,
          });
        },
      },
      {
        id: 'notification-settings',
        label: '通知设置',
        icon: <Settings size={20} />,
        color: 'info.light',
        onClick: () => navigate(NOTIFICATION_PATHS.settings),
      },
      {
        id: 'template-management',
        label: '模板管理',
        icon: <FileText size={20} />,
        color: 'warning.light',
        onClick: () => navigate(NOTIFICATION_PATHS.templates),
      },
    ],
    [navigate, addNotification]
  );

  const recentItems: RecentItem[] = useMemo(
    () => [
      {
        id: '1',
        title: '系统升级通知',
        description: '系统将于今晚22:00-24:00进行升级维护',
        time: '10分钟前',
        icon: <AlertCircle size={18} />,
        status: 'warning',
        onClick: () => navigate(NOTIFICATION_PATHS.detail.replace(':id', '1')),
      },
      {
        id: '2',
        title: '采购订单审批通过',
        description: 'PO-20240630-001 已通过审批',
        time: '30分钟前',
        icon: <CheckCircle size={18} />,
        status: 'success',
        onClick: () => navigate(NOTIFICATION_PATHS.detail.replace(':id', '2')),
      },
      {
        id: '3',
        title: '新任务分配',
        description: '您有一个新的待处理任务：项目周报',
        time: '1小时前',
        icon: <MessageSquare size={18} />,
        status: 'info',
        onClick: () => navigate(NOTIFICATION_PATHS.detail.replace(':id', '3')),
      },
      {
        id: '4',
        title: '密码安全提醒',
        description: '您的密码即将过期，请及时更新',
        time: '2小时前',
        icon: <Info size={18} />,
        status: 'default',
        onClick: () => navigate(NOTIFICATION_PATHS.detail.replace(':id', '4')),
      },
      {
        id: '5',
        title: '月度报告已生成',
        description: '2024年6月运营报告已生成，请查看',
        time: '昨天',
        icon: <FileText size={18} />,
        status: 'success',
        onClick: () => navigate(NOTIFICATION_PATHS.detail.replace(':id', '5')),
      },
    ],
    [navigate]
  );

  const handleRefresh = () => {
    setLoading(true);
    try {
      addNotification({
        message: '仪表盘数据已刷新',
        type: 'success',
        duration: 2000,
      });
    } catch (error) {
      logError('NotificationDashboard', error);
    } finally {
      setTimeout(() => setLoading(false), 500);
    }
  };

  return (
    <PageContainer
      headerProps={{
        pageIcon: <Bell size={20} />,
      }}
    >
      <DashboardTemplate
        title=''
        subtitle=''
        loading={loading}
        stats={stats}
        charts={charts}
        quickActions={quickActions}
        recentItems={recentItems}
        recentTitle='最近通知'
        onRefresh={handleRefresh}
      />
    </PageContainer>
  );
};

const NotificationTrendChart: React.FC = () => {
  const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  const sentData = [45, 52, 38, 65, 48, 28, 32];
  const readData = [38, 45, 32, 58, 42, 22, 28];
  const max = Math.max(...sentData, ...readData);

  const sentPoints = sentData
    .map((value, index) => {
      const x = (index / (days.length - 1)) * 100;
      const y = 100 - (value / max) * 90 - 5;
      return `${x},${y}`;
    })
    .join(' ');

  const readPoints = readData
    .map((value, index) => {
      const x = (index / (days.length - 1)) * 100;
      const y = 100 - (value / max) * 90 - 5;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <Box sx={{ width: '100%', height: '100%', p: 2 }}>
      <Box sx={{ display: 'flex', gap: 2, mb: 1, justifyContent: 'flex-end' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main' }} />
          <Typography
            variant='caption'
            color='text.secondary'
          >
            发送
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'success.main' }} />
          <Typography
            variant='caption'
            color='text.secondary'
          >
            已读
          </Typography>
        </Box>
      </Box>
      <svg
        width='100%'
        height='80%'
        preserveAspectRatio='none'
      >
        {[0, 25, 50, 75, 100].map((value) => (
          <line
            key={value}
            x1='0'
            y1={`${100 - value}%`}
            x2='100%'
            y2={`${100 - value}%`}
            stroke={ct.grey[300]}
            strokeWidth='0.5'
            strokeDasharray='4,4'
          />
        ))}
        <polyline
          points={sentPoints}
          fill='none'
          stroke='primary.main'
          strokeWidth='2'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
        <polyline
          points={readPoints}
          fill='none'
          stroke='success.main'
          strokeWidth='2'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
      </svg>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
        {days.map((day) => (
          <Typography
            key={day}
            variant='caption'
            color='text.secondary'
          >
            {day}
          </Typography>
        ))}
      </Box>
    </Box>
  );
};

const TypeDistributionChart: React.FC = () => {
  const data = [
    { label: '系统', value: 35, color: 'primary.main' },
    { label: '审批', value: 28, color: 'success.main' },
    { label: '任务', value: 22, color: 'warning.main' },
    { label: '消息', value: 15, color: 'secondary.main' },
  ];

  const total = data.reduce((sum, item) => sum + item.value, 0);
  let currentAngle = -90;

  const radius = 60;
  const center = 80;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, width: '100%', height: '100%' }}>
      <svg
        width='160'
        height='160'
        viewBox='0 0 160 160'
      >
        {data.map((item, index) => {
          const angle = (item.value / total) * 360;
          const startAngle = currentAngle;
          const endAngle = currentAngle + angle;
          currentAngle = endAngle;

          const startRad = (startAngle * Math.PI) / 180;
          const endRad = (endAngle * Math.PI) / 180;

          const x1 = center + radius * Math.cos(startRad);
          const y1 = center + radius * Math.sin(startRad);
          const x2 = center + radius * Math.cos(endRad);
          const y2 = center + radius * Math.sin(endRad);

          const largeArc = angle > 180 ? 1 : 0;

          const pathData = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;

          return (
            <path
              key={index}
              d={pathData}
              fill={item.color}
            />
          );
        })}
        <circle
          cx={center}
          cy={center}
          r={35}
          fill='white'
        />
      </svg>
      <Box sx={{ flex: 1 }}>
        {data.map((item) => (
          <Box
            key={item.label}
            sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}
          >
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: item.color }} />
            <Typography
              variant='body2'
              sx={{ flex: 1 }}
            >
              {item.label}
            </Typography>
            <Typography
              variant='body2'
              color='text.secondary'
            >
              {item.value}%
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

const ChannelDistributionChart: React.FC = () => {
  const data = [
    { label: '邮件', value: 120, color: 'primary.main' },
    { label: '短信', value: 85, color: 'success.main' },
    { label: '站内信', value: 180, color: 'warning.main' },
    { label: '推送', value: 95, color: 'secondary.main' },
  ];

  const max = Math.max(...data.map((item) => item.value));

  return (
    <Box sx={{ width: '100%', height: '100%', p: 2 }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'flex-end',
          height: '75%',
        }}
      >
        {data.map((item) => (
          <Box
            key={item.label}
            sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}
          >
            <Typography
              variant='caption'
              color='text.secondary'
            >
              {item.value}
            </Typography>
            <Box
              sx={{
                width: 32,
                height: `${(item.value / max) * 100}%`,
                bgcolor: item.color,
                borderRadius: 1,
                minHeight: 8,
              }}
            />
          </Box>
        ))}
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-around', mt: 1 }}>
        {data.map((item) => (
          <Typography
            key={item.label}
            variant='caption'
            color='text.secondary'
          >
            {item.label}
          </Typography>
        ))}
      </Box>
    </Box>
  );
};

export default NotificationDashboardPage;
