import React from 'react';
import { Box, Typography } from '@mui/material';
import { Button } from '@/components/ui/Button';
import { FileText, Brain, GitBranch, Clock, Bell, User } from 'lucide-react';

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
              borderRadius: 2,
              backgroundColor: action.bgColor,
              transition: 'all 0.3s ease',
              '&:hover': {
                backgroundColor: action.hoverColor,
                boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
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
                borderRadius: 2,
                backgroundColor: 'rgba(255,255,255,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'backgroundColor 0.3s ease',
                '&:hover': {
                  backgroundColor: 'rgba(255,255,255,0.7)',
                },
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
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

export const defaultQuickActions: QuickAction[] = [
  {
    label: '上传文件',
    icon: FileText,
    path: '/documents',
    color: '#2563eb',
    bgColor: '#eff6ff',
    hoverColor: '#2563eb',
    service: 'doc',
  },
  {
    label: 'AI 问答',
    icon: Brain,
    path: '/ai',
    color: '#7c3aed',
    bgColor: '#faf5ff',
    hoverColor: '#7c3aed',
    service: 'ai',
  },
  {
    label: '发起流程',
    icon: GitBranch,
    path: '/flow/definitions',
    color: '#16a34a',
    bgColor: '#f0fdf4',
    hoverColor: '#16a34a',
    service: 'flow',
  },
  {
    label: '我的待办',
    icon: Clock,
    path: '/flow/approvals',
    color: '#ea580c',
    bgColor: '#fff7ed',
    hoverColor: '#ea580c',
    service: 'flow',
  },
  {
    label: '通知中心',
    icon: Bell,
    path: '/notifications',
    color: '#ca8a04',
    bgColor: '#fefce8',
    hoverColor: '#ca8a04',
    service: 'notification',
  },
  {
    label: '个人中心',
    icon: User,
    path: '/profile',
    color: '#4f46e5',
    bgColor: '#eef2ff',
    hoverColor: '#4f46e5',
    service: null,
  },
];
