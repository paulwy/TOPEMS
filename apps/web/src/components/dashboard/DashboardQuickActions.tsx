import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { designTokens } from '@topems/tokens';

type IconComponent = React.ComponentType<{
  className?: string;
  style?: React.CSSProperties;
}>;

interface QuickAction {
  label: string;
  icon: IconComponent;
  path: string;
  color: string;
  bgColor: string;
  hoverColor: string;
  service?: string | null;
}

interface DashboardQuickActionsProps {
  quickActions: QuickAction[];
  serviceStatuses: Record<string, boolean>;
  onQuickAccess: (path: string) => void;
}

export const DashboardQuickActions: React.FC<DashboardQuickActionsProps> = ({
  quickActions,
  serviceStatuses,
  onQuickAccess,
}) => {
  const shouldShowQuickAction = (action: QuickAction): boolean => {
    if (!action.service) return true;
    return serviceStatuses[action.service];
  };

  return (
    <Box
      className='dashboard-quick-actions'
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: 'repeat(2, 1fr)',
          md: 'repeat(3, 1fr)',
          lg: 'repeat(6, 1fr)',
        },
        gap: 2,
      }}
    >
      {quickActions.filter(shouldShowQuickAction).map((action) => {
        const Icon = action.icon;
        return (
          <Button
            key={action.label}
            onClick={() => onQuickAccess(action.path)}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
              padding: 2,
              borderRadius: 3,
              backgroundColor: action.bgColor,
              transition: 'all 0.3s ease',
              '&:hover': {
                backgroundColor: action.hoverColor,
                boxShadow: `0 8px 24px ${designTokens.colors.action.selected}`,
                transform: 'translateY(-4px)',
              },
              border: 'none',
              cursor: 'pointer',
              textTransform: 'none',
            }}
          >
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 3,
                backgroundColor: 'background.paper',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'backgroundColor 0.3s ease',
                '&:hover': {
                  backgroundColor: 'background.paper',
                },
                boxShadow: `0 2px 8px ${designTokens.colors.action.selected}`,
              }}
            >
              <Icon style={{ width: 24, height: 24, color: action.color }} />
            </Box>
            <Typography
              sx={{
                fontSize: 12,
                fontWeight: 500,
                color: action.color,
                transition: 'color 0.3s ease',
              }}
            >
              {action.label}
            </Typography>
          </Button>
        );
      })}
    </Box>
  );
};
