import React, { useState, useEffect } from 'react';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Stack,
  Button,
} from '@mui/material';
import { apiLogger } from '@/utils/logger';
import { Plus, Eye, ClipboardList, Clock, ListOrdered } from 'lucide-react';
import { ListPageTemplate, type ColumnDef } from '@/components/templates';
import { PageContainer } from '@/components/common';
import { pdmApi } from '@/api/pdm';
import type { ProductionStep } from '@/api/pdm';
import { useAppStore } from '@/store';

const PdmStepPage: React.FC = () => {
  const [steps, setSteps] = useState<ProductionStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedStep, setSelectedStep] = useState<ProductionStep | null>(null);
  const [formData, setFormData] = useState({
    step_no: '',
    name: '',
    description: '',
    process_id: '',
    sort_order: 1,
    duration_hours: '',
    equipment_required: '',
  });
  const addNotification = useAppStore((state) => state.addNotification);

  // 分页状态
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    loadSteps();
  }, []);

  const loadSteps = async () => {
    try {
      setLoading(true);
      const response = await pdmApi.listSteps();
      if (response.success && response.data) {
        const adapted = (response.data as any).map((item: { [key: string]: unknown }) => ({
          ...item,
          sort_order: item.sort_order || item.order || 0,
          duration: item.duration_hours || item.duration || 0,
          status:
            item.status === 'active'
              ? '启用'
              : item.status === 'inactive'
                ? '禁用'
                : item.status || '正常',
        }));
        setSteps(adapted);
      } else {
        setSteps([]);
      }
    } catch (err: unknown) {
      apiLogger.error('加载工序步骤数据失败:', err);
      setSteps([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; color: string }> = {
      启用: { bg: 'success.lighter', color: 'success.dark' },
      禁用: { bg: 'error.lighter', color: 'error.dark' },
      正常: { bg: '#dbeafe', color: 'primary.main' },
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

  const columns: ColumnDef<ProductionStep>[] = [
    {
      id: 'sort_order',
      label: '序号',
      width: 80,
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <ListOrdered sx={{ width: 14, height: 14 }} />
          {row.sort_order}
        </Box>
      ),
    },
    {
      id: 'step_no',
      label: '步骤编号',
    },
    {
      id: 'name',
      label: '步骤名称',
    },
    {
      id: 'duration',
      label: '耗时(小时)',
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Clock sx={{ width: 14, height: 14 }} />
          {row.duration || '-'}
        </Box>
      ),
    },
    {
      id: 'status',
      label: '状态',
      render: (row) => getStatusBadge(row.status || ''),
    },
    {
      id: 'actions',
      label: '操作',
      align: 'right',
      render: (row) => (
        <Button
          size='small'
          onClick={() => handleView(row)}
          startIcon={<Eye style={{ width: 16, height: 16 }} />}
        >
          详情
        </Button>
      ),
    },
  ];

  // 搜索过滤
  const filteredSteps = steps.filter((step) => {
    return (
      step.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      step.step_no.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // 分页数据
  const paginatedSteps = filteredSteps.slice(page * pageSize, page * pageSize + pageSize);

  const handleView = (step: ProductionStep) => {
    setSelectedStep(step);
    setShowDetailModal(true);
  };

  const handleCreate = () => {
    setFormData({
      step_no: '',
      name: '',
      description: '',
      process_id: '',
      sort_order: 1,
      duration_hours: '',
      equipment_required: '',
    });
    setShowCreateModal(true);
  };

  const handleSave = async () => {
    try {
      await pdmApi.createStep({
        step_no: formData.step_no,
        name: formData.name,
        description: formData.description || undefined,
        process_id: formData.process_id || '',
        sort_order: formData.sort_order,
        duration_hours: formData.duration_hours ? parseFloat(formData.duration_hours) : undefined,
        equipment_required: formData.equipment_required || undefined,
      });
      addNotification({ title: '成功', message: '工序步骤创建成功', type: 'success' });
      setShowCreateModal(false);
      loadSteps();
    } catch (err: unknown) {
      addNotification({ title: '错误', message: '创建失败', type: 'error' });
      apiLogger.error('创建工序步骤失败:', err);
    }
  };

  const stats = {
    total: steps.length,
    active: steps.filter((s) => s.status === '启用' || s.status === '正常').length,
    inactive: steps.filter((s) => s.status === '禁用').length,
  };

  const headerActions = [
    {
      label: '新增步骤',
      icon: <Plus style={{ width: 18, height: 18 }} />,
      onClick: handleCreate,
      variant: 'contained' as const,
      color: 'success' as const,
    },
  ];

  return (
    <PageContainer
      title='工序步骤'
      subtitle='Production Steps'
      headerProps={{
        actions: headerActions,
        pageIcon: <ClipboardList sx={{ width: 20, height: 20 }} />,
        pageGradient: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
      }}
      maxWidth='xl'
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(1, 1fr)', md: 'repeat(3, 1fr)' },
          gap: 2,
          mb: 4,
        }}
      >
        <Card sx={{ bgcolor: 'success.light' }}>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor: 'success.lighter',
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ClipboardList sx={{ width: 20, height: 20, color: 'success.dark' }} />
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'slate.600', fontSize: '0.875rem' }}
                >
                  步骤总数
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700, color: 'slate.900' }}
                >
                  {stats.total}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
        <Card>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor: 'success.lighter',
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ClipboardList sx={{ width: 20, height: 20, color: 'success.dark' }} />
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'slate.600', fontSize: '0.875rem' }}
                >
                  正常使用
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700, color: 'slate.900' }}
                >
                  {stats.active}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
        <Card>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor: 'error.lighter',
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ClipboardList sx={{ width: 20, height: 20, color: 'error.dark' }} />
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'slate.600', fontSize: '0.875rem' }}
                >
                  已禁用
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700, color: 'slate.900' }}
                >
                  {stats.inactive}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>

      <Card>
        <CardHeader
          sx={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            pb: 0,
          }}
        >
          <Typography
            variant='h6'
            sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <ClipboardList style={{ width: 20, height: 20, color: 'success.dark' }} />
            工序步骤列表
          </Typography>
        </CardHeader>
        <CardContent>
          <ListPageTemplate
            columns={columns}
            data={paginatedSteps}
            loading={loading}
            searchable
            searchPlaceholder='搜索步骤名称或编号...'
            searchValue={searchTerm}
            onSearch={setSearchTerm}
            pagination={{
              page,
              pageSize,
              total: filteredSteps.length,
              onPageChange: setPage,
              onPageSizeChange: setPageSize,
            }}
            showRowNumber
            onRowClick={handleView}
          />
        </CardContent>
      </Card>

      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>新增工序步骤</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label='步骤编号 *'
              value={formData.step_no}
              onChange={(e) => setFormData({ ...formData, step_no: e.target.value })}
              placeholder='请输入步骤编号'
            />
            <TextField
              fullWidth
              label='步骤名称 *'
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder='请输入步骤名称'
            />
            <TextField
              fullWidth
              label='所属工艺'
              value={formData.process_id}
              onChange={(e) => setFormData({ ...formData, process_id: e.target.value })}
              placeholder='请输入工艺ID'
            />
            <TextField
              fullWidth
              label='排序序号'
              type='number'
              value={formData.sort_order}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  sort_order: parseInt(e.target.value) || 1,
                })
              }
            />
            <TextField
              fullWidth
              label='耗时(小时)'
              type='number'
              value={formData.duration_hours}
              onChange={(e) => setFormData({ ...formData, duration_hours: e.target.value })}
              placeholder='请输入耗时'
            />
            <TextField
              fullWidth
              label='所需设备'
              value={formData.equipment_required}
              onChange={(e) => setFormData({ ...formData, equipment_required: e.target.value })}
              placeholder='请输入所需设备'
            />
            <TextField
              fullWidth
              label='描述'
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder='请输入步骤描述'
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
            sx={{ bgcolor: 'success.dark' }}
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
        <DialogTitle>工序步骤详情</DialogTitle>
        <DialogContent>
          {selectedStep && (
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
                  步骤编号
                </Box>
                <Box sx={{ fontWeight: 500 }}>{selectedStep.step_no}</Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  步骤名称
                </Box>
                <Box>{selectedStep.name}</Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  排序序号
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <ListOrdered style={{ width: 16, height: 16 }} />
                  {selectedStep.sort_order}
                </Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  耗时(小时)
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Clock style={{ width: 16, height: 16 }} />
                  {selectedStep.duration_hours || selectedStep.duration || '-'}
                </Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  所需设备
                </Box>
                <Box>{selectedStep.equipment_required || '-'}</Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  状态
                </Box>
                <Box sx={{ mt: 0.5 }}>{getStatusBadge(selectedStep.status || '正常')}</Box>
              </Box>
              <Box sx={{ gridColumn: '1 / -1' }}>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  描述
                </Box>
                <Box>{selectedStep.description || '-'}</Box>
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

export default PdmStepPage;
