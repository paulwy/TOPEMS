import {
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Box,
  InputLabel,
  Typography,
  Button,
  Stack,
} from '@mui/material';
import { PageContainer } from '@/components/common/PageContainerV2';
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';
import type {
  ProcessFlow,
  CreateProcessFlowRequest,
  UpdateProcessFlowRequest,
  ProcessFlowStep,
  CapacityAnalysis,
} from '@/api/mes/processFlow';
import type { ListParams } from '@/api/mes';
import { processFlowApi } from '@/api/mes/processFlow';
import { useNotificationStore } from '@/store';
import { LoadingSpinner } from '@topems/shared-components';
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  type FilterConfig,
} from '@/components/templates';
import { Plus, Edit, Trash2, Eye, GitBranch, Clock, TrendingUp, BarChart3 } from 'lucide-react';
import { apiLogger } from '@/utils/logger';
import { designTokens } from '@/theme/tokens';

import { useTranslation } from 'react-i18next';
const ct = designTokens.colors;

const ProcessFlowPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [showDialog, setShowDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedFlow, setSelectedFlow] = useState<ProcessFlow | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [flowSteps, setFlowSteps] = useState<ProcessFlowStep[]>([]);
  const [capacityAnalysis, setCapacityAnalysis] = useState<CapacityAnalysis | null>(null);
  const [formData, setFormData] = useState<CreateProcessFlowRequest>({
    code: '',
    name: '',
    description: '',
    version: '1.0',
    route_id: '',
    production_line: '',
    capacity: 0,
    unit: t('mes.process_flow_page.text_d5bfc3'),
  });

  const { addNotification } = useNotificationStore();

  const params: ListParams = {
    page: currentPage - 1,
    pagesize: pageSize,
  };
  if (searchTerm) params.search = searchTerm;
  if (statusFilter !== 'all') params.status = statusFilter;

  const { data: flowsData, isLoading: loading } = useQuery({
    queryKey: [...QUERY_KEYS.MES.PROCESS_FLOWS, params],
    queryFn: async () => {
      const response = await processFlowApi.list(params);
      if (response.success && response.data) {
        return {
          flows: response.data.flows || [],
          total: response.data.total || 0,
        };
      }
      return { flows: [], total: 0 };
    },
  });

  const flows = flowsData?.flows || [];
  const total = flowsData?.total || 0;

  const invalidateFlows = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MES.PROCESS_FLOWS });
  };

  const loadFlowDetails = async (flowId: string) => {
    try {
      const [stepsResponse, capacityResponse] = await Promise.all([
        processFlowApi.getSteps(flowId),
        processFlowApi.analyzeCapacity(flowId),
      ]);

      if (stepsResponse.success && stepsResponse.data) {
        setFlowSteps(stepsResponse.data.steps || []);
      }
      if (capacityResponse.success && capacityResponse.data) {
        setCapacityAnalysis(capacityResponse.data);
      }
    } catch (error: unknown) {
      apiLogger.error(t('mes.process_flow_page.detail'), error);
    }
  };

  const createMutation = useMutation({
    mutationFn: (data: CreateProcessFlowRequest) => processFlowApi.create(data),
    onSuccess: () => {
      addNotification({ type: 'success', title: t('mes.process_flow_page.create'), message: t('mes.process_flow_page.create_1') });
      invalidateFlows();
      setShowDialog(false);
      resetForm();
    },
    onError: (error: unknown) => {
      apiLogger.error(t('mes.process_flow_page.operation_failed'), error);
      addNotification({ type: 'error', title: t('mes.process_flow_page.operation_failed_1'), message: t('mes.process_flow_page.create_2') });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProcessFlowRequest }) =>
      processFlowApi.update(id, data),
    onSuccess: () => {
      addNotification({ type: 'success', title: t('mes.process_flow_page.update'), message: t('mes.process_flow_page.update_1') });
      invalidateFlows();
      setShowDialog(false);
      resetForm();
    },
    onError: (error: unknown) => {
      apiLogger.error(t('mes.process_flow_page.operation_failed'), error);
      addNotification({ type: 'error', title: t('mes.process_flow_page.operation_failed_1'), message: t('mes.process_flow_page.update_2') });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => processFlowApi.delete(id),
    onSuccess: () => {
      addNotification({ type: 'success', title: t('mes.process_flow_page.delete_success'), message: t('mes.process_flow_page.deleted') });
      invalidateFlows();
    },
    onError: (error: unknown) => {
      apiLogger.error(t('mes.process_flow_page.delete'), error);
      addNotification({ type: 'error', title: t('mes.process_flow_page.delete_1'), message: t('mes.process_flow_page.delete_2') });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFlow) {
      updateMutation.mutate({ id: selectedFlow.id, data: formData as UpdateProcessFlowRequest });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: string) => {
    if (!window.confirm(t('mes.process_flow_page.confirm'))) return;
    deleteMutation.mutate(id);
  };

  const handleEdit = (flow: ProcessFlow) => {
    setSelectedFlow(flow);
    setFormData({
      code: flow.code,
      name: flow.name,
      description: flow.description || '',
      version: flow.version || '1.0',
      route_id: flow.route_id || '',
      production_line: flow.production_line || '',
      capacity: flow.capacity || 0,
      unit: flow.unit || t('mes.process_flow_page.text_d5bfc3'),
    });
    setShowDialog(true);
  };

  const handleViewDetail = async (flow: ProcessFlow) => {
    setSelectedFlow(flow);
    await loadFlowDetails(flow.id);
    setShowDetailDialog(true);
  };

  const resetForm = () => {
    setSelectedFlow(null);
    setFormData({
      code: '',
      name: '',
      description: '',
      version: '1.0',
      route_id: '',
      production_line: '',
      capacity: 0,
      unit: t('mes.process_flow_page.text_d5bfc3'),
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
      active: { label: t('mes.process_flow_page.active'), bg: 'success.lighter', color: 'success.dark' },
      inactive: { label: t('mes.process_flow_page.inactive'), bg: 'grey.100', color: 'text.secondary' },
      draft: { label: t('mes.process_flow_page.status_draft'), bg: 'warning.light', color: 'warning.dark' },
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

  const columns: ColumnDef<ProcessFlow>[] = useMemo(
    () => [
      { id: 'code', label: t('mes.process_flow_page.text_f1dbc1'), sortable: true },
      { id: 'name', label: t('mes.process_flow_page.column_flow_name'), sortable: true },
      { id: 'production_line', label: t('mes.process_flow_page.production_line'), sortable: true },
      {
        id: 'capacity',
        label: t('mes.process_flow_page.text_215586'),
        sortable: true,
        render: (row) => `${row.capacity || 0} ${row.unit || '件/小时'}`,
      },
      {
        id: 'status',
        label: t('mes.process_flow_page.filter_status'),
        render: (row) => getStatusBadge(row.status),
      },
    ],
    []
  );

  const filters: FilterConfig[] = useMemo(
    () => [
      {
        id: 'status',
        label: t('mes.process_flow_page.filter_status'),
        type: 'select',
        options: [
          { label: t('mes.process_flow_page.filter_option_all_status'), value: 'all' },
          { label: t('mes.process_flow_page.active'), value: 'active' },
          { label: t('mes.process_flow_page.inactive'), value: 'inactive' },
          { label: t('mes.process_flow_page.status_draft'), value: 'draft' },
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

  const rowActions: RowAction<ProcessFlow>[] = useMemo(
    () => [
      {
        label: t('mes.process_flow_page.action_view_detail'),
        icon: <Eye size={16} />,
        onClick: handleViewDetail,
      },
      {
        label: t('mes.process_flow_page.action_edit'),
        icon: <Edit size={16} />,
        onClick: handleEdit,
      },
      {
        label: t('mes.process_flow_page.action_delete'),
        icon: <Trash2 size={16} />,
        color: 'error',
        onClick: (row) => handleDelete(row.id),
        confirm: true,
        confirmMessage: t('mes.process_flow_page.confirm'),
      },
    ],
    [handleViewDetail, handleEdit, handleDelete]
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

  return (
    <PageContainer
      autoTitle
      autoBreadcrumbs
      headerProps={{
        pageIcon: <GitBranch style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.success.main} 0%, ${ct.success.dark} 100%)`,
      }}
    >
      <ListPageTemplate
        title=''
        subtitle=''
        columns={columns}
        data={flows}
        loading={loading}
        filters={filters}
        searchable
        searchPlaceholder={t('mes.process_flow_page.search')}
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
            label: t('mes.process_flow_page.add'),
            icon: <Plus size={16} />,
            onClick: handleOpenCreate,
          },
        ]}
        rowActions={rowActions}
        emptyMessage={t('mes.process_flow_page.empty_message')}
        getRowId={(row) => row.id}
      />

      {/* 新增/编辑对话框 */}
      <Dialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        maxWidth='md'
      >
        <DialogTitle>{selectedFlow ? t('mes.process_flow_page.dialog_edit_title') : t('mes.process_flow_page.dialog_create_title')}</DialogTitle>
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
            {selectedFlow ? t('mes.process_flow_page.info') : t('mes.process_flow_page.info_1')}
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
                <InputLabel htmlFor='code'>流程编号 *</InputLabel>
                <TextField
                  id='code'
                  required
                  size='small'
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  disabled={!!selectedFlow}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='name'>流程名称 *</InputLabel>
                <TextField
                  id='name'
                  required
                  size='small'
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='production_line'>生产线</InputLabel>
                <TextField
                  id='production_line'
                  size='small'
                  value={formData.production_line || ''}
                  onChange={(e) => setFormData({ ...formData, production_line: e.target.value })}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='capacity'>产能</InputLabel>
                <TextField
                  id='capacity'
                  type='number'
                  size='small'
                  value={formData.capacity || 0}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      capacity: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='unit'>单位</InputLabel>
                <TextField
                  id='unit'
                  size='small'
                  value={formData.unit || t('mes.process_flow_page.text_d5bfc3')}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='version'>版本</InputLabel>
                <TextField
                  id='version'
                  size='small'
                  value={formData.version || '1.0'}
                  onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                />
              </Box>
              <Box sx={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='description'>描述</InputLabel>
                <TextField
                  id='description'
                  size='small'
                  multiline
                  rows={2}
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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

      {/* 详情对话框 */}
      <Dialog
        open={showDetailDialog}
        onClose={() => setShowDetailDialog(false)}
        maxWidth='lg'
      >
        <DialogTitle>工艺流程详情</DialogTitle>
        <DialogContent>
          {selectedFlow && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                  gap: 2,
                }}
              >
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>流程编号</InputLabel>
                  <Box
                    component='span'
                    sx={{ fontWeight: 500 }}
                  >
                    {selectedFlow.code}
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>流程名称</InputLabel>
                  <Box component='span'>{selectedFlow.name}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>生产线</InputLabel>
                  <Box component='span'>{selectedFlow.production_line || '-'}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>产能</InputLabel>
                  <Box component='span'>
                    {selectedFlow.capacity || 0} {selectedFlow.unit || t('mes.process_flow_page.text_d5bfc3')}
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>状态</InputLabel>
                  <Box>{getStatusBadge(selectedFlow.status)}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>创建时间</InputLabel>
                  <Box component='span'>
                    {new Date(selectedFlow.created_at).toLocaleString('zh-CN')}
                  </Box>
                </Box>
                <Box sx={{ gridColumn: '1 / -1' }}>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>描述</InputLabel>
                  <Box component='span'>{selectedFlow.description || '-'}</Box>
                </Box>
              </Box>

              {capacityAnalysis && (
                <>
                  <Typography
                    variant='h6'
                    sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}
                  >
                    <BarChart3 size={20} />
                    产能分析
                  </Typography>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
                      gap: 2,
                      mb: 2,
                    }}
                  >
                    <Box sx={{ p: 2, bgcolor: 'primary.light', borderRadius: 3 }}>
                      <Typography
                        variant='body2'
                        color='white'
                      >
                        理论产能
                      </Typography>
                      <Typography
                        variant='h5'
                        sx={{ fontWeight: 700, color: 'white' }}
                      >
                        {capacityAnalysis.theoretical_capacity}
                      </Typography>
                    </Box>
                    <Box sx={{ p: 2, bgcolor: 'success.main', borderRadius: 3 }}>
                      <Typography
                        variant='body2'
                        color='white'
                      >
                        有效产能
                      </Typography>
                      <Typography
                        variant='h5'
                        sx={{ fontWeight: 700, color: 'white' }}
                      >
                        {capacityAnalysis.effective_capacity}
                      </Typography>
                    </Box>
                    <Box sx={{ p: 2, bgcolor: 'warning.main', borderRadius: 3 }}>
                      <Typography
                        variant='body2'
                        color='white'
                      >
                        利用率
                      </Typography>
                      <Typography
                        variant='h5'
                        sx={{ fontWeight: 700, color: 'white' }}
                      >
                        {(capacityAnalysis.utilization_rate * 100).toFixed(1)}%
                      </Typography>
                    </Box>
                  </Box>
                </>
              )}

              <Typography
                variant='h6'
                sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
              >
                <GitBranch size={20} />
                工序列表
              </Typography>
              {flowSteps.length > 0 ? (
                <Stack spacing={1}>
                  {flowSteps.map((step, index) => (
                    <Box
                      key={step.id}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        p: 2,
                        bgcolor: 'grey.50',
                        borderRadius: 1,
                      }}
                    >
                      <Box
                        sx={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          bgcolor: 'primary.main',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 12,
                        }}
                      >
                        {index + 1}
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography
                          variant='body2'
                          sx={{ fontWeight: 500 }}
                        >
                          {step.process_name}
                        </Typography>
                        <Typography
                          variant='caption'
                          color='text.secondary'
                        >
                          {step.process_code} | 标准工时: {step.standard_time || 0} 分钟
                          {step.quality_check_required && t('mes.process_flow_page.quality_inspection')}
                        </Typography>
                      </Box>
                      {step.work_station_name && (
                        <Chip
                          size='small'
                          label={step.work_station_name}
                          variant='outlined'
                        />
                      )}
                    </Box>
                  ))}
                </Stack>
              ) : (
                <Typography color='text.secondary'>暂无工序数据</Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            variant='outlined'
            onClick={() => setShowDetailDialog(false)}
          >
            关闭
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default ProcessFlowPage;
