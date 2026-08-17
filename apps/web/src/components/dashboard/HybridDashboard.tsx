import React from 'react';
import { Box, Typography, Paper, Button, Checkbox, Avatar, Badge, IconButton } from '@mui/material';
import { Grid } from '@/components';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Phone } from 'lucide-react';
import { useAuth } from '@/hooks';
import { DASHBOARD_PATHS } from '@/routes/dashboard';
import { designTokens } from '@topems/tokens';
import i18n from '@/i18n';

// ── Mock Data ──────────────────────────────────────────────

const todoData = [
  {
    id: 1,
    title: i18n.t('shared.hybrid_dashboard.po20240087_0'),
    time: '10:30',
    priority: 'urgent' as const,
  },
  {
    id: 2,
    title: i18n.t('shared.hybrid_dashboard.q3_1'),
    time: '09:15',
    priority: 'warning' as const,
  },
  {
    id: 3,
    title: i18n.t('shared.hybrid_dashboard.k2'),
    time: i18n.t('components.hybrid_dashboard.1642_0'),
    priority: 'normal' as const,
  },
  {
    id: 4,
    title: i18n.t('shared.hybrid_dashboard.k3'),
    time: i18n.t('components.hybrid_dashboard.1420_1'),
    priority: 'urgent' as const,
  },
  {
    id: 5,
    title: i18n.t('shared.hybrid_dashboard.k4'),
    time: i18n.t('components.hybrid_dashboard.1105_2'),
    priority: 'normal' as const,
  },
];

const activityData = [
  {
    name: i18n.t('shared.hybrid_dashboard.k5'),
    initial: i18n.t('shared.hybrid_dashboard.k6'),
    action: i18n.t('shared.hybrid_dashboard.k7'),
    time: i18n.t('components.hybrid_dashboard.5_3'),
    gradient: 'primary' as const,
  },
  {
    name: i18n.t('shared.hybrid_dashboard.k8'),
    initial: i18n.t('shared.hybrid_dashboard.k9'),
    action: i18n.t('shared.hybrid_dashboard.b2024156_10'),
    time: i18n.t('components.hybrid_dashboard.23_4'),
    gradient: 'success' as const,
  },
  {
    name: i18n.t('shared.hybrid_dashboard.k11'),
    initial: i18n.t('shared.hybrid_dashboard.k12'),
    action: i18n.t('components.hybrid_dashboard.k5') + i18n.t('shared.hybrid_dashboard.k13'),
    time: i18n.t('components.hybrid_dashboard.1_6'),
    gradient: 'warning' as const,
  },
  {
    name: i18n.t('shared.hybrid_dashboard.k14'),
    initial: i18n.t('shared.hybrid_dashboard.k15'),
    action: i18n.t('shared.hybrid_dashboard.78_16'),
    time: i18n.t('components.hybrid_dashboard.2_7'),
    gradient: 'info' as const,
  },
  {
    name: i18n.t('shared.hybrid_dashboard.k17'),
    initial: i18n.t('shared.hybrid_dashboard.k18'),
    action: i18n.t('shared.hybrid_dashboard.k19'),
    time: i18n.t('components.hybrid_dashboard.3_8'),
    gradient: 'secondary' as const,
  },
];

const contactData = [
  {
    name: i18n.t('shared.hybrid_dashboard.k22'),
    initial: i18n.t('shared.hybrid_dashboard.k21'),
    role: i18n.t('shared.hybrid_dashboard.k20'),
    color: 'primary' as const,
  },
  {
    name: i18n.t('shared.hybrid_dashboard.k25'),
    initial: i18n.t('shared.hybrid_dashboard.k24'),
    role: i18n.t('shared.hybrid_dashboard.k23'),
    color: 'success' as const,
  },
  {
    name: i18n.t('shared.hybrid_dashboard.k28'),
    initial: i18n.t('shared.hybrid_dashboard.k27'),
    role: i18n.t('shared.hybrid_dashboard.k26'),
    color: 'info' as const,
  },
  {
    name: i18n.t('shared.hybrid_dashboard.k31'),
    initial: i18n.t('shared.hybrid_dashboard.k30'),
    role: i18n.t('shared.hybrid_dashboard.k29'),
    color: 'warning' as const,
  },
];

// ── Helper: get greeting based on time of day ──────────────

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return i18n.t('shared.hybrid_dashboard.k32');
  if (hour < 18) return i18n.t('shared.hybrid_dashboard.k33');
  return i18n.t('shared.hybrid_dashboard.k34');
};

// ── Helper: priority color mapping ─────────────────────────

const priorityColor = (priority: 'urgent' | 'warning' | 'normal') => {
  if (priority === 'urgent') return 'error.main';
  if (priority === 'warning') return 'warning.main';
  return 'transparent';
};

// ── Helper: gradient color mapping for avatars ────────────

const gradientMap: Record<string, string> = {
  primary: `linear-gradient(135deg, ${designTokens.colors.primary.main}, ${designTokens.colors.primary.dark})`,
  secondary: `linear-gradient(135deg, ${designTokens.colors.secondary.main}, ${designTokens.colors.primary.dark})`,
  success: `linear-gradient(135deg, ${designTokens.colors.success.main}, ${designTokens.colors.success.dark})`,
  warning: `linear-gradient(135deg, ${designTokens.colors.warning.main}, ${designTokens.colors.warning.dark})`,
  info: `linear-gradient(135deg, ${designTokens.colors.cyan['500']}, ${designTokens.colors.cyan['600']})`,
};

// ── Components ──────────────────────────────────────────────

