import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Checkbox,
  Avatar,
  Badge,
  IconButton,
} from '@mui/material';
import { Grid } from '@/components';
import { useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  Phone,
} from 'lucide-react';
import { useAuth } from '@/hooks';

// ── Mock Data ──────────────────────────────────────────────

const todoData = [
  { id: 1, title: '审批采购订单 PO-2024-0087', time: '10:30', priority: 'urgent' as const },
  { id: 2, title: '完成Q3生产计划排程', time: '09:15', priority: 'warning' as const },
  { id: 3, title: '客户样品发货确认', time: '昨天 16:42', priority: 'normal' as const },
  { id: 4, title: '月度财务报表审核', time: '昨天 14:20', priority: 'urgent' as const },
  { id: 5, title: '新员工入职培训安排', time: '昨天 11:05', priority: 'normal' as const },
];

const activityData = [
  { name: '李四', initial: '李', action: '提交了采购订单', time: '5分钟前', gradient: 'primary' as const },
  { name: '王五', initial: '王', action: '完成了生产批次 B-2024-156', time: '23分钟前', gradient: 'success' as const },
  { name: '赵六', initial: '赵', action: '新增了客户"恒达化工"', time: '1小时前', gradient: 'warning' as const },
  { name: '陈七', initial: '陈', action: '更新了项目进度至78%', time: '2小时前', gradient: 'info' as const },
  { name: '孙八', initial: '孙', action: '上传了质检报告', time: '3小时前', gradient: 'secondary' as const },
];

const contactData = [
  { name: '王经理', initial: '王', role: '采购部经理', color: 'primary' as const },
  { name: '刘工程师', initial: '刘', role: '技术部工程师', color: 'success' as const },
  { name: '张会计', initial: '张', role: '财务部会计', color: 'info' as const },
  { name: '陈主管', initial: '陈', role: '生产部主管', color: 'warning' as const },
];

// ── Helper: get greeting based on time of day ──────────────

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return '上午好';
  if (hour < 18) return '下午好';
  return '晚上好';
};

// ── Helper: priority color mapping ─────────────────────────

const priorityColor = (priority: 'urgent' | 'warning' | 'normal') => {
  if (priority === 'urgent') return 'error.main';
  if (priority === 'warning') return 'warning.main';
  return 'transparent';
};

// ── Helper: gradient color mapping for avatars ────────────

const gradientMap: Record<string, string> = {
  primary: 'linear-gradient(135deg, #3b82f6, #2563eb)',
  secondary: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
  success: 'linear-gradient(135deg, #22c55e, #16a34a)',
  warning: 'linear-gradient(135deg, #f59e0b, #d97706)',
  info: 'linear-gradient(135deg, #06b6d4, #0891b2)',
};

// ── Components ──────────────────────────────────────────────

