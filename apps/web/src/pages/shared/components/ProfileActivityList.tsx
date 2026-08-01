/**
 * @done V79 Phase 2 split
 * ProfileActivityList - Recent activity log (Tab 2).
 * Includes: Refresh button / Loading / Empty state / Activity list
 */
import React from 'react';
import { RefreshCw, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme, Box, Typography, Button, CircularProgress } from '@mui/material';
import type { UseProfileReturn } from '../hooks/useProfile';

export interface ProfileActivityListProps {
  profile: UseProfileReturn;
}

export const ProfileActivityList: React.FC<ProfileActivityListProps> = ({ profile }) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const { activities, loadingActivities, handleRefreshActivities } = profile;

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
          {t('shared.profile.recent_activities')}
        </Typography>
        <Button
          variant='text'
          size='small'
          startIcon={<RefreshCw size={16} />}
          onClick={handleRefreshActivities}
        >
          {t('shared.profile.refresh')}
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
            {t('shared.profile.loading')}
          </Typography>
        </Box>
      ) : activities.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Clock
            size={48}
            style={{ color: theme.palette.text.disabled, marginBottom: 12 }}
          />
          <Typography color='text.secondary'>{t('shared.profile.no_activities')}</Typography>
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
};

export default ProfileActivityList;
