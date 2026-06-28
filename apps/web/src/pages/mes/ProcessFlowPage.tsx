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
import { PageContainer } from '@/components/common';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type {
  ProcessFlow,
  CreateProcessFlowRequest,
  UpdateProcessFlowRequest,
  ProcessFlowStep,
  CapacityAnalysis,
} from '@/api/mes/processFlow';
import { processFlowApi } from '@/api/mes/processFlow';
import { useAppStore } from '@/store';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  type FilterConfig,
} from '@/components/templates';
import { Plus, Edit, Trash2, Eye, GitBranch, Clock, TrendingUp, BarChart3 } from 'lucide-react';
import { apiLogger } from '@/utils/logger';

const ProcessFlowPage: React.FC = () => {
  const [flows, setFlows] = useState<ProcessFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
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
    unit: '件/小时',
  });

  const { addNotification } = useAppStore();

  const loadFlows = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {
        page: currentPage - 1,
        page_size: pageSize,
      };
      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== 'all') params.status = statusFilter;

      const response = await processFlowApi.list(params);
      if (response.success && response.data) {
        setFlows(response.data.flows || []);
        setTotal(response.data.total || 0);
      }
    } catch (error: unknown) {
      apiLogger.error('加载工艺流程列表失败:', error);
      addNotification({
        type: 'error',
        title: '加载失败',
        message: '无法加载工艺流程列表',
      });
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchTerm, statusFilter, addNotification]);

  const loadFlowDetails = useCallback(async (flowId: string) => {
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
      apiLogger.error('加载工艺流程详情失败:', error);
    }
  }, []);

  useEffect(() => {
    loadFlows();
  }, [loadFlows]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedFlow) {
        await processFlowApi.update(selectedFlow.id, formData as UpdateProcessFlowRequest);
        addNotification({
          type: 'success',
          title: '更新成功',
          message: '工艺流程信息已更新',
        });
      } else {
        await processFlowApi.create(formData);
        addNotification({
          type: 'success',
          title: '创建成功',
          message: '新工艺流程已创建',
        });
      }
      setShowDialog(false);
      resetForm();
      loadFlows();
    } catch (error: unknown) {
      apiLogger.error('操作失败:', error);
      addNotification({
        type: 'error',
        title: '操作失败',
        message: selectedFlow ? '更新工艺流程失败' : '创建工艺流程失败',
      });
    }
  };

  const handleDelete = useCallback(
    async (id: string) => {
      if (!window.confirm('确定要删除这个工艺流程吗?')) return;
      try {
        await processFlowApi.delete(id);
        addNotification({
          type: 'success',
          title: '删除成功',
          message: '工艺流程已删除',
        });
        loadFlows();
      } catch (error: unknown) {
        apiLogger.error('删除失败:', error);
        addNotification({
          type: 'error',
          title: '删除失败',
          message: '无法删除工艺流程',
        });
      }
    },
    [loadFlows, addNotification]
  );

  const handleEdit = useCallback((flow: ProcessFlow) => {
    setSelectedFlow(flow);
    setFormData({
      code: flow.code,
      name: flow.name,
      description: flow.description || '',
      version: flow.version || '1.0',
      route_id: flow.route_id || '',
      production_line: flow.production_line || '',
      capacity: flow.capacity || 0,
      unit: flow.unit || '件/小时',
    });
    setShowDialog(true);
  }, []);

  const handleViewDetail = useCallback(
    async (flow: ProcessFlow) => {
      setSelectedFlow(flow);
      await loadFlowDetails(flow.id);
      setShowDetailDialog(true);
    },
    [loadFlowDetails]
  );

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
      unit: '件/小时',
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
      active: { label: '启用', bg: 'success.lighter', color: 'success.dark' },
      inactive: { label: '停用', bg: 'grey.100', color: 'text.secondary' },
      draft: { label: '草稿', bg: 'warning.light', color: 'warning.dark' },
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
      { id: 'code', label: '流程编号', sortable: true },
      { id: 'name', label: '流程名称', sortable: true },
      { id: 'production_line', label: '生产线', sortable: true },
      {
        id: 'capacity',
        label: '产能',
        sortable: true,
        render: (row) => `${row.capacity || 0} ${row.unit || '件/小时'}`,
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
          { label: '启用', value: 'active' },
          { label: '停用', value: 'inactive' },
          { label: '草稿', value: 'draft' },
        ],
        value: statusFilter,
        onChange: (value) => {
          setStatusFilter(value);
          setCurrentPage(1);
        },
      },
    ],
    [statusFilter]
  );

  const rowActions: RowAction<ProcessFlow>[] = useMemo(
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
        label: '删除',
        icon: <Trash2 size={16} />,
        color: 'error',
        onClick: (row) => handleDelete(row.id),
        confirm: true,
        confirmMessage: '确定要删除这个工艺流程吗?',
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
      title='工艺流程管理'
      subtitle='管理生产工艺流程,包括流程定义、工序关联、产能分析等'
    >
      <ListPageTemplate
        title=''
        subtitle=''
        columns={columns}
        data={flows}
        loading={loading}
        filters={filters}
        searchable
        searchPlaceholder='搜索流程编号或名称...'
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
            label: '新增流程',
            icon: <Plus size={16} />,
            onClick: handleOpenCreate,
          },
        ]}
        rowActions={rowActions}
        emptyMessage='暂无工艺流程数据'
        getRowId={(row) => row.id}
      />

      {/* 新增/编辑对话框 */}
      <Dialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        maxWidth='md'
      >
        <DialogTitle>{selectedFlow ? '编辑工艺流程' : '新增工艺流程'}</DialogTitle>
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
            {selectedFlow ? '修改工艺流程信息' : '填写新工艺流程信息'}
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
                  value={formData.unit || '件/小时'}
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
                    {selectedFlow.capacity || 0} {selectedFlow.unit || '件/小时'}
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
                    <Box sx={{ p: 2, bgcolor: 'primary.light', borderRadius: 2 }}>
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
                    <Box sx={{ p: 2, bgcolor: 'success.main', borderRadius: 2 }}>
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
                    <Box sx={{ p: 2, bgcolor: 'warning.main', borderRadius: 2 }}>
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
                          {step.quality_check_required && ' | 需质检'}
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
