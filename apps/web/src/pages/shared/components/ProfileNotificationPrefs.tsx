/**
 * @done V79 Phase 2 split
 * ProfileNotificationPrefs - Notification preferences (Tab 3).
 * 5 toggles: Email / System / Workflow / Document / Security
 */
import React from 'react';
import { Mail, Bell, Activity, FileText, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Box, Typography, Switch } from '@mui/material';
import { designTokens } from '@/theme/tokens';
import type { NotificationSettings, UseProfileReturn } from '../hooks/useProfile';

const ct = designTokens.colors;

interface NotificationOption {
  key: keyof NotificationSettings;
  icon: typeof Mail;
  label: string;
  desc: string;
  color: string;
}

interface ProfileNotificationPrefsProps {
  profile: UseProfileReturn;
}

const ProfileNotificationPrefs: React.FC<ProfileNotificationPrefsProps> = ({ profile }) => {
  const { t } = useTranslation();
  const { notificationSettings, handleNotificationSettingChange } = profile;

  const options: NotificationOption[] = [
    {
      key: 'email_enabled',
      icon: Mail,
      label: t('shared.profile.notify_email_label'),
      desc: t('shared.profile.notify_email_desc'),
      color: 'primary.dark',
    },
    {
      key: 'system_enabled',
      icon: Bell,
      label: t('shared.profile.notify_system_label'),
      desc: t('shared.profile.notify_system_desc'),
      color: ct.yellow[600],
    },
    {
      key: 'workflow_enabled',
      icon: Activity,
      label: t('shared.profile.notify_workflow_label'),
      desc: t('shared.profile.notify_workflow_desc'),
      color: 'success.dark',
    },
    {
      key: 'document_enabled',
      icon: FileText,
      label: t('shared.profile.notify_document_label'),
      desc: t('shared.profile.notify_document_desc'),
      color: ct.purple[600],
    },
    {
      key: 'security_enabled',
      icon: Shield,
      label: t('shared.profile.notify_security_label'),
      desc: t('shared.profile.notify_security_desc'),
      color: 'error.dark',
    },
  ];

  return (
    <Box>
      <Typography
        variant='subtitle1'
        sx={{ fontWeight: 500, mb: 2 }}
      >
        {t('shared.profile.notification_prefs')}
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {options.map(({ key, icon: Icon, label, desc, color }) => (
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
              onChange={() => handleNotificationSettingChange(key)}
            />
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default ProfileNotificationPrefs;