/** Personal Info Card */
const PersonalInfoCard: React.FC = () => {
  const { user } = useAuth();
  const name = user?.realName || i18n.t('shared.hybrid_dashboard.k35');
  const greeting = getGreeting();

  return (
    <Box
      sx={{
        bgcolor: 'grey.50',
        borderRadius: 3,
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
            background: `linear-gradient(135deg, ${designTokens.colors.primary.main}, ${designTokens.colors.secondary.main})`,
            color: 'common.white',
            fontWeight: 600,
            fontSize: '1.1rem',
            flexShrink: 0,
          }}
        >
          {name.charAt(0)}
        </Avatar>
        <Box>
          <Typography
            variant='h6'
            sx={{ fontWeight: 600, lineHeight: 1.3 }}
          >
            {greeting}，{name}
          </Typography>
          <Typography
            variant='body2'
            color='text.secondary'
          >
            {i18n.t('components.hybrid_dashboard.k0')}
          </Typography>
        </Box>
      </Box>

      {/* Right: mini stats */}
      <Box sx={{ display: 'flex', gap: 1 }}>
        {[
          i18n.t('components.hybrid_dashboard.5_11'),
          i18n.t('components.hybrid_dashboard.3_10'),
          i18n.t('components.hybrid_dashboard.2_9'),
        ].map((label) => (
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
            <Typography
              variant='caption'
              color='text.secondary'
            >
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
      className='dashboard-hero'
      sx={{
        position: 'relative',
        background: `linear-gradient(135deg, ${designTokens.colors.primary.main} 0%, ${designTokens.colors.primary.dark} 50%, ${designTokens.colors.secondary.main} 100%)`,
        borderRadius: 3,
        p: 2.5,
        color: 'common.white',
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
          bgcolor: 'common.white',
          opacity: 0.08,
        }}
      />

      {/* Content */}
      <Box sx={{ position: 'relative', zIndex: 1 }}>
        <Typography
          variant='subtitle1'
          sx={{ fontWeight: 700, mb: 0.5 }}
        >
          {i18n.t('components.hybrid_dashboard.topems_1')}
        </Typography>
        <Typography
          variant='body2'
          sx={{ opacity: 0.85, mb: 2 }}
        >
          {i18n.t('components.hybrid_dashboard.k2')}
        </Typography>
        <Button
          size='small'
          sx={{
            bgcolor: 'common.white',
            color: 'primary.main',
            fontWeight: 600,
            textTransform: 'none',
            px: 2,
            '&:hover': { bgcolor: 'grey.100' },
          }}
          onClick={() => navigate(DASHBOARD_PATHS.dashboard)}
        >
          {i18n.t('components.hybrid_dashboard.k3')}
        </Button>
      </Box>
    </Box>
  );
};

/** Todo List Column */
const TodoList: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Paper sx={{ borderRadius: 3, p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography
          variant='subtitle2'
          sx={{ fontWeight: 600 }}
        >
          {i18n.t('components.hybrid_dashboard.k4')}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Badge
            badgeContent={todoData.length}
            color='primary'
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
            onClick={() => navigate(DASHBOARD_PATHS.dashboard)}
          >
            {i18n.t('components.hybrid_dashboard.k5')}
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
          <Checkbox size='small' />
          <Box sx={{ flex: 1 }}>
            <Typography variant='body2'>{item.title}</Typography>
            <Typography
              variant='caption'
              color='text.secondary'
              sx={{ ml: 1 }}
            >
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
    <Paper
      className='recent-activities'
      sx={{ borderRadius: 3, p: 2 }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography
          variant='subtitle2'
          sx={{ fontWeight: 600 }}
        >
          {i18n.t('components.hybrid_dashboard.k6')}
        </Typography>
        <Typography
          sx={{ fontSize: 13, color: 'primary.main', cursor: 'pointer' }}
          onClick={() => navigate(DASHBOARD_PATHS.dashboard)}
        >
          {i18n.t('components.hybrid_dashboard.k7')}
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
              color: 'common.white',
              fontWeight: 600,
              fontSize: '0.8rem',
              flexShrink: 0,
            }}
          >
            {item.initial}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant='body2'>
              <Box
                component='span'
                sx={{ fontWeight: 600 }}
              >
                {item.name}
              </Box>{' '}
              {item.action}
            </Typography>
            <Typography
              variant='caption'
              color='text.secondary'
            >
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
    <Paper sx={{ borderRadius: 3, p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography
          variant='subtitle2'
          sx={{ fontWeight: 600 }}
        >
          {i18n.t('components.hybrid_dashboard.k8')}
        </Typography>
        <Typography
          sx={{ fontSize: 13, color: 'primary.main', cursor: 'pointer' }}
          onClick={() => navigate(DASHBOARD_PATHS.addressbook)}
        >
          {i18n.t('components.hybrid_dashboard.k9')}
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
            <Typography
              variant='body2'
              sx={{ fontWeight: 500 }}
            >
              {item.name}
            </Typography>
            <Typography
              variant='caption'
              color='text.secondary'
            >
              {item.role}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <IconButton
              size='small'
              sx={{ color: 'text.secondary' }}
              aria-label={i18n.t('shared.hybrid_dashboard.k36')}
            >
              <MessageSquare size={16} />
            </IconButton>
            <IconButton
              size='small'
              sx={{ color: 'text.secondary' }}
              aria-label={i18n.t('shared.hybrid_dashboard.k37')}
            >
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
      <Grid
        container
        spacing={2}
      >
        <Grid size={{ xs: 12, md: 6 }}>
          <PersonalInfoCard />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <CompactHero />
        </Grid>
      </Grid>

      {/* 3. Todo + Activities + Contacts (3-column layout) */}
      <Box sx={{ mt: 3 }}>
        <Grid
          container
          spacing={2}
        >
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
