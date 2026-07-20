import {
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Box,
  Stack,
  Typography,
  Button,
} from '@mui/material';
import { PageContainer } from '@/components/common';
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { WorkStation, CreateWorkStationRequest, UpdateWorkStationRequest } from '@/api/mes';
import { mesApi } from '@/api/mes';
import { useNotificationStore } from '@/store';
import { LoadingSpinner } from '@topems/shared-components';
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  type FilterConfig,
} from '@/components/templates';
import { Plus, Edit, Eye, MapPin, Clock } from 'lucide-react';
import { apiLogger } from '@/utils/logger';
import { designTokens } from '@/theme/tokens';

import { useTranslation } from 'react-i18next';
const ct = designTokens.colors;

const WorkStationPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [showDialog, setShowDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedWorkStation, setSelectedWorkStation] = useState<WorkStation | null>(null);
  const [formData, setFormData] = useState<CreateWorkStationRequest>({
    name: '',
    code: '',
    location: '',
    capacity: 0,
    supervisor: '',
  });

  const { addNotification } = useNotificationStore();

  const workstationsQuery = useQuery({
    queryKey: ['mes-workstations', currentPage, pageSize, searchTerm, statusFilter],
    queryFn: async () => {
      const params: Record<string, unknown> = {
        page: currentPage - 1,
        pagesize: pageSize,
      };
      if (searchTerm) params.search = searchTerm;
      if (statusFilter) params.status = statusFilter;

      const response = await mesApi.workstations.list(params);
      if (!response.success || !response.data) {
        throw new Error(response.message || t('mes.work_station_page.list'));
      }
      return {
        items: response.data.workstations || [],
        total: response.data.total || 0,
      };
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  const workstations = workstationsQuery.data?.items ?? [];
  const total = workstationsQuery.data?.total ?? 0;
  const loading = workstationsQuery.isLoading;

  useEffect(() => {
    if (workstationsQuery.isError) {
      addNotification({
        type: 'error',
        title: t('mes.work_station_page.fail'),
        message: t('mes.work_station_page.list'),
      });
    }
  }, [workstationsQuery.isError, addNotification]);

  const createMutation = useMutation({
    mutationFn: async (data: CreateWorkStationRequest) => {
      const response = await mesApi.workstations.create(data);
      if (!response.success) {
        throw new Error(response.message || t('mes.work_station_page.create'));
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mes-workstations'] });
      addNotification({
        type: 'success',
        title: t('mes.work_station_page.create_1'),
        message: t('mes.work_station_page.create_2'),
      });
    },
    onError: (error: unknown) => {
      apiLogger.error(t('mes.work_station_page.create_3'), error);
      addNotification({
        type: 'error',
        title: t('mes.work_station_page.operation_failed'),
        message: t('mes.work_station_page.create'),
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateWorkStationRequest }) => {
      const response = await mesApi.workstations.update(id, data);
      if (!response.success) {
        throw new Error(response.message || t('mes.work_station_page.update'));
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mes-workstations'] });
      addNotification({
        type: 'success',
        title: t('mes.work_station_page.update_1'),
        message: t('mes.work_station_page.update_2'),
      });
    },
    onError: (error: unknown) => {
      apiLogger.error(t('mes.work_station_page.update_3'), error);
      addNotification({
        type: 'error',
        title: t('mes.work_station_page.operation_failed'),
        message: t('mes.work_station_page.update'),
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedWorkStation) {
        await updateMutation.mutateAsync({
          id: selectedWorkStation.id,
          data: formData as UpdateWorkStationRequest,
        });
      } else {
        await createMutation.mutateAsync(formData);
      }
      setShowDialog(false);
      resetForm();
    } catch {}
  };

  const handleEdit = useCallback((station: WorkStation) => {
    setSelectedWorkStation(station);
    setFormData({
      name: station.name,
      code: station.code || '',
      location: station.location || '',
      capacity: station.capacity || 0,
      supervisor: station.supervisor || '',
    });
    setShowDialog(true);
  }, []);

  const handleViewDetail = useCallback((station: WorkStation) => {
    setSelectedWorkStation(station);
    setShowDetailDialog(true);
  }, []);

  const resetForm = () => {
    setSelectedWorkStation(null);
    setFormData({
      name: '',
      code: '',
      location: '',
      capacity: 0,
      supervisor: '',
    });
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; bg: string; color: string }> = {
      active: { label: t('mes.work_station_page.status_running'), bg: 'success.lighter', color: 'success.dark' },
      idle: { label: t('mes.work_station_page.status_idle'), bg: 'warning.light', color: 'warning.700' },
      maintenance: { label: t('mes.work_station_page.status_maintenance'), bg: 'primary.100', color: 'primary.dark' },
      offline: { label: t('mes.work_station_page.status_offline'), bg: 'error.lighter', color: 'error.dark' },
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

  const columns: ColumnDef<WorkStation>[] = useMemo(
    () => [
      { id: 'name', label: t('mes.work_station_page.name'), sortable: true },
      { id: 'code', label: t('mes.work_station_page.code'), sortable: true },
      { id: 'location', label: t('mes.work_station_page.text_d4d2a6'), render: (row) => row.location || '-' },
      { id: 'capacity', label: t('mes.work_station_page.text_fe7d74'), render: (row) => row.capacity || '-' },
      { id: 'supervisor', label: t('mes.work_station_page.manager'), render: (row) => row.supervisor || '-' },
      {
        id: 'status',
        label: t('mes.work_station_page.filter_status'),
        render: (row) => getStatusBadge(row.status),
      },
    ],
    []
  );

  const filters: FilterConfig[] = useMemo(
    () => [
      {
        id: 'status',
        label: t('mes.work_station_page.filter_status'),
        type: 'select',
        options: [
          { label: t('mes.work_station_page.all'), value: '' },
          { label: t('mes.work_station_page.status_running'), value: 'active' },
          { label: t('mes.work_station_page.status_idle'), value: 'idle' },
          { label: t('mes.work_station_page.status_maintenance'), value: 'maintenance' },
          { label: t('mes.work_station_page.status_offline'), value: 'offline' },
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

  const rowActions: RowAction<WorkStation>[] = useMemo(
    () => [
      {
        label: t('mes.work_station_page.action_view_detail'),
        icon: <Eye size={16} />,
        onClick: handleViewDetail,
      },
      {
        label: t('mes.work_station_page.action_edit'),
        icon: <Edit size={16} />,
        onClick: handleEdit,
      },
    ],
    [handleViewDetail, handleEdit]
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
      total: workstations.length,
      active: workstations.filter((w) => w.status === 'active').length,
      idle: workstations.filter((w) => w.status === 'idle').length,
      maintenance: workstations.filter((w) => w.status === 'maintenance').length,
    };
  }, [workstations]);

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
      <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 3 }}>
        <Typography
          variant='body2'
          sx={{ color: 'text.secondary' }}
        >
          工作站总数
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700 }}
        >
          {stats.total}
        </Typography>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'success.lighter', borderRadius: 3 }}>
        <Typography
          variant='body2'
          sx={{ color: 'text.secondary' }}
        >
          运行中
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700 }}
        >
          {stats.active}
        </Typography>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'warning.light', borderRadius: 3 }}>
        <Typography
          variant='body2'
          sx={{ color: 'text.secondary' }}
        >
          空闲
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700 }}
        >
          {stats.idle}
        </Typography>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'primary.100', borderRadius: 3 }}>
        <Typography
          variant='body2'
          sx={{ color: 'text.secondary' }}
        >
          维护中
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700 }}
        >
          {stats.maintenance}
        </Typography>
      </Box>
    </Box>
  );

  return (
    <PageContainer
      title={t('mes.work_station_page.text_044a4f')}
      subtitle={t('mes.work_station_page.name_1')}
      headerProps={{
        pageIcon: <MapPin style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.success.main} 0%, ${ct.success.dark} 100%)`,
      }}
    >
      <ListPageTemplate
        title=''
        subtitle=''
        columns={columns}
        data={workstations}
        loading={loading || createMutation.isPending || updateMutation.isPending}
        filters={filters}
        searchable
        searchPlaceholder={t('mes.work_station_page.search')}
        searchValue={searchTerm}
        onSearch={handleSearch}
        pagination={{
          page: currentPage - 1,
          pageSize,
          total,
          onPageChange: (page) => setCurrentPage(page + 1),
        }}
        actions={[
          {
            label: t('mes.work_station_page.add'),
            icon: <Plus size={16} />,
            onClick: handleOpenCreate,
          },
        ]}
        rowActions={rowActions}
        headerContent={statsContent}
        emptyMessage={t('mes.work_station_page.no_data')}
        getRowId={(row) => row.id}
      />

      <Dialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>{selectedWorkStation ? t('mes.work_station_page.edit') : t('mes.work_station_page.add')}</DialogTitle>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                gap: 2,
                py: 2,
              }}
            >
              <TextField
                label={t('mes.work_station_page.name_2')}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                size='small'
                required
              />
              <TextField
                label={t('mes.work_station_page.code_1')}
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                size='small'
                required
              />
              <TextField
                label={t('mes.work_station_page.text_d4d2a6')}
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                size='small'
              />
              <TextField
                label={t('mes.work_station_page.text_fe7d74')}
                type='number'
                value={formData.capacity}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    capacity: parseInt(e.target.value) || 0,
                  })
                }
                size='small'
              />
              <TextField
                label={t('mes.work_station_page.manager')}
                value={formData.supervisor}
                onChange={(e) => setFormData({ ...formData, supervisor: e.target.value })}
                size='small'
              />
            </Box>
            <DialogActions sx={{ mt: 2 }}>
              <Button
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
        fullWidth
      >
        <DialogTitle>工作站详情</DialogTitle>
        <DialogContent>
          {selectedWorkStation && (
            <Box
              sx={{
                pt: 2,
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                gap: 2,
              }}
            >
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  工作站名称
                </Box>
                <Box sx={{ fontWeight: 500 }}>{selectedWorkStation.name}</Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  编码
                </Box>
                <Box>{selectedWorkStation.code || '-'}</Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  位置
                </Box>
                <Stack
                  direction='row'
                  spacing={0.5}
                  sx={{ alignItems: 'center' }}
                >
                  <MapPin style={{ width: 16, height: 16 }} />
                  {selectedWorkStation.location || '-'}
                </Stack>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  容量
                </Box>
                <Box>{selectedWorkStation.capacity || '-'}</Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  负责人
                </Box>
                <Box>{selectedWorkStation.supervisor || '-'}</Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  状态
                </Box>
                <Box sx={{ mt: 0.5 }}>{getStatusBadge(selectedWorkStation.status)}</Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  创建时间
                </Box>
                <Stack
                  direction='row'
                  spacing={0.5}
                  sx={{ alignItems: 'center' }}
                >
                  <Clock style={{ width: 16, height: 16 }} />
                  {selectedWorkStation.created_at
                    ? new Date(selectedWorkStation.created_at).toLocaleString('zh-CN')
                    : '-'}
                </Stack>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  更新时间
                </Box>
                <Stack
                  direction='row'
                  spacing={0.5}
                  sx={{ alignItems: 'center' }}
                >
                  <Clock style={{ width: 16, height: 16 }} />
                  {selectedWorkStation.updated_at
                    ? new Date(selectedWorkStation.updated_at).toLocaleString('zh-CN')
                    : '-'}
                </Stack>
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

export default WorkStationPage;
