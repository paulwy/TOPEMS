import React from 'react';
import { Box, Typography, Button, CircularProgress, Switch, Chip, useTheme } from '@mui/material';
import {
  Clock,
  RefreshCw,
  Mail,
  Bell,
  Activity,
  FileText,
  Shield,
  GitBranch,
  Bot,
  MessageSquare,
} from 'lucide-react';
import i18n from '@/i18n';
import { designTokens } from '@/theme/tokens';
import { IM_PATHS } from '@/modules/im/config';

const ct = designTokens.colors;

interface ActivityItem {
  id: string;
  action: string;
  resource: string;
  success: boolean;
  error_message?: string;
  created_at: string;
  ip_address?: string;
}

interface NotificationSettings {
  email_enabled: boolean;
  system_enabled: boolean;
  workflow_enabled: boolean;
  document_enabled: boolean;
  security_enabled: boolean;
}

interface Shortcut {
  id: string;
  title: string;
  path: string;
  icon: string;
}

interface ProfileApprovalPanelProps {
  activeTab: number;
  activities: ActivityItem[];
  loadingActivities: boolean;
  notificationSettings: NotificationSettings;
  shortcuts: Shortcut[];
  onRefreshActivities: () => void;
  onNotificationSettingChange: (key: keyof NotificationSettings) => void;
  onShortcutToggle: (shortcut: Shortcut) => void;
}

