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
} from '@mui/material';
import {
  Plus,
  MoreHorizontal,
  GripVertical,
  Trash2,
  Edit,
  Archive,
  Filter,
  Search,
  RefreshCw,
  Columns3,
} from 'lucide-react';
import type { BreadcrumbItem } from './PageHeader';
import { PageHeader } from './PageHeader';

// ============ 类型定义 ============

export interface KanbanCard {
  id: string;
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  status?: string;
  assignee?: {
    id: string;
    name: string;
    avatar?: string;
  };
  dueDate?: string;
  tags?: Array<{ label: string; color?: string }>;
  comments?: number;
  attachments?: number;
  subtasks?: {
    total: number;
    completed: number;
  };
  onClick?: () => void;
  actions?: React.ReactNode;
}

export interface KanbanColumn {
  id: string;
  title: string;
  status: string;
  cards: KanbanCard[];
  color?: string;
  limit?: number;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  onAddCard?: () => void;
}

export interface KanbanAction {
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  variant?: 'contained' | 'outlined' | 'text';
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'success';
}

export interface KanbanStats {
  totalCards: number;
  totalColumns: number;
  overdueCards: number;
  completedCards: number;
}

export interface KanbanPageTemplateProps extends BoxProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];

  columns: KanbanColumn[];
  loading?: boolean;
  error?: string;

  onCardMove?: (
    cardId: string,
    sourceColumn: string,
    targetColumn: string,
    targetIndex: number
  ) => void;
  onCardDelete?: (cardId: string) => void;
  onCardEdit?: (cardId: string) => void;
  onCardArchive?: (cardId: string) => void;

  showStats?: boolean;
  showSearch?: boolean;
  showFilter?: boolean;
  showAddColumn?: boolean;

  searchValue?: string;
  onSearch?: (value: string) => void;

  filterConfig?: {
    priorities?: string[];
    assignees?: Array<{ id: string; name: string }>;
    tags?: string[];
  };
  filters?: Record<string, any>;
  onFilterChange?: (filters: Record<string, any>) => void;

  stats?: KanbanStats;

  actions?: KanbanAction[];
  headerContent?: React.ReactNode;
  footerContent?: React.ReactNode;

  defaultColumnWidth?: number;
}

// ============ 看板页模板组件 ============