/** Personal Info Card */
const PersonalInfoCard: React.FC = () => {
  const { user } = useAuth();
  const name = user?.realName || '张三';
  const greeting = getGreeting();

  return (
    <Box
      sx={{
        bgcolor: 'grey.50',
        borderRadius: 2,
        p: 2.5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 2,
      }}
    >
      {/* Left: avatar + info */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Avatar
          sx={{
            width: 48,
            height: 48,
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            color: 'white',
            fontWeight: 600,
            fontSize: '1.1rem',
            flexShrink: 0,
          }}
        >
          {name.charAt(0)}
        </Avatar>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.3 }}>
            {greeting}，{name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            系统管理员 · 技术部
          </Typography>
        </Box>
      </Box>

      {/* Right: mini stats */}
      <Box sx={{ display: 'flex', gap: 1 }}>
        {['5 条待办', '3 条消息', '2 个日程'].map((label) => (
          <Box
            key={label}
            sx={{
              px: 2,
              py: 1,
              bgcolor: 'grey.100',
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Typography variant="caption" color="text.secondary">
              {label}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

/** Compact Hero Banner */
const CompactHero: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        position: 'relative',
        background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 50%, #8b5cf6 100%)',
        borderRadius: 2,
        p: 2.5,
        color: 'white',
        overflow: 'hidden',
      }}
    >
      {/* Decorative circle */}
      <Box
        sx={{
          position: 'absolute',
          top: -20,
          right: -20,
          width: 100,
          height: 100,
          borderRadius: '50%',
          bgcolor: 'white',
          opacity: 0.08,
        }}
      />

      {/* Content */}
      <Box sx={{ position: 'relative', zIndex: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
          TOPEMS 企业数字化平台
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.85, mb: 2 }}>
          化工新材料行业一站式数字化管理解决方案
        </Typography>
        <Button
          size="small"
          sx={{
            bgcolor: 'white',
            color: 'primary.main',
            fontWeight: 600,
            textTransform: 'none',
            px: 2,
            '&:hover': { bgcolor: 'grey.100' },
          }}
          onClick={() => navigate('/dashboard')}
        >
          进入工作台
        </Button>
      </Box>
    </Box>
  );
};

/** Todo List Column */
const TodoList: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Paper sx={{ borderRadius: 2, p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
          待办事项
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Badge
            badgeContent={todoData.length}
            color="primary"
            sx={{
              '& .MuiBadge-badge': {
                fontSize: 11,
                height: 18,
                minWidth: 18,
              },
            }}
          >
            <span />
          </Badge>
          <Typography
            sx={{ fontSize: 13, color: 'primary.main', cursor: 'pointer' }}
            onClick={() => navigate('/dashboard')}
          >
            查看全部
          </Typography>
        </Box>
      </Box>
      {todoData.map((item, index) => (
        <Box
          key={item.id}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            py: 1.25,
            borderBottom: index < todoData.length - 1 ? '1px solid' : 'none',
            borderColor: 'divider',
          }}
        >
          <Checkbox size="small" />
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2">{item.title}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
              {item.time}
            </Typography>
          </Box>
          <Box
            sx={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              bgcolor: priorityColor(item.priority),
              ml: 'auto',
              flexShrink: 0,
            }}
          />
        </Box>
      ))}
    </Paper>
  );
};

/** Recent Activities Column */
const RecentActivities: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Paper sx={{ borderRadius: 2, p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
          最近动态
        </Typography>
        <Typography
          sx={{ fontSize: 13, color: 'primary.main', cursor: 'pointer' }}
          onClick={() => navigate('/dashboard')}
        >
          查看全部
        </Typography>
      </Box>
      {activityData.map((item, index) => (
        <Box
          key={index}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            py: 1.25,
            borderBottom: index < activityData.length - 1 ? '1px solid' : 'none',
            borderColor: 'divider',
          }}
        >
          <Avatar
            sx={{
              width: 32,
              height: 32,
              background: gradientMap[item.gradient] || gradientMap.primary,
              color: 'white',
              fontWeight: 600,
              fontSize: '0.8rem',
              flexShrink: 0,
            }}
          >
            {item.initial}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2">
              <Box component="span" sx={{ fontWeight: 600 }}>
                {item.name}
              </Box>
              {' '}{item.action}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {item.time}
            </Typography>
          </Box>
        </Box>
      ))}
    </Paper>
  );
};

/** Frequent Contacts Column */
const FrequentContacts: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Paper sx={{ borderRadius: 2, p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
          常用联系人
        </Typography>
        <Typography
          sx={{ fontSize: 13, color: 'primary.main', cursor: 'pointer' }}
          onClick={() => navigate('/addressbook')}
        >
          查看通讯录
        </Typography>
      </Box>
      {contactData.map((item, index) => (
        <Box
          key={index}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            py: 1.25,
            borderBottom: index < contactData.length - 1 ? '1px solid' : 'none',
            borderColor: 'divider',
          }}
        >
          <Avatar
            sx={{
              width: 36,
              height: 36,
              bgcolor: `${item.color}.15`,
              color: `${item.color}.main`,
              fontWeight: 600,
              fontSize: '0.9rem',
              flexShrink: 0,
            }}
          >
            {item.initial}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {item.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {item.role}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <IconButton size="small" sx={{ color: 'text.secondary' }}>
              <MessageSquare size={16} />
            </IconButton>
            <IconButton size="small" sx={{ color: 'text.secondary' }}>
              <Phone size={16} />
            </IconButton>
          </Box>
        </Box>
      ))}
    </Paper>
  );
};

// ── Main Dashboard ───────────────────────────────────────────

export const HybridDashboard: React.FC = () => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      {/* 1. Personal Info Card + Compact Hero (combined row) */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <PersonalInfoCard />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <CompactHero />
        </Grid>
      </Grid>

      {/* 3. Todo + Activities + Contacts (3-column layout) */}
      <Box sx={{ mt: 3 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 4 }}>
            <TodoList />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <RecentActivities />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <FrequentContacts />
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};
