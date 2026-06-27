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
  Typography,
  Button,
  Stack,
} from '@mui/material';
import { PageContainer } from '@/components/common';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type {
  ProcessRoute,
  CreateProcessRouteRequest,
  UpdateProcessRouteRequest,
  ProcessRouteStep,
} from '@/api/mes/process';
import { processRouteApi } from '@/api/mes/process';
import { useAppStore } from '@/store';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  type FilterConfig,
} from '@/components/templates';
import { Plus, Edit, Trash2, Eye, Route, Clock } from 'lucide-react';
import { apiLogger } from '@/utils/logger';

const ProcessRoutePage: React.FC = () => {
  const [routes, setRoutes] = useState<ProcessRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [showDialog, setShowDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<ProcessRoute | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [routeSteps, setRouteSteps] = useState<ProcessRouteStep[]>([]);
  const [formData, setFormData] = useState<CreateProcessRouteRequest>({
    code: '',
    name: '',
    description: '',
    version: '1.0',
    standard_time: 0,
  });

  const { addNotification } = useAppStore();

  const loadRoutes = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {
        page: currentPage - 1,
        page_size: pageSize,
      };
      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== 'all') params.status = statusFilter;

      const response = await processRouteApi.list(params);
      if (response.success && response.data) {
        setRoutes(response.data.routes || []);
        setTotal(response.data.total || 0);
      }
    } catch (error: unknown) {
      apiLogger.error('加载工序路线列表失败:', error);
      addNotification({
        type: 'error',
        title: '加载失败',
        message: '无法加载工序路线列表',
      });
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchTerm, statusFilter, addNotification]);

  const loadRouteSteps = useCallback(async (routeId: string) => {
    try {
      const response = await processRouteApi.getSteps(routeId);
      if (response.success && response.data) {
        setRouteSteps(response.data.steps || []);
      }
    } catch (error: unknown) {
      apiLogger.error('加载工序路线步骤失败:', error);
    }
  }, []);

  useEffect(() => {
    loadRoutes();
  }, [loadRoutes]);

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      active: '启用',
      inactive: '停用',
      draft: '草稿',
    };
    return statusMap[status] || status;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedRoute) {
        await processRouteApi.update(selectedRoute.id, formData as UpdateProcessRouteRequest);
        addNotification({
          type: 'success',
          title: '更新成功',
          message: '工序路线信息已更新',
        });
      } else {
        await processRouteApi.create(formData);
        addNotification({
          type: 'success',
          title: '创建成功',
          message: '新工序路线已创建',
        });
      }
      setShowDialog(false);
      resetForm();
      loadRoutes();
    } catch (error: unknown) {
      apiLogger.error('操作失败:', error);
      addNotification({
        type: 'error',
        title: '操作失败',
        message: selectedRoute ? '更新工序路线失败' : '创建工序路线失败',
      });
    }
  };

  const handleDelete = useCallback(
    async (id: string) => {
      if (!window.confirm('确定要删除这个工序路线吗?')) return;
      try {
        await processRouteApi.delete(id);
        addNotification({
          type: 'success',
          title: '删除成功',
          message: '工序路线已删除',
        });
        loadRoutes();
      } catch (error: unknown) {
        apiLogger.error('删除失败:', error);
        addNotification({
          type: 'error',
          title: '删除失败',
          message: '无法删除工序路线',
        });
      }
    },
    [loadRoutes, addNotification]
  );

  const handleEdit = useCallback((route: ProcessRoute) => {
    setSelectedRoute(route);
    setFormData({
      code: route.code,
      name: route.name,
      description: route.description || '',
      version: route.version || '1.0',
      standard_time: route.standard_time || 0,
    });
    setShowDialog(true);
  }, []);

  const handleViewDetail = useCallback(
    async (route: ProcessRoute) => {
      setSelectedRoute(route);
      await loadRouteSteps(route.id);
      setShowDetailDialog(true);
    },
    [loadRouteSteps]
  );

  const resetForm = () => {
    setSelectedRoute(null);
    setFormData({
      code: '',
      name: '',
      description: '',
      version: '1.0',
      standard_time: 0,
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

  const columns: ColumnDef<ProcessRoute>[] = useMemo(
    () => [
      { id: 'code', label: '路线编号', sortable: true },
      { id: 'name', label: '路线名称', sortable: true },
      { id: 'version', label: '版本', sortable: true },
      { id: 'process_count', label: '工序数量', sortable: true },
      {
        id: 'total_standard_time',
        label: '标准工时(分钟)',
        sortable: true,
        render: (row) => row.total_standard_time || 0,
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

  const rowActions: RowAction<ProcessRoute>[] = useMemo(
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
        confirmMessage: '确定要删除这个工序路线吗?',
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
      title='工序路线管理'
      subtitle='管理生产工序路线,包括路线定义、工序顺序、标准工时等'
    >
      <ListPageTemplate
        title=''
        subtitle=''
        columns={columns}
        data={routes}
        loading={loading}
        filters={filters}
        searchable
        searchPlaceholder='搜索路线编号或名称...'
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
            label: '新增路线',
            icon: <Plus size={16} />,
            onClick: handleOpenCreate,
          },
        ]}
        rowActions={rowActions}
        emptyMessage='暂无工序路线数据'
        getRowId={(row) => row.id}
      />

      {/* 新增/编辑对话框 */}
      <Dialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        maxWidth='md'
      >
        <DialogTitle>{selectedRoute ? '编辑工序路线' : '新增工序路线'}</DialogTitle>
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
            {selectedRoute ? '修改工序路线信息' : '填写新工序路线信息'}
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
                <InputLabel htmlFor='code'>路线编号 *</InputLabel>
                <TextField
                  id='code'
                  required
                  size='small'
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  disabled={!!selectedRoute}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='name'>路线名称 *</InputLabel>
                <TextField
                  id='name'
                  required
                  size='small'
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='standard_time'>标准工时(分钟)</InputLabel>
                <TextField
                  id='standard_time'
                  type='number'
                  size='small'
                  value={formData.standard_time || 0}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      standard_time: parseInt(e.target.value) || 0,
                    })
                  }
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
        maxWidth='md'
      >
        <DialogTitle>工序路线详情</DialogTitle>
        <DialogContent>
          {selectedRoute && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                  gap: 2,
                }}
              >
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>路线编号</InputLabel>
                  <Box
                    component='span'
                    sx={{ fontWeight: 500 }}
                  >
                    {selectedRoute.code}
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>路线名称</InputLabel>
                  <Box component='span'>{selectedRoute.name}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>版本</InputLabel>
                  <Box component='span'>{selectedRoute.version || '-'}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>状态</InputLabel>
                  <Box>{getStatusBadge(selectedRoute.status)}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>标准工时</InputLabel>
                  <Box component='span'>{selectedRoute.total_standard_time || 0} 分钟</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>创建时间</InputLabel>
                  <Box component='span'>
                    {new Date(selectedRoute.created_at).toLocaleString('zh-CN')}
                  </Box>
                </Box>
                <Box sx={{ gridColumn: '1 / -1' }}>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>描述</InputLabel>
                  <Box component='span'>{selectedRoute.description || '-'}</Box>
                </Box>
              </Box>

              <Typography
                variant='h6'
                sx={{ mt: 2 }}
              >
                工序列表
              </Typography>
              {routeSteps.length > 0 ? (
                <Stack spacing={1}>
                  {routeSteps.map((step, index) => (
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

export default ProcessRoutePage;
