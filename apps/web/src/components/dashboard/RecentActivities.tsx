import React, { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import {
  ChevronRight,
  FileText,
  Clock,
  AlertTriangle,
  Users,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import i18n from '@/i18n';
import { designTokens } from '@topems/tokens';

export interface ActivityItem {
  id: string;
  title: string;
  type: string;
  time: string;
  icon: React.ReactNode;
}

interface RecentActivitiesProps {
  activities?: ActivityItem[];
}

const DEFAULT_COLORS = { bg: 'grey.50', text: 'grey.600', bar: 'grey.400', iconBg: 'grey.100' };

const typeColors: Record<string, { bg: string; text: string; bar: string; iconBg: string }> = {
  [i18n.t('shared.recent_activities.k0')]: {
    bg: 'primary.light',
    text: 'primary.dark',
    bar: 'primary.main',
    iconBg: 'primary.100',
  },
  [i18n.t('shared.recent_activities.k1')]: {
    bg: 'secondary.light',
    text: 'secondary.dark',
    bar: 'secondary.main',
    iconBg: 'secondary.light',
  },
  [i18n.t('shared.recent_activities.k2')]: {
    bg: 'success.light',
    text: 'success.dark',
    bar: 'success.dark',
    iconBg: 'success.lighter',
  },
  [i18n.t('shared.recent_activities.k3')]: {
    bg: 'warning.lighter',
    text: designTokens.colors.warning[600],
    bar: 'warning.main',
    iconBg: 'warning.100',
  },
  [i18n.t('shared.recent_activities.k4')]: {
    bg: 'grey.50',
    text: 'grey.600',
    bar: 'grey.400',
    iconBg: 'grey.100',
  },
  [i18n.t('shared.recent_activities.k5')]: {
    bg: 'primary.light',
    text: 'primary.dark',
    bar: 'primary.main',
    iconBg: 'primary.100',
  },
  [i18n.t('shared.recent_activities.k6')]: DEFAULT_COLORS,
};

const generateMockActivities = (): ActivityItem[] => [
  {
    id: '1',
    title: i18n.t('components.recent_activities.k0'),
    type: i18n.t('shared.recent_activities.k0'),
    time: i18n.t('components.recent_activities.2_1'),
    icon: (
      <AlertCircle
        size={20}
        color='success.dark'
      />
    ),
  },
  {
    id: '2',
    title: i18n.t('components.recent_activities.v20_2'),
    type: i18n.t('shared.recent_activities.k1'),
    time: i18n.t('components.recent_activities.15_3'),
    icon: (
      <FileText
        size={20}
        color='secondary.main'
      />
    ),
  },
  {
    id: '3',
    title: i18n.t('components.recent_activities.k4'),
    type: i18n.t('shared.recent_activities.k2'),
    time: i18n.t('components.recent_activities.1_5'),
    icon: (
      <CheckCircle2
        size={20}
        color='primary.main'
      />
    ),
  },
  {
    id: '4',
    title: i18n.t('components.recent_activities.k6'),
    type: i18n.t('shared.recent_activities.k3'),
    time: i18n.t('components.recent_activities.2_7'),
    icon: (
      <Users
        size={20}
        color='warning.main'
      />
    ),
  },
  {
    id: '5',
    title: i18n.t('components.recent_activities.crm_8'),
    type: i18n.t('shared.recent_activities.k4'),
    time: i18n.t('components.recent_activities.3_9'),
    icon: (
      <AlertTriangle
        size={20}
        color='error.main'
      />
    ),
  },
  {
    id: '6',
    title: i18n.t('components.recent_activities.k10'),
    type: i18n.t('shared.recent_activities.k5'),
    time: i18n.t('components.recent_activities.5_11'),
    icon: (
      <Clock
        size={20}
        color='success.dark'
      />
    ),
  },
];

export const RecentActivities: React.FC<RecentActivitiesProps> = ({
  activities: externalActivities,
}) => {
  const [internalActivities, setInternalActivities] = useState<ActivityItem[]>([]);

  const hasExternalActivities = externalActivities && externalActivities.length > 0;
  const currentActivities = hasExternalActivities ? externalActivities : internalActivities;

  useEffect(() => {
    if (!hasExternalActivities) {
      setInternalActivities(generateMockActivities());
    }
  }, [hasExternalActivities]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {currentActivities.map((activity, index) => {
        const colors =
          typeColors[activity.type] ??
          typeColors[i18n.t('shared.recent_activities.k6')] ??
          DEFAULT_COLORS;
        const progressWidth = `${((currentActivities.length - index) / currentActivities.length) * 100}%`;

        return (
          <Box
            key={activity.id}
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              padding: 2,
              borderRadius: 3,
              '&:hover': { backgroundColor: 'grey.50' },
              transition: 'backgroundColor 0.2s ease',
              cursor: 'pointer',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                marginRight: 2,
              }}
            >
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 3,
                  backgroundColor: colors.iconBg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: `0 1px 3px ${designTokens.colors.action.selected}`,
                }}
              >
                {activity.icon}
              </Box>
              {index < currentActivities.length - 1 && (
                <Box
                  sx={{
                    position: 'relative',
                    width: 4,
                    height: 32,
                    backgroundColor: 'border.default',
                    borderRadius: 3,
                    marginTop: 1,
                  }}
                >
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      backgroundColor: colors.bar,
                      borderRadius: 3,
                      transition: 'height 0.7s ease',
                    }}
                    style={{ height: progressWidth }}
                  />
                </Box>
              )}
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography
                sx={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: 'text.primary',
                  marginBottom: 0.5,
                }}
              >
                {activity.title}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    paddingX: 1.5,
                    paddingY: 0.5,
                    borderRadius: 1,
                    backgroundColor: colors.bg,
                  }}
                >
                  <Typography sx={{ fontSize: 11, fontWeight: 500, color: colors.text }}>
                    {activity.type}
                  </Typography>
                </Box>
                <Typography sx={{ fontSize: 12, color: 'grey.400' }}>{activity.time}</Typography>
              </Box>
            </Box>
            <ChevronRight sx={{ width: 16, height: 16, color: 'grey.400', marginLeft: 1 }} />
          </Box>
        );
      })}
    </Box>
  );
};
