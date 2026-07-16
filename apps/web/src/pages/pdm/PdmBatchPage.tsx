import React, { useState, useMemo } from 'react';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Typography,
  Button,
} from '@mui/material';
import { apiLogger } from '@/utils/logger';
import { Plus, Eye, Clock } from 'lucide-react';
import { PageContainer } from '@/components/common/PageContainerV2';
import { ListPageTemplate } from '@/components/templates';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import type { RowAction, FilterConfig, ColumnDef } from '@/components/templates';
import { pdmApi } from '@/api/pdm';
import type { ProductionBatch } from '@/api/pdm';
import { useNotificationStore } from '@/store';
import { designTokens } from '@/theme/tokens';
import { QUERY_KEYS } from '@/lib/reactQuery';

const ct = designTokens.colors;

const PdmBatchPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<ProductionBatch | null>(null);
  const [formData, setFormData] = useState({
    batch_no: '',
    product_name: '',
    quantity: '',
    unit: 'kg',
  });
  const addNotification = useNotificationStore((state) => state.addNotification);

  const { data: batches = [], isLoading: loading } = useQuery<ProductionBatch[]>({
    queryKey: QUERY_KEYS.PDM.BATCHES,
    queryFn: async (): Promise<ProductionBatch[]> => {
      const response = await pdmApi.listBatches();
      if (response.success && response.data) {
        const adapted = (response.data as unknown as { [key: string]: unknown }[]).map((item: { [key: string]: unknown }) => ({
          ...item,
          quantity: item.planned_quantity || item.actual_quantity || 0,
          status:
            item.status === 'planning'
              ? '规划中'
              : item.status === 'in_progress'
                ? '进行中'
                : item.status === 'completed'
                  ? '已完成'
                  : item.status === 'cancelled'
                    ? '已取消'
                    : item.status,
        }));
        return adapted as unknown as ProductionBatch[];
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const createBatchMutation = useMutation({
    mutationFn: (data: {
      batch_no: string;
      product_name: string;
      quantity: string;
      unit: string;
    }) =>
      pdmApi.createBatch({
        batch_no: data.batch_no,
        product_name: data.product_name,
        planned_quantity: parseFloat(data.quantity) || 0,
        unit: data.unit,
        status: 'planning',
      }),
    onSuccess: () => {
      addNotification({ title: '成功', message: '生产批次创建成功', type: 'success' });
      setShowCreateModal(false);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PDM.BATCHES });
    },
    onError: () => {
      addNotification({ title: '错误', message: '创建失败', type: 'error' });
    },
  });

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; color: string }> = {
      规划中: { bg: 'warning.100', color: ct.yellow[600] },
      进行中: { bg: 'primary.100', color: 'primary.dark' },
      已完成: { bg: 'success.lighter', color: 'success.dark' },
      已取消: { bg: 'error.lighter', color: 'error.dark' },
    };
    const colors = statusMap[status] || { bg: 'grey.100', color: 'text.secondary' };
    return (
      <Chip
        label={status}
        size='small'
        sx={{
          backgroundColor: colors.bg,
          color: colors.color,
          fontWeight: 500,
        }}
      />
    );
  };

  const filteredBatches = useMemo(() => {
    return batches.filter((batch: any) => {
      const matchesSearch =
        batch.batch_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
        batch.product_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = !statusFilter || batch.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [batches, searchTerm, statusFilter]);

  const columns = useMemo<ColumnDef<ProductionBatch>[]>(
    () => [
      { id: 'batch_no', label: '批次号' },
      { id: 'product_name', label: '产品名称' },
      {
        id: 'planned_quantity',
        label: '计划数量',
        render: (row) => `${row.planned_quantity || 0} ${row.unit || ''}`,
      },
      {
        id: 'status',
        label: '状态',
        render: (row) => getStatusBadge(row.status),
      },
    ],
    []
  );

  const rowActions = useMemo<RowAction<ProductionBatch>[]>(
    () => [
      {
        label: '详情',
        icon: <Eye size={16} />,
        onClick: (row) => {
          setSelectedBatch(row);
          setShowDetailModal(true);
        },
      },
    ],
    []
  );

  const filters = useMemo<FilterConfig[]>(
    () => [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { value: '', label: '全部' },
          { value: '规划中', label: '规划中' },
          { value: '进行中', label: '进行中' },
          { value: '已完成', label: '已完成' },
          { value: '已取消', label: '已取消' },
        ],
        value: statusFilter,
        onChange: (value) => setStatusFilter(value as string),
      },
    ],
    [statusFilter]
  );

  const handleView = (batch: ProductionBatch) => {
    setSelectedBatch(batch);
    setShowDetailModal(true);
  };

  const handleCreate = () => {
    setFormData({
      batch_no: '',
      product_name: '',
      quantity: '',
      unit: 'kg',
    });
    setShowCreateModal(true);
  };

  const handleSave = () => {
    createBatchMutation.mutate({
      batch_no: formData.batch_no,
      product_name: formData.product_name,
      quantity: formData.quantity,
      unit: formData.unit,
    });
  };

  const stats = {
    total: batches.length,
    planning: batches.filter((b: any) => b.status === '规划中').length,
    inProgress: batches.filter((b: any) => b.status === '进行中').length,
    completed: batches.filter((b: any) => b.status === '已完成').length,
  };

  const statsContent = (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(1, 1fr)', md: 'repeat(4, 1fr)' },
        gap: 2,
        mb: 3,
      }}
    >
      <Box sx={{ p: 2, bgcolor: 'cyan.light', borderRadius: 3 }}>
        <Typography
          variant='body2'
          sx={{ color: 'slate.600' }}
        >
          批次总数
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700 }}
        >
          {stats.total}
        </Typography>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'warning.100', borderRadius: 3 }}>
        <Typography
          variant='body2'
          sx={{ color: 'slate.600' }}
        >
          规划中
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700 }}
        >
          {stats.planning}
        </Typography>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'primary.100', borderRadius: 3 }}>
        <Typography
          variant='body2'
          sx={{ color: 'slate.600' }}
        >
          进行中
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700 }}
        >
          {stats.inProgress}
        </Typography>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'success.lighter', borderRadius: 3 }}>
        <Typography
          variant='body2'
          sx={{ color: 'slate.600' }}
        >
          已完成
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700 }}
        >
          {stats.completed}
        </Typography>
      </Box>
    </Box>
  );

  return (
    <PageContainer
      headerProps={{
        pageIcon: <Clock style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.cyan.main} 0%, ${ct.cyan.dark} 100%)`,
      }}
    >
      <ListPageTemplate<ProductionBatch>
        title=''
        subtitle=''
        backButton={{ href: '/dashboard' }}
        columns={columns}
        data={filteredBatches}
        loading={loading}
        searchable
        searchPlaceholder='搜索批次号或产品名称...'
        searchValue={searchTerm}
        onSearch={(value) => setSearchTerm(value)}
        filters={filters}
        rowActions={rowActions}
        actions={[
          {
            label: '新增批次',
            icon: <Plus size={18} />,
            onClick: handleCreate,
            variant: 'contained',
          },
        ]}
        headerContent={statsContent}
        emptyMessage='暂无生产批次数据'
      />

      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>新增生产批次</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label='批次号 *'
              value={formData.batch_no}
              onChange={(e) => setFormData({ ...formData, batch_no: e.target.value })}
              placeholder='请输入批次号'
            />
            <TextField
              fullWidth
              label='产品名称 *'
              value={formData.product_name}
              onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
              placeholder='请输入产品名称'
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label='数量'
                type='number'
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                placeholder='请输入数量'
              />
              <TextField
                fullWidth
                select
                label='单位'
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              >
                <option value='kg'>kg</option>
                <option value='件'>件</option>
                <option value='盒'>盒</option>
                <option value='瓶'>瓶</option>
              </TextField>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            variant='outlined'
            onClick={() => setShowCreateModal(false)}
          >
            取消
          </Button>
          <Button
            variant='contained'
            onClick={handleSave}
            sx={{ bgcolor: 'info.main' }}
          >
            保存
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>生产批次详情</DialogTitle>
        <DialogContent>
          {selectedBatch && (
            <Box
              sx={{
                pt: 2,
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 2,
              }}
            >
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  批次号
                </Box>
                <Box sx={{ fontWeight: 500 }}>{selectedBatch.batch_no}</Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  产品名称
                </Box>
                <Box>{selectedBatch.product_name}</Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  数量
                </Box>
                <Box>
                  {selectedBatch.planned_quantity || 0} {selectedBatch.unit}
                </Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  状态
                </Box>
                <Box sx={{ mt: 0.5 }}>{getStatusBadge(selectedBatch.status)}</Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  创建时间
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Clock style={{ width: 16, height: 16 }} />
                  {selectedBatch.created_at || '-'}
                </Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  更新时间
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Clock style={{ width: 16, height: 16 }} />
                  {selectedBatch.updated_at || '-'}
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetailModal(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default PdmBatchPage;
