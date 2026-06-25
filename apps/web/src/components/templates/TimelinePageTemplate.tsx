import React, { useState, useCallback, useMemo } from 'react';
import type { BoxProps } from '@mui/material';
import {
  Box,
  Paper,
  Typography,
  Button,
  Chip,
  IconButton,
  Tooltip,
  Avatar,
  Badge,
  Skeleton,
  useTheme,
  useMediaQuery,
  Divider,
} from '@mui/material';
import {
  Plus,
  MoreHorizontal,
  Calendar,
  Filter,
  Search,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Clock,
  MapPin,
  Users,
  Tag,
} from 'lucide-react';
import type { BreadcrumbItem } from './PageHeader';
import { PageHeader } from './PageHeader';

// ============ 类型定义 ============

export interface TimelineNode {
  id: string;
  title: string;
  description?: string;
  date: string;
  time?: string;
  type?: 'event' | 'milestone' | 'task' | 'meeting' | 'reminder';
  status?: 'completed' | 'in-progress' | 'pending' | 'cancelled';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  icon?: React.ReactNode;
  color?: string;
  tags?: Array<{ label: string; color?: string }>;
  location?: string;
  participants?: Array<{ id: string; name: string; avatar?: string }>;
  onClick?: () => void;
  actions?: React.ReactNode;
  children?: TimelineNode[];
}

export interface TimelineGroup {
  id: string;
  title: string;
  icon?: React.ReactNode;
  color?: string;
  nodes: TimelineNode[];
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

export interface TimelineAction {
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  variant?: 'contained' | 'outlined' | 'text';
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'success';
}

export interface TimeRange {
  id: string;
  label: string;
  start: Date;
  end: Date;
}

export interface TimelinePageTemplateProps extends BoxProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];

  nodes: TimelineNode[];
  groups?: TimelineGroup[];

  loading?: boolean;
  error?: string;

  showSearch?: boolean;
  showFilter?: boolean;
  showTimeRange?: boolean;

  searchValue?: string;
  onSearch?: (value: string) => void;

  filterConfig?: {
    types?: string[];
    statuses?: string[];
    priorities?: string[];
    tags?: string[];
  };
  filters?: Record<string, any>;
  onFilterChange?: (filters: Record<string, any>) => void;

  timeRanges?: TimeRange[];
  selectedTimeRange?: string;
  onTimeRangeChange?: (rangeId: string) => void;

  actions?: TimelineAction[];
  headerContent?: React.ReactNode;
  footerContent?: React.ReactNode;

  defaultGroupExpanded?: boolean;
}

// ============ 时间线页模板组件 ============