export const KanbanPageTemplate: React.FC<KanbanPageTemplateProps> = ({
  title,
  subtitle,
  breadcrumbs,
  columns,
  loading,
  error,
  onCardMove,
  onCardDelete,
  onCardEdit,
  onCardArchive,
  showStats = true,
  showSearch = true,
  showFilter = true,
  showAddColumn = true,
  searchValue,
  onSearch,
  filterConfig,
  filters,
  onFilterChange,
  stats,
  actions = [],
  headerContent,
  footerContent,
  defaultColumnWidth = 300,
  ...props
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [searchInput, setSearchInput] = useState(searchValue || '');
  const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(new Set());
  const [draggedCard, setDraggedCard] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const computedStats = useMemo(() => {
    if (stats) return stats;

    const totalCards = columns.reduce((acc, col) => acc + col.cards.length, 0);
    const overdueCards = columns.reduce((acc, col) => {
      return (
        acc +
        col.cards.filter((card) => {
          if (!card.dueDate) return false;
          return new Date(card.dueDate) < new Date() && col.status !== 'completed';
        }).length
      );
    }, 0);
    const completedCards = columns.find((col) => col.status === 'completed')?.cards.length || 0;

    return {
      totalCards,
      totalColumns: columns.length,
      overdueCards,
      completedCards,
    };
  }, [columns, stats]);

  const handleSearch = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setSearchInput(value);
      onSearch?.(value);
    },
    [onSearch]
  );

  const toggleColumn = useCallback((columnId: string) => {
    setCollapsedColumns((prev) => {
      const next = new Set(prev);
      if (next.has(columnId)) {
        next.delete(columnId);
      } else {
        next.add(columnId);
      }
      return next;
    });
  }, []);

  const handleDragStart = useCallback((cardId: string) => {
    setDraggedCard(cardId);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedCard(null);
    setDragOverColumn(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    setDragOverColumn(columnId);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, targetColumnId: string) => {
      e.preventDefault();

      if (!draggedCard) return;

      let sourceColumnId: string | null = null;
      let sourceIndex = -1;

      columns.forEach((col) => {
        const index = col.cards.findIndex((card) => card.id === draggedCard);
        if (index !== -1) {
          sourceColumnId = col.id;
          sourceIndex = index;
        }
      });

      if (sourceColumnId && sourceColumnId !== targetColumnId) {
        onCardMove?.(draggedCard, sourceColumnId, targetColumnId, 0);
      }

      setDraggedCard(null);
      setDragOverColumn(null);
    },
    [draggedCard, columns, onCardMove]
  );

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

  const getPriorityLabel = (priority?: string) => {
    switch (priority) {
      case 'urgent':
        return '紧急';
      case 'high':
        return '高';
      case 'medium':
        return '中';
      case 'low':
        return '低';
      default:
        return '';
    }
  };

  const renderStats = () => {
    if (!showStats) return null;

    return (
      <Box
        sx={{
          display: 'flex',
          gap: 2,
          mb: 3,
          flexWrap: 'wrap',
        }}
      >
        <Paper sx={{ p: 2, borderRadius: 2, minWidth: 120 }}>
          <Typography
            variant='caption'
            color='text.secondary'
          >
            总任务
          </Typography>
          <Typography
            variant='h5'
            sx={{ fontWeight: 600 }}
          >
            {computedStats.totalCards}
          </Typography>
        </Paper>
        <Paper sx={{ p: 2, borderRadius: 2, minWidth: 120 }}>
          <Typography
            variant='caption'
            color='text.secondary'
          >
            列数
          </Typography>
          <Typography
            variant='h5'
            sx={{ fontWeight: 600 }}
          >
            {computedStats.totalColumns}
          </Typography>
        </Paper>
        <Paper sx={{ p: 2, borderRadius: 2, minWidth: 120 }}>
          <Typography
            variant='caption'
            color='error'
          >
            逾期任务
          </Typography>
          <Typography
            variant='h5'
            sx={{ fontWeight: 600, color: 'error.main' }}
          >
            {computedStats.overdueCards}
          </Typography>
        </Paper>
        <Paper sx={{ p: 2, borderRadius: 2, minWidth: 120 }}>
          <Typography
            variant='caption'
            color='success'
          >
            已完成
          </Typography>
          <Typography
            variant='h5'
            sx={{ fontWeight: 600, color: 'success.main' }}
          >
            {computedStats.completedCards}
          </Typography>
        </Paper>
      </Box>
    );
  };

  const renderSearchAndFilter = () => {
    if (!showSearch && !showFilter) return null;

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
            <Search
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 18,
                height: 18,
                color: theme.palette.text.secondary,
              }}
            />
            <input
              type='text'
              value={searchInput}
              onChange={handleSearch}
              placeholder='搜索任务...'
              style={
                {
                  width: '100%',
                  padding: '8px 12px 8px 40px',
                  borderRadius: 8,
                  border: '1px solid',
                  borderColor: theme.palette.divider,
                  fontSize: '0.875rem',
                  outline: 'none',
                } as React.CSSProperties
              }
            />
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

  const renderCard = (card: KanbanCard) => {
    const isDragging = draggedCard === card.id;

    return (
      <Paper
        key={card.id}
        draggable
        onDragStart={() => handleDragStart(card.id)}
        onDragEnd={handleDragEnd}
        sx={{
          p: 2,
          borderRadius: 2,
          cursor: 'pointer',
          marginBottom: 1,
          opacity: isDragging ? 0.5 : 1,
          transform: isDragging ? 'rotate(3deg)' : 'none',
          transition: 'all 0.2s',
          '&:hover': {
            boxShadow: 2,
          },
        }}
        onClick={card.onClick}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
          <GripVertical
            style={{ width: 16, height: 16, color: theme.palette.text.secondary, flexShrink: 0 }}
          />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant='body2'
              sx={{ fontWeight: 500 }}
            >
              {card.title}
            </Typography>
            {card.description && (
              <Typography
                variant='caption'
                color='text.secondary'
                sx={{ mt: 0.5, display: 'block' }}
              >
                {card.description}
              </Typography>
            )}
          </Box>
          <IconButton size='small'>
            <MoreHorizontal style={{ width: 16, height: 16 }} />
          </IconButton>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 2 }}>
          {card.priority && (
            <Chip
              label={getPriorityLabel(card.priority)}
              size='small'
              color={getPriorityColor(card.priority) as any}
              sx={{ height: 20, fontSize: '0.6rem' }}
            />
          )}
          {card.tags?.map((tag, index) => (
            <Chip
              key={index}
              label={tag.label}
              size='small'
              sx={{
                height: 20,
                fontSize: '0.6rem',
                bgcolor:
                  tag.color ||
                  (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'grey.100'),
                color: tag.color || (theme.palette.mode === 'dark' ? 'grey.400' : 'grey.700'),
              }}
            />
          ))}
        </Box>

        {card.subtasks && card.subtasks.total > 0 && (
          <Box sx={{ mb: 2 }}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                mb: 0.5,
              }}
            >
              <Typography
                variant='caption'
                color='text.secondary'
              >
                子任务
              </Typography>
              <Typography variant='caption'>
                {card.subtasks.completed}/{card.subtasks.total}
              </Typography>
            </Box>
            <Box
              sx={{
                width: '100%',
                height: 4,
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'grey.200',
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  width: `${(card.subtasks.completed / card.subtasks.total) * 100}%`,
                  height: '100%',
                  bgcolor: 'primary.main',
                  borderRadius: 2,
                }}
              />
            </Box>
          </Box>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {card.comments && (
              <Badge
                badgeContent={card.comments}
                color='primary'
              >
                <IconButton
                  size='small'
                  sx={{ p: 0 }}
                >
                  <Edit style={{ width: 14, height: 14 }} />
                </IconButton>
              </Badge>
            )}
            {card.attachments && (
              <Badge
                badgeContent={card.attachments}
                color='secondary'
              >
                <IconButton
                  size='small'
                  sx={{ p: 0 }}
                >
                  <Archive style={{ width: 14, height: 14 }} />
                </IconButton>
              </Badge>
            )}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {card.dueDate && (
              <Typography
                variant='caption'
                sx={{
                  color: new Date(card.dueDate) < new Date() ? 'error.main' : 'text.secondary',
                }}
              >
                {new Date(card.dueDate).toLocaleDateString()}
              </Typography>
            )}
            {card.assignee && (
              <Avatar
                src={card.assignee.avatar}
                sx={{ width: 24, height: 24, fontSize: '0.7rem' }}
              >
                {card.assignee.name.charAt(0)}
              </Avatar>
            )}
          </Box>
        </Box>
      </Paper>
    );
  };

  const renderColumn = (column: KanbanColumn) => {
    const isCollapsed = collapsedColumns.has(column.id);
    const isDragOver = dragOverColumn === column.id;

    return (
      <Box
        key={column.id}
        sx={{
          width: isMobile ? '100%' : defaultColumnWidth,
          flexShrink: 0,
        }}
        onDragOver={(e) => handleDragOver(e, column.id)}
        onDrop={(e) => handleDrop(e, column.id)}
      >
        <Paper
          sx={{
            borderRadius: 3,
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            border: isDragOver ? '2px dashed' : 'none',
            borderColor: isDragOver ? 'primary.main' : undefined,
            bgcolor: isDragOver
              ? theme.palette.mode === 'dark'
                ? 'rgba(59,130,246,0.15)'
                : 'primary.50'
              : undefined,
          }}
        >
          <Box
            sx={{
              p: 2,
              borderBottom: 1,
              borderColor: 'divider',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              {column.color && (
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: column.color,
                  }}
                />
              )}
              <Typography
                variant='subtitle2'
                sx={{ fontWeight: 600 }}
              >
                {column.title}
              </Typography>
              <Chip
                label={column.cards.length}
                size='small'
                sx={{ height: 20, fontSize: '0.65rem' }}
              />
              {column.limit && (
                <Typography
                  variant='caption'
                  sx={{
                    color: column.cards.length >= column.limit ? 'error.main' : 'text.secondary',
                  }}
                >
                  /{column.limit}
                </Typography>
              )}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {column.onAddCard && (
                <Tooltip title='添加任务'>
                  <IconButton
                    size='small'
                    onClick={column.onAddCard}
                  >
                    <Plus style={{ width: 16, height: 16 }} />
                  </IconButton>
                </Tooltip>
              )}
              {column.collapsible && (
                <Tooltip title={isCollapsed ? '展开' : '折叠'}>
                  <IconButton
                    size='small'
                    onClick={() => toggleColumn(column.id)}
                  >
                    <Columns3
                      style={{
                        width: 16,
                        height: 16,
                        transform: isCollapsed ? 'rotate(90deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s',
                      }}
                    />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          </Box>

          <Box sx={{ p: 1, overflow: 'auto', flex: 1, minHeight: 200 }}>
            {loading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <Skeleton
                  key={index}
                  variant='rectangular'
                  height={80}
                  sx={{ borderRadius: 2, mb: 1 }}
                />
              ))
            ) : isCollapsed ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  已折叠
                </Typography>
              </Box>
            ) : column.cards.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  暂无任务
                </Typography>
              </Box>
            ) : (
              column.cards.map(renderCard)
            )}
          </Box>

          {column.onAddCard && !isCollapsed && (
            <Box sx={{ p: 1 }}>
              <Button
                fullWidth
                variant='outlined'
                size='small'
                onClick={column.onAddCard}
                startIcon={<Plus style={{ width: 14, height: 14 }} />}
              >
                添加任务
              </Button>
            </Box>
          )}
        </Paper>
      </Box>
    );
  };

  const renderColumns = () => {
    if (error) {
      return (
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Paper sx={{ p: 4, borderRadius: 3 }}>
            <Typography
              variant='body1'
              color='error'
            >
              {error}
            </Typography>
          </Paper>
        </Box>
      );
    }

    return (
      <Box
        sx={{
          display: 'flex',
          gap: 2,
          overflowX: 'auto',
          paddingBottom: 2,
        }}
      >
        {columns.map(renderColumn)}
        {showAddColumn && (
          <Box
            sx={{
              width: isMobile ? '100%' : defaultColumnWidth,
              flexShrink: 0,
            }}
          >
            <Paper
              sx={{
                borderRadius: 3,
                p: 2,
                border: '2px dashed',
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: 120,
                cursor: 'pointer',
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: theme.palette.mode === 'dark' ? 'rgba(59,130,246,0.15)' : 'primary.50',
                },
              }}
            >
              <Typography
                variant='caption'
                sx={{ color: 'text.secondary' }}
              >
                添加新列
              </Typography>
            </Paper>
          </Box>
        )}
      </Box>
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

      {renderStats()}

      {renderSearchAndFilter()}

      <Box sx={{ display: 'flex', minHeight: 'calc(100vh - 280px)' }}>{renderColumns()}</Box>

      {footerContent}
    </Box>
  );
};

export default KanbanPageTemplate;
