import React, { useState, useEffect, useCallback } from 'react';
import { PageContainer } from '@/components/common';
import { useNavigate } from 'react-router-dom';
import { Award, Plus, Eye, Edit, Search } from 'lucide-react';
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
  Typography,
  MenuItem,
  Button,
  FormControl,
  InputLabel,
  Select,
  Grid,
} from '@mui/material';
import {
  ListPageTemplate,
  type ColumnDef,
  type FilterConfig,
  type RowAction,
} from '@/components/templates';
import { limsApi } from '@/api/lims';
import type { PtPlan, CreatePtPlanRequest, UpdatePtPlanRequest } from '@/api/lims';
import { useAppStore } from '@/store';
import { apiLogger } from '@/utils/logger';
import { designTokens } from '@/theme/tokens';

const ct = designTokens.colors;

interface LimsListResponse<T> {
  items?: T[];
  plans?: T[];
}

interface PtPlanWithCount extends PtPlan {
  samples_count?: number;
}

const LimsProficiencyTestingPage: React.FC = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<PtPlanWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [cycleFilter, setCycleFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PtPlan | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const addNotification = useAppStore((state) => state.addNotification);

  const initialFormData: CreatePtPlanRequest = {
    plan_name: '',
    plan_year: new Date().getFullYear().toString(),
  };

  const [formData, setFormData] = useState<CreatePtPlanRequest>(initialFormData);

  const loadPlans = useCallback(async () => {
    try {
      setLoading(true);
      const response = await limsApi.listPtPlans();
      if (response.success && response.data) {
        const data = response.data as LimsListResponse<PtPlanWithCount> | PtPlanWithCount[];
        let rawPlans: PtPlanWithCount[] = [];
        if (Array.isArray(data)) {
          rawPlans = data;
        } else if (data.items && Array.isArray(data.items)) {
          rawPlans = data.items;
        } else if (data.plans && Array.isArray(data.plans)) {
          rawPlans = data.plans;
        }
        setPlans(rawPlans);
      } else {
        setPlans([]);
      }
    } catch (err: unknown) {
      apiLogger.error('加载能力验证计划列表失败:', err);
      setPlans([]);
      addNotification({
        title: '错误',
        message: '加载能力验证计划列表失败，请稍后重试',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; color: string }> = {
      待执行: { bg: 'grey.100', color: 'text.secondary' },
      执行中: { bg: 'primary.100', color: 'primary.dark' },
      已完成: { bg: 'success.lighter', color: 'success.700' },
      已评价: { bg: 'secondary.100', color: ct.purple[700] },
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

  const columns: ColumnDef<PtPlanWithCount>[] = [
    { id: 'plan_no', label: '计划编号', sortable: true },
    { id: 'plan_name', label: '计划名称', sortable: true },
    {
      id: 'plan_year',
      label: '验证周期',
      render: (row) => {
        const cycleMap: Record<string, string> = {
          月度: '月度',
          季度: '季度',
          年度: '年度',
        };
        return row.plan_year ? cycleMap[row.plan_year] || row.plan_year : '-';
      },
    },
    { id: 'status', label: '状态', render: (row) => getStatusBadge(row.status) },
    {
      id: 'samples_count',
      label: '样品数',
      render: (row) => row.samples_count || '-',
    },
    {
      id: 'registration_date',
      label: '开始日期',
      render: (row) =>
        row.registration_date ? new Date(row.registration_date).toLocaleDateString('zh-CN') : '-',
    },
    {
      id: 'report_deadline',
      label: '结束日期',
      render: (row) =>
        row.report_deadline ? new Date(row.report_deadline).toLocaleDateString('zh-CN') : '-',
    },
  ];

  const rowActions: RowAction<PtPlanWithCount>[] = [
    {
      label: '查看',
      icon: <Eye style={{ width: 16, height: 16 }} />,
      onClick: (row) => handleView(row),
    },
    {
      label: '编辑',
      icon: <Edit style={{ width: 16, height: 16 }} />,
      onClick: (row) => handleEdit(row),
    },
  ];

  const filters: FilterConfig[] = [
    {
      id: 'status',
      label: '状态',
      type: 'select',
      options: [
        { label: '全部状态', value: 'all' },
        { label: '待执行', value: '待执行' },
        { label: '执行中', value: '执行中' },
        { label: '已完成', value: '已完成' },
        { label: '已评价', value: '已评价' },
      ],
      value: statusFilter,
      onChange: (value: unknown) => setStatusFilter(value as string),
    },
    {
      id: 'cycle',
      label: '验证周期',
      type: 'select',
      options: [
        { label: '全部周期', value: 'all' },
        { label: '月度', value: '月度' },
        { label: '季度', value: '季度' },
        { label: '年度', value: '年度' },
      ],
      value: cycleFilter,
      onChange: (value: unknown) => setCycleFilter(value as string),
    },
  ];

  const filteredPlans = plans.filter((plan) => {
    const matchesSearch =
      plan.plan_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plan.plan_no.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || plan.status === statusFilter;
    const matchesCycle = cycleFilter === 'all' || plan.plan_year === cycleFilter;
    return matchesSearch && matchesStatus && matchesCycle;
  });

  const paginatedData = filteredPlans.slice(page * pageSize, page * pageSize + pageSize);

  const handleView = (plan: PtPlan) => {
    setSelectedPlan(plan);
    setShowDetailModal(true);
  };

  const handleEdit = (plan: PtPlan) => {
    setSelectedPlan(plan);
    setIsEditing(true);
    setFormData({
      plan_name: plan.plan_name,
      provider: plan.provider,
      testitem: plan.testitem,
      test_method: plan.test_method,
      plan_year: plan.plan_year,
      sample_type: plan.sample_type,
      registration_date: plan.registration_date,
      test_deadline: plan.test_deadline,
      report_deadline: plan.report_deadline,
      contact_person: plan.contact_person,
      contact_phone: plan.contact_phone,
      notes: plan.notes,
    });
    setShowCreateModal(true);
  };

  const handleCreate = () => {
    setSelectedPlan(null);
    setIsEditing(false);
    setFormData(initialFormData);
    setShowCreateModal(true);
  };

  const handleSave = async () => {
    if (!formData.plan_name?.trim()) {
      addNotification({
        title: '错误',
        message: '请输入计划名称',
        type: 'error',
      });
      return;
    }

    try {
      setSaving(true);
      if (isEditing && selectedPlan) {
        const updateData: UpdatePtPlanRequest = {
          plan_name: formData.plan_name,
          provider: formData.provider,
          testitem: formData.testitem,
          test_method: formData.test_method,
          plan_year: formData.plan_year,
          sample_type: formData.sample_type,
          registration_date: formData.registration_date,
          test_deadline: formData.test_deadline,
          report_deadline: formData.report_deadline,
          contact_person: formData.contact_person,
          contact_phone: formData.contact_phone,
          notes: formData.notes,
        };
        const response = await limsApi.updatePtPlan(selectedPlan.id, updateData);
        if (response.success) {
          addNotification({
            title: '成功',
            message: '能力验证计划更新成功',
            type: 'success',
          });
          setShowCreateModal(false);
          loadPlans();
        } else {
          addNotification({
            title: '错误',
            message: response.message || '更新失败，请稍后重试',
            type: 'error',
          });
        }
      } else {
        const response = await limsApi.createPtPlan(formData);
        if (response.success) {
          addNotification({
            title: '成功',
            message: '能力验证计划创建成功',
            type: 'success',
          });
          setShowCreateModal(false);
          loadPlans();
        } else {
          addNotification({
            title: '错误',
            message: response.message || '创建失败，请稍后重试',
            type: 'error',
          });
        }
      }
    } catch (err: unknown) {
      apiLogger.error('保存能力验证计划失败:', err);
      addNotification({
        title: '错误',
        message: isEditing
          ? '更新能力验证计划失败，请稍后重试'
          : '创建能力验证计划失败，请稍后重试',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const stats = {
    total: plans.length,
    pending: plans.filter((p) => p.status === '待执行').length,
    inProgress: plans.filter((p) => p.status === '执行中').length,
    completed: plans.filter((p) => p.status === '已完成' || p.status === '已评价').length,
  };

  const statsCards = (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
        gap: 2,
        mb: 3,
      }}
    >
      <Card sx={{ bgcolor: ct.purple[50] }}>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                bgcolor: 'secondary.100',
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Award sx={{ width: 20, height: 20, color: 'secondary.dark' }} />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ color: 'slate.600', fontSize: '0.875rem' }}
              >
                计划总数
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
                background: `linear-gradient(135deg, ${ct.primary.main}, ${ct.primary[600]})`,
                boxShadow: '0 4px 12px rgba(59,130,246,0.3)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Award sx={{ width: 20, height: 20, color: ct.background.paper }} />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ color: 'slate.600', fontSize: '0.875rem' }}
              >
                待执行
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'slate.900' }}
              >
                {stats.pending}
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
                bgcolor: 'primary.100',
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Award sx={{ width: 20, height: 20, color: 'primary.dark' }} />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ color: 'slate.600', fontSize: '0.875rem' }}
              >
                执行中
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'slate.900' }}
              >
                {stats.inProgress}
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
                background: `linear-gradient(135deg, ${ct.success.main}, ${ct.success[600]})`,
                boxShadow: '0 4px 12px rgba(34,197,94,0.3)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Award sx={{ width: 20, height: 20, color: ct.background.paper }} />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ color: 'slate.600', fontSize: '0.875rem' }}
              >
                已完成
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'slate.900' }}
              >
                {stats.completed}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `linear-gradient(135deg, ${ct.purple[50]} 0%, ${ct.background.default} 100%)`,
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              border: 4,
              borderColor: ct.purple[400],
              borderTopColor: 'secondary.dark',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              mx: 'auto',
              mb: 2,
            }}
          />
          <Typography sx={{ color: 'slate.600' }}>加载中...</Typography>
        </Box>
      </Box>
    );
  }

  return (
    <PageContainer
      title='能力验证'
      subtitle='Proficiency Testing'
      headerProps={{
        pageIcon: <Award style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.purple[500]} 0%, ${ct.secondary.dark} 100%)`,
      }}
    >
      <ListPageTemplate
        title=''
        subtitle=''
        breadcrumbs={[
          { label: '首页', href: '/dashboard' },
          { label: 'LIMS' },
          { label: '能力验证' },
        ]}
        backButton={{ onClick: () => navigate('/dashboard') }}
        columns={columns}
        data={paginatedData}
        loading={loading}
        getRowId={(row) => row.id}
        filters={filters}
        searchable
        searchPlaceholder='搜索计划编号或名称...'
        searchValue={searchTerm}
        onSearch={setSearchTerm}
        pagination={{
          page,
          pageSize,
          total: filteredPlans.length,
          onPageChange: setPage,
          onPageSizeChange: setPageSize,
        }}
        actions={[
          {
            label: '新建计划',
            icon: <Plus style={{ width: 18, height: 18 }} />,
            onClick: handleCreate,
            variant: 'contained',
          },
        ]}
        rowActions={rowActions}
        headerContent={statsCards}
      />

      {/* 创建/编辑 Dialog */}
      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>{isEditing ? '编辑能力验证计划' : '新建能力验证计划'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label='计划名称 *'
              value={formData.plan_name || ''}
              onChange={(e) => setFormData({ ...formData, plan_name: e.target.value })}
              placeholder='请输入计划名称'
            />
            <FormControl fullWidth>
              <InputLabel>验证周期</InputLabel>
              <Select
                value={formData.plan_year || ''}
                label='验证周期'
                onChange={(e) => setFormData({ ...formData, plan_year: e.target.value })}
              >
                <MenuItem value=''>请选择周期</MenuItem>
                <MenuItem value='月度'>月度</MenuItem>
                <MenuItem value='季度'>季度</MenuItem>
                <MenuItem value='年度'>年度</MenuItem>
              </Select>
            </FormControl>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                fullWidth
                label='开始日期'
                type='date'
                value={formData.registration_date || ''}
                onChange={(e) => setFormData({ ...formData, registration_date: e.target.value })}
                slotProps={{ inputLabel: { shrink: true } } as any}
              />
              <TextField
                fullWidth
                label='结束日期'
                type='date'
                value={formData.report_deadline || ''}
                onChange={(e) => setFormData({ ...formData, report_deadline: e.target.value })}
                slotProps={{ inputLabel: { shrink: true } } as any}
              />
            </Box>
            <TextField
              fullWidth
              label='描述'
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder='请输入计划描述'
              multiline
              rows={3}
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
            disabled={saving}
            sx={{ bgcolor: 'secondary.600' }}
          >
            {saving ? '保存中...' : '保存'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 查看 Dialog */}
      <Dialog
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>能力验证计划详情</DialogTitle>
        <DialogContent>
          {selectedPlan && (
            <Box sx={{ pt: 2, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  计划编号
                </Box>
                <Box sx={{ fontWeight: 500 }}>{selectedPlan.plan_no}</Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  计划名称
                </Box>
                <Box sx={{ fontWeight: 500 }}>{selectedPlan.plan_name}</Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  状态
                </Box>
                <Box sx={{ mt: 0.5 }}>{getStatusBadge(selectedPlan.status)}</Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  提供方
                </Box>
                <Box>{selectedPlan.provider || '-'}</Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  检测项目
                </Box>
                <Box>{selectedPlan.testitem || '-'}</Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  检测方法
                </Box>
                <Box>{selectedPlan.test_method || '-'}</Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  样品类型
                </Box>
                <Box>{selectedPlan.sample_type || '-'}</Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  注册日期
                </Box>
                <Box>
                  {selectedPlan.registration_date
                    ? new Date(selectedPlan.registration_date).toLocaleDateString('zh-CN')
                    : '-'}
                </Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  检测截止日期
                </Box>
                <Box>
                  {selectedPlan.test_deadline
                    ? new Date(selectedPlan.test_deadline).toLocaleDateString('zh-CN')
                    : '-'}
                </Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  报告截止日期
                </Box>
                <Box>
                  {selectedPlan.report_deadline
                    ? new Date(selectedPlan.report_deadline).toLocaleDateString('zh-CN')
                    : '-'}
                </Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  联系人
                </Box>
                <Box>{selectedPlan.contact_person || '-'}</Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  联系电话
                </Box>
                <Box>{selectedPlan.contact_phone || '-'}</Box>
              </Box>
              <Box sx={{ gridColumn: '1 / -1' }}>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  备注
                </Box>
                <Box>{selectedPlan.notes || '-'}</Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetailModal(false)}>关闭</Button>
          <Button
            variant='contained'
            onClick={() => {
              setShowDetailModal(false);
              if (selectedPlan) handleEdit(selectedPlan);
            }}
            sx={{ bgcolor: 'secondary.600' }}
          >
            编辑
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default LimsProficiencyTestingPage;
