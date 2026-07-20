import {
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Chip,
  InputLabel,
  Select,
  MenuItem,
  FormControl,
  Stack,
  Typography,
  Button,
} from '@mui/material';
import { PageContainer } from '@/components/common/PageContainerV2';
import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  ProductionProcess,
  CreateProductionProcessRequest,
  UpdateProductionProcessRequest,
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
import { Plus, Edit, Eye, Clock, Settings } from 'lucide-react';
import { apiLogger } from '@/utils/logger';
import { designTokens } from '@/theme/tokens';

import { useTranslation } from 'react-i18next';
const ct = designTokens.colors;

const ProductionProcessPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [showDialog, setShowDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedProcess, setSelectedProcess] = useState<ProductionProcess | null>(null);
  const [formData, setFormData] = useState<CreateProductionProcessRequest>({
    name: '',
    code: '',
    description: '',
    sequence: 0,
    standard_time: 0,
    work_station_id: '',
  });

  const { addNotification } = useNotificationStore();

  const processQuery = useQuery({
    queryKey: ['mes-processes', currentPage, pageSize, searchTerm, statusFilter],
    queryFn: async () => {
      const params: ListParams = {
        page: currentPage - 1,
        pagesize: pageSize,
      };
      if (searchTerm) params.search = searchTerm;
      if (statusFilter) params.status = statusFilter;

      const response = await mesApi.processes.list(params);
      if (!response.success || !response.data) {
        throw new Error(response.message || t('mes.production_process_page.list'));
      }
      return {
        items: response.data.processes || [],
        total: response.data.total || 0,
      };
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  const processes = processQuery.data?.items ?? [];
  const total = processQuery.data?.total ?? 0;
  const loading = processQuery.isLoading;

  const createMutation = useMutation({
    mutationFn: async (data: CreateProductionProcessRequest) => {
      const response = await mesApi.processes.create(data);
      if (!response.success) {
        throw new Error(response.message || t('mes.production_process_page.create'));
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mes-processes'] });
      addNotification({
        type: 'success',
        title: t('mes.production_process_page.create_1'),
        message: t('mes.production_process_page.create_2'),
      });
    },
    onError: (error: unknown) => {
      apiLogger.error(t('mes.production_process_page.create_3'), error);
      addNotification({
        type: 'error',
        title: t('mes.production_process_page.operation_failed'),
        message: t('mes.production_process_page.create'),
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateProductionProcessRequest }) => {
      const response = await mesApi.processes.update(id, data);
      if (!response.success) {
        throw new Error(response.message || t('mes.production_process_page.update'));
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mes-processes'] });
      addNotification({
        type: 'success',
        title: t('mes.production_process_page.update_1'),
        message: t('mes.production_process_page.update_2'),
      });
    },
    onError: (error: unknown) => {
      apiLogger.error(t('mes.production_process_page.update_3'), error);
      addNotification({
        type: 'error',
        title: t('mes.production_process_page.operation_failed'),
        message: t('mes.production_process_page.update'),
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedProcess) {
      await updateMutation.mutateAsync({
        id: selectedProcess.id,
        data: formData as UpdateProductionProcessRequest,
      });
    } else {
      await createMutation.mutateAsync(formData);
    }
    setShowDialog(false);
    resetForm();
  };

  const handleEdit = useCallback((process: ProductionProcess) => {
    setSelectedProcess(process);
    setFormData({
      name: process.name,
      code: process.code || '',
      description: process.description || '',
      sequence: process.sequence,
      standard_time: process.standard_time || 0,
      work_station_id: process.work_station_id || '',
    });
    setShowDialog(true);
  }, []);

  const handleViewDetail = useCallback((process: ProductionProcess) => {
    setSelectedProcess(process);
    setShowDetailDialog(true);
  }, []);

  const resetForm = () => {
    setSelectedProcess(null);
    setFormData({
      name: '',
      code: '',
      description: '',
      sequence: 0,
      standard_time: 0,
      work_station_id: '',
    });
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; bg: string; color: string }> = {
      active: { label: t('mes.production_process_page.status_active'), bg: 'success.lighter', color: 'success.dark' },
      inactive: { label: t('mes.production_process_page.text_710ad0'), bg: 'error.lighter', color: 'error.dark' },
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

  const columns: ColumnDef<ProductionProcess>[] = useMemo(
    () => [
      {
        id: 'name',
        label: t('mes.production_process_page.column_process_name'),
        sortable: true,
        render: (row) => <Box sx={{ fontWeight: 500 }}>{row.name}</Box>,
      },
      { id: 'code', label: t('mes.production_process_page.column_process_code'), sortable: true, render: (row) => row.code || '-' },
      { id: 'sequence', label: t('mes.production_process_page.text_6367e7'), sortable: true },
      {
        id: 'standard_time',
        label: t('mes.production_process_page.text_5d4906'),
        render: (row) => (row.standard_time ? `${row.standard_time}h` : '-'),
      },
      {
        id: 'work_station_id',
        label: t('mes.production_process_page.text_909250'),
        render: (row) => row.work_station_id || '-',
      },
      {
        id: 'status',
        label: t('mes.production_process_page.filter_status'),
        render: (row) => getStatusBadge(row.status),
      },
    ],
    []
  );

  const filters: FilterConfig[] = useMemo(
    () => [
      {
        id: 'status',
        label: t('mes.production_process_page.filter_status'),
        type: 'select',
        options: [
          { label: t('mes.production_process_page.all'), value: '' },
          { label: t('mes.production_process_page.status_active'), value: 'active' },
          { label: t('mes.production_process_page.text_710ad0'), value: 'inactive' },
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

  const rowActions: RowAction<ProductionProcess>[] = useMemo(
    () => [
      {
        label: t('mes.production_process_page.action_view_detail'),
        icon: <Eye size={16} />,
        onClick: handleViewDetail,
      },
      {
        label: t('mes.production_process_page.action_edit'),
        icon: <Edit size={16} />,
        onClick: handleEdit,
      },
    ],
    []
  );

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const stats = useMemo(() => {
    return {
      total: processes.length,
      active: processes.filter((p) => p.status === 'active').length,
      inactive: processes.filter((p) => p.status === 'inactive').length,
    };
  }, [processes]);

  const statsContent = (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
        gap: 2,
        mb: 3,
      }}
    >
      <Box sx={{ p: 2, bgcolor: 'cyan.light', borderRadius: 3 }}>
        <Typography
          variant='body2'
          sx={{ color: 'text.secondary' }}
        >
          工序总数
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
          已启用
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700 }}
        >
          {stats.active}
        </Typography>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'error.lighter', borderRadius: 3 }}>
        <Typography
          variant='body2'
          sx={{ color: 'text.secondary' }}
        >
          已禁用
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700 }}
        >
          {stats.inactive}
        </Typography>
      </Box>
    </Box>
  );

  if (loading) return <LoadingSpinner />;

  return (
    <PageContainer
      autoTitle
      autoBreadcrumbs
      headerProps={{
        pageIcon: <Settings style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.success.main} 0%, ${ct.success.dark} 100%)`,
      }}
    >
      <ListPageTemplate
        title=''
        subtitle=''
        columns={columns}
        data={processes}
        loading={loading}
        filters={filters}
        searchable
        searchPlaceholder={t('mes.production_process_page.search_placeholder')}
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
            label: t('mes.production_process_page.dialog_create_title'),
            icon: <Plus size={16} />,
            onClick: () => {
              resetForm();
              setShowDialog(true);
            },
          },
        ]}
        rowActions={rowActions}
        headerContent={statsContent}
        emptyMessage={t('mes.production_process_page.empty_message')}
        getRowId={(row) => row.id}
      />

      <Dialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>{selectedProcess ? t('mes.production_process_page.dialog_edit_title') : t('mes.production_process_page.dialog_create_title')}</DialogTitle>
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
                label={t('mes.production_process_page.field_process_name_required')}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                size='small'
                required
              />
              <TextField
                label={t('mes.production_process_page.column_process_code')}
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                size='small'
              />
              <TextField
                label={t('mes.production_process_page.text_961c58')}
                type='number'
                value={formData.sequence}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    sequence: parseInt(e.target.value),
                  })
                }
                size='small'
                required
              />
              <TextField
                label={t('mes.production_process_page.text_5d4906')}
                type='number'
                value={formData.standard_time}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    standard_time: parseFloat(e.target.value),
                  })
                }
                size='small'
              />
              <TextField
                label={t('mes.production_process_page.text_e991a1')}
                value={formData.work_station_id}
                onChange={(e) => setFormData({ ...formData, work_station_id: e.target.value })}
                size='small'
              />
            </Box>
            <TextField
              label={t('mes.production_process_page.field_description')}
              multiline
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              fullWidth
              size='small'
              sx={{ mt: 2 }}
            />
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
        <DialogTitle>工序详情</DialogTitle>
        <DialogContent>
          {selectedProcess && (
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
                  工序名称
                </Box>
                <Box sx={{ fontWeight: 500 }}>{selectedProcess.name}</Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  工序编码
                </Box>
                <Box>{selectedProcess.code || '-'}</Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  顺序
                </Box>
                <Box>{selectedProcess.sequence}</Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  标准工时
                </Box>
                <Box>
                  {selectedProcess.standard_time ? `${selectedProcess.standard_time}h` : '-'}
                </Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  工作站
                </Box>
                <Box>{selectedProcess.work_station_id || '-'}</Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  状态
                </Box>
                <Box sx={{ mt: 0.5 }}>{getStatusBadge(selectedProcess.status)}</Box>
              </Box>
              <Box sx={{ gridColumn: '1 / -1' }}>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  描述
                </Box>
                <Box>{selectedProcess.description || '-'}</Box>
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
                  {selectedProcess.created_at
                    ? new Date(selectedProcess.created_at).toLocaleString('zh-CN')
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
                  {selectedProcess.updated_at
                    ? new Date(selectedProcess.updated_at).toLocaleString('zh-CN')
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

export default ProductionProcessPage;
