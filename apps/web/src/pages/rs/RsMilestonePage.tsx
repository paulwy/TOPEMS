import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Chip,
  LinearProgress,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
} from '@mui/material';
import { Button } from '@mui/material';
import { Plus, Flag, Calendar, Link2, Eye, Edit } from 'lucide-react';
import { ListPageTemplate, type ColumnDef, type FilterConfig } from '@/components/templates';
import { PageContainer } from '@/components/common';
import { rsApi } from '@/api/rs';
import { useAppStore } from '@/store';
import type { Build, CreateBuildRequest } from '@/api/rs';

interface Milestone {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  progress: number;
  related_project: string;
  status: string;
}

const RsMilestonePage: React.FC = () => {
  const { addNotification } = useAppStore();
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: '',
  });
  const [newMilestoneDialogOpen, setNewMilestoneDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);
  const [newMilestoneForm, setNewMilestoneForm] = useState({
    name: '',
    start_date: '',
    end_date: '',
    related_project: '',
  });

  useEffect(() => {
    loadMilestones();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, statusFilter, page, rowsPerPage]);

  const loadMilestones = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: page + 1,
        page_size: rowsPerPage,
      };
      if (searchTerm) params.search = searchTerm;
      if (statusFilter) params.status = statusFilter;

      const response = await rsApi.listBuilds(params);
      if (response.success && response.data) {
        const builds = response.data.builds || [];
        const transformed = builds.map((b: Build) => ({
          id: b.id,
          name: `${b.build_no} - ${b.project_name}`,
          start_date: b.created_at?.split('T')[0] || '',
          end_date: b.created_at?.split('T')[0] || '',
          progress: b.status === 'success' ? 100 : b.status === 'failed' ? 0 : b.status === 'running' ? 50 : 0,
          related_project: b.project_name,
          status: b.status === 'success' ? 'completed' : b.status === 'running' ? 'active' : 'planning',
        }));
        setMilestones(transformed);
        setTotal(response.data.total || 0);
      }
    } catch (error: unknown) {
      console.error('加载里程碑数据失败:', error);
      addNotification({
        type: 'error',
        title: '加载失败',
        message: '无法加载里程碑数据',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string): 'success' | 'primary' | 'warning' | 'default' => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'active':
        return 'primary';
      case 'planning':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'completed':
        return '已完成';
      case 'active':
        return '进行中';
      case 'planning':
        return '规划中';
      default:
        return status;
    }
  };

  const filteredMilestones = useMemo(() => {
    return milestones.filter((ms) => {
      const matchesSearch =
        ms.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ms.related_project.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = !statusFilter || ms.status === statusFilter;
      const matchesDateRange =
        (!dateRange.start || ms.end_date >= dateRange.start) &&
        (!dateRange.end || ms.start_date <= dateRange.end);
      return matchesSearch && matchesStatus && matchesDateRange;
    });
  }, [milestones, searchTerm, statusFilter, dateRange]);

  const paginatedMilestones = filteredMilestones.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const handleCreateMilestone = async () => {
    try {
      const createData: CreateBuildRequest = {
        project_id: 'default',
        branch: 'main',
        commit_hash: 'HEAD',
        build_type: 'manual',
      };
      await rsApi.createBuild(createData);
      addNotification({
        type: 'success',
        title: '创建成功',
        message: '新里程碑已创建',
      });
      setNewMilestoneDialogOpen(false);
      setNewMilestoneForm({
        name: '',
        start_date: '',
        end_date: '',
        related_project: '',
      });
      loadMilestones();
    } catch (error: unknown) {
      console.error('创建里程碑失败:', error);
      addNotification({
        type: 'error',
        title: '创建失败',
        message: '无法创建里程碑',
      });
    }
  };

  const handleViewDetail = (ms: Milestone) => {
    setSelectedMilestone(ms);
    setDetailDialogOpen(true);
  };

  const columns: ColumnDef<Milestone>[] = [
    {
      id: 'name',
      label: '里程碑名称',
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Flag
            size={16}
            color='primary.main'
          />
          {row.name}
        </Box>
      ),
    },
    {
      id: 'start_date',
      label: '开始日期',
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Calendar size={14} />
          {row.start_date}
        </Box>
      ),
    },
    {
      id: 'end_date',
      label: '结束日期',
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Calendar size={14} />
          {row.end_date}
        </Box>
      ),
    },
    {
      id: 'progress',
      label: '进度',
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 150 }}>
          <LinearProgress
            variant='determinate'
            value={row.progress}
            sx={{ flex: 1, height: 8, borderRadius: 4 }}
          />
          <Typography variant='caption'>{row.progress}%</Typography>
        </Box>
      ),
    },
    {
      id: 'related_project',
      label: '关联项目',
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Link2 size={14} />
          {row.related_project}
        </Box>
      ),
    },
    {
      id: 'status',
      label: '状态',
      render: (row) => (
        <Chip
          label={getStatusLabel(row.status)}
          size='small'
          color={getStatusColor(row.status)}
        />
      ),
    },
  ];

  const filters: FilterConfig[] = [
    {
      id: 'status',
      label: '状态',
      type: 'select',
      options: [
        { label: '全部', value: '' },
        { label: '进行中', value: 'active' },
        { label: '已完成', value: 'completed' },
        { label: '规划中', value: 'planning' },
      ],
      value: statusFilter || '',
      onChange: (value) => setStatusFilter(value || null),
    },
    {
      id: 'start_date',
      label: '开始日期',
      type: 'date',
      value: dateRange.start,
      onChange: (value) => setDateRange((prev) => ({ ...prev, start: value })),
    },
    {
      id: 'end_date',
      label: '结束日期',
      type: 'date',
      value: dateRange.end,
      onChange: (value) => setDateRange((prev) => ({ ...prev, end: value })),
    },
  ];

  const rowActions = [
    {
      label: '查看进度',
      icon: <Eye size={16} />,
      onClick: handleViewDetail,
    },
    {
      label: '编辑',
      icon: <Edit size={16} />,
      onClick: () => {},
    },
    {
      label: '关联项目',
      icon: <Link2 size={16} />,
      onClick: () => {},
    },
  ];

  return (
    <PageContainer title='里程碑'>
      <ListPageTemplate
        title=''
        columns={columns}
        data={paginatedMilestones}
        loading={loading}
        searchable
        searchPlaceholder='搜索里程碑名称、项目...'
        searchValue={searchTerm}
        onSearch={setSearchTerm}
        filters={filters}
        filtersValue={{
          status: statusFilter || '',
          start_date: dateRange.start,
          end_date: dateRange.end,
        }}
        onFilterChange={(filters) => {
          if (filters.status !== undefined) {
            setStatusFilter(filters.status || null);
          }
          if (filters.start_date !== undefined) {
            setDateRange((prev) => ({
              ...prev,
              start: filters.start_date as string,
            }));
          }
          if (filters.end_date !== undefined) {
            setDateRange((prev) => ({
              ...prev,
              end: filters.end_date as string,
            }));
          }
        }}
        pagination={{
          page,
          pageSize: rowsPerPage,
          total,
          onPageChange: setPage,
          onPageSizeChange: setRowsPerPage,
        }}
        actions={[
          {
            label: '新建里程碑',
            variant: 'contained',
            icon: <Plus size={18} />,
            onClick: () => setNewMilestoneDialogOpen(true),
          },
        ]}
        rowActions={rowActions}
        showRowNumber
        emptyMessage='暂无里程碑数据'
      />

      <Dialog
        open={newMilestoneDialogOpen}
        onClose={() => setNewMilestoneDialogOpen(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>新建里程碑</DialogTitle>
        <DialogContent>
          <Stack
            spacing={2}
            sx={{ mt: 2 }}
          >
            <TextField
              label='里程碑名称'
              fullWidth
              value={newMilestoneForm.name}
              onChange={(e) =>
                setNewMilestoneForm({
                  ...newMilestoneForm,
                  name: e.target.value,
                })
              }
            />
            <TextField
              label='开始日期'
              type='date'
              fullWidth
              value={newMilestoneForm.start_date}
              onChange={(e) =>
                setNewMilestoneForm({
                  ...newMilestoneForm,
                  start_date: e.target.value,
                })
              }
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label='结束日期'
              type='date'
              fullWidth
              value={newMilestoneForm.end_date}
              onChange={(e) =>
                setNewMilestoneForm({
                  ...newMilestoneForm,
                  end_date: e.target.value,
                })
              }
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label='关联项目'
              fullWidth
              value={newMilestoneForm.related_project}
              onChange={(e) =>
                setNewMilestoneForm({
                  ...newMilestoneForm,
                  related_project: e.target.value,
                })
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewMilestoneDialogOpen(false)}>取消</Button>
          <Button
            variant='contained'
            sx={{ bgcolor: 'primary.main' }}
            onClick={handleCreateMilestone}
          >
            创建
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>里程碑详情</DialogTitle>
        <DialogContent>
          {selectedMilestone && (
            <Box sx={{ py: 2 }}>
              <Typography
                variant='h6'
                sx={{ fontWeight: 'bold' }}
              >
                {selectedMilestone.name}
              </Typography>
              <Stack
                direction='row'
                spacing={2}
                sx={{ mt: 2 }}
              >
                <Chip
                  label={getStatusLabel(selectedMilestone.status)}
                  size='small'
                  color={getStatusColor(selectedMilestone.status)}
                />
              </Stack>
              <Box sx={{ mt: 3 }}>
                <Typography
                  variant='subtitle2'
                  color='text.secondary'
                >
                  进度
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
                  <LinearProgress
                    variant='determinate'
                    value={selectedMilestone.progress}
                    sx={{ flex: 1, height: 10, borderRadius: 4 }}
                  />
                  <Typography
                    variant='body1'
                    sx={{ fontWeight: 'bold' }}
                  >
                    {selectedMilestone.progress}%
                  </Typography>
                </Box>
              </Box>
              <Stack
                direction='row'
                spacing={4}
                sx={{ mt: 3 }}
              >
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    开始日期
                  </Typography>
                  <Typography
                    variant='body1'
                    sx={{ fontWeight: 'bold' }}
                  >
                    {selectedMilestone.start_date}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    结束日期
                  </Typography>
                  <Typography
                    variant='body1'
                    sx={{ fontWeight: 'bold' }}
                  >
                    {selectedMilestone.end_date}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    关联项目
                  </Typography>
                  <Typography
                    variant='body1'
                    sx={{ fontWeight: 'bold' }}
                  >
                    {selectedMilestone.related_project}
                  </Typography>
                </Box>
              </Stack>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default RsMilestonePage;
