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
  IconButton,
  Tooltip,
  Button,
} from '@mui/material';
import { PageContainer } from '@/components/common';
import React, { useState, useEffect, useMemo } from 'react';
import type { WorkStation, CreateWorkStationRequest, UpdateWorkStationRequest } from '@/api/mes';
import { mesApi } from '@/api/mes';
import { useAppStore } from '@/store';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  type FilterConfig,
} from '@/components/templates';
import { Plus, Edit, Eye, MapPin, Clock, Settings } from 'lucide-react';
import { apiLogger } from '@/utils/logger';

const WorkStationPage: React.FC = () => {
  const [workstations, setWorkstations] = useState<WorkStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
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

  const { addNotification } = useAppStore();

  useEffect(() => {
    loadWorkStations();
  }, [currentPage, searchTerm, statusFilter]);

  const loadWorkStations = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: currentPage - 1,
        pagesize: pageSize,
      };
      if (searchTerm) params.search = searchTerm;
      if (statusFilter) params.status = statusFilter;

      const response = await mesApi.workstations.list(params);
      if (response.success && response.data) {
        setWorkstations(response.data.workstations || []);
        setTotal(response.data.total || 0);
      }
    } catch (error: unknown) {
      apiLogger.error('加载工作站列表失败:', error);
      addNotification({
        type: 'error',
        title: '加载失败',
        message: '无法加载工作站列表',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedWorkStation) {
        await mesApi.workstations.update(
          selectedWorkStation.id,
          formData as UpdateWorkStationRequest
        );
        addNotification({
          type: 'success',
          title: '更新成功',
          message: '工作站信息已更新',
        });
      } else {
        await mesApi.workstations.create(formData);
        addNotification({
          type: 'success',
          title: '创建成功',
          message: '新工作站已创建',
        });
      }
      setShowDialog(false);
      resetForm();
      loadWorkStations();
    } catch (error: unknown) {
      apiLogger.error('操作失败:', error);
      addNotification({
        type: 'error',
        title: '操作失败',
        message: selectedWorkStation ? '更新工作站失败' : '创建工作站失败',
      });
    }
  };

  const handleEdit = (station: WorkStation) => {
    setSelectedWorkStation(station);
    setFormData({
      name: station.name,
      code: station.code || '',
      location: station.location || '',
      capacity: station.capacity || 0,
      supervisor: station.supervisor || '',
    });
    setShowDialog(true);
  };

  const handleViewDetail = (station: WorkStation) => {
    setSelectedWorkStation(station);
    setShowDetailDialog(true);
  };

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
      active: { label: '运行中', bg: 'success.lighter', color: 'success.dark' },
      idle: { label: '空闲', bg: 'warning.light', color: '#b45309' },
      maintenance: { label: '维护中', bg: '#dbeafe', color: 'primary.dark' },
      offline: { label: '离线', bg: 'error.lighter', color: 'error.dark' },
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
      { id: 'name', label: '工作站名称', sortable: true },
      { id: 'code', label: '编码', sortable: true },
      { id: 'location', label: '位置', render: (row) => row.location || '-' },
      { id: 'capacity', label: '容量', render: (row) => row.capacity || '-' },
      { id: 'supervisor', label: '负责人', render: (row) => row.supervisor || '-' },
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
          { label: '运行中', value: 'active' },
          { label: '空闲', value: 'idle' },
          { label: '维护中', value: 'maintenance' },
          { label: '离线', value: 'offline' },
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

  const rowActions: RowAction<WorkStation>[] = useMemo(
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

  const handleOpenCreate = () => {
    resetForm();
    setShowDialog(true);
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  // 工作站统计
  const stats = useMemo(() => {
    return {
      total: workstations.length,
      active: workstations.filter((w) => w.status === 'active').length,
      idle: workstations.filter((w) => w.status === 'idle').length,
      maintenance: workstations.filter((w) => w.status === 'maintenance').length,
    };
  }, [workstations]);

  const statsContent = (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
        gap: 2,
        mb: 3,
      }}
    >
      <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 2 }}>
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
      <Box sx={{ p: 2, bgcolor: 'success.lighter', borderRadius: 2 }}>
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
      <Box sx={{ p: 2, bgcolor: 'warning.light', borderRadius: 2 }}>
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
      <Box sx={{ p: 2, bgcolor: '#dbeafe', borderRadius: 2 }}>
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

  if (loading) return <LoadingSpinner />;

  return (
    <PageContainer
      title='工作站管理'
      subtitle='管理生产工作站,包括工作站名称、编码、位置、容量等'
    >
      <ListPageTemplate
        title=''
        subtitle=''
        columns={columns}
        data={workstations}
        loading={loading}
        filters={filters}
        searchable
        searchPlaceholder='搜索工作站名称或编码...'
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
            label: '新增工作站',
            icon: <Plus size={16} />,
            onClick: handleOpenCreate,
          },
        ]}
        rowActions={rowActions}
        headerContent={statsContent}
        emptyMessage='暂无工作站数据'
        getRowId={(row) => row.id}
      />

      <Dialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>{selectedWorkStation ? '编辑工作站' : '新增工作站'}</DialogTitle>
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
                label='工作站名称 *'
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                size='small'
                required
              />
              <TextField
                label='编码 *'
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                size='small'
                required
              />
              <TextField
                label='位置'
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                size='small'
              />
              <TextField
                label='容量'
                type='number'
                value={formData.capacity}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    capacity: parseInt(e.target.value),
                  })
                }
                size='small'
              />
              <TextField
                label='负责人'
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
