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
} from '@mui/material';
import { Button } from '@mui/material';
import React, { useState, useEffect, useMemo } from 'react';
import type {
  ProductionProcess,
  CreateProductionProcessRequest,
  UpdateProductionProcessRequest,
} from '@/api/professional/mes/mes';
import { mesApi } from '@/api/professional/mes/mes';
import { useAppStore } from '@/store';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  type FilterConfig,
} from '@/components/templates';
import { Plus, Edit, Eye, Clock, Settings } from 'lucide-react';
import { apiLogger } from '@/utils/logger';

const ProductionProcessPage: React.FC = () => {
  const [processes, setProcesses] = useState<ProductionProcess[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
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

  const { addNotification } = useAppStore();

  useEffect(() => {
    loadProcesses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, searchTerm, statusFilter]);

  const loadProcesses = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: currentPage - 1,
        page_size: pageSize,
      };
      if (searchTerm) params.search = searchTerm;
      if (statusFilter) params.status = statusFilter;

      const response = await mesApi.processes.list(params);
      if (response.success && response.data) {
        setProcesses(response.data.processes || []);
        setTotal(response.data.total || 0);
      }
    } catch (error: unknown) {
      apiLogger.error('加载工序列表失败:', error);
      addNotification({
        type: 'error',
        title: '加载失败',
        message: '无法加载工序列表',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedProcess) {
        await mesApi.processes.update(
          selectedProcess.id,
          formData as UpdateProductionProcessRequest
        );
        addNotification({
          type: 'success',
          title: '更新成功',
          message: '工序信息已更新',
        });
      } else {
        await mesApi.processes.create(formData);
        addNotification({
          type: 'success',
          title: '创建成功',
          message: '新工序已创建',
        });
      }
      setShowDialog(false);
      resetForm();
      loadProcesses();
    } catch (error: unknown) {
      apiLogger.error('操作失败:', error);
      addNotification({
        type: 'error',
        title: '操作失败',
        message: selectedProcess ? '更新工序失败' : '创建工序失败',
      });
    }
  };

  const handleEdit = (process: ProductionProcess) => {
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
  };

  const handleViewDetail = (process: ProductionProcess) => {
    setSelectedProcess(process);
    setShowDetailDialog(true);
  };

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
      active: { label: '启用', bg: 'success.lighter', color: 'success.dark' },
      inactive: { label: '禁用', bg: 'error.lighter', color: 'error.dark' },
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
        label: '工序名称',
        sortable: true,
        render: (row) => <Box sx={{ fontWeight: 500 }}>{row.name}</Box>,
      },
      { id: 'code', label: '工序编码', sortable: true, render: (row) => row.code || '-' },
      { id: 'sequence', label: '顺序', sortable: true },
      {
        id: 'standard_time',
        label: '标准工时(小时)',
        render: (row) => (row.standard_time ? `${row.standard_time}h` : '-'),
      },
      {
        id: 'work_station_id',
        label: '工作站',
        render: (row) => row.work_station_id || '-',
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
          { label: '全部', value: '' },
          { label: '启用', value: 'active' },
          { label: '禁用', value: 'inactive' },
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

  const rowActions: RowAction<ProductionProcess>[] = useMemo(
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
    ],
    []
  );

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  // 工序统计
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
      <Box sx={{ p: 2, bgcolor: '#ecfeff', borderRadius: 2 }}>
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
      <Box sx={{ p: 2, bgcolor: 'success.lighter', borderRadius: 2 }}>
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
      <Box sx={{ p: 2, bgcolor: 'error.lighter', borderRadius: 2 }}>
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
    <>
      <ListPageTemplate
        title='生产工序管理'
        subtitle='管理生产工序,包括工序名称、编码、顺序、标准工时等'
        columns={columns}
        data={processes}
        loading={loading}
        filters={filters}
        searchable
        searchPlaceholder='搜索工序名称或编码...'
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
            label: '新增工序',
            icon: <Plus size={16} />,
            onClick: () => {
              resetForm();
              setShowDialog(true);
            },
          },
        ]}
        rowActions={rowActions}
        headerContent={statsContent}
        emptyMessage='暂无工序数据'
        getRowId={(row) => row.id}
      />

      <Dialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>{selectedProcess ? '编辑工序' : '新增工序'}</DialogTitle>
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
                label='工序名称 *'
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                size='small'
                required
              />
              <TextField
                label='工序编码'
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                size='small'
              />
              <TextField
                label='顺序 *'
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
                label='标准工时(小时)'
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
                label='工作站ID'
                value={formData.work_station_id}
                onChange={(e) => setFormData({ ...formData, work_station_id: e.target.value })}
                size='small'
              />
            </Box>
            <TextField
              label='描述'
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
    </>
  );
};

export default ProductionProcessPage;