export const TimelinePageTemplate: React.FC<TimelinePageTemplateProps> = ({
  title,
  subtitle,
  breadcrumbs,
  nodes,
  groups,
  loading,
  error,
  showSearch = true,
  showFilter = true,
  showTimeRange = true,
  searchValue,
  onSearch,
  filterConfig,
  filters,
  onFilterChange,
  timeRanges = [
    { id: 'today', label: '今天', start: new Date(), end: new Date() },
    { id: 'week', label: '本周', start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), end: new Date() },
    { id: 'month', label: '本月', start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), end: new Date() },
    { id: 'all', label: '全部', start: new Date(0), end: new Date() },
  ],
  selectedTimeRange = 'week',
  onTimeRangeChange,
  actions = [],
  headerContent,
  footerContent,
  defaultGroupExpanded = true,
  ...props
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [searchInput, setSearchInput] = useState(searchValue || '');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const handleSearch = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setSearchInput(value);
      onSearch?.(value);
    },
    [onSearch]
  );

  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }, []);

  const getTypeIcon = (type?: string) => {
    switch (type) {
      case 'milestone':
        return <Badge badgeContent='!' color='warning' />;
      case 'task':
        return <Clock style={{ width: 16, height: 16 }} />;
      case 'meeting':
        return <Users style={{ width: 16, height: 16 }} />;
      case 'reminder':
        return <Tag style={{ width: 16, height: 16 }} />;
      default:
        return <Calendar style={{ width: 16, height: 16 }} />;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'in-progress':
        return 'info';
      case 'pending':
        return 'warning';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'urgent':
        return 'error';
      case 'high':
        return 'warning';
      case 'medium':
        return 'info';
      case 'low':
        return 'success';
      default:
        return 'default';
    }
  };

  const renderSearchAndFilter = () => {
    if (!showSearch && !showFilter && !showTimeRange) return null;

    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          mb: 3,
          flexWrap: 'wrap',
        }}
      >
        {showSearch && (
          <Box sx={{ position: 'relative', minWidth: 250 }}>
            <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 18, height: 18, color: 'text.secondary' }} />
            <input
              type='text'
              value={searchInput}
              onChange={handleSearch}
              placeholder='搜索时间线...'
              style={{
                width: '100%',
                padding: '8px 12px 8px 40px',
                borderRadius: 8,
                border: '1px solid',
                borderColor: theme.palette.divider,
                fontSize: '0.875rem',
                outline: 'none',
              } as React.CSSProperties}
            />
          </Box>
        )}

        {showTimeRange && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            {timeRanges.map((range) => (
              <Button
                key={range.id}
                size='small'
                variant={selectedTimeRange === range.id ? 'contained' : 'outlined'}
                onClick={() => onTimeRangeChange?.(range.id)}
              >
                {range.label}
              </Button>
            ))}
          </Box>
        )}

        {showFilter && (
          <Tooltip title='筛选'>
            <IconButton size='small'>
              <Filter style={{ width: 18, height: 18 }} />
            </IconButton>
          </Tooltip>
        )}

        <Tooltip title='刷新'>
          <IconButton size='small'>
            <RefreshCw style={{ width: 18, height: 18 }} />
          </IconButton>
        </Tooltip>
      </Box>
    );
  };

  const renderNode = (node: TimelineNode, isChild = false) => {
    const isExpanded = node.children?.length ? expandedGroups.has(node.id) : true;

    return (
      <React.Fragment key={node.id}>
        <Box
          sx={{
            display: 'flex',
            gap: 2,
            cursor: node.onClick ? 'pointer' : 'default',
            '&:hover': node.onClick ? { bgcolor: 'action.hover' } : {},
            padding: isChild ? '8px 0 8px 24px' : '8px 0',
            borderRadius: 1,
          }}
          onClick={node.onClick}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 48 }}>
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                bgcolor: node.color || 'primary.main',
                border: '3px solid',
                borderColor: theme.palette.background.paper,
                boxShadow: `0 0 0 2px ${node.color || theme.palette.primary.main}`,
              }}
            />
            {!isChild && (
              <Box
                sx={{
                  width: 2,
                  flex: 1,
                  minHeight: '40px',
                  bgcolor: 'divider',
                  mt: 1,
                }}
              />
            )}
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: `${node.color || 'primary'}.light`,
                  color: node.color || 'primary.main',
                }}
              >
                {node.icon || getTypeIcon(node.type)}
              </Box>
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Typography variant='body1' sx={{ fontWeight: 500 }}>
                    {node.title}
                  </Typography>
                  {node.status && (
                    <Chip
                      label={node.status}
                      size='small'
                      color={getStatusColor(node.status) as any}
                      sx={{ height: 20, fontSize: '0.6rem' }}
                    />
                  )}
                  {node.priority && (
                    <Chip
                      label={node.priority}
                      size='small'
                      color={getPriorityColor(node.priority) as any}
                      sx={{ height: 20, fontSize: '0.6rem' }}
                    />
                  )}
                </Box>

                {node.description && (
                  <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
                    {node.description}
                  </Typography>
                )}

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1, flexWrap: 'wrap' }}>
                  <Typography variant='caption' color='text.secondary'>
                    {new Date(node.date).toLocaleDateString('zh-CN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      weekday: 'short',
                    })}
                  </Typography>
                  {node.time && (
                    <Typography variant='caption' color='text.secondary'>
                      {node.time}
                    </Typography>
                  )}
                  {node.location && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <MapPin style={{ width: 12, height: 12, color: 'text.secondary' }} />
                      <Typography variant='caption' color='text.secondary'>
                        {node.location}
                      </Typography>
                    </Box>
                  )}
                </Box>

                {node.tags && node.tags.length > 0 && (
                  <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                    {node.tags.map((tag, index) => (
                      <Chip
                        key={index}
                        label={tag.label}
                        size='small'
                        sx={{
                          height: 18,
                          fontSize: '0.6rem',
                          bgcolor: tag.color || 'grey.100',
                          color: tag.color || 'grey.700',
                        }}
                      />
                    ))}
                  </Box>
                )}

                {node.participants && node.participants.length > 0 && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                    {node.participants.slice(0, 3).map((participant) => (
                      <Avatar
                        key={participant.id}
                        src={participant.avatar}
                        sx={{ width: 24, height: 24, fontSize: '0.7rem' }}
                      >
                        {participant.name.charAt(0)}
                      </Avatar>
                    ))}
                    {node.participants.length > 3 && (
                      <Typography variant='caption' color='text.secondary'>
                        +{node.participants.length - 3}
                      </Typography>
                    )}
                  </Box>
                )}

                {node.actions && (
                  <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>{node.actions}</Box>
                )}
              </Box>

              {node.children && node.children.length > 0 && (
                <IconButton
                  size='small'
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleGroup(node.id);
                  }}
                >
                  {isExpanded ? (
                    <ChevronUp style={{ width: 16, height: 16 }} />
                  ) : (
                    <ChevronDown style={{ width: 16, height: 16 }} />
                  )}
                </IconButton>
              )}
            </Box>
          </Box>
        </Box>

        {node.children && node.children.length > 0 && isExpanded && (
          <Box sx={{ ml: 2 }}>
            {node.children.map((child) => renderNode(child, true))}
          </Box>
        )}
      </React.Fragment>
    );
  };

  const renderGroup = (group: TimelineGroup) => {
    const isExpanded = expandedGroups.has(group.id);

    return (
      <Paper key={group.id} sx={{ borderRadius: 2, overflow: 'hidden', mb: 2 }}>
        <Box
          sx={{
            p: 2,
            borderBottom: 1,
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: group.collapsible ? 'pointer' : 'default',
            bgcolor: group.color ? `${group.color}50` : 'inherit',
          }}
          onClick={() => group.collapsible && toggleGroup(group.id)}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {group.icon && (
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: group.color ? `${group.color}20` : 'primary.light',
                  color: group.color || 'primary.main',
                }}
              >
                {group.icon}
              </Box>
            )}
            <Box>
              <Typography variant='subtitle1' sx={{ fontWeight: 600 }}>
                {group.title}
              </Typography>
              <Typography variant='caption' color='text.secondary'>
                {group.nodes.length} 个事件
              </Typography>
            </Box>
          </Box>
          {group.collapsible && (
            <IconButton size='small'>
              {isExpanded ? (
                <ChevronUp style={{ width: 18, height: 18 }} />
              ) : (
                <ChevronDown style={{ width: 18, height: 18 }} />
              )}
            </IconButton>
          )}
        </Box>

        <Box sx={{ p: 2 }}>
          {loading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} variant='rectangular' height={60} sx={{ borderRadius: 1, mb: 1 }} />
            ))
          ) : group.nodes.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant='caption' color='text.secondary'>
                暂无事件
              </Typography>
            </Box>
          ) : isExpanded ? (
            group.nodes.map((node) => renderNode(node))
          ) : (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant='caption' color='text.secondary'>
                点击展开查看 {group.nodes.length} 个事件
              </Typography>
            </Box>
          )}
        </Box>
      </Paper>
    );
  };

  const renderTimeline = () => {
    if (error) {
      return (
        <Paper sx={{ p: 4, borderRadius: 2 }}>
          <Typography variant='body1' color='error'>
            {error}
          </Typography>
        </Paper>
      );
    }

    if (groups && groups.length > 0) {
      return groups.map(renderGroup);
    }

    return (
      <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ p: 3 }}>
          {loading ? (
            Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} variant='rectangular' height={80} sx={{ borderRadius: 1, mb: 2 }} />
            ))
          ) : nodes.length === 0 ? (
            <Box sx={{ p: 8, textAlign: 'center' }}>
              <Calendar style={{ width: 48, height: 48, color: 'text.secondary', margin: '0 auto 16px' }} />
              <Typography variant='body1' color='text.secondary'>
                暂无时间线事件
              </Typography>
            </Box>
          ) : (
            nodes.map((node) => renderNode(node))
          )}
        </Box>
      </Paper>
    );
  };

  return (
    <Box {...props}>
      <PageHeader
        title={title}
        subtitle={subtitle}
        breadcrumbs={breadcrumbs}
        loading={loading}
      >
        {headerContent}
        {actions.map((action, index) => (
          <Button
            key={index}
            variant={action.variant || 'contained'}
            size='small'
            startIcon={action.icon}
            onClick={action.onClick}
            sx={{ ml: 1 }}
          >
            {action.label}
          </Button>
        ))}
      </PageHeader>

      {renderSearchAndFilter()}

      {renderTimeline()}

      {footerContent}
    </Box>
  );
};

export default TimelinePageTemplate;