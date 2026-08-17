import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import i18n from '@/i18n';
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
import { designTokens } from '@/theme/tokens';
import { QUERY_KEYS } from '@/lib/reactQuery';

const ct = designTokens.colors;
export const NotificationDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const dashboardQuery = useQuery<boolean>({
    queryKey: QUERY_KEYS.AD_HOC.NOTIFICATION_DASHBOARD_BASE,
    queryFn: async () => true,
    staleTime: 5 * 60 * 1000,
  });
  const loading = dashboardQuery.isFetching;
  const stats: StatCard[] = useMemo(
    () => [
      {
        id: 'unread',
        title: i18n.t('notification.notification_dashboard_page.k0'),
        value: '23',
        icon: <Bell size={20} />,
        change: 5,
        changeLabel: i18n.t('notification.notification_dashboard_page.k1'),
        color: 'error',
      },
      {
        id: 'today',
        title: i18n.t('notification.notification_dashboard_page.k2'),
        value: '42',
        icon: <Inbox size={20} />,
        change: 8,
        changeLabel: i18n.t('notification.notification_dashboard_page.k3'),
        color: 'primary',
      },
      {
        id: 'week',
        title: i18n.t('notification.notification_dashboard_page.k4'),
        value: '256',
        icon: <Calendar size={20} />,
        change: 12,
        changeLabel: i18n.t('notification.notification_dashboard_page.k5'),
        color: 'info',
      },
      {
        id: 'read-rate',
        title: i18n.t('notification.notification_dashboard_page.k6'),
        value: '87.5',
        unit: '%',
        icon: <CheckCheck size={20} />,
        change: 3.2,
        changeLabel: i18n.t('notification.notification_dashboard_page.k7'),
        color: 'success',
      },
      {
        id: 'channels',
        title: i18n.t('notification.notification_dashboard_page.k8'),
        value: '4',
        icon: <Layers size={20} />,
        change: 0,
        changeLabel: i18n.t('notification.notification_dashboard_page.k9'),
        color: 'warning',
      },
      {
        id: 'templates',
        title: i18n.t('notification.notification_dashboard_page.k10'),
        value: '18',
        icon: <FileText size={20} />,
        change: 2,
        changeLabel: i18n.t('notification.notification_dashboard_page.k11'),
        color: 'secondary',
      },
    ],
    []
  );
  const charts: ChartCard[] = useMemo(
    () => [
      {
        id: 'trend',
        title: i18n.t('notification.notification_dashboard_page.k12'),
        subtitle: i18n.t('notification.notification_dashboard_page.7_13'),
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
        title: i18n.t('notification.notification_dashboard_page.k14'),
        subtitle: i18n.t('notification.notification_dashboard_page.k15'),
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
        title: i18n.t('notification.notification_dashboard_page.k16'),
        subtitle: i18n.t('notification.notification_dashboard_page.k17'),
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
        label: i18n.t('notification.notification_dashboard_page.k18'),
        icon: <Eye size={20} />,
        color: 'primary.light',
        onClick: () => {
          navigate(`${NOTIFICATION_PATHS.list}?filter=unread`);
          addNotification({
            message: i18n.t('notification.notification_dashboard_page.k19'),
            type: 'info',
            duration: 2000,
          });
        },
      },
      {
        id: 'mark-all-read',
        label: i18n.t('notification.notification_dashboard_page.k20'),
        icon: <CheckCheck size={20} />,
        color: 'success.light',
        onClick: () => {
          addNotification({
            message: i18n.t('notification.notification_dashboard_page.k21'),
            type: 'success',
            duration: 2000,
          });
        },
      },
      {
        id: 'notification-settings',
        label: i18n.t('notification.notification_dashboard_page.k22'),
        icon: <Settings size={20} />,
        color: 'info.light',
        onClick: () => navigate(NOTIFICATION_PATHS.settings),
      },
      {
        id: 'template-management',
        label: i18n.t('notification.notification_dashboard_page.k23'),
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
        title: i18n.t('notification.notification_dashboard_page.k24'),
        description: i18n.t('pages.notification_dashboard_page.k0'),
        time: i18n.t('pages.notification_dashboard_page.10_1'),
        icon: <AlertCircle size={18} />,
        status: 'warning',
        onClick: () => navigate(NOTIFICATION_PATHS.detail.replace(':id', '1')),
      },
      {
        id: '2',
        title: i18n.t('notification.notification_dashboard_page.k25'),
        description: i18n.t('pages.notification_dashboard_page.k2'),
        time: i18n.t('pages.notification_dashboard_page.30_3'),
        icon: <CheckCircle size={18} />,
        status: 'success',
        onClick: () => navigate(NOTIFICATION_PATHS.detail.replace(':id', '2')),
      },
      {
        id: '3',
        title: i18n.t('notification.notification_dashboard_page.k26'),
        description: i18n.t('notification.notification_dashboard_page.k27'),
        time: i18n.t('pages.notification_dashboard_page.1_4'),
        icon: <MessageSquare size={18} />,
        status: 'info',
        onClick: () => navigate(NOTIFICATION_PATHS.detail.replace(':id', '3')),
      },
      {
        id: '4',
        title: i18n.t('notification.notification_dashboard_page.k28'),
        description: i18n.t('notification.notification_dashboard_page.k29'),
        time: i18n.t('pages.notification_dashboard_page.2_5'),
        icon: <Info size={18} />,
        status: 'default',
        onClick: () => navigate(NOTIFICATION_PATHS.detail.replace(':id', '4')),
      },
      {
        id: '5',
        title: i18n.t('notification.notification_dashboard_page.k30'),
        description: i18n.t('pages.notification_dashboard_page.20246_6'),
        time: i18n.t('notification.notification_dashboard_page.k31'),
        icon: <FileText size={18} />,
        status: 'success',
        onClick: () => navigate(NOTIFICATION_PATHS.detail.replace(':id', '5')),
      },
    ],
    [navigate]
  );
  const handleRefresh = () => {
    dashboardQuery.refetch();
    addNotification({
      message: i18n.t('notification.notification_dashboard_page.k32'),
      type: 'success',
      duration: 2000,
    });
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
        recentTitle={i18n.t('notification.notification_dashboard_page.k33')}
        onRefresh={handleRefresh}
      />
    </PageContainer>
  );
};
const NotificationTrendChart: React.FC = () => {
  const days = [
    i18n.t('notification.notification_dashboard_page.k40'),
    i18n.t('notification.notification_dashboard_page.k39'),
    i18n.t('notification.notification_dashboard_page.k38'),
    i18n.t('notification.notification_dashboard_page.k37'),
    i18n.t('notification.notification_dashboard_page.k36'),
    i18n.t('notification.notification_dashboard_page.k35'),
    i18n.t('notification.notification_dashboard_page.k34'),
  ];
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
            {i18n.t('pages.notification_dashboard_page.k0')}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'success.main' }} />
          <Typography
            variant='caption'
            color='text.secondary'
          >
            {i18n.t('pages.notification_dashboard_page.k1')}
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
    {
      label: i18n.t('notification.notification_dashboard_page.k41'),
      value: 35,
      color: 'primary.main',
    },
    {
      label: i18n.t('notification.notification_dashboard_page.k42'),
      value: 28,
      color: 'success.main',
    },
    {
      label: i18n.t('notification.notification_dashboard_page.k43'),
      value: 22,
      color: 'warning.main',
    },
    {
      label: i18n.t('notification.notification_dashboard_page.k44'),
      value: 15,
      color: 'secondary.main',
    },
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
    {
      label: i18n.t('notification.notification_dashboard_page.k45'),
      value: 120,
      color: 'primary.main',
    },
    {
      label: i18n.t('notification.notification_dashboard_page.k46'),
      value: 85,
      color: 'success.main',
    },
    {
      label: i18n.t('notification.notification_dashboard_page.k47'),
      value: 180,
      color: 'warning.main',
    },
    {
      label: i18n.t('notification.notification_dashboard_page.k48'),
      value: 95,
      color: 'secondary.main',
    },
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
