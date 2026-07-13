import { useState, useMemo, useCallback } from 'react';
import { logger } from '@/utils/logger';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  RefreshCw,
  Edit,
  Trash2,
  Eye,
  TestTube,
  CheckCircle,
  XCircle,
  Clock,
  Database,
  Server,
} from 'lucide-react';
import { Chip, Box, Typography, Tooltip, IconButton, Alert, Button } from '@mui/material';
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  type FilterConfig,
} from '@/components/templates';
import { PageContainer } from '@/components/common';
import { useCrudOperations } from '@/hooks/useCrudQueries';
import {
  dataSourceCrudApi,
  testDataSource,
  refreshDataSource,
  type DataSource,
} from '@/api/bi';

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'active':
      return {
        color: 'success' as const,
        icon: <CheckCircle size={14} />,
        label: '已连接',
      };
    case 'inactive':
      return {
        color: 'default' as const,
        icon: <Clock size={14} />,
        label: '未激活',
      };
    case 'error':
      return {
        color: 'error' as const,
        icon: <XCircle size={14} />,
        label: '异常',
      };
    default:
      return {
        color: 'default' as const,
        icon: <Clock size={14} />,
        label: status,
      };
  }
};

const getTypeConfig = (type: string) => {
  switch (type) {
    case 'postgresql':
      return { icon: '🐘', label: 'PostgreSQL' };
    case 'mysql':
      return { icon: '🐬', label: 'MySQL' };
    case 'mongodb':
      return { icon: '🍃', label: 'MongoDB' };
    case 'redis':
      return { icon: '🔴', label: 'Redis' };
    case 'elasticsearch':
      return { icon: '🔍', label: 'Elasticsearch' };
    case 'api':
      return { icon: '🌐', label: 'API' };
    case 'file':
      return { icon: '📁', label: '文件' };
    default:
      return { icon: '💾', label: type };
  }
};

