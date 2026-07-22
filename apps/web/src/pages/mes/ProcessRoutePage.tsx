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
import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import type {
  ProcessRoute,
  CreateProcessRouteRequest,
  UpdateProcessRouteRequest,
  ProcessRouteStep,
} from '@/api/mes/process';
import type { ListParams } from '@/api/mes';
import { processRouteApi } from '@/api/mes/process';
import { LoadingSpinner } from '@topems/shared-components';
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  type FilterConfig,
} from '@/components/templates';
import { Plus, Edit, Trash2, Eye, Route, Clock } from 'lucide-react';
import { apiLogger } from '@/utils/logger';
import { designTokens } from '@/theme/tokens';
import { useCrudMutations } from '@/hooks';

import { useTranslation } from 'react-i18next';
const ct = designTokens.colors;

const ProcessRoutePage: React.FC = () => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
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

  const routeQuery = useQuery({
    queryKey: ['mes-process-routes', currentPage, pageSize, searchTerm, statusFilter],
    queryFn: async () => {
      const params: ListParams = {
        page: currentPage - 1,
        pagesize: pageSize,
      };
      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== 'all') params.status = statusFilter;

      const response = await processRouteApi.list(params);
      if (!response.success || !response.data) {
        throw new Error(response.message || t('mes.process_route_page.list'));
      }
      return {
        items: response.data.routes || [],
        total: response.data.total || 0,
      };
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  const routes = routeQuery.data?.items ?? [];
  const total = routeQuery.data?.total ?? 0;
  const loading = routeQuery.isLoading;

  const { createMutation, updateMutation, deleteMutation } = useCrudMutations<
    CreateProcessRouteRequest,
    UpdateProcessRouteRequest,
    string
  >({
    queryKeyToInvalidate: ['mes-process-routes'],
    createFn: async (data) => {
      const response = await processRouteApi.create(data);
      if (!response.success) {
        throw new Error(response.message || '创建工序路线失败');
      }
      return response.data;
    },
    updateFn: async ({ id, data }) => {
      const response = await processRouteApi.update(String(id), data);
      if (!response.success) {
        throw new Error(response.message || '更新工序路线失败');
      }
      return response.data;
    },
    deleteFn: async (id) => {
      const response = await processRouteApi.delete(String(id));
      if (!response.success) {
        throw new Error(response.message || '删除工序路线失败');
      }
      return response.data;
    },
    entityName: '工序路线',
  });

  const loadRouteSteps = useCallback(async (routeId: string) => {
    try {
      const response = await processRouteApi.getSteps(routeId);
      if (response.success && response.data) {
        setRouteSteps(response.data.steps || []);
      }
    } catch (error: unknown) {
      apiLogger.error(t('mes.process_route_page.fail'), error);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRoute) {
      await updateMutation.mutateAsync({
        id: selectedRoute.id,
        data: formData as UpdateProcessRouteRequest,
      });
    } else {
      await createMutation.mutateAsync(formData);
    }
    setShowDialog(false);
    resetForm();
  };

  const handleDelete = useCallback(
    async (id: string) => {
      if (!window.confirm(t('mes.process_route_page.confirm'))) return;
      await deleteMutation.mutateAsync(id);
    },
    [deleteMutation]
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

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      active: t('mes.process_route_page.active'),
      inactive: t('mes.process_route_page.inactive'),
      draft: t('mes.process_route_page.status_draft'),
    };
    return statusMap[status] || status;
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
      active: { label: t('mes.process_route_page.active'), bg: 'success.lighter', color: 'success.dark' },
      inactive: { label: t('mes.process_route_page.inactive'), bg: 'grey.100', color: 'text.secondary' },
      draft: { label: t('mes.process_route_page.status_draft'), bg: 'warning.light', color: 'warning.dark' },
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
      { id: 'code', label: t('mes.process_route_page.text_3f16bf'), sortable: true },
      { id: 'name', label: t('mes.process_route_page.column_route_name'), sortable: true },
      { id: 'version', label: t('mes.process_route_page.field_version'), sortable: true },
      { id: 'process_count', label: t('mes.process_route_page.quantity'), sortable: true },
      {
        id: 'total_standard_time',
        label: t('mes.process_route_page.text_82fe5b'),
        sortable: true,
        render: (row) => row.total_standard_time || 0,
      },
      {
        id: 'status',
        label: t('mes.process_route_page.filter_status'),
        render: (row) => getStatusBadge(row.status),
      },
    ],
    []
  );

  const filters: FilterConfig[] = useMemo(
    () => [
      {
        id: 'status',
        label: t('mes.process_route_page.filter_status'),
        type: 'select',
        options: [
          { label: t('mes.process_route_page.filter_option_all_status'), value: 'all' },
          { label: t('mes.process_route_page.active'), value: 'active' },
          { label: t('mes.process_route_page.inactive'), value: 'inactive' },
          { label: t('mes.process_route_page.status_draft'), value: 'draft' },
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

  const rowActions: RowAction<ProcessRoute>[] = useMemo(
    () => [
      {
        label: t('mes.process_route_page.action_view_detail'),
        icon: <Eye size={16} />,
        onClick: handleViewDetail,
      },
      {
        label: t('mes.process_route_page.action_edit'),
        icon: <Edit size={16} />,
        onClick: handleEdit,
      },
      {
        label: t('mes.process_route_page.action_delete'),
        icon: <Trash2 size={16} />,
        color: 'error',
        onClick: (row) => handleDelete(row.id),
        confirm: true,
        confirmMessage: t('mes.process_route_page.confirm'),
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
      title={t('mes.process_route_page.process')}
      subtitle={t('mes.process_route_page.process_1')}
      headerProps={{
        pageIcon: <Route style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.secondary.main} 0%, ${ct.secondary.dark} 100%)`,
      }}
    >
      <ListPageTemplate
        title=''
        subtitle=''
        columns={columns}
        data={routes}
        loading={loading}
        filters={filters}
        searchable
        searchPlaceholder={t('mes.process_route_page.search')}
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
            label: t('mes.process_route_page.add'),
            icon: <Plus size={16} />,
            onClick: handleOpenCreate,
          },
        ]}
        rowActions={rowActions}
        emptyMessage={t('mes.process_route_page.no_data')}
        getRowId={(row) => row.id}
      />

      <Dialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        maxWidth='md'
      >
        <DialogTitle>{selectedRoute ? t('mes.process_route_page.edit') : t('mes.process_route_page.add_1')}</DialogTitle>
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
            {selectedRoute ? t('mes.process_route_page.info') : t('mes.process_route_page.info_1')}
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
                disabled={createMutation.isPending || updateMutation.isPending}
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
