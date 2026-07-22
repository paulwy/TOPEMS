import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Stack,
  Typography,
} from '@mui/material';
import { PageContainer } from '@/components/common/PageContainerV2';
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  type FilterConfig,
} from '@/components/templates';
import { wipApi } from '@/api/mes';
import type { Wip, CreateWipRequest, UpdateWipRequest, WipStatistics } from '@/api/mes';
import { useNotificationStore } from '@/store';
import { QUERY_KEYS } from '@/lib/reactQuery';
import { Eye, Edit, Trash2, ArrowRightLeft } from 'lucide-react';
import { designTokens } from '@/theme/tokens';
import { LoadingSpinner } from '@topems/shared-components';

const ct = designTokens.colors;

const statusColorMap: Record<
  string,
  'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error'
> = {
  in_progress: 'warning',
  completed: 'success',
  pending: 'default',
  transferred: 'primary',
};

const statusLabelMap: Record<string, string> = {
  in_progress: '在产',
  completed: '已完成',
  pending: '待处理',
  transferred: '已转移',
};

const WIPPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [showDialog, setShowDialog] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [selectedWip, setSelectedWip] = useState<Wip | null>(null);
  const [formData, setFormData] = useState<CreateWipRequest>({
    order_id: '',
    quantity: 0,
  });

  const addNotification = useNotificationStore((state) => state.addNotification);

  // Fetch WIP list
  const { data: wipData, isLoading } = useQuery({
    queryKey: [QUERY_KEYS.MES.WIP, currentPage, pageSize, searchTerm, statusFilter],
    queryFn: async () => {
      const result = await wipApi.list({
        page: currentPage,
        pagesize: pageSize,
        search: searchTerm || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
      });
      if (!result.success) throw new Error(result.message);
      return result.data;
    },
  });

  // Fetch WIP statistics
  const { data: stats } = useQuery<WipStatistics>({
    queryKey: [QUERY_KEYS.MES.WIP, 'statistics'],
    queryFn: async () => {
      const result = await wipApi.getStatistics();
      if (!result.success) throw new Error(result.message);
      return result.data;
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateWipRequest) => wipApi.create(data),
    onSuccess: (result) => {
      if (result.success) {
        addNotification({ title: '成功', message: '在制品创建成功', type: 'success' });
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.MES.WIP] });
        handleCloseDialog();
      } else {
        addNotification({ title: '失败', message: result.message || '创建失败', type: 'error' });
      }
    },
    onError: (error) => {
      addNotification({
        title: '失败',
        message: `创建失败: ${error instanceof Error ? error.message : '未知错误'}`,
        type: 'error',
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateWipRequest }) => wipApi.update(id, data),
    onSuccess: (result) => {
      if (result.success) {
        addNotification({ title: '成功', message: '在制品更新成功', type: 'success' });
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.MES.WIP] });
        handleCloseDialog();
      } else {
        addNotification({ title: '失败', message: result.message || '更新失败', type: 'error' });
      }
    },
    onError: (error) => {
      addNotification({
        title: '失败',
        message: `更新失败: ${error instanceof Error ? error.message : '未知错误'}`,
        type: 'error',
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => wipApi.delete(id),
    onSuccess: (result) => {
      if (result.success) {
        addNotification({ title: '成功', message: '在制品删除成功', type: 'success' });
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.MES.WIP] });
      } else {
        addNotification({ title: '失败', message: result.message || '删除失败', type: 'error' });
      }
    },
    onError: (error) => {
      addNotification({
        title: '失败',
        message: `删除失败: ${error instanceof Error ? error.message : '未知错误'}`,
        type: 'error',
      });
    },
  });

  const handleOpenDialog = (wip?: Wip) => {
    if (wip) {
      setSelectedWip(wip);
      setFormData({
        order_id: wip.order_id,
        process_id: wip.process_id,
        work_station_id: wip.work_station_id,
        quantity: wip.quantity,
        unit: wip.unit,
        batch_no: wip.batch_no,
        operator: wip.operator,
        remarks: wip.remarks,
      });
    } else {
      setSelectedWip(null);
      setFormData({
        order_id: '',
        quantity: 0,
      });
    }
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setSelectedWip(null);
  };

  const handleSubmit = () => {
    if (selectedWip) {
      updateMutation.mutate({ id: selectedWip.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('确定要删除这条在制品记录吗？')) {
      deleteMutation.mutate(id);
    }
  };

  // Column definitions
  const columns: ColumnDef<Wip>[] = [
    {
      id: 'order_number',
      label: '生产订单',
      width: 140,
    },
    {
      id: 'process_name',
      label: '工序',
      width: 120,
    },
    {
      id: 'work_station_name',
      label: '工位',
      width: 120,
    },
    {
      id: 'quantity',
      label: '数量',
      width: 100,
      align: 'right',
    },
    {
      id: 'batch_no',
      label: '批次号',
      width: 120,
    },
    {
      id: 'operator',
      label: '操作员',
      width: 100,
    },
    {
      id: 'status',
      label: '状态',
      width: 100,
      render: (row: Wip) => (
        <Chip
          label={statusLabelMap[row.status] || row.status}
          color={statusColorMap[row.status] || 'default'}
          size='small'
        />
      ),
    },
    {
      id: 'created_at',
      label: '创建时间',
      width: 160,
      render: (row: Wip) =>
        row.created_at ? new Date(row.created_at).toLocaleString('zh-CN') : '-',
    },
  ];

  // Row actions
  const rowActions: RowAction<Wip>[] = [
    {
      icon: <Eye size={18} />,
      label: '查看',
      onClick: (row) => handleOpenDialog(row),
    },
    {
      icon: <Edit size={18} />,
      label: '编辑',
      onClick: (row) => handleOpenDialog(row),
    },
    {
      icon: <ArrowRightLeft size={18} />,
      label: '转移',
      onClick: (row) => {
        setSelectedWip(row);
        setShowTransferDialog(true);
      },
    },
    {
      icon: <Trash2 size={18} />,
      label: '删除',
      onClick: (row) => handleDelete(row.id),
      color: 'error',
    },
  ];

  // Filter config
  const filters: FilterConfig[] = [
    {
      id: 'status',
      type: 'select',
      label: '状态',
      value: statusFilter,
      onChange: setStatusFilter,
      options: [
        { value: 'all', label: '全部状态' },
        { value: 'pending', label: '待处理' },
        { value: 'in_progress', label: '在产' },
        { value: 'transferred', label: '已转移' },
        { value: 'completed', label: '已完成' },
      ],
    },
  ];

  if (isLoading) {
    return (
      <PageContainer>
        <LoadingSpinner />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {/* Statistics Cards */}
      <Stack
        direction='row'
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box
          sx={{
            flex: 1,
            p: 2,
            borderRadius: 2,
            bgcolor: 'background.paper',
            border: `1px solid ${ct.border.light}`,
          }}
        >
          <Typography
            variant='body2'
            color='text.secondary'
          >
            在制品总数
          </Typography>
          <Typography
            variant='h4'
            sx={{ fontWeight: 700 }}
          >
            {stats?.total_wip || 0}
          </Typography>
        </Box>
        <Box
          sx={{
            flex: 1,
            p: 2,
            borderRadius: 2,
            bgcolor: 'background.paper',
            border: `1px solid ${ct.border.light}`,
          }}
        >
          <Typography
            variant='body2'
            color='text.secondary'
          >
            总数量
          </Typography>
          <Typography
            variant='h4'
            sx={{ fontWeight: 700 }}
          >
            {stats?.total_quantity || 0}
          </Typography>
        </Box>
      </Stack>

      {/* Main List */}
      <ListPageTemplate<Wip>
        title='在制品管理'
        subtitle='管理生产过程中的在制品信息'
        columns={columns}
        data={wipData?.wips || []}
        page={currentPage}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        rowActions={rowActions}
        filters={filters}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder='搜索在制品编号、产品名称...'
        primaryActionButton={{
          label: '新建在制品',
          onClick: () => handleOpenDialog(),
        }}
      />

      {/* Create/Edit Dialog */}
      <Dialog
        open={showDialog}
        onClose={handleCloseDialog}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>{selectedWip ? '编辑在制品' : '新建在制品'}</DialogTitle>
        <DialogContent>
          <Stack
            spacing={2}
            sx={{ mt: 1 }}
          >
            <TextField
              label='生产订单ID'
              value={formData.order_id}
              onChange={(e) => setFormData({ ...formData, order_id: e.target.value })}
              fullWidth
              required
              disabled={!!selectedWip}
            />
            <TextField
              label='数量'
              type='number'
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
              fullWidth
              required
            />
            <TextField
              label='批次号'
              value={formData.batch_no || ''}
              onChange={(e) => setFormData({ ...formData, batch_no: e.target.value })}
              fullWidth
            />
            <TextField
              label='操作员'
              value={formData.operator || ''}
              onChange={(e) => setFormData({ ...formData, operator: e.target.value })}
              fullWidth
            />
            <TextField
              label='备注'
              value={formData.remarks || ''}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              fullWidth
              multiline
              rows={3}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>取消</Button>
          <Button
            variant='contained'
            onClick={handleSubmit}
          >
            {selectedWip ? '更新' : '创建'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Transfer Dialog */}
      <Dialog
        open={showTransferDialog}
        onClose={() => setShowTransferDialog(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>在制品转移</DialogTitle>
        <DialogContent>
          <Typography>转移功能开发中...</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowTransferDialog(false)}>取消</Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default WIPPage;
