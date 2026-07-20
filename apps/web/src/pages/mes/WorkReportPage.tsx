import {
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Box,
  InputLabel,
  Select,
  MenuItem,
  FormControl,
  Stack,
  Typography,
  Button,
} from '@mui/material';
import { PageContainer } from '@/components/common/PageContainerV2';
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';
import type {
  WorkReport,
  CreateWorkReportRequest,
  UpdateWorkReportRequest,
  ListParams,
} from '@/api/mes';
import { mesApi } from '@/api/mes';
import { useNotificationStore } from '@/store';
import { LoadingSpinner } from '@topems/shared-components';
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  type FilterConfig,
} from '@/components/templates';
import { Plus, Edit, Trash2, Eye, CheckCircle, XCircle, Clock, FileText } from 'lucide-react';
import { apiLogger } from '@/utils/logger';
import { designTokens } from '@/theme/tokens';

import { useTranslation } from 'react-i18next';
const ct = designTokens.colors;

const WorkReportPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [showDialog, setShowDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedReport, setSelectedReport] = useState<WorkReport | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [formData, setFormData] = useState<CreateWorkReportRequest>({
    order_id: '',
    worker_name: '',
    quantity_good: 0,
    quantity_bad: 0,
    start_time: '',
    end_time: '',
  });

  const { addNotification } = useNotificationStore();

  const params: ListParams = {
    page: currentPage - 1,
    pagesize: pageSize,
  };
  if (searchTerm) params.search = searchTerm;
  if (statusFilter !== 'all') params.status = statusFilter;

  const { data: reportsData, isLoading: loading } = useQuery({
    queryKey: [...QUERY_KEYS.MES.WORK_REPORTS, params],
    queryFn: async () => {
      const response = await mesApi.workReports.list(params);
      if (response.success && response.data) {
        return {
          reports: response.data.reports || [],
          total: response.data.total || 0,
        };
      }
      return { reports: [], total: 0 };
    },
  });

  const reports = reportsData?.reports || [];
  const total = reportsData?.total || 0;

  const invalidateReports = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MES.WORK_REPORTS });
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      draft: t('mes.work_report_page.text_22b433'),
      submitted: t('mes.work_report_page.submit'),
      approved: t('mes.work_report_page.approved'),
      rejected: t('mes.work_report_page.status_rejected'),
      cancelled: t('mes.work_report_page.cancelled'),
    };
    return statusMap[status] || status;
  };

  const createMutation = useMutation({
    mutationFn: (data: CreateWorkReportRequest) => mesApi.workReports.create(data),
    onSuccess: () => {
      addNotification({ type: 'success', title: t('mes.work_report_page.create'), message: t('mes.work_report_page.create_1') });
      invalidateReports();
      setShowDialog(false);
      resetForm();
    },
    onError: (error: unknown) => {
      apiLogger.error(t('mes.work_report_page.operation_failed'), error);
      addNotification({ type: 'error', title: t('mes.work_report_page.operation_failed_1'), message: t('mes.work_report_page.create_2') });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateWorkReportRequest }) =>
      mesApi.workReports.update(id, data),
    onSuccess: () => {
      addNotification({ type: 'success', title: t('mes.work_report_page.update'), message: t('mes.work_report_page.update_1') });
      invalidateReports();
      setShowDialog(false);
      resetForm();
    },
    onError: (error: unknown) => {
      apiLogger.error(t('mes.work_report_page.operation_failed'), error);
      addNotification({ type: 'error', title: t('mes.work_report_page.operation_failed_1'), message: t('mes.work_report_page.update_2') });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => mesApi.workReports.delete(id),
    onSuccess: () => {
      addNotification({ type: 'success', title: t('mes.work_report_page.delete_success'), message: t('mes.work_report_page.deleted') });
      invalidateReports();
    },
    onError: (error: unknown) => {
      apiLogger.error(t('mes.work_report_page.delete'), error);
      addNotification({ type: 'error', title: t('mes.work_report_page.delete_1'), message: t('mes.work_report_page.delete_2') });
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => mesApi.workReports.approve(id),
    onSuccess: () => {
      addNotification({ type: 'success', title: t('mes.work_report_page.success'), message: t('mes.work_report_page.approved_1') });
      invalidateReports();
    },
    onError: (error: unknown) => {
      apiLogger.error(t('mes.work_report_page.fail'), error);
      addNotification({ type: 'error', title: t('mes.work_report_page.fail_1'), message: t('mes.work_report_page.work_report') });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => mesApi.workReports.reject(id),
    onSuccess: () => {
      addNotification({ type: 'success', title: t('mes.work_report_page.success_1'), message: t('mes.work_report_page.work_report_1') });
      invalidateReports();
    },
    onError: (error: unknown) => {
      apiLogger.error(t('mes.work_report_page.fail_2'), error);
      addNotification({ type: 'error', title: t('mes.work_report_page.fail_3'), message: t('mes.work_report_page.work_report_2') });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedReport) {
      updateMutation.mutate({ id: selectedReport.id, data: formData as UpdateWorkReportRequest });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: string) => {
    if (!window.confirm(t('mes.work_report_page.confirm'))) return;
    deleteMutation.mutate(id);
  };

  const handleApprove = (id: string) => {
    approveMutation.mutate(id);
  };

  const handleReject = (id: string) => {
    rejectMutation.mutate(id);
  };

  const handleEdit = (report: WorkReport) => {
    setSelectedReport(report);
    setFormData({
      order_id: report.order_id,
      worker_name: report.worker_name,
      quantity_good: report.quantity_good,
      quantity_bad: report.quantity_bad,
      start_time: report.start_time,
      end_time: report.end_time,
    });
    setShowDialog(true);
  };

  const handleViewDetail = (report: WorkReport) => {
    setSelectedReport(report);
    setShowDetailDialog(true);
  };

  const resetForm = () => {
    setSelectedReport(null);
    setFormData({
      order_id: '',
      worker_name: '',
      quantity_good: 0,
      quantity_bad: 0,
      start_time: '',
      end_time: '',
    });
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<
      string,
      {
        label: string;
        bg: string;
        color: string;
      }
    > = {
      draft: { label: t('mes.work_report_page.text_22b433'), bg: 'grey.100', color: 'text.secondary' },
      submitted: { label: t('mes.work_report_page.submit'), bg: 'primary.100', color: 'primary.dark' },
      approved: { label: t('mes.work_report_page.approved'), bg: 'success.lighter', color: 'success.700' },
      rejected: { label: t('mes.work_report_page.status_rejected'), bg: 'error.lighter', color: 'error.dark' },
      cancelled: { label: t('mes.work_report_page.cancelled'), bg: 'grey.100', color: 'text.secondary' },
    };
    const s = statusMap[status] || { label: status, bg: 'grey.100', color: 'text.secondary' };
    return (
      <Chip
        size='small'
        label={s.label}
        sx={{ backgroundColor: s.bg, color: s.color, fontWeight: 500 }}
      />
    );
  };

  const columns: ColumnDef<WorkReport>[] = useMemo(
    () => [
      { id: 'report_no', label: t('mes.work_report_page.column_report_no'), sortable: true },
      { id: 'order_number', label: t('mes.work_report_page.production'), sortable: true },
      { id: 'process_name', label: t('mes.work_report_page.field_process'), sortable: true },
      { id: 'work_station_name', label: t('mes.work_report_page.text_909250'), sortable: true },
      { id: 'worker_name', label: t('mes.work_report_page.operator'), sortable: true },
      { id: 'quantity_good', label: t('mes.work_report_page.field_qualified_quantity'), sortable: true },
      { id: 'quantity_bad', label: t('mes.work_report_page.field_defective_quantity'), sortable: true },
      { id: 'quantity_total', label: t('mes.work_report_page.total_quantity'), sortable: true },
      {
        id: 'start_time',
        label: t('mes.work_report_page.start_time'),
        render: (row) => (row.start_time ? new Date(row.start_time).toLocaleString('zh-CN') : '-'),
      },
      {
        id: 'end_time',
        label: t('mes.work_report_page.end_time'),
        render: (row) => (row.end_time ? new Date(row.end_time).toLocaleString('zh-CN') : '-'),
      },
      {
        id: 'status',
        label: t('mes.work_report_page.filter_status'),
        render: (row) => getStatusBadge(row.status),
      },
    ],
    []
  );

  const filters: FilterConfig[] = useMemo(
    () => [
      {
        id: 'status',
        label: t('mes.work_report_page.filter_status'),
        type: 'select',
        options: [
          { label: t('mes.work_report_page.filter_option_all_status'), value: 'all' },
          { label: t('mes.work_report_page.text_22b433'), value: 'draft' },
          { label: t('mes.work_report_page.submit'), value: 'submitted' },
          { label: t('mes.work_report_page.approved'), value: 'approved' },
          { label: t('mes.work_report_page.status_rejected'), value: 'rejected' },
          { label: t('mes.work_report_page.cancelled'), value: 'cancelled' },
        ],
        value: statusFilter,
        onChange: (value: unknown) => {
          setStatusFilter(value as string);
          setCurrentPage(1);
        },
      },
    ],
    [statusFilter]
  );

  const rowActions: RowAction<WorkReport>[] = useMemo(
    () => [
      {
        label: t('mes.work_report_page.action_view_detail'),
        icon: <Eye size={16} />,
        onClick: handleViewDetail,
      },
      {
        label: t('mes.work_report_page.action_edit'),
        icon: <Edit size={16} />,
        onClick: handleEdit,
      },
      {
        label: t('mes.work_report_page.text_cf13b1'),
        icon: <CheckCircle size={16} />,
        color: 'success',
        onClick: (row) => handleApprove(row.id),
        show: (row) => row.status === 'submitted',
      },
      {
        label: t('mes.work_report_page.action_reject'),
        icon: <XCircle size={16} />,
        color: 'error',
        onClick: (row) => handleReject(row.id),
        show: (row) => row.status === 'submitted',
      },
      {
        label: t('mes.work_report_page.action_delete'),
        icon: <Trash2 size={16} />,
        color: 'error',
        onClick: (row) => handleDelete(row.id),
        confirm: true,
        confirmMessage: t('mes.work_report_page.confirm'),
      },
    ],
    [handleViewDetail, handleEdit, handleDelete, handleApprove, handleReject]
  );

  const handleOpenCreate = () => {
    resetForm();
    setShowDialog(true);
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const stats = useMemo(() => {
    return {
      total: reports.length,
      draft: reports.filter((r) => r.status === 'draft').length,
      submitted: reports.filter((r) => r.status === 'submitted').length,
      approved: reports.filter((r) => r.status === 'approved').length,
      totalGood: reports.reduce((sum, r) => sum + r.quantity_good, 0),
    };
  }, [reports]);

  if (loading) return <LoadingSpinner />;

  const statsContent = (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(5, 1fr)' },
        gap: 2,
        mb: 3,
      }}
    >
      <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 3 }}>
        <Typography
          variant='body2'
          sx={{ color: 'text.secondary' }}
        >
          总记录数
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700 }}
        >
          {stats.total}
        </Typography>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'warning.light', borderRadius: 3 }}>
        <Typography
          variant='body2'
          sx={{ color: 'text.secondary' }}
        >
          草稿
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700 }}
        >
          {stats.draft}
        </Typography>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'primary.100', borderRadius: 3 }}>
        <Typography
          variant='body2'
          sx={{ color: 'text.secondary' }}
        >
          待审核
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700 }}
        >
          {stats.submitted}
        </Typography>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'success.lighter', borderRadius: 3 }}>
        <Typography
          variant='body2'
          sx={{ color: 'text.secondary' }}
        >
          已审核
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700 }}
        >
          {stats.approved}
        </Typography>
      </Box>
      <Box sx={{ p: 2, bgcolor: ct.secondary[100], borderRadius: 3 }}>
        <Typography
          variant='body2'
          sx={{ color: 'text.secondary' }}
        >
          合格总数
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700, color: 'secondary.700' }}
        >
          {stats.totalGood}
        </Typography>
      </Box>
    </Box>
  );

  return (
    <PageContainer
      autoTitle
      autoBreadcrumbs
      headerProps={{
        pageIcon: <FileText style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.primary.main} 0%, ${ct.primary.dark} 100%)`,
      }}
    >
      <ListPageTemplate
        title=''
        subtitle=''
        columns={columns}
        data={reports}
        loading={loading}
        filters={filters}
        searchable
        searchPlaceholder={t('mes.work_report_page.operator_1')}
        searchValue={searchTerm}
        onSearch={handleSearch}
        pagination={{
          page: currentPage - 1,
          pageSize,
          total,
          onPageChange: (page) => setCurrentPage(page + 1),
        }}
        selectable
        selectedIds={selectedIds}
        onSelectionChange={(ids) => setSelectedIds(ids.map(String))}
        actions={[
          {
            label: t('mes.work_report_page.dialog_create_title'),
            icon: <Plus size={16} />,
            onClick: handleOpenCreate,
          },
        ]}
        rowActions={rowActions}
        headerContent={statsContent}
        emptyMessage={t('mes.work_report_page.empty_message')}
        getRowId={(row) => row.id}
      />

      <Dialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        maxWidth='md'
      >
        <DialogTitle>{selectedReport ? t('mes.work_report_page.dialog_edit_title') : t('mes.work_report_page.dialog_create_title')}</DialogTitle>
        <DialogContent>
          <Box
            component='span'
            sx={{
              display: 'block',
              color: 'text.secondary',
              mb: 2,
              fontSize: 14,
            }}
          >
            {selectedReport ? t('mes.work_report_page.info') : t('mes.work_report_page.info_1')}
          </Box>
          <form onSubmit={handleSubmit}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                gap: 2,
                py: 2,
              }}
            >
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='order_id'>生产订单ID *</InputLabel>
                <TextField
                  id='order_id'
                  required
                  size='small'
                  value={formData.order_id}
                  onChange={(e) => setFormData({ ...formData, order_id: e.target.value })}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='worker_name'>操作人员 *</InputLabel>
                <TextField
                  id='worker_name'
                  required
                  size='small'
                  value={formData.worker_name}
                  onChange={(e) => setFormData({ ...formData, worker_name: e.target.value })}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='quantity_good'>合格数量 *</InputLabel>
                <TextField
                  id='quantity_good'
                  type='number'
                  required
                  size='small'
                  value={formData.quantity_good}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      quantity_good: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='quantity_bad'>不良数量</InputLabel>
                <TextField
                  id='quantity_bad'
                  type='number'
                  size='small'
                  value={formData.quantity_bad || 0}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      quantity_bad: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='start_time'>开始时间 *</InputLabel>
                <TextField
                  id='start_time'
                  type='datetime-local'
                  required
                  size='small'
                  value={formData.start_time}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      start_time: e.target.value,
                    })
                  }
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='end_time'>结束时间 *</InputLabel>
                <TextField
                  id='end_time'
                  type='datetime-local'
                  required
                  size='small'
                  value={formData.end_time}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      end_time: e.target.value,
                    })
                  }
                />
              </Box>
            </Box>
            <DialogActions>
              <Button
                type='button'
                variant='outlined'
                onClick={() => setShowDialog(false)}
              >
                取消
              </Button>
              <Button
                type='submit'
                variant='contained'
              >
                保存
              </Button>
            </DialogActions>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showDetailDialog}
        onClose={() => setShowDetailDialog(false)}
        maxWidth='md'
      >
        <DialogTitle>报工详情</DialogTitle>
        <DialogContent>
          {selectedReport && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                  gap: 2,
                }}
              >
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>报工单号</InputLabel>
                  <Box
                    component='span'
                    sx={{ fontWeight: 500 }}
                  >
                    {selectedReport.report_no}
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>生产订单</InputLabel>
                  <Box component='span'>{selectedReport.order_number || '-'}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>工序</InputLabel>
                  <Box component='span'>{selectedReport.process_name || '-'}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>工作站</InputLabel>
                  <Box component='span'>{selectedReport.work_station_name || '-'}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>班组</InputLabel>
                  <Box component='span'>{selectedReport.team_name || '-'}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>操作人员</InputLabel>
                  <Box component='span'>{selectedReport.worker_name}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>合格数量</InputLabel>
                  <Box component='span'>{selectedReport.quantity_good}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>不良数量</InputLabel>
                  <Box component='span'>{selectedReport.quantity_bad}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>总数量</InputLabel>
                  <Box component='span'>{selectedReport.quantity_total}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>状态</InputLabel>
                  <Box>{getStatusBadge(selectedReport.status)}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>开始时间</InputLabel>
                  <Box component='span'>
                    {selectedReport.start_time
                      ? new Date(selectedReport.start_time).toLocaleString('zh-CN')
                      : '-'}
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>结束时间</InputLabel>
                  <Box component='span'>
                    {selectedReport.end_time
                      ? new Date(selectedReport.end_time).toLocaleString('zh-CN')
                      : '-'}
                  </Box>
                </Box>
                <Box sx={{ gridColumn: '1 / -1' }}>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>备注</InputLabel>
                  <Box component='span'>{selectedReport.remark || '-'}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>创建时间</InputLabel>
                  <Box component='span'>
                    {new Date(selectedReport.created_at).toLocaleString('zh-CN')}
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>更新时间</InputLabel>
                  <Box component='span'>
                    {new Date(selectedReport.updated_at).toLocaleString('zh-CN')}
                  </Box>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
};

export default WorkReportPage;
