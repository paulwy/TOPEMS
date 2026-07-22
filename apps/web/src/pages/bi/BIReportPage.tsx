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

import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
        label: t('bi.bi_report_page.name'),
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
                {row.description || t('bi.bi_report_page.description')}
              </Typography>
            </Box>
          </Box>
        ),
      },
      {
        id: 'type',
        label: t('bi.bi_report_page.type'),
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
        label: t('bi.bi_report_page.creator'),
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
        label: t('bi.bi_report_page.created_at'),
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
        label: t('bi.bi_report_page.status'),
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
        label: t('bi.bi_report_page.text_645dbc'),
        icon: <Eye size={16} />,
        onClick: (row) => logger.info('View:', row.id),
      },
      {
        label: t('bi.bi_report_page.download'),
        icon: <Download size={16} />,
        onClick: (row) => logger.info('Download:', row.id),
      },
      {
        label: t('bi.bi_report_page.edit'),
        icon: <Edit size={16} />,
        onClick: (row) => logger.info('Edit:', row.id),
      },
      {
        label: t('bi.bi_report_page.delete'),
        icon: <Trash2 size={16} />,
        color: 'error',
        onClick: (row) => handleDeleteReport(row.id),
        confirm: true,
        confirmMessage: t('bi.bi_report_page.confirm'),
      },
    ],
    [handleDeleteReport]
  );

  const filters = useMemo<FilterConfig[]>(
    () => [
      {
        id: 'type',
        label: t('bi.bi_report_page.type_1'),
        type: 'select',
        options: [
          { value: '', label: t('bi.bi_report_page.type_2') },
          { value: 'daily', label: t('bi.bi_report_page.text_843774') },
          { value: 'weekly', label: t('bi.bi_report_page.text_242121') },
          { value: 'monthly', label: t('bi.bi_report_page.text_1f904d') },
          { value: 'quarterly', label: t('bi.bi_report_page.text_f7ff8b') },
          { value: 'annual', label: t('bi.bi_report_page.text_958d52') },
          { value: 'custom', label: t('bi.bi_report_page.text_f1d4ff') },
        ],
        value: filterType,
        onChange: (value) => handleFilterTypeChange(value as string),
      },
      {
        id: 'status',
        label: t('bi.bi_report_page.status'),
        type: 'select',
        options: [
          { value: '', label: t('bi.bi_report_page.all') },
          { value: 'active', label: t('bi.bi_report_page.active') },
          { value: 'draft', label: t('bi.bi_report_page.text_22b433') },
          { value: 'archived', label: t('bi.bi_report_page.text_2f51c1') },
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
      title={t('bi.bi_report_page.text_256969')}
      subtitle={t('bi.bi_report_page.create')}
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
        searchPlaceholder={t('bi.bi_report_page.creator_1')}
        searchValue={searchTerm}
        onSearch={handleSearch}
        filters={filters}
        pagination={paginationConfig}
        rowActions={rowActions}
        onRefresh={refresh}
        actions={[
          {
            label: t('bi.bi_report_page.back'),
            variant: 'outlined',
            onClick: () => logger.info('Back to dashboard'),
          },
          {
            label: t('bi.bi_report_page.text_025119'),
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
