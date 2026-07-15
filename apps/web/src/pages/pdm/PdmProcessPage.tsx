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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageContainer } from '@/components/common/PageContainerV2';
import { ListPageTemplate } from '@/components/templates';

import type { RowAction, FilterConfig, ColumnDef } from '@/components/templates';
import { pdmApi } from '@/api/pdm';
import type { ProductionProcess } from '@/api/pdm';
import { useNotificationStore } from '@/store';
import { designTokens } from '@/theme/tokens';
import { QUERY_KEYS } from '@/lib/reactQuery';

const ct = designTokens.colors;

const adaptProcess = (item: { [key: string]: unknown }) => ({
  ...item,
  status: item.status === 'active' ? '启用' : item.status === 'inactive' ? '禁用' : item.status,
});

const PdmProcessPage: React.FC = () => {
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((state) => state.addNotification);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedProcess, setSelectedProcess] = useState<ProductionProcess | null>(null);
  const [formData, setFormData] = useState({
    process_no: '',
    name: '',
    description: '',
    version: '1.0',
  });

  const { data: processes = [], isLoading } = useQuery({
    queryKey: QUERY_KEYS.PDM.PROCESSES,
    queryFn: async () => {
      const response = await pdmApi.listProcesses();
      if (response.success && response.data) {
        const adapted = (response.data as any).map(adaptProcess);
        return adapted;
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const createProcessMutation = useMutation({
    mutationFn: (data: {
      process_no: string;
      name: string;
      description?: string;
      version: string;
    }) =>
      pdmApi.createProcess({
        process_no: data.process_no,
        name: data.name,
        description: data.description || undefined,
        version: data.version,
        status: 'active',
      }),
    onSuccess: () => {
      addNotification({ title: '成功', message: '生产工艺创建成功', type: 'success' });
      setShowCreateModal(false);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PDM.PROCESSES });
    },
    onError: (err: unknown) => {
      addNotification({ title: '错误', message: '创建失败', type: 'error' });
      apiLogger.error('创建生产工艺失败:', err);
    },
  });

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; color: string }> = {
      启用: { bg: 'success.lighter', color: 'success.dark' },
      禁用: { bg: 'error.lighter', color: 'error.dark' },
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

  const filteredProcesses = useMemo(() => {
    return processes.filter((process: ProductionProcess) => {
      const matchesSearch =
        process.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        process.process_no.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = !statusFilter || process.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [processes, searchTerm, statusFilter]);

  const columns = useMemo<ColumnDef<ProductionProcess>[]>(
    () => [
      { id: 'process_no', label: '工艺编号' },
      { id: 'name', label: '工艺名称' },
      { id: 'version', label: '版本' },
      {
        id: 'status',
        label: '状态',
        render: (row) => getStatusBadge(row.status),
      },
    ],
    []
  );

  const rowActions = useMemo<RowAction<ProductionProcess>[]>(
    () => [
      {
        label: '详情',
        icon: <Eye size={16} />,
        onClick: (row) => {
          setSelectedProcess(row);
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
          { value: '启用', label: '启用' },
          { value: '禁用', label: '禁用' },
        ],
        value: statusFilter,
        onChange: (value) => setStatusFilter(value as string),
      },
    ],
    [statusFilter]
  );

  const handleCreate = () => {
    setFormData({
      process_no: '',
      name: '',
      description: '',
      version: '1.0',
    });
    setShowCreateModal(true);
  };

  const handleSave = () => {
    createProcessMutation.mutate(formData);
  };

  const stats = {
    total: processes.length,
    active: processes.filter((p: ProductionProcess) => p.status === '启用').length,
    inactive: processes.filter((p: ProductionProcess) => p.status === '禁用').length,
  };

  const statsContent = (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(1, 1fr)', md: 'repeat(3, 1fr)' },
        gap: 2,
        mb: 3,
      }}
    >
      <Box sx={{ p: 2, bgcolor: 'cyan.light', borderRadius: 3 }}>
        <Typography
          variant='body2'
          sx={{ color: 'slate.600' }}
        >
          工艺总数
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
          sx={{ color: 'slate.600' }}
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
          sx={{ color: 'slate.600' }}
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

  return (
    <PageContainer
      headerProps={{
        pageIcon: <Clock style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.cyan.main} 0%, ${ct.cyan.dark} 100%)`,
      }}
    >
      <ListPageTemplate<ProductionProcess>
        title=''
        subtitle=''
        backButton={{ href: '/dashboard' }}
        columns={columns}
        data={filteredProcesses}
        loading={isLoading}
        searchable
        searchPlaceholder='搜索工艺名称或编号...'
        searchValue={searchTerm}
        onSearch={(value) => setSearchTerm(value)}
        filters={filters}
        rowActions={rowActions}
        actions={[
          {
            label: '新增工艺',
            icon: <Plus size={18} />,
            onClick: handleCreate,
            variant: 'contained',
          },
        ]}
        headerContent={statsContent}
        emptyMessage='暂无生产工艺数据'
      />

      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>新增生产工艺</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label='工艺编号 *'
              value={formData.process_no}
              onChange={(e) => setFormData({ ...formData, process_no: e.target.value })}
              placeholder='请输入工艺编号'
            />
            <TextField
              fullWidth
              label='工艺名称 *'
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder='请输入工艺名称'
            />
            <TextField
              fullWidth
              label='版本'
              value={formData.version}
              onChange={(e) => setFormData({ ...formData, version: e.target.value })}
              placeholder='请输入版本号'
            />
            <TextField
              fullWidth
              label='描述'
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder='请输入工艺描述'
              multiline
              rows={2}
            />
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
            disabled={createProcessMutation.isPending}
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
        <DialogTitle>生产工艺详情</DialogTitle>
        <DialogContent>
          {selectedProcess && (
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
                  工艺编号
                </Box>
                <Box sx={{ fontWeight: 500 }}>{selectedProcess.process_no}</Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  工艺名称
                </Box>
                <Box>{selectedProcess.name}</Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  版本
                </Box>
                <Box>{selectedProcess.version}</Box>
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
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Clock style={{ width: 16, height: 16 }} />
                  {selectedProcess.created_at || '-'}
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
                  {selectedProcess.updated_at || '-'}
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

export default PdmProcessPage;
