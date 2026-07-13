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
import React, { useState, useEffect, useMemo, useCallback } from 'react';
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

const ct = designTokens.colors;

const WorkReportPage: React.FC = () => {
  const [reports, setReports] = useState<WorkReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
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

  const loadReports = useCallback(async () => {
    try {
      setLoading(true);
      const params: ListParams = {
        page: currentPage - 1,
        pagesize: pageSize,
      };
      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== 'all') params.status = statusFilter;

      const response = await mesApi.workReports.list(params);
      if (response.success && response.data) {
        setReports(response.data.reports || []);
        setTotal(response.data.total || 0);
      }
    } catch (error: unknown) {
      apiLogger.error('加载报工列表失败:', error);
      addNotification({
        type: 'error',
        title: '加载失败',
        message: '无法加载报工列表',
      });
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchTerm, statusFilter, addNotification]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      draft: '草稿',
      submitted: '已提交',
      approved: '已审核',
      rejected: '已驳回',
      cancelled: '已取消',
    };
    return statusMap[status] || status;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedReport) {
        await mesApi.workReports.update(selectedReport.id, formData as UpdateWorkReportRequest);
        addNotification({
          type: 'success',
          title: '更新成功',
          message: '报工信息已更新',
        });
      } else {
        await mesApi.workReports.create(formData);
        addNotification({
          type: 'success',
          title: '创建成功',
          message: '新报工已创建',
        });
      }
      setShowDialog(false);
      resetForm();
      loadReports();
    } catch (error: unknown) {
      apiLogger.error('操作失败:', error);
      addNotification({
        type: 'error',
        title: '操作失败',
        message: selectedReport ? '更新报工失败' : '创建报工失败',
      });
    }
  };

  const handleDelete = useCallback(
    async (id: string) => {
      if (!window.confirm('确定要删除这条报工记录吗?')) return;
      try {
        await mesApi.workReports.delete(id);
        addNotification({
          type: 'success',
          title: '删除成功',
          message: '报工记录已删除',
        });
        loadReports();
      } catch (error: unknown) {
        apiLogger.error('删除失败:', error);
        addNotification({
          type: 'error',
          title: '删除失败',
          message: '无法删除报工记录',
        });
      }
    },
    [loadReports, addNotification]
  );

  const handleApprove = useCallback(
    async (id: string) => {
      try {
        await mesApi.workReports.approve(id);
        addNotification({
          type: 'success',
          title: '审核成功',
          message: '报工已审核通过',
        });
        loadReports();
      } catch (error: unknown) {
        apiLogger.error('审核失败:', error);
        addNotification({
          type: 'error',
          title: '审核失败',
          message: '无法审核报工',
        });
      }
    },
    [loadReports, addNotification]
  );

  const handleReject = useCallback(
    async (id: string) => {
      try {
        await mesApi.workReports.reject(id);
        addNotification({
          type: 'success',
          title: '驳回成功',
          message: '报工已驳回',
        });
        loadReports();
      } catch (error: unknown) {
        apiLogger.error('驳回失败:', error);
        addNotification({
          type: 'error',
          title: '驳回失败',
          message: '无法驳回报工',
        });
      }
    },
    [loadReports, addNotification]
  );

  const handleEdit = useCallback((report: WorkReport) => {
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
  }, []);

  const handleViewDetail = useCallback((report: WorkReport) => {
    setSelectedReport(report);
    setShowDetailDialog(true);
  }, []);

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
      draft: { label: '草稿', bg: 'grey.100', color: 'text.secondary' },
      submitted: { label: '已提交', bg: 'primary.100', color: 'primary.dark' },
      approved: { label: '已审核', bg: 'success.lighter', color: 'success.700' },
      rejected: { label: '已驳回', bg: 'error.lighter', color: 'error.dark' },
      cancelled: { label: '已取消', bg: 'grey.100', color: 'text.secondary' },
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
      { id: 'report_no', label: '报工单号', sortable: true },
      { id: 'order_number', label: '生产订单', sortable: true },
      { id: 'process_name', label: '工序', sortable: true },
      { id: 'work_station_name', label: '工作站', sortable: true },
      { id: 'worker_name', label: '操作人员', sortable: true },
      { id: 'quantity_good', label: '合格数量', sortable: true },
      { id: 'quantity_bad', label: '不良数量', sortable: true },
      { id: 'quantity_total', label: '总数量', sortable: true },
      {
        id: 'start_time',
        label: '开始时间',
        render: (row) => (row.start_time ? new Date(row.start_time).toLocaleString('zh-CN') : '-'),
      },
      {
        id: 'end_time',
        label: '结束时间',
        render: (row) => (row.end_time ? new Date(row.end_time).toLocaleString('zh-CN') : '-'),
      },
      {
        id: 'status',
        label: '状态',
        render: (row) => getStatusBadge(row.status),
      },
    ],
    []
  );

  const filters: FilterConfig[] = useMemo(
    () => [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '草稿', value: 'draft' },
          { label: '已提交', value: 'submitted' },
          { label: '已审核', value: 'approved' },
          { label: '已驳回', value: 'rejected' },
          { label: '已取消', value: 'cancelled' },
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
        label: '查看详情',
        icon: <Eye size={16} />,
        onClick: handleViewDetail,
      },
      {
        label: '编辑',
        icon: <Edit size={16} />,
        onClick: handleEdit,
      },
      {
        label: '审核',
        icon: <CheckCircle size={16} />,
        color: 'success',
        onClick: (row) => handleApprove(row.id),
        show: (row) => row.status === 'submitted',
      },
      {
        label: '驳回',
        icon: <XCircle size={16} />,
        color: 'error',
        onClick: (row) => handleReject(row.id),
        show: (row) => row.status === 'submitted',
      },
      {
        label: '删除',
        icon: <Trash2 size={16} />,
        color: 'error',
        onClick: (row) => handleDelete(row.id),
        confirm: true,
        confirmMessage: '确定要删除这条报工记录吗?',
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
        searchPlaceholder='搜索报工单号或操作人员...'
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
            label: '新增报工',
            icon: <Plus size={16} />,
            onClick: handleOpenCreate,
          },
        ]}
        rowActions={rowActions}
        headerContent={statsContent}
        emptyMessage='暂无报工数据'
        getRowId={(row) => row.id}
      />

      <Dialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        maxWidth='md'
      >
        <DialogTitle>{selectedReport ? '编辑报工' : '新增报工'}</DialogTitle>
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
            {selectedReport ? '修改报工信息' : '填写新报工信息'}
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
