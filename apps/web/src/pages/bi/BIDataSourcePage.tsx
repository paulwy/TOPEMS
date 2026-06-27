import { useState, useEffect, useMemo } from 'react';
import { logger } from '@/utils/logger';
import { useAppStore } from '@/store';
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
import { Chip, Box, Typography, Tooltip, IconButton, Alert } from '@mui/material';
import { Button } from '@mui/material';
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  type FilterConfig,
} from '@/components/templates';
import { PageContainer } from '@/components/common';
import {
  listDataSources,
  deleteDataSource,
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
  const [datasources, setDatasources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadDatasources();
  }, [page, rowsPerPage, filterType, filterStatus]);

  const loadDatasources = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listDataSources({
        page: page + 1,
        pageSize: rowsPerPage,
        search: searchTerm || undefined,
        type: filterType || undefined,
        status: filterStatus || undefined,
      });
      if (res.success && res.data) {
        setDatasources(res.data.items || []);
        setTotal(res.data.total || 0);
      }
    } catch (e: unknown) {
      logger.error('Failed to load datasources:', e);
      setError('加载数据源列表失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePage = (newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (newPageSize: number) => {
    setRowsPerPage(newPageSize);
    setPage(0);
  };

  const handleSync = async (ds: DataSource) => {
    try {
      const res = await refreshDataSource(ds.id);
      if (res.success) {
        logger.info('Sync successful:', ds.id);
        loadDatasources();
      }
    } catch (e: unknown) {
      logger.error('Failed to sync datasource:', e);
      setError('同步数据源失败');
    }
  };

  const handleTestConnection = async (ds: DataSource) => {
    try {
      const res = await testDataSource(ds.id);
      if (res.success) {
        logger.info('Connection test successful:', ds.id);
      }
    } catch (e: unknown) {
      logger.error('Connection test failed:', e);
      setError('连接测试失败');
    }
  };

  const handleDelete = async (ds: DataSource) => {
    try {
      const res = await deleteDataSource(ds.id);
      if (res.success) {
        logger.info('Delete successful:', ds.id);
        loadDatasources();
      }
    } catch (e: unknown) {
      logger.error('Failed to delete datasource:', e);
      setError('删除数据源失败');
    }
  };

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
    []
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
        onChange: (value) => setFilterType(value as string),
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
        onChange: (value) => setFilterStatus(value as string),
      },
    ],
    [filterType, filterStatus]
  );

  const pagination = useMemo(
    () => ({
      page,
      pageSize: rowsPerPage,
      total,
      onPageChange: handleChangePage,
      onPageSizeChange: handleChangeRowsPerPage,
    }),
    [page, rowsPerPage, total]
  );

  return (
    <PageContainer title='数据源管理' subtitle='配置和管理BI数据源连接'>
      <ListPageTemplate<DataSource>
        title=''
        subtitle=''
      columns={columns}
      data={datasources}
      loading={loading}
      searchable
      searchPlaceholder='搜索数据源名称...'
      searchValue={searchTerm}
      onSearch={(value) => setSearchTerm(value)}
      filters={filters}
      pagination={pagination}
      rowActions={rowActions}
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
