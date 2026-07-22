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
  Button,
} from '@mui/material';
import { PageContainer } from '@/components/common/PageContainerV2';
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';
import type {
  WorkReport,
  CreateWorkReportRequest,
  UpdateWorkReportRequest,
  ListParams,
} from '@/api/mes';
import { workReportApi } from '@/api/mes';
import { useNotificationStore } from '@/store';
import { LoadingSpinner } from '@topems/shared-components';
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  type FilterConfig,
} from '@/components/templates';
import { Edit, Trash2, Eye, ClipboardList, CheckCircle, XCircle, Save } from 'lucide-react';
import { apiLogger } from '@/utils/logger';
import { designTokens } from '@/theme/tokens';

const ct = designTokens.colors;

const WorkReportPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [showDialog, setShowDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedWorkReport, setSelectedWorkReport] = useState<WorkReport | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [formData, setFormData] = useState<CreateWorkReportRequest>({
    order_id: '',
    process_id: '',
    work_station_id: '',
    team_id: '',
    worker_name: '',
    quantity_good: 0,
    quantity_bad: 0,
    start_time: '',
    end_time: '',
    report_type: 'production',
  });

  const { addNotification } = useNotificationStore();

  const params: ListParams = {
    page: currentPage - 1,
    pagesize: pageSize,
  };
  if (searchTerm) params.search = searchTerm;
  if (statusFilter !== 'all') params.status = statusFilter;

  const { data: workReportsData, isLoading: loading } = useQuery({
    queryKey: [...QUERY_KEYS.MES.WORK_REPORTS, params],
    queryFn: async () => {
      const response = await workReportApi.list(params);
      if (response.success && response.data) {
        return {
          workReports: response.data.reports || [],
          total: response.data.total || 0,
        };
      }
      return { workReports: [], total: 0 };
    },
  });

  const workReports = workReportsData?.workReports || [];
  const total = workReportsData?.total || 0;

  const invalidateWorkReports = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MES.WORK_REPORTS });
  };

  const createMutation = useMutation({
    mutationFn: (data: CreateWorkReportRequest) => workReportApi.create(data),
    onSuccess: () => {
      addNotification({ type: 'success', title: '创建成功', message: '新工作报告已创建' });
      invalidateWorkReports();
      setShowDialog(false);
      resetForm();
    },
    onError: (error: unknown) => {
      apiLogger.error('操作失败:', error);
      addNotification({ type: 'error', title: '操作失败', message: '创建工作报告失败' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateWorkReportRequest }) =>
      workReportApi.update(id, data),
    onSuccess: () => {
      addNotification({ type: 'success', title: '更新成功', message: '工作报告信息已更新' });
      invalidateWorkReports();
      setShowDialog(false);
      resetForm();
    },
    onError: (error: unknown) => {
      apiLogger.error('操作失败:', error);
      addNotification({ type: 'error', title: '操作失败', message: '更新工作报告失败' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => workReportApi.delete(id),
    onSuccess: () => {
      addNotification({ type: 'success', title: '删除成功', message: '工作报告已删除' });
      invalidateWorkReports();
    },
    onError: (error: unknown) => {
      apiLogger.error('删除失败:', error);
      addNotification({ type: 'error', title: '删除失败', message: '无法删除工作报告' });
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => workReportApi.approve(id),
    onSuccess: () => {
      addNotification({ type: 'success', title: '操作成功', message: '工作报告已审核' });
      invalidateWorkReports();
    },
    onError: (error: unknown) => {
      apiLogger.error('操作失败:', error);
      addNotification({ type: 'error', title: '操作失败', message: '审核工作报告失败' });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => workReportApi.reject(id, '审核不通过'),
    onSuccess: () => {
      addNotification({ type: 'success', title: '操作成功', message: '工作报告已驳回' });
      invalidateWorkReports();
    },
    onError: (error: unknown) => {
      apiLogger.error('操作失败:', error);
      addNotification({ type: 'error', title: '操作失败', message: '驳回工作报告失败' });
    },
  });

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      draft: '草稿',
      pending: '待审核',
      approved: '已审核',
      rejected: '已驳回',
    };
    return statusMap[status] || status;
  };

  const getReportTypeText = (reportType: string) => {
    const reportTypeMap: Record<string, string> = {
      production: '生产报告',
      quality: '质量报告',
      maintenance: '维护报告',
    };
    return reportTypeMap[reportType] || reportType;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedWorkReport) {
      updateMutation.mutate({
        id: selectedWorkReport.id,
        data: formData as UpdateWorkReportRequest,
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: string) => {
    if (!window.confirm('确定要删除这个工作报告吗?')) return;
    deleteMutation.mutate(id);
  };

  const handleEdit = (workReport: WorkReport) => {
    setSelectedWorkReport(workReport);
    setFormData({
      order_id: workReport.order_id,
      process_id: workReport.process_id || '',
      work_station_id: workReport.work_station_id || '',
      team_id: workReport.team_id || '',
      worker_name: workReport.worker_name,
      quantity_good: workReport.quantity_good,
      quantity_bad: workReport.quantity_bad,
      start_time: workReport.start_time,
      end_time: workReport.end_time,
      report_type: workReport.report_type || 'production',
    });
    setShowDialog(true);
  };

  const handleViewDetail = (workReport: WorkReport) => {
    setSelectedWorkReport(workReport);
    setShowDetailDialog(true);
  };

  const resetForm = () => {
    setSelectedWorkReport(null);
    setFormData({
      order_id: '',
      process_id: '',
      work_station_id: '',
      team_id: '',
      worker_name: '',
      quantity_good: 0,
      quantity_bad: 0,
      start_time: '',
      end_time: '',
      report_type: 'production',
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
      pending: { label: '待审核', bg: 'info.lighter', color: 'info.700' },
      approved: { label: '已审核', bg: 'success.lighter', color: 'success.700' },
      rejected: { label: '已驳回', bg: 'error.lighter', color: 'error.dark' },
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
      { id: 'report_no', label: '报告编号', sortable: true },
      { id: 'order_number', label: '订单编号', sortable: true },
      { id: 'process_name', label: '工序名称' },
      { id: 'worker_name', label: '操作员' },
      {
        id: 'quantity_total',
        label: '总数量',
        render: (row) => row.quantity_total,
      },
      {
        id: 'quantity_good',
        label: '良品数',
        render: (row) => row.quantity_good,
      },
      {
        id: 'quantity_bad',
        label: '不良数',
        render: (row) => row.quantity_bad,
      },
      {
        id: 'status',
        label: '状态',
        render: (row) => getStatusBadge(row.status),
      },
      {
        id: 'created_at',
        label: '创建时间',
        render: (row) => new Date(row.created_at).toLocaleDateString('zh-CN'),
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
          { label: '待审核', value: 'pending' },
          { label: '已审核', value: 'approved' },
          { label: '已驳回', value: 'rejected' },
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
        show: (row) => row.status === 'draft',
      },
      {
        label: '审核',
        icon: <CheckCircle size={16} />,
        onClick: (row) => approveMutation.mutate(row.id),
        show: (row) => row.status === 'pending',
      },
      {
        label: '驳回',
        icon: <XCircle size={16} />,
        onClick: (row) => rejectMutation.mutate(row.id),
        show: (row) => row.status === 'pending',
      },
      {
        label: '删除',
        icon: <Trash2 size={16} />,
        color: 'error',
        onClick: (row) => handleDelete(row.id),
        confirm: true,
        confirmMessage: '确定要删除这个工作报告吗?',
        show: (row) => row.status === 'draft',
      },
    ],
    [approveMutation, rejectMutation]
  );

  const handleOpenCreate = () => {
    resetForm();
    setShowDialog(true);
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  if (loading) return <LoadingSpinner />;

  const statsContent = (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
        gap: 2,
        mb: 3,
      }}
    >
      <Box sx={{ p: 2, bgcolor: ct.secondary[100], borderRadius: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <ClipboardList
            size={18}
            sx={{ color: 'secondary.700' }}
          />
          <Box
            component='span'
            sx={{ color: 'text.secondary', fontSize: 14 }}
          >
            报告总数
          </Box>
        </Box>
        <Box sx={{ fontWeight: 700, fontSize: 24, color: 'secondary.700' }}>
          {workReports.length}
        </Box>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'info.lighter', borderRadius: 3 }}>
        <Box sx={{ color: 'text.secondary', fontSize: 14, mb: 1 }}>待审核</Box>
        <Box sx={{ fontWeight: 700, fontSize: 24, color: 'info.700' }}>
          {workReports.filter((r) => r.status === 'pending').length}
        </Box>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'success.lighter', borderRadius: 3 }}>
        <Box sx={{ color: 'text.secondary', fontSize: 14, mb: 1 }}>已审核</Box>
        <Box sx={{ fontWeight: 700, fontSize: 24, color: 'success.700' }}>
          {workReports.filter((r) => r.status === 'approved').length}
        </Box>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'error.lighter', borderRadius: 3 }}>
        <Box sx={{ color: 'text.secondary', fontSize: 14, mb: 1 }}>已驳回</Box>
        <Box sx={{ fontWeight: 700, fontSize: 24, color: 'error.dark' }}>
          {workReports.filter((r) => r.status === 'rejected').length}
        </Box>
      </Box>
    </Box>
  );

  return (
    <PageContainer
      autoTitle
      autoBreadcrumbs
      headerProps={{
        pageIcon: <ClipboardList style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.primary.main} 0%, ${ct.primary.dark} 100%)`,
      }}
    >
      <ListPageTemplate
        title=''
        subtitle=''
        columns={columns}
        data={workReports}
        loading={loading}
        filters={filters}
        searchable
        searchPlaceholder='搜索报告编号或订单编号...'
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
            label: '新增工作报告',
            icon: <ClipboardList size={16} />,
            onClick: handleOpenCreate,
          },
        ]}
        rowActions={rowActions}
        headerContent={statsContent}
        emptyMessage='暂无工作报告数据'
        getRowId={(row) => row.id}
      />

      {/* 新增/编辑对话框 */}
      <Dialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        maxWidth='md'
      >
        <DialogTitle>{selectedWorkReport ? '编辑工作报告' : '新增工作报告'}</DialogTitle>
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
            {selectedWorkReport ? '修改工作报告信息' : '填写新工作报告信息'}
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
                <InputLabel htmlFor='order_id'>订单ID *</InputLabel>
                <TextField
                  id='order_id'
                  required
                  size='small'
                  value={formData.order_id}
                  onChange={(e) => setFormData({ ...formData, order_id: e.target.value })}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='worker_name'>操作员 *</InputLabel>
                <TextField
                  id='worker_name'
                  required
                  size='small'
                  value={formData.worker_name}
                  onChange={(e) => setFormData({ ...formData, worker_name: e.target.value })}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='quantity_good'>良品数量 *</InputLabel>
                <TextField
                  id='quantity_good'
                  required
                  size='small'
                  type='number'
                  value={formData.quantity_good}
                  onChange={(e) =>
                    setFormData({ ...formData, quantity_good: parseFloat(e.target.value) })
                  }
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='quantity_bad'>不良数量</InputLabel>
                <TextField
                  id='quantity_bad'
                  size='small'
                  type='number'
                  value={formData.quantity_bad}
                  onChange={(e) =>
                    setFormData({ ...formData, quantity_bad: parseFloat(e.target.value) })
                  }
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='process_id'>工序ID</InputLabel>
                <TextField
                  id='process_id'
                  size='small'
                  value={formData.process_id || ''}
                  onChange={(e) => setFormData({ ...formData, process_id: e.target.value })}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='work_station_id'>工作站ID</InputLabel>
                <TextField
                  id='work_station_id'
                  size='small'
                  value={formData.work_station_id || ''}
                  onChange={(e) => setFormData({ ...formData, work_station_id: e.target.value })}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='team_id'>班组ID</InputLabel>
                <TextField
                  id='team_id'
                  size='small'
                  value={formData.team_id || ''}
                  onChange={(e) => setFormData({ ...formData, team_id: e.target.value })}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='report_type'>报告类型</InputLabel>
                <FormControl
                  fullWidth
                  size='small'
                >
                  <Select
                    id='report_type'
                    value={formData.report_type || 'production'}
                    onChange={(e) => setFormData({ ...formData, report_type: e.target.value })}
                  >
                    <MenuItem value='production'>生产报告</MenuItem>
                    <MenuItem value='quality'>质量报告</MenuItem>
                    <MenuItem value='maintenance'>维护报告</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='start_time'>开始时间 *</InputLabel>
                <TextField
                  id='start_time'
                  required
                  size='small'
                  type='datetime-local'
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='end_time'>结束时间 *</InputLabel>
                <TextField
                  id='end_time'
                  required
                  size='small'
                  type='datetime-local'
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                />
              </Box>
            </Box>

            <DialogActions sx={{ mt: 2 }}>
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
                startIcon={<Save size={16} />}
              >
                保存
              </Button>
            </DialogActions>
          </form>
        </DialogContent>
      </Dialog>

      {/* 详情对话框 */}
      <Dialog
        open={showDetailDialog}
        onClose={() => setShowDetailDialog(false)}
        maxWidth='md'
      >
        <DialogTitle>工作报告详情</DialogTitle>
        <DialogContent>
          {selectedWorkReport && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                  gap: 2,
                }}
              >
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>报告编号</InputLabel>
                  <Box sx={{ fontWeight: 500 }}>{selectedWorkReport.report_no}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>订单编号</InputLabel>
                  <Box component='span'>{selectedWorkReport.order_number || '-'}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>工序名称</InputLabel>
                  <Box component='span'>{selectedWorkReport.process_name || '-'}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>工作站</InputLabel>
                  <Box component='span'>{selectedWorkReport.work_station_name || '-'}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>班组</InputLabel>
                  <Box component='span'>{selectedWorkReport.team_name || '-'}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>操作员</InputLabel>
                  <Box component='span'>{selectedWorkReport.worker_name}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>状态</InputLabel>
                  <Box>{getStatusBadge(selectedWorkReport.status)}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>报告类型</InputLabel>
                  <Box component='span'>
                    {getReportTypeText(selectedWorkReport.report_type || 'production')}
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>总数量</InputLabel>
                  <Box component='span'>{selectedWorkReport.quantity_total}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>良品数量</InputLabel>
                  <Box component='span'>{selectedWorkReport.quantity_good}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>不良数量</InputLabel>
                  <Box component='span'>{selectedWorkReport.quantity_bad}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>开始时间</InputLabel>
                  <Box component='span'>
                    {new Date(selectedWorkReport.start_time).toLocaleString('zh-CN')}
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>结束时间</InputLabel>
                  <Box component='span'>
                    {new Date(selectedWorkReport.end_time).toLocaleString('zh-CN')}
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>
                    实际时长(分钟)
                  </InputLabel>
                  <Box component='span'>{selectedWorkReport.actual_duration || '-'}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>
                    标准时长(分钟)
                  </InputLabel>
                  <Box component='span'>{selectedWorkReport.standard_duration || '-'}</Box>
                </Box>
                {selectedWorkReport.remark && (
                  <Box sx={{ gridColumn: '1 / -1' }}>
                    <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>备注</InputLabel>
                    <Box component='span'>{selectedWorkReport.remark}</Box>
                  </Box>
                )}
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>创建时间</InputLabel>
                  <Box component='span'>
                    {new Date(selectedWorkReport.created_at).toLocaleString('zh-CN')}
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>更新时间</InputLabel>
                  <Box component='span'>
                    {new Date(selectedWorkReport.updated_at).toLocaleString('zh-CN')}
                  </Box>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetailDialog(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default WorkReportPage;
