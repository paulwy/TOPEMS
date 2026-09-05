/**
 * 移动端首页 - V4.0 标准化改造
 *
 * @module pages/mobile
 * @path /mobile/home
 */
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { mobileApi } from '@/api/mobile';
import {
  Clock,
  CheckSquare,
  Scan,
  LayoutDashboard,
  Bell,
  User,
  ChevronRight,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import i18n from '@/i18n';
import { Box, Typography, Avatar, Paper, Badge, Chip, Divider } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { MobilePageTemplate } from '@/components/templates';
import { useNotificationStore } from '../../store';
import { designTokens } from '@/theme/tokens';
import { MOBILE_PATHS } from '@/modules/mobile/config';

const ct = designTokens.colors;
const quickActions = [
  {
    id: 'attendance',
    label: i18n.t('mobile.mobile_home_page.k0'),
    icon: <Clock size={24} />,
    color: ct.success.main,
    path: MOBILE_PATHS.attendance,
  },
  {
    id: 'approval',
    label: i18n.t('mobile.mobile_home_page.k1'),
    icon: <CheckSquare size={24} />,
    color: ct.primary.main,
    path: MOBILE_PATHS.approvals,
  },
  {
    id: 'scan',
    label: i18n.t('mobile.mobile_home_page.k2'),
    icon: <Scan size={24} />,
    color: ct.warning.main,
    path: MOBILE_PATHS.scan,
  },
  {
    id: 'workbench',
    label: i18n.t('mobile.mobile_home_page.k3'),
    icon: <LayoutDashboard size={24} />,
    color: ct.secondary.main,
    path: MOBILE_PATHS.workbench,
  },
  {
    id: 'notification',
    label: i18n.t('mobile.mobile_home_page.k4'),
    icon: <Bell size={24} />,
    color: ct.error.main,
    path: MOBILE_PATHS.notifications,
  },
  {
    id: 'profile',
    label: i18n.t('mobile.mobile_home_page.k5'),
    icon: <User size={24} />,
    color: ct.text.secondary,
    path: MOBILE_PATHS.profile,
  },
];
const mockTodos = [
  {
    id: '1',
    title: i18n.t('mobile.mobile_home_page.po20240115_6'),
    type: 'approval',
    priority: 'high',
    time: i18n.t('pages.mobile_home_page.2_0'),
  },
  {
    id: '2',
    title: i18n.t('mobile.mobile_home_page.k8'),
    type: 'task',
    priority: 'medium',
    time: i18n.t('mobile.mobile_home_page.k7'),
  },
  {
    id: '3',
    title: i18n.t('mobile.mobile_home_page.k10'),
    type: 'task',
    priority: 'low',
    time: i18n.t('mobile.mobile_home_page.k9'),
  },
];
const mockActivities = [
  {
    id: '1',
    title: i18n.t('mobile.mobile_home_page.k11'),
    time: i18n.t('pages.mobile_home_page.10_1'),
    icon: <CheckSquare size={16} />,
  },
  {
    id: '2',
    title: i18n.t('mobile.mobile_home_page.k12'),
    time: i18n.t('pages.mobile_home_page.30_2'),
    icon: <AlertTriangle size={16} />,
  },
  {
    id: '3',
    title: i18n.t('mobile.mobile_home_page.k13'),
    time: i18n.t('pages.mobile_home_page.1_3'),
    icon: <FileText size={16} />,
  },
];
export const MobileHomePage: React.FC = () => {
  const {} = useQuery({
    queryKey: ['mobile-home-page'],
    queryFn: async () => {
      try {
        return (await mobileApi.analytics.getUsageStats()) ?? {};
      } catch {
        return {};
      }
    },
  });
  const navigate = useNavigate();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const [checkedIn, setCheckedIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState('');
  const handleCheckIn = () => {
    const now = new Date();
    setCheckInTime(now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }));
    setCheckedIn(true);
    addNotification({
      title: i18n.t('mobile.mobile_home_page.k14'),
      message: `${i18n.t('pages.mobile_home_page.k4')}${checkInTime || now.toLocaleTimeString()}`,
      type: 'success',
    });
  };
  const today = new Date().toLocaleDateString('zh-CN', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  return (
    <MobilePageTemplate title={i18n.t('mobile.mobile_home_page.k15')}>
      <Box sx={{ p: 2, pb: 3, bgcolor: 'background.default' }}>
        {/* 用户信息卡片 */}
        <Paper sx={{ p: 2, mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Badge
            overlap='circular'
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            badgeContent={
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  bgcolor: 'success.main',
                  borderRadius: '50%',
                  border: 2,
                  borderColor: 'background.paper',
                }}
              />
            }
          >
            <Avatar sx={{ width: 56, height: 56, bgcolor: 'primary.main' }}>
              {i18n.t('pages.mobile_home_page.k0')}
            </Avatar>
          </Badge>
          <Box sx={{ flex: 1 }}>
            <Typography variant='h6'>{i18n.t('mobile.mobile_home_page.k16')}</Typography>
            <Typography
              variant='body2'
              color='text.secondary'
            >
              {i18n.t('pages.mobile_home_page.k1')}
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography
              variant='caption'
              color='text.secondary'
            >
              {today}
            </Typography>
          </Box>
        </Paper>
        {/* 打卡卡片 */}
        <Paper sx={{ p: 2, mb: 2, textAlign: 'center' }}>
          <Typography
            variant='body2'
            color='text.secondary'
            sx={{ mb: 1 }}
          >
            {new Date().toLocaleTimeString('zh-CN', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 3 }}>
            <Box>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                {i18n.t('pages.mobile_home_page.k2')}
              </Typography>
              <Typography
                variant='body2'
                sx={{ fontWeight: 500 }}
              >
                {checkedIn ? checkInTime || '09:00' : '--:--'}
              </Typography>
            </Box>
            <Box sx={{ width: 1, bgcolor: 'divider' }} />
            <Box>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                {i18n.t('pages.mobile_home_page.k3')}
              </Typography>
              <Typography
                variant='body2'
                sx={{ fontWeight: 500 }}
              >
                --:--
              </Typography>
            </Box>
          </Box>
          <Box sx={{ mt: 2 }}>
            <Chip
              label={
                checkedIn
                  ? i18n.t('mobile.mobile_home_page.k18')
                  : i18n.t('mobile.mobile_home_page.k17')
              }
              color={checkedIn ? 'success' : 'primary'}
              onClick={handleCheckIn}
              sx={{ cursor: 'pointer' }}
            />
          </Box>
        </Paper>
        {/* 快捷入口 */}
        <Typography
          variant='subtitle1'
          sx={{ fontWeight: 500, mb: 1.5 }}
        >
          {i18n.t('pages.mobile_home_page.k4')}
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5, mb: 2 }}>
          {quickActions.map((action) => (
            <Paper
              key={action.id}
              sx={{
                p: 2,
                textAlign: 'center',
                cursor: 'pointer',
                '&:hover': { bgcolor: 'action.hover' },
              }}
              onClick={() => navigate(action.path)}
            >
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  bgcolor: `${action.color}20`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 1,
                  color: action.color,
                }}
              >
                {action.icon}
              </Box>
              <Typography
                variant='caption'
                sx={{ fontWeight: 500 }}
              >
                {action.label}
              </Typography>
            </Paper>
          ))}
        </Box>
        {/* 待办事项 */}
        <Box
          sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}
        >
          <Typography
            variant='subtitle1'
            sx={{ fontWeight: 500 }}
          >
            {i18n.t('pages.mobile_home_page.k5')}
          </Typography>
          <Chip
            label={i18n.t('mobile.mobile_home_page.k19')}
            size='small'
            onClick={() => navigate(MOBILE_PATHS.tasks)}
          />
        </Box>
        <Paper sx={{ mb: 2 }}>
          {mockTodos.map((todo, index) => (
            <Box key={todo.id}>
              <Box
                sx={{
                  p: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'action.hover' },
                }}
                onClick={() => navigate(MOBILE_PATHS.tasks)}
              >
                <Box
                  sx={{
                    width: 4,
                    height: 40,
                    borderRadius: 3,
                    bgcolor:
                      todo.priority === 'high'
                        ? 'error.main'
                        : todo.priority === 'medium'
                          ? 'warning.main'
                          : 'info.main',
                  }}
                />
                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant='body2'
                    sx={{ fontWeight: 500 }}
                  >
                    {todo.title}
                  </Typography>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    {todo.time}
                  </Typography>
                </Box>
                <Chip
                  label={
                    todo.type === 'approval'
                      ? i18n.t('mobile.mobile_home_page.k21')
                      : i18n.t('mobile.mobile_home_page.k20')
                  }
                  size='small'
                  variant='outlined'
                />
                <ChevronRight
                  size={20}
                  color='action'
                />
              </Box>
              {index < mockTodos.length - 1 && <Divider />}
            </Box>
          ))}
        </Paper>
        {/* 最近动态 */}
        <Typography
          variant='subtitle1'
          sx={{ fontWeight: 500, mb: 1.5 }}
        >
          {i18n.t('pages.mobile_home_page.k6')}
        </Typography>
        <Paper>
          {mockActivities.map((activity, index) => (
            <Box key={activity.id}>
              <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ color: 'primary.main' }}>{activity.icon}</Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant='body2'>{activity.title}</Typography>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    {activity.time}
                  </Typography>
                </Box>
              </Box>
              {index < mockActivities.length - 1 && <Divider />}
            </Box>
          ))}
        </Paper>
      </Box>
    </MobilePageTemplate>
  );
};
export default MobileHomePage;
