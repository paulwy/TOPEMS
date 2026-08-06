import React, { useState } from 'react';
import {
  Paper,
  Box,
  Typography,
  Collapse,
  IconButton,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { ChevronDown, ChevronUp } from 'lucide-react';

export interface DashboardSectionProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  collapsible?: boolean;
  headerRight?: React.ReactNode;
  sx?: object;
}

export const DashboardSection: React.FC<DashboardSectionProps> = ({
  title,
  icon,
  children,
  defaultExpanded = true,
  collapsible = false,
  headerRight,
  sx = {},
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleToggle = () => {
    if (collapsible) {
      setExpanded(!expanded);
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        bgcolor: 'background.paper',
        borderRadius: 3,
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        overflow: 'hidden',
        mb: 3,
        ...sx,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 2,
          borderBottom: expanded ? '1px solid' : 'none',
          borderColor: 'grey.100',
          cursor: collapsible ? 'pointer' : 'default',
          '&:hover': collapsible
            ? {
                bgcolor: 'grey.50',
              }
            : {},
        }}
        onClick={handleToggle}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {icon && (
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: 1.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'primary.50',
                color: 'primary.main',
              }}
            >
              {icon}
            </Box>
          )}
          <Typography
            sx={{
              fontSize: { xs: '1rem', md: '1.125rem' },
              fontWeight: 600,
              color: 'grey.900',
            }}
          >
            {title}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {headerRight && !isMobile && (
            <Box sx={{ marginRight: collapsible ? 1 : 0 }}>{headerRight}</Box>
          )}
          {collapsible && (
            <IconButton
              size='small'
              onClick={(e) => {
                e.stopPropagation();
                handleToggle();
              }}
              sx={{
                bgcolor: 'grey.100',
                '&:hover': { bgcolor: 'grey.200' },
              }}
              aria-label='展开'
            >
              {expanded ? (
                <ChevronUp
                  size={18}
                  color='grey.600'
                />
              ) : (
                <ChevronDown
                  size={18}
                  color='grey.600'
                />
              )}
            </IconButton>
          )}
        </Box>
      </Box>
      <Collapse
        in={expanded}
        timeout='auto'
      >
        <Box sx={{ p: 2 }}>{children}</Box>
      </Collapse>
    </Paper>
  );
};

// 今日概览分区
export interface TodayOverviewSectionProps {
  children: React.ReactNode;
}

export const TodayOverviewSection: React.FC<TodayOverviewSectionProps> = ({ children }) => {
  return (
    <DashboardSection
      title='今日概览'
      sx={{ mb: 4 }}
    >
      {children}
    </DashboardSection>
  );
};

// 快捷入口分区
export interface QuickAccessSectionProps {
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

export const QuickAccessSection: React.FC<QuickAccessSectionProps> = ({
  children,
  defaultExpanded = true,
}) => {
  return (
    <DashboardSection
      title='快捷入口'
      collapsible
      defaultExpanded={defaultExpanded}
    >
      {children}
    </DashboardSection>
  );
};

// 待办事项分区
export interface TodoListSectionProps {
  children: React.ReactNode;
}

export const TodoListSection: React.FC<TodoListSectionProps> = ({ children }) => {
  return (
    <DashboardSection
      title='待办事项'
      collapsible
      defaultExpanded={true}
    >
      {children}
    </DashboardSection>
  );
};

// 模块导航分区
export interface ModuleNavigationSectionProps {
  children: React.ReactNode;
  title?: string;
  icon?: React.ReactNode;
}

export const ModuleNavigationSection: React.FC<ModuleNavigationSectionProps> = ({
  children,
  title = '模块导航',
  icon,
}) => {
  return (
    <DashboardSection
      title={title}
      icon={icon}
    >
      {children}
    </DashboardSection>
  );
};

// 服务状态监测分区
export interface ServiceMonitorSectionProps {
  children: React.ReactNode;
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

export const ServiceMonitorSection: React.FC<ServiceMonitorSectionProps> = ({
  children,
  collapsible = true,
  defaultExpanded = true,
}) => {
  return (
    <DashboardSection
      title='服务状态监测'
      collapsible={collapsible}
      defaultExpanded={defaultExpanded}
    >
      {children}
    </DashboardSection>
  );
};

// 最近活动分区
export interface RecentActivitySectionProps {
  children: React.ReactNode;
  headerRight?: React.ReactNode;
  defaultExpanded?: boolean;
}

export const RecentActivitySection: React.FC<RecentActivitySectionProps> = ({
  children,
  headerRight,
  defaultExpanded = false,
}) => {
  return (
    <DashboardSection
      title='最近活动'
      collapsible
      defaultExpanded={defaultExpanded}
      headerRight={headerRight}
    >
      {children}
    </DashboardSection>
  );
};
