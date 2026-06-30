/**
 * 移动端首页 - V4.0 标准化改造
 *
 * @module pages/mobile
 * @path /mobile/home
 */

import React, { useState, useMemo } from 'react';
import {
  Home,
  Clock,
  CheckSquare,
  Scan,
  LayoutDashboard,
  Bell,
  User,
  ChevronRight,
  Calendar,
  FileText,
  AlertTriangle,
  ArrowUpRight,
} from 'lucide-react';
import { Box, Typography, Avatar, Paper, IconButton, Badge, Chip } from '@mui/material';
import { useNavigate } from 'react-router-dom';

import { PageContainer } from '@/components/common';
import { useAppStore } from '../../store';

const quickActions = [
  { id: 'attendance', label: '考勤打卡', icon: <Clock size={24} />, color: '#4CAF50', path: '/mobile/attendance' },
  { id: 'approval', label: '审批任务', icon: <CheckSquare size={24} />, color: '#2196F3', path: '/mobile/approvals' },
  { id: 'scan', label: '扫码功能', icon: <Scan size={24} />, color: '#FF9800', path: '/mobile/scan' },
  { id: 'workbench', label: '工作台', icon: <LayoutDashboard size={24} />, color: '#9C27B0', path: '/mobile/workbench' },
  { id: 'notification', label: '消息通知', icon: <Bell size={24} />, color: '#F44336', path: '/mobile/notifications' },
  { id: 'profile', label: '个人中心', icon: <User size={24} />, color: '#607D8B', path: '/mobile/profile' },
];

const mockTodos = [
  { id: '1', title: '采购订单审批 - PO20240115', type: 'approval', priority: 'high', time: '2小时后到期' },
  { id: '2', title: '完成周报填写', type: 'task', priority: 'medium', time: '今天' },
  { id: '3', title: '产品质量检验', type: 'task', priority: 'low', time: '明天' },
];

const mockActivities = [
  { id: '1', title: '采购订单已通过', time: '10分钟前', icon: <CheckSquare size={16} /> },
  { id: '2', title: '库存预警：原材料不足', time: '30分钟前', icon: <AlertTriangle size={16} /> },
  { id: '3', title: '新任务分配：质量巡检', time: '1小时前', icon: <FileText size={16} /> },
];

export const MobileHomePage: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);
  const [checkedIn, setCheckedIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState('');

  const handleCheckIn = () => {
    const now = new Date();
    setCheckInTime(now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }));
    setCheckedIn(true);
    addNotification({ title: '打卡成功', message: `上班打卡 ${checkInTime || now.toLocaleTimeString()}`, type: 'success' });
  };

  const today = new Date().toLocaleDateString('zh-CN', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <PageContainer headerProps={{ pageIcon: <Home size={20} />, title: '首页' }}>
      <Box sx={{ p: 2, bgcolor: 'background.default', minHeight: '100vh' }}>
        {/* 用户信息卡片 */}
        <Paper sx={{ p: 2, mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Badge overlap='circular' anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} badgeContent={<Box sx={{ width: 12, height: 12, bgcolor: 'success.main', borderRadius: '50%', border: 2, borderColor: 'background.paper' }} />}>
            <Avatar sx={{ width: 56, height: 56, bgcolor: 'primary.main' }}>陈</Avatar>
          </Badge>
          <Box sx={{ flex: 1 }}>
            <Typography variant='h6'>陈管理员</Typography>
            <Typography variant='body2' color='text.secondary'>技术部 · 产品经理</Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant='caption' color='text.secondary'>{today}</Typography>
          </Box>
        </Paper>

        {/* 打卡卡片 */}
        <Paper sx={{ p: 2, mb: 2, textAlign: 'center' }}>
          <Typography variant='body2' color='text.secondary' sx={{ mb: 1 }}>
            {new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 3 }}>
            <Box>
              <Typography variant='caption' color='text.secondary'>上班</Typography>
              <Typography variant='body2' fontWeight={500}>{checkedIn ? (checkInTime || '09:00') : '--:--'}</Typography>
            </Box>
            <Box sx={{ width: 1, bgcolor: 'divider' }} />
            <Box>
              <Typography variant='caption' color='text.secondary'>下班</Typography>
              <Typography variant='body2' fontWeight={500}>--:--</Typography>
            </Box>
          </Box>
          <Box sx={{ mt: 2 }}>
            <Chip label={checkedIn ? '已打卡' : '上班打卡'} color={checkedIn ? 'success' : 'primary'} onClick={handleCheckIn} sx={{ cursor: 'pointer' }} />
          </Box>
        </Paper>

        {/* 快捷入口 */}
        <Typography variant='subtitle1' fontWeight={500} sx={{ mb: 1.5 }}>快捷入口</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5, mb: 2 }}>
          {quickActions.map((action) => (
            <Paper key={action.id} sx={{ p: 2, textAlign: 'center', cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }} onClick={() => navigate(action.path)}>
              <Box sx={{ width: 48, height: 48, borderRadius: '50%', bgcolor: `${action.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 1, color: action.color }}>
                {action.icon}
              </Box>
              <Typography variant='caption' fontWeight={500}>{action.label}</Typography>
            </Paper>
          ))}
        </Box>

        {/* 待办事项 */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Typography variant='subtitle1' fontWeight={500}>待办事项</Typography>
          <Chip label='查看全部' size='small' onClick={() => navigate('/mobile/tasks')} />
        </Box>
        <Paper sx={{ mb: 2 }}>
          {mockTodos.map((todo, index) => (
            <Box key={todo.id}>
              <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }} onClick={() => navigate('/mobile/tasks')}>
                <Box sx={{ width: 4, height: 40, borderRadius: 2, bgcolor: todo.priority === 'high' ? 'error.main' : todo.priority === 'medium' ? 'warning.main' : 'info.main' }} />
                <Box sx={{ flex: 1 }}>
                  <Typography variant='body2' fontWeight={500}>{todo.title}</Typography>
                  <Typography variant='caption' color='text.secondary'>{todo.time}</Typography>
                </Box>
                <Chip label={todo.type === 'approval' ? '审批' : '任务'} size='small' variant='outlined' />
                <ChevronRight size={20} color='action' />
              </Box>
              {index < mockTodos.length - 1 && <Divider />}
            </Box>
          ))}
        </Paper>

        {/* 最近动态 */}
        <Typography variant='subtitle1' fontWeight={500} sx={{ mb: 1.5 }}>最近动态</Typography>
        <Paper>
          {mockActivities.map((activity, index) => (
            <Box key={activity.id}>
              <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ color: 'primary.main' }}>{activity.icon}</Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant='body2'>{activity.title}</Typography>
                  <Typography variant='caption' color='text.secondary'>{activity.time}</Typography>
                </Box>
              </Box>
              {index < mockActivities.length - 1 && <Divider />}
            </Box>
          ))}
        </Paper>
      </Box>
    </PageContainer>
  );
};

export default MobileHomePage;
