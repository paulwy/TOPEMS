import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Box, Card, CardContent, Typography, Chip } from '@mui/material';
import {
  FileText as FileTextIcon,
  Clock as ClockIcon,
  Users as UsersIcon,
  BarChart3 as AnalyticsIcon,
  Eye,
  Trash2,
  Download,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ListPageTemplate, type ColumnDef, type RowAction } from '@/components/templates';
import { PageContainer } from '@/components/common';
import { reportApi } from '@/api/report';
import type { ReportData } from '@/api/report';
import { useAppStore } from '@/store';
import { apiLogger } from '@/utils/logger';
import ConfirmDialog from '@/components/common/ConfirmDialog';

const ReportListPage: React.FC = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState<ReportData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [stats, setStats] = useState({ total: 0, today: 0, scheduled: 0, subscribed: 0 });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ReportData | null>(null);
  const addNotification = useAppStore((state) => state.addNotification);

  const loadReports = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await reportApi.listReports();
      if (response.success && response.data) {
        const items = Array.isArray(response.data) ? response.data : [];
        setReports(items);
        setStats({
          total: items.length,
          today: items.filter((r) => {
            const date = new Date(r.created_at);
            const today = new Date();
            return date.toDateString() === today.toDateString();
          }).length,
          scheduled: 0,
          subscribed: 0,
        });
      } else {
        setReports([]);
        setStats({ total: 0, today: 0, scheduled: 0, subscribed: 0 });
        setError(response.message || '加载报表数据失败');
      }
    } catch (err: unknown) {
      apiLogger.error('加载报表数据失败:', err);
      setError('加载报表数据失败');
      addNotification({
        type: 'error',
        title: '加载失败',
        message: '加载报表数据失败',
      });
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const filteredReports = useMemo(() => {
    return reports.filter((r) =>
      r.config.title?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [reports, searchTerm]);

  const paginatedReports = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredReports.slice(start, start + rowsPerPage);
  }, [filteredReports, page, rowsPerPage]);

  const handleDeleteClick = (report: ReportData) => {
    setSelectedReport(report);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedReport) return;
    try {
      const response = await reportApi.deleteReport(selectedReport.id);
      if (response.success) {
        addNotification({
          type: 'success',
          title: '删除成功',
          message: '删除报表成功',
        });
        setReports((prev) => prev.filter((r) => r.id !== selectedReport.id));
        setStats((prev) => ({ ...prev, total: Math.max(0, prev.total - 1) }));
      } else {
        throw new Error(response.message || '删除报表失败');
      }
    } catch (err: unknown) {
      apiLogger.error('删除报表失败:', err);
      addNotification({
        type: 'error',
        title: '删除失败',
        message: '删除报表失败',
      });
    }
  };

  const handleExport = async (report: ReportData) => {
    try {
      const response = await reportApi.exportReport(report.id, { format: 'excel' });
      if (response.success && response.data) {
        addNotification({
          type: 'success',
          title: '导出成功',
          message: '导出报表成功',
        });
      } else {
        throw new Error(response.message || '导出报表失败');
      }
    } catch (err: unknown) {
      apiLogger.error('导出报表失败:', err);
      addNotification({
        type: 'error',
        title: '导出失败',
        message: '导出报表失败',
      });
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN');
  };

  const columns: ColumnDef<ReportData>[] = useMemo(
    () => [
      {
        id: 'id',
        label: '报表ID',
        width: 100,
      },
      {
        id: 'title',
        label: '报表名称',
        width: 200,
        sortable: true,
        render: (row) => row.config.title,
      },
      {
        id: 'type',
        label: '报表类型',
        width: 150,
        render: (row) => (
          <Chip label={row.config.report_type} size='small' variant='outlined' />
        ),
      },
      {
        id: 'rowCount',
        label: '数据行数',
        width: 100,
        sortable: true,
        render: (row) => row.row_count,
      },
      {
        id: 'createdAt',
        label: '创建时间',
        width: 180,
        sortable: true,
        render: (row) => formatDate(row.created_at),
      },
    ],
    []
  );

  const rowActions: RowAction<ReportData>[] = [
    {
      label: '查看详情',
      icon: <Eye size={16} />,
      onClick: (row) => navigate(`'/report/list'`),
    },
    {
      label: '导出',
      icon: <Download size={16} />,
      onClick: handleExport,
    },
    {
      label: '删除',
      icon: <Trash2 size={16} />,
      color: 'error',
      onClick: handleDeleteClick,
    },
  ];

  const headerContent = (
    <Box>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 2,
          mb: 3,
        }}
      >
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <Typography color='text.secondary' variant='body2'>
                  报表总数
                </Typography>
                <Typography variant='h4' sx={{ fontWeight: 'bold' }}>
                  {stats.total}
                </Typography>
              </div>
              <FileTextIcon color='primary' size={32} />
            </Box>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <Typography color='text.secondary' variant='body2'>
                  今日生成
                </Typography>
                <Typography variant='h4' sx={{ fontWeight: 'bold' }}>
                  {stats.today}
                </Typography>
              </div>
              <AnalyticsIcon color='success' size={32} />
            </Box>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <Typography color='text.secondary' variant='body2'>
                  定时任务
                </Typography>
                <Typography variant='h4' sx={{ fontWeight: 'bold' }}>
                  {stats.scheduled}
                </Typography>
              </div>
              <ClockIcon color='warning' size={32} />
            </Box>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <Typography color='text.secondary' variant='body2'>
                  订阅用户
                </Typography>
                <Typography variant='h4' sx={{ fontWeight: 'bold' }}>
                  {stats.subscribed}
                </Typography>
              </div>
              <UsersIcon color='info' size={32} />
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );

  return (
    <PageContainer title='报表中心' subtitle='统一报表管理平台，支持多种报表类型和导出格式'>
      <ListPageTemplate
        title=''
        subtitle=''
        breadcrumbs={[{ label: '首页', href: '/dashboard' }, { label: '报表中心' }]}
        columns={columns}
        data={paginatedReports}
        loading={loading}
        error={error}
        pagination={{
          page,
          pageSize: rowsPerPage,
          total: filteredReports.length,
          onPageChange: setPage,
          onPageSizeChange: (size) => {
            setRowsPerPage(size);
            setPage(0);
          },
        }}
        searchable
        searchPlaceholder='搜索报表名称...'
        searchValue={searchTerm}
        onSearch={(value) => {
          setSearchTerm(value);
          setPage(0);
        }}
        actions={[]}
        rowActions={rowActions}
        headerContent={headerContent}
        getRowId={(row) => row.id}
        onRefresh={loadReports}
        emptyMessage='暂无报表数据'
        showRowNumber
        columnConfigurable
        persistColumnConfig
        columnConfigStorageKey='report-list-columns'
      />

      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setSelectedReport(null);
        }}
        onConfirm={handleDeleteConfirm}
        title='确认删除'
        message={`确定要删除报表 "${selectedReport?.config.title}" 吗？此操作不可恢复。`}
        danger
      />
    </PageContainer>
  );
};

export default ReportListPage;