const BIDataSourcePage = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  const {
    data: datasources,
    loading,
    error,
    pagination,
    fetch,
    refresh,
    delete: deleteItem,
  } = useCrudOperations<DataSource>({
    api: dataSourceCrudApi,
    queryKey: 'bi-data-sources',
    defaultPageSize: 10,
    pageParamName: 'page',
    pageSizeParamName: 'pageSize',
  });

  const testConnectionMutation = useMutation({
    mutationFn: (id: string) => testDataSource(id),
    onSuccess: () => {
      logger.info('Connection test successful');
    },
  });

  const refreshMutation = useMutation({
    mutationFn: (id: string) => refreshDataSource(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bi-data-sources'] });
      logger.info('Sync successful');
    },
  });

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
    fetch({ search: value || undefined, type: filterType || undefined, status: filterStatus || undefined });
  }, [fetch, filterType, filterStatus]);

  const handleFilterTypeChange = useCallback((value: string) => {
    setFilterType(value);
    pagination.setPage(1);
    fetch({ search: searchTerm || undefined, type: value || undefined, status: filterStatus || undefined });
  }, [fetch, searchTerm, filterStatus, pagination]);

  const handleFilterStatusChange = useCallback((value: string) => {
    setFilterStatus(value);
    pagination.setPage(1);
    fetch({ search: searchTerm || undefined, type: filterType || undefined, status: value || undefined });
  }, [fetch, searchTerm, filterType, pagination]);

  const handleSync = useCallback(async (ds: DataSource) => {
    try {
      await refreshMutation.mutateAsync(ds.id);
    } catch (e: unknown) {
      logger.error('Failed to sync datasource:', e);
    }
  }, [refreshMutation]);

  const handleTestConnection = useCallback(async (ds: DataSource) => {
    try {
      await testConnectionMutation.mutateAsync(ds.id);
    } catch (e: unknown) {
      logger.error('Connection test failed:', e);
    }
  }, [testConnectionMutation]);

  const handleDelete = useCallback(async (ds: DataSource) => {
    try {
      await deleteItem(ds.id);
    } catch (e: unknown) {
      logger.error('Failed to delete datasource:', e);
    }
  }, [deleteItem]);

  const columns = useMemo<ColumnDef<DataSource>[]>(
    () => [
      {
        id: 'name',
        label: '数据源名称',
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Database
              size={18}
              color='grey.600'
            />
            <Box>
              <Typography
                variant='body2'
                sx={{ fontWeight: 500 }}
              >
                {row.name}
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                <Server size={12} /> {row.host}
              </Typography>
            </Box>
          </Box>
        ),
      },
      {
        id: 'type',
        label: '类型',
        render: (row) => {
          const typeConfig = getTypeConfig(row.type);
          return (
            <Chip
              icon={<Typography component='span'>{typeConfig.icon}</Typography>}
              label={typeConfig.label}
              size='small'
              variant='outlined'
            />
          );
        },
      },
      {
        id: 'status',
        label: '连接状态',
        render: (row) => {
          const statusConfig = getStatusConfig(row.status);
          return (
            <Chip
              icon={statusConfig.icon}
              label={statusConfig.label}
              size='small'
              color={statusConfig.color}
            />
          );
        },
      },
      {
        id: 'last_sync',
        label: '最后同步时间',
        render: (row) =>
          row.last_sync ? (
            <Typography
              variant='body2'
              color='text.secondary'
            >
              <Clock size={12} /> {new Date(row.last_sync).toLocaleString('zh-CN')}
            </Typography>
          ) : (
            <Typography
              variant='body2'
              color='text.secondary'
            >
              未同步
            </Typography>
          ),
      },
      {
        id: 'dataVolume',
        label: '数据量',
        render: (row) => (
          <Typography variant='body2'>
            {row.data_volume ? `${(row.data_volume / 1000).toFixed(1)}K` : '-'}
          </Typography>
        ),
      },
    ],
    []
  );

  const rowActions = useMemo<RowAction<DataSource>[]>(
    () => [
      {
        label: '同步',
        icon: <RefreshCw size={16} />,
        onClick: (row) => handleSync(row),
      },
      {
        label: '测试连接',
        icon: <TestTube size={16} />,
        onClick: (row) => handleTestConnection(row),
      },
      {
        label: '查看',
        icon: <Eye size={16} />,
        onClick: (row) => logger.info('View:', row.id),
      },
      {
        label: '编辑',
        icon: <Edit size={16} />,
        onClick: (row) => logger.info('Edit:', row.id),
      },
      {
        label: '删除',
        icon: <Trash2 size={16} />,
        color: 'error',
        onClick: (row) => handleDelete(row),
        confirm: true,
        confirmMessage: '确定要删除这个数据源吗?',
      },
    ],
    [handleSync, handleTestConnection, handleDelete]
  );

  const filters = useMemo<FilterConfig[]>(
    () => [
      {
        id: 'type',
        label: '数据源类型',
        type: 'select',
        options: [
          { value: '', label: '全部类型' },
          { value: 'postgresql', label: 'PostgreSQL' },
          { value: 'mysql', label: 'MySQL' },
          { value: 'mongodb', label: 'MongoDB' },
          { value: 'redis', label: 'Redis' },
          { value: 'elasticsearch', label: 'Elasticsearch' },
          { value: 'api', label: 'API' },
          { value: 'file', label: '文件' },
        ],
        value: filterType,
        onChange: (value) => handleFilterTypeChange(value as string),
      },
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { value: '', label: '全部' },
          { value: 'active', label: '已连接' },
          { value: 'inactive', label: '未激活' },
          { value: 'error', label: '异常' },
        ],
        value: filterStatus,
        onChange: (value) => handleFilterStatusChange(value as string),
      },
    ],
    [filterType, filterStatus, handleFilterTypeChange, handleFilterStatusChange]
  );

  const paginationConfig = useMemo(
    () => ({
      page: pagination.page - 1,
      pageSize: pagination.pageSize,
      total: pagination.total,
      onPageChange: (newPage: number) => pagination.setPage(newPage + 1),
      onPageSizeChange: (newPageSize: number) => pagination.setPageSize(newPageSize),
    }),
    [pagination]
  );

  const actionLoading = loading || testConnectionMutation.isPending || refreshMutation.isPending;

  return (
    <PageContainer
      title='数据源管理'
      subtitle='配置和管理BI数据源连接'
    >
      <ListPageTemplate<DataSource>
        title=''
        subtitle=''
        columns={columns}
        data={datasources}
        loading={actionLoading}
        error={error || undefined}
        searchable
        searchPlaceholder='搜索数据源名称...'
        searchValue={searchTerm}
        onSearch={handleSearch}
        filters={filters}
        pagination={paginationConfig}
        rowActions={rowActions}
        onRefresh={refresh}
        actions={[
          {
            label: '返回数据大屏',
            variant: 'outlined',
            onClick: () => logger.info('Back to dashboard'),
          },
          {
            label: '新增数据源',
            icon: <Plus size={16} />,
            variant: 'contained',
            onClick: () => logger.info('Add datasource'),
          },
        ]}
      />
    </PageContainer>
  );
};

export default BIDataSourcePage;
