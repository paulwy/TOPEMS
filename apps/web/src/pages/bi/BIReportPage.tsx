import { useState, useMemo, useCallback } from 'react';
import { logger } from '@/utils/logger';
import { Plus, Edit, Trash2, Eye, Download, FileText, Calendar, User } from 'lucide-react';
import { Chip, Box, Typography, Tooltip, IconButton, Alert, Button } from '@mui/material';
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  type FilterConfig,
} from '@/components/templates';
import { PageContainer } from '@/components/common';
import { useCrudOperations } from '@/hooks/useCrudQueries';
import { reportCrudApi, type Report as ApiReport } from '@/api/bi';

interface Report {
  id: string;
  name: string;
  type: string;
  creator: string;
  created_at: string;
  updated_at: string;
  status: 'active' | 'draft' | 'archived';
  description?: string;
}

const getTypeConfig = (type: string) => {
  switch (type) {
    case 'daily':
      return { color: 'info' as const, label: '日报' };
    case 'weekly':
      return { color: 'success' as const, label: '周报' };
    case 'monthly':
      return { color: 'warning' as const, label: '月报' };
    case 'quarterly':
      return { color: 'secondary' as const, label: '季报' };
    case 'annual':
      return { color: 'primary' as const, label: '年报' };
    case 'custom':
      return { color: 'default' as const, label: '自定义' };
    default:
      return { color: 'default' as const, label: type };
  }
};

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'active':
      return { color: 'success' as const, label: '启用' };
    case 'draft':
      return { color: 'warning' as const, label: '草稿' };
    case 'archived':
      return { color: 'default' as const, label: '归档' };
    default:
      return { color: 'default' as const, label: status };
  }
};

const apiReportToReport = (apiReport: ApiReport): Report => ({
  id: apiReport.id,
  name: apiReport.name,
  type: apiReport.report_type,
  creator: apiReport.created_by || '未知',
  created_at: apiReport.created_at,
  updated_at: apiReport.updated_at,
  status:
    apiReport.status === 'draft' || apiReport.status === 'archived'
      ? apiReport.status
      : 'active',
  description: apiReport.description,
});

const BIReportPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  const {
    data: apiReports,
    loading,
    error,
    pagination,
    fetch,
    refresh,
    delete: deleteItem,
  } = useCrudOperations<ApiReport>({
    api: reportCrudApi,
    queryKey: 'bi-reports',
    defaultPageSize: 10,
    pageParamName: 'page',
    pageSizeParamName: 'pageSize',
  });

  const reports = useMemo(() => {
    return apiReports.map(apiReportToReport);
  }, [apiReports]);

  const handleDeleteReport = useCallback(
    async (id: string) => {
      try {
        await deleteItem(id);
      } catch (e: unknown) {
        logger.error('Failed to delete report:', e);
      }
    },
    [deleteItem]
  );

  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      const matchesSearch =
        report.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.creator.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = !filterType || report.type === filterType;
      const matchesStatus = !filterStatus || report.status === filterStatus;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [reports, searchTerm, filterType, filterStatus]);

  const handleSearch = useCallback(
    (value: string) => {
      setSearchTerm(value);
      fetch({
        search: value || undefined,
        reportType: filterType || undefined,
        status: filterStatus || undefined,
      });
    },
    [fetch, filterType, filterStatus]
  );

  const handleFilterTypeChange = useCallback(
    (value: string) => {
      setFilterType(value);
      pagination.setPage(1);
      fetch({
        search: searchTerm || undefined,
        reportType: value || undefined,
        status: filterStatus || undefined,
      });
    },
    [fetch, searchTerm, filterStatus, pagination]
  );

  const handleFilterStatusChange = useCallback(
    (value: string) => {
      setFilterStatus(value);
      pagination.setPage(1);
      fetch({
        search: searchTerm || undefined,
        reportType: filterType || undefined,
        status: value || undefined,
      });
    },
    [fetch, searchTerm, filterType, pagination]
  );

  const columns = useMemo<ColumnDef<Report>[]>(
    () => [
      {
        id: 'name',
        label: '报表名称',
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <FileText
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
                {row.description || '暂无描述'}
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
              label={typeConfig.label}
              size='small'
              color={typeConfig.color}
              variant='outlined'
            />
          );
        },
      },
      {
        id: 'creator',
        label: '创建人',
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <User
              size={14}
              color='grey.600'
            />
            <Typography variant='body2'>{row.creator}</Typography>
          </Box>
        ),
      },
      {
        id: 'created_at',
        label: '创建时间',
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Calendar
              size={14}
              color='grey.600'
            />
            <Typography
              variant='body2'
              color='text.secondary'
            >
              {new Date(row.created_at).toLocaleDateString('zh-CN')}
            </Typography>
          </Box>
        ),
      },
      {
        id: 'status',
        label: '状态',
        render: (row) => {
          const statusConfig = getStatusConfig(row.status);
          return (
            <Chip
              label={statusConfig.label}
              size='small'
              color={statusConfig.color}
            />
          );
        },
      },
    ],
    []
  );

  const rowActions = useMemo<RowAction<Report>[]>(
    () => [
      {
        label: '预览',
        icon: <Eye size={16} />,
        onClick: (row) => logger.info('View:', row.id),
      },
      {
        label: '下载',
        icon: <Download size={16} />,
        onClick: (row) => logger.info('Download:', row.id),
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
        onClick: (row) => handleDeleteReport(row.id),
        confirm: true,
        confirmMessage: '确定要删除这个报表吗?',
      },
    ],
    [handleDeleteReport]
  );

  const filters = useMemo<FilterConfig[]>(
    () => [
      {
        id: 'type',
        label: '报表类型',
        type: 'select',
        options: [
          { value: '', label: '全部类型' },
          { value: 'daily', label: '日报' },
          { value: 'weekly', label: '周报' },
          { value: 'monthly', label: '月报' },
          { value: 'quarterly', label: '季报' },
          { value: 'annual', label: '年报' },
          { value: 'custom', label: '自定义' },
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
          { value: 'active', label: '启用' },
          { value: 'draft', label: '草稿' },
          { value: 'archived', label: '归档' },
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

  return (
    <PageContainer
      title='报表管理'
      subtitle='创建、管理和生成业务报表'
    >
      {error && (
        <Alert
          severity='error'
          sx={{ mb: 3 }}
        >
          {error}
        </Alert>
      )}
      <ListPageTemplate<Report>
        title=''
        subtitle=''
        columns={columns}
        data={filteredReports}
        loading={loading}
        searchable
        searchPlaceholder='搜索报表名称或创建人...'
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
            label: '新建报表',
            icon: <Plus size={16} />,
            variant: 'contained',
            onClick: () => logger.info('Create report'),
          },
        ]}
      />
    </PageContainer>
  );
};

export default BIReportPage;