const ProfileApprovalPanel: React.FC<ProfileApprovalPanelProps> = ({
  activeTab,
  activities,
  loadingActivities,
  notificationSettings,
  shortcuts,
  onRefreshActivities,
  onNotificationSettingChange,
  onShortcutToggle,
}) => {
  const theme = useTheme();

  if (activeTab === 2) {
    return (
      <Box>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 2,
          }}
        >
          <Typography
            variant='subtitle1'
            sx={{ fontWeight: 500 }}
          >
            {i18n.t('pages.profile_approval_panel.k0')}
          </Typography>
          <Button
            variant='text'
            size='small'
            startIcon={<RefreshCw size={16} />}
            onClick={onRefreshActivities}
          >
            {i18n.t('pages.profile_approval_panel.k1')}
          </Button>
        </Box>
        {loadingActivities ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CircularProgress size={32} />
            <Typography
              variant='body2'
              color='text.secondary'
              sx={{ mt: 1 }}
            >
              {i18n.t('pages.profile_approval_panel.k2')}
            </Typography>
          </Box>
        ) : activities.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Clock
              size={48}
              style={{ color: theme.palette.text.disabled, marginBottom: 12 }}
            />
            <Typography color='text.secondary'>
              {i18n.t('pages.profile_approval_panel.k0')}
            </Typography>
          </Box>
        ) : (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 1.5,
            }}
          >
            {activities.map((activity) => (
              <Box
                key={activity.id}
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 1.5,
                  p: 1.5,
                  bgcolor: 'grey.100',
                  borderRadius: 1,
                }}
              >
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: activity.success ? 'success.main' : 'error.main',
                    mt: 1,
                  }}
                />
                <Box sx={{ flex: 1 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Typography
                      variant='body2'
                      sx={{ fontWeight: 500 }}
                    >
                      {activity.action}
                    </Typography>
                    <Typography
                      variant='caption'
                      color='text.secondary'
                    >
                      {new Date(activity.created_at).toLocaleString('zh-CN')}
                    </Typography>
                  </Box>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    {activity.resource}
                    {activity.ip_address && ` · ${activity.ip_address}`}
                  </Typography>
                  {activity.error_message && (
                    <Typography
                      variant='caption'
                      color='error'
                    >
                      {activity.error_message}
                    </Typography>
                  )}
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    );
  }

  if (activeTab === 3) {
    return (
      <Box>
        <Typography
          variant='subtitle1'
          sx={{ fontWeight: 500, mb: 2 }}
        >
          {i18n.t('pages.profile_approval_panel.k3')}
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {[
            {
              key: 'email_enabled' as const,
              icon: Mail,
              label: i18n.t('pages.profile_approval_panel.k1'),
              desc: i18n.t('pages.profile_approval_panel.k2'),
              color: 'primary.dark',
            },
            {
              key: 'system_enabled' as const,
              icon: Bell,
              label: i18n.t('pages.profile_approval_panel.k3'),
              desc: i18n.t('pages.profile_approval_panel.k4'),
              color: ct.yellow[600],
            },
            {
              key: 'workflow_enabled' as const,
              icon: Activity,
              label: i18n.t('pages.profile_approval_panel.k5'),
              desc: i18n.t('pages.profile_approval_panel.k6'),
              color: 'success.dark',
            },
            {
              key: 'document_enabled' as const,
              icon: FileText,
              label: i18n.t('pages.profile_approval_panel.k7'),
              desc: i18n.t('pages.profile_approval_panel.k8'),
              color: ct.purple[600],
            },
            {
              key: 'security_enabled' as const,
              icon: Shield,
              label: i18n.t('pages.profile_approval_panel.k9'),
              desc: i18n.t('pages.profile_approval_panel.k10'),
              color: 'error.dark',
            },
          ].map(({ key, icon: Icon, label, desc, color }) => (
            <Box
              key={key}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                p: 2,
                bgcolor: 'grey.100',
                borderRadius: 1,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                }}
              >
                <Icon
                  size={20}
                  style={{ color }}
                />
                <Box>
                  <Typography
                    variant='subtitle1'
                    sx={{ fontWeight: 500 }}
                  >
                    {label}
                  </Typography>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    {desc}
                  </Typography>
                </Box>
              </Box>
              <Switch
                checked={notificationSettings[key]}
                onChange={() => onNotificationSettingChange(key)}
              />
            </Box>
          ))}
        </Box>
      </Box>
    );
  }

  if (activeTab === 4) {
    return (
      <Box>
        <Typography
          variant='subtitle1'
          sx={{ fontWeight: 500, mb: 2 }}
        >
          {i18n.t('pages.profile_approval_panel.k4')}
        </Typography>
        <Typography
          variant='body2'
          color='text.secondary'
          sx={{ mb: 2 }}
        >
          {i18n.t('pages.profile_approval_panel.k5')}
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(2, 1fr)',
              md: 'repeat(3, 1fr)',
            },
            gap: 2,
          }}
        >
          {[
            {
              id: '1',
              title: i18n.t('pages.profile_approval_panel.k11'),
              icon: Activity,
              iconName: 'Activity',
              path: '/dashboard',
              color: 'primary.main',
            },
            {
              id: '2',
              title: i18n.t('pages.profile_approval_panel.k12'),
              icon: FileText,
              iconName: 'FileText',
              path: '/documents',
              color: 'success.dark',
            },
            {
              id: '3',
              title: i18n.t('pages.profile_approval_panel.k13'),
              icon: GitBranch,
              iconName: 'GitBranch',
              path: '/flow/definitions',
              color: ct.purple[500],
            },
            {
              id: '4',
              title: i18n.t('pages.profile_approval_panel.k14'),
              icon: Bell,
              iconName: 'Bell',
              path: '/notifications',
              color: 'warning.main',
            },
            {
              id: '5',
              title: i18n.t('pages.profile_approval_panel.ai_0'),
              icon: Bot,
              iconName: 'Bot',
              path: '/ai',
              color: ct.pink[500],
            },
            {
              id: '6',
              title: i18n.t('pages.profile_approval_panel.k15'),
              icon: MessageSquare,
              iconName: 'MessageSquare',
              path: IM_PATHS.root,
              color: 'primary.light',
            },
          ].map((item) => {
            const isSelected = shortcuts.some((s) => s.id === item.id);
            const Icon = item.icon;
            return (
              <Box
                key={item.id}
                onClick={() =>
                  onShortcutToggle({
                    id: item.id,
                    title: item.title,
                    icon: item.iconName,
                    path: item.path,
                  })
                }
                sx={{
                  p: 2,
                  borderRadius: 1,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  border: 2,
                  borderColor: isSelected ? 'primary.main' : 'transparent',
                  bgcolor: isSelected ? 'primary.50' : 'grey.100',
                  '&:hover': {
                    borderColor: isSelected ? 'primary.main' : 'primary.light',
                  },
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                  }}
                >
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mb: 1.5,
                      bgcolor: item.color,
                    }}
                  >
                    <Icon
                      size={24}
                      style={{ color: 'common.white' }}
                    />
                  </Box>
                  <Typography
                    variant='body2'
                    sx={{ fontWeight: 500 }}
                  >
                    {item.title}
                  </Typography>
                  {isSelected && (
                    <Chip
                      label={i18n.t('pages.profile_approval_panel.k16')}
                      size='small'
                      sx={{ mt: 1 }}
                    />
                  )}
                </Box>
              </Box>
            );
          })}
        </Box>

        {shortcuts.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Typography
              variant='subtitle1'
              sx={{ fontWeight: 500, mb: 2 }}
            >
              {i18n.t('pages.profile_approval_panel.k6')}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {shortcuts.map((shortcut) => (
                <Chip
                  key={shortcut.id}
                  label={`${shortcut.title} ×`}
                  variant='outlined'
                  onClick={() => onShortcutToggle(shortcut)}
                  sx={{ cursor: 'pointer' }}
                />
              ))}
            </Box>
          </Box>
        )}
      </Box>
    );
  }

  return null;
};

export default ProfileApprovalPanel;
export { ProfileApprovalPanel };
