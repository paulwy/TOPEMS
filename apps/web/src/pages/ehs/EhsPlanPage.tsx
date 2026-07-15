import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';
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
  Button,
} from '@mui/material';
import { Plus, Eye, Activity, FileText, Users } from 'lucide-react';
import { ListPageTemplate } from '@/components';
import type { ColumnDef, RowAction, FilterConfig } from '@/components';
import { PageContainer } from '@/components/common';
import { ehsApi } from '@/api/ehs';
import type { EmergencyPlan } from '@/api/ehs';
import { useNotificationStore } from '@/store';
import { apiLogger } from '@/utils/logger';
import { designTokens } from '@/theme/tokens';

const ct = designTokens.colors;

const EhsPlanPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<EmergencyPlan | null>(null);
  const [formData, setFormData] = useState({
    plan_no: '',
    name: '',
    plan_type: '',
    scope: '',
    trigger_conditions: '',
    response_procedures: '',
    responsible_persons: '',
    contact_info: '',
  });
  const addNotification = useNotificationStore((state) => state.addNotification);

  const {
    data: plansData,
    isLoading: loading,
    isError,
  } = useQuery({
    queryKey: QUERY_KEYS.EHS.PLANS,
    queryFn: async () => {
      const response = await ehsApi.listPlans();
      if (response.success && response.data) {
        const data = response.data as any;
        const plansData = Array.isArray(data) ? data : data.data || [];
        return plansData.map((item: { [key: string]: unknown }) => ({
          ...item,
          status:
            item.status === 'active' ? '有效' : item.status === 'inactive' ? '无效' : item.status,
        }));
      }
      return [];
    },
  });
  const plans = (plansData as EmergencyPlan[]) || [];

  useEffect(() => {
    if (isError) {
      addNotification({ title: '错误', message: '加载应急预案列表失败', type: 'error' });
    }
  }, [isError, addNotification]);

  const planDetailQuery = useQuery<EmergencyPlan | null>({
    queryKey: QUERY_KEYS.EHS.PLAN(selectedPlan?.id || ''),
    queryFn: async () => {
      if (!selectedPlan?.id) return null;
      const response = await ehsApi.getPlan(selectedPlan.id);
      if (response.success && response.data) {
        const planData = response.data as any;
        return {
          ...planData,
          status:
            planData.status === 'active'
              ? '有效'
              : planData.status === 'inactive'
                ? '无效'
                : planData.status,
        };
      }
      return null;
    },
    enabled: !!selectedPlan?.id && showDetailModal,
    staleTime: 5 * 60 * 1000,
  });

  const detailLoading = planDetailQuery.isFetching;

  useEffect(() => {
    if (planDetailQuery.data) {
      setSelectedPlan(planDetailQuery.data);
    }
  }, [planDetailQuery.data]);

  useEffect(() => {
    if (planDetailQuery.isError) {
      apiLogger.error('加载应急预案详情失败:', planDetailQuery.error);
      addNotification({ title: '错误', message: '加载详情失败', type: 'error' });
    }
  }, [planDetailQuery.isError, planDetailQuery.error, addNotification]);

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; color: string }> = {
      有效: { bg: 'success.lighter', color: 'success.dark' },
      无效: { bg: 'error.lighter', color: 'error.dark' },
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

  const columns = useMemo<ColumnDef<EmergencyPlan>[]>(
    () => [
      {
        id: 'plan_no',
        label: '预案编号',
        render: (row) => row.plan_no,
      },
      {
        id: 'name',
        label: '预案名称',
        render: (row) => (
          <Typography
            variant='body2'
            sx={{ fontWeight: 500 }}
          >
            {row.name}
          </Typography>
        ),
      },
      {
        id: 'plan_type',
        label: '预案类型',
        render: (row) => row.plan_type || '-',
      },
      {
        id: 'scope',
        label: '适用范围',
        render: (row) => row.scope || '-',
      },
      {
        id: 'responsible_persons',
        label: '负责人',
        render: (row) => {
          const persons = row.responsible_persons;
          const displayText = Array.isArray(persons) ? persons.join(', ') : persons;
          return (
            <Box
              sx={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: 150,
              }}
              title={displayText}
            >
              {displayText || '-'}
            </Box>
          );
        },
      },
      {
        id: 'status',
        label: '状态',
        render: (row) => getStatusBadge(row.status),
      },
    ],
    []
  );

  const handleViewDetail = (plan: EmergencyPlan) => {
    setSelectedPlan(plan);
    setShowDetailModal(true);
  };

  const rowActions = useMemo<RowAction<EmergencyPlan>[]>(
    () => [
      {
        label: '详情',
        icon: <Eye size={16} />,
        onClick: (row) => handleViewDetail(row),
      },
    ],
    []
  );

  const filters = useMemo<FilterConfig[]>(
    () => [
      {
        id: 'plan_type',
        label: '预案类型',
        type: 'select',
        options: [
          { value: '', label: '全部' },
          { value: '火灾预案', label: '火灾预案' },
          { value: '化学品泄漏', label: '化学品泄漏' },
          { value: '地震预案', label: '地震预案' },
          { value: '应急预案', label: '应急预案' },
        ],
        value: typeFilter,
        onChange: (value) => setTypeFilter(value as string),
      },
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { value: '', label: '全部' },
          { value: '有效', label: '有效' },
          { value: '无效', label: '无效' },
        ],
        value: statusFilter,
        onChange: (value) => setStatusFilter(value as string),
      },
    ],
    [typeFilter, statusFilter]
  );

  const filteredPlans = useMemo(() => {
    return plans.filter((plan) => {
      const matchesSearch =
        plan.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        plan.plan_no.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = !typeFilter || plan.plan_type === typeFilter;
      const matchesStatus = !statusFilter || plan.status === statusFilter;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [plans, searchTerm, typeFilter, statusFilter]);

  const handleCreate = () => {
    setFormData({
      plan_no: '',
      name: '',
      plan_type: '',
      scope: '',
      trigger_conditions: '',
      response_procedures: '',
      responsible_persons: '',
      contact_info: '',
    });
    setShowCreateModal(true);
  };

  const createMutation = useMutation({
    mutationFn: (data: Parameters<typeof ehsApi.createPlan>[0]) => ehsApi.createPlan(data),
    onSuccess: () => {
      addNotification({ title: '成功', message: '应急预案创建成功', type: 'success' });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.EHS.PLANS });
      setShowCreateModal(false);
    },
    onError: (error: unknown) => {
      apiLogger.error('创建应急预案失败:', error);
      addNotification({ title: '错误', message: '创建失败', type: 'error' });
    },
  });

  const handleSave = () => {
    createMutation.mutate({
      plan_no: formData.plan_no,
      name: formData.name,
      plan_type: formData.plan_type,
      scope: formData.scope || null,
      trigger_conditions: formData.trigger_conditions || null,
      response_procedures: formData.response_procedures || null,
      responsible_persons: formData.responsible_persons
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s),
      contact_info: formData.contact_info || null,
      status: 'active',
    });
  };

  const stats = useMemo(
    () => ({
      total: plans.length,
      active: plans.filter((p) => p.status === '有效').length,
      inactive: plans.filter((p) => p.status === '无效').length,
    }),
    [plans]
  );

  const headerActions = [
    {
      label: '新增预案',
      icon: <Plus style={{ width: 18, height: 18 }} />,
      onClick: handleCreate,
      variant: 'contained' as const,
      color: 'success' as const,
    },
  ];

  return (
    <PageContainer
      headerProps={{
        actions: headerActions,
        pageIcon: <Activity sx={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.success.main} 0%, ${ct.success[600]} 100%)`,
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
                  borderRadius: 3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FileText sx={{ width: 20, height: 20, color: 'success.dark' }} />
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'slate.600', fontSize: '0.875rem' }}
                >
                  预案总数
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
                  borderRadius: 3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FileText sx={{ width: 20, height: 20, color: 'success.dark' }} />
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'slate.600', fontSize: '0.875rem' }}
                >
                  有效预案
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
                  borderRadius: 3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FileText sx={{ width: 20, height: 20, color: 'error.dark' }} />
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'slate.600', fontSize: '0.875rem' }}
                >
                  无效预案
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

      <ListPageTemplate<EmergencyPlan>
        title='应急预案列表'
        columns={columns}
        data={filteredPlans}
        loading={loading}
        searchable
        searchPlaceholder='搜索预案名称或编号...'
        searchValue={searchTerm}
        onSearch={(value) => setSearchTerm(value)}
        filters={filters}
        rowActions={rowActions}
        onRefresh={() => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.EHS.PLANS })}
      />

      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>新增应急预案</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label='预案编号 *'
              value={formData.plan_no}
              onChange={(e) => setFormData({ ...formData, plan_no: e.target.value })}
              placeholder='请输入预案编号'
            />
            <TextField
              fullWidth
              label='预案名称 *'
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder='请输入预案名称'
            />
            <TextField
              fullWidth
              label='预案类型 *'
              value={formData.plan_type}
              onChange={(e) => setFormData({ ...formData, plan_type: e.target.value })}
              placeholder='请输入预案类型'
            />
            <TextField
              fullWidth
              label='适用范围'
              value={formData.scope}
              onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
              placeholder='请输入适用范围'
              multiline
              rows={2}
            />
            <TextField
              fullWidth
              label='触发条件'
              value={formData.trigger_conditions}
              onChange={(e) => setFormData({ ...formData, trigger_conditions: e.target.value })}
              placeholder='请输入触发条件'
              multiline
              rows={2}
            />
            <TextField
              fullWidth
              label='响应程序'
              value={formData.response_procedures}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  response_procedures: e.target.value,
                })
              }
              placeholder='请输入响应程序'
              multiline
              rows={3}
            />
            <TextField
              fullWidth
              label='负责人'
              value={formData.responsible_persons}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  responsible_persons: e.target.value,
                })
              }
              placeholder='多个负责人用逗号分隔'
            />
            <TextField
              fullWidth
              label='联系方式'
              value={formData.contact_info}
              onChange={(e) => setFormData({ ...formData, contact_info: e.target.value })}
              placeholder='请输入联系方式'
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
        maxWidth='lg'
        fullWidth
      >
        <DialogTitle>应急预案详情</DialogTitle>
        <DialogContent>
          {detailLoading ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  border: 3,
                  borderColor: 'success.main',
                  borderTopColor: 'success.dark',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  mx: 'auto',
                  mb: 2,
                }}
              />
              <Typography sx={{ color: 'slate.600' }}>加载中...</Typography>
            </Box>
          ) : (
            selectedPlan && (
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
                    预案编号
                  </Box>
                  <Box sx={{ fontWeight: 500 }}>{selectedPlan.plan_no}</Box>
                </Box>
                <Box>
                  <Box
                    component='span'
                    sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                  >
                    预案名称
                  </Box>
                  <Box>{selectedPlan.name}</Box>
                </Box>
                <Box>
                  <Box
                    component='span'
                    sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                  >
                    预案类型
                  </Box>
                  <Box>{selectedPlan.plan_type}</Box>
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
                    适用范围
                  </Box>
                  <Box>{selectedPlan.scope || '-'}</Box>
                </Box>
                <Box>
                  <Box
                    component='span'
                    sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                  >
                    负责人
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Users style={{ width: 16, height: 16 }} />
                    {Array.isArray(selectedPlan.responsible_persons)
                      ? selectedPlan.responsible_persons.join(', ')
                      : selectedPlan.responsible_persons || '-'}
                  </Box>
                </Box>
                <Box sx={{ gridColumn: '1 / -1' }}>
                  <Box
                    component='span'
                    sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                  >
                    触发条件
                  </Box>
                  <Box>{selectedPlan.trigger_conditions || '-'}</Box>
                </Box>
                <Box sx={{ gridColumn: '1 / -1' }}>
                  <Box
                    component='span'
                    sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                  >
                    响应程序
                  </Box>
                  <Box>{selectedPlan.response_procedures || '-'}</Box>
                </Box>
                <Box sx={{ gridColumn: '1 / -1' }}>
                  <Box
                    component='span'
                    sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                  >
                    联系方式
                  </Box>
                  <Box>{selectedPlan.contact_info || '-'}</Box>
                </Box>
              </Box>
            )
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetailModal(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default EhsPlanPage;
