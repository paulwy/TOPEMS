import React, { useState } from 'react';
import {
  Paper,
  Box,
  Typography,
  Collapse,
  IconButton,
  Tooltip,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import i18n from '@/i18n';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { ModuleCard, type ModuleItem } from './ModuleCard';
import { designTokens, semanticTokens } from '@topems/tokens';

export const MODULE_SECTIONS = [
  {
    key: 'core',
    title: i18n.t('shared.dashboard_sections.k0'),
    collapsedLimit: 6,
    moduleKeys: [
      'iam',
      'tenant',
      'plugin',
      'file',
      'doc',
      'mail',
      'notification',
      'im',
      'workflow',
      'audit',
    ],
  },
  {
    key: 'operation',
    title: i18n.t('shared.dashboard_sections.k1'),
    collapsedLimit: 6,
    moduleKeys: ['crm', 'srm', 'scm', 'wms', 'erp', 'finance', 'hrm', 'pm'],
  },
  {
    key: 'production',
    title: i18n.t('shared.dashboard_sections.k2'),
    collapsedLimit: 6,
    moduleKeys: ['mes', 'pdca', 'qms', 'ehs', 'lims', 'pdm', 'rd'],
  },
  {
    key: 'intelligent',
    title: i18n.t('shared.dashboard_sections.k3'),
    collapsedLimit: 6,
    moduleKeys: ['ai', 'bi', 'analytics', 'report', 'search', 'portal', 'gis', 'mobile', 'lowcode'],
  },
] as const;

export type ModuleSectionKey = (typeof MODULE_SECTIONS)[number]['key'];

interface ModuleSectionProps {
  title: string;
  cards: ModuleItem[];
  collapsedLimit: number;
  onCardClick?: (card: ModuleItem) => void;
  size?: 'large' | 'medium' | 'small';
}

export const ModuleSection: React.FC<ModuleSectionProps> = ({
  title,
  cards,
  collapsedLimit,
  onCardClick,
  size = 'medium',
}) => {
  const [collapsed, setCollapsed] = useState(cards.length > collapsedLimit);
  const shouldCollapse = cards.length > collapsedLimit;
  const visibleCards = collapsed && shouldCollapse ? cards.slice(0, collapsedLimit) : cards;

  if (cards.length === 0) return null;

  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Typography
          variant='subtitle1'
          sx={{ fontWeight: 600, color: 'text.primary' }}
        >
          {title}
          <Typography
            component='span'
            variant='caption'
            color='text.secondary'
            sx={{ ml: 1 }}
          >
            {cards.length} {i18n.t('components.dashboard_sections.k0')}
          </Typography>
        </Typography>
        {shouldCollapse ? (
          <Tooltip title={collapsed ? i18n.t('shared.dashboard_sections.k5') : i18n.t('shared.dashboard_sections.k4')}>
            <IconButton
              size='small'
              onClick={() => setCollapsed((v) => !v)}
              aria-label='toggle section'
            >
              {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            </IconButton>
          </Tooltip>
        ) : null}
      </Box>

      <Collapse
        in={!collapsed || !shouldCollapse}
        timeout={220}
        unmountOnExit={false}
      >
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: {
              xs: 'repeat(2, minmax(0, 1fr))',
              sm: 'repeat(3, minmax(0, 1fr))',
              md: 'repeat(4, minmax(0, 1fr))',
              xl: 'repeat(5, minmax(0, 1fr))',
            },
          }}
        >
          {visibleCards.map((c) => (
            <ModuleCard
              key={c.title}
              item={c}
              onClick={() => onCardClick?.(c)}
              size={size}
            />
          ))}
        </Box>
      </Collapse>

      {shouldCollapse && collapsed ? (
        <Typography
          variant='caption'
          color='text.secondary'
          sx={{ mt: 0.75, display: 'block', textAlign: 'right' }}
        >
          {i18n.t('components.dashboard_sections.k1')} {cards.length - collapsedLimit} {i18n.t('components.dashboard_sections.k2')} ↑ {i18n.t('components.dashboard_sections.k3')}
        </Typography>
      ) : null}
    </Box>
  );
};

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
        boxShadow: designTokens.shadows.sm,
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
              aria-label={i18n.t('shared.dashboard_sections.k6')}
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
      title={i18n.t('shared.dashboard_sections.k7')}
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
      title={i18n.t('shared.dashboard_sections.k8')}
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
      title={i18n.t('shared.dashboard_sections.k9')}
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
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

export const ModuleNavigationSection: React.FC<ModuleNavigationSectionProps> = ({
  children,
  title = i18n.t('shared.dashboard_sections.k10'),
  icon,
  collapsible,
  defaultExpanded,
}) => {
  return (
    <DashboardSection
      title={title}
      icon={icon}
      collapsible={collapsible}
      defaultExpanded={defaultExpanded}
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
      title={i18n.t('shared.dashboard_sections.k11')}
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
      title={i18n.t('shared.dashboard_sections.k12')}
      collapsible
      defaultExpanded={defaultExpanded}
      headerRight={headerRight}
    >
      {children}
    </DashboardSection>
  );
};
