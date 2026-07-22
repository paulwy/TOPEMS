import { Card, CardContent, CardHeader, Typography, Box, LinearProgress } from '@mui/material';
import React, { useState, useMemo } from 'react';
import type {
  Opportunity,
  CreateOpportunityRequest,
  UpdateOpportunityRequest,
  FunnelStage,
  OpportunityStats,
} from '@/api/crm';
import { crmApi } from '@/api/crm';
import { useNotificationStore } from '@/store';
import { logger } from '@/utils/logger';
import {
  DataExport,
  ActionButton,
  FormField,
  Dialog,
  StatusBadge,
  PageContainer,
} from '@/components/common';
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  TrendingUp,
  Target,
  TrendingDown,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { ListPageTemplate } from '@/components/templates';
import type { ColumnDef, RowAction, FilterConfig } from '@/components/templates';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ConfirmDialog } from '@topems/shared-components';
import { useConfirmDialog, useUrlListState } from '@/hooks';

const OpportunityManagementPage: React.FC = () => {
  const { addNotification } = useNotificationStore();
  const queryClient = useQueryClient();

  // URL 同步的列表状态
  const listState = useUrlListState<{ stage: string }>({
    defaultSearch: '',
    defaultPageSize: 20,
    defaultFilters: { stage: '' },
    historyMode: 'replace',
  });
  const {
    searchQuery,
    debouncedSearch: searchTerm,
    currentPage,
    pageSize,
    filters: urlFilters,
    setSearchQuery: setSearchTerm,
    setFilter,
  } = listState;
  const stageFilter = urlFilters.stage;
  const [showDialog, setShowDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [formData, setFormData] = useState<CreateOpportunityRequest & { customer_id?: string }>({
    name: '',
    value: undefined,
    probability: undefined,
    close_date: '',
    notes: '',
  });
  const {
    confirmOpen: confirmDialogOpen,
    confirmConfig: confirmDialogConfig,
    openConfirm: openConfirmDialog,
    closeConfirm: setConfirmDialogClosed,
  } = useConfirmDialog();

  const opportunitiesQuery = useQuery({
    queryKey: ['crm-opportunities', searchTerm, urlFilters.stage, currentPage, pageSize],
    queryFn: async () => {
      const params: Record<string, unknown> = {
        page: currentPage,
        pagesize: pageSize,
      };
      if (searchTerm) params.search = searchTerm;
      if (urlFilters.stage) params.stage = urlFilters.stage;
      const response = await crmApi.opportunities.list(params);
      if (response.success && response.data) {
        return {
          items: response.data.items || [],
          total: response.data.total || 0,
        };
      }
      return { items: [], total: 0 };
    },
    staleTime: 5 * 60 * 1000,
  });
  const opportunities = opportunitiesQuery.data?.items || [];
  const total = opportunitiesQuery.data?.total || 0;
  const loading = opportunitiesQuery.isLoading;

  const funnelQuery = useQuery({
    queryKey: ['crm-opportunities-funnel'],
    queryFn: async () => {
      const response = await crmApi.opportunities.getFunnel();
      if (response.success && response.data) {
        return response.data;
      }
      return [];
    },
    staleTime: 30 * 60 * 1000,
  });
  const funnelData = funnelQuery.data || [];

  const statsQuery = useQuery({
    queryKey: ['crm-opportunities-stats'],
    queryFn: async () => {
      const response = await crmApi.opportunities.getStats();
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    },
    staleTime: 5 * 60 * 1000,
  });
  const stats = statsQuery.data;

  const createOpportunityMutation = useMutation({
    mutationFn: (data: CreateOpportunityRequest & { customer_id?: string }) =>
      crmApi.opportunities.create(data),
    onSuccess: () => {
      addNotification({ type: 'success', title: '创建成功', message: '新商机已创建' });
      queryClient.invalidateQueries({ queryKey: ['crm-opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['crm-opportunities-funnel'] });
      queryClient.invalidateQueries({ queryKey: ['crm-opportunities-stats'] });
    },
    onError: (error: unknown) => {
      logger.error('创建失败:', error);
      addNotification({ type: 'error', title: '操作失败', message: '创建商机失败' });
    },
  });

  const updateOpportunityMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateOpportunityRequest }) =>
      crmApi.opportunities.update(id, data),
    onSuccess: () => {
      addNotification({ type: 'success', title: '更新成功', message: '商机信息已更新' });
      queryClient.invalidateQueries({ queryKey: ['crm-opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['crm-opportunities-funnel'] });
      queryClient.invalidateQueries({ queryKey: ['crm-opportunities-stats'] });
    },
    onError: (error: unknown) => {
      logger.error('更新失败:', error);
      addNotification({ type: 'error', title: '操作失败', message: '更新商机失败' });
    },
  });

  const deleteOpportunityMutation = useMutation({
    mutationFn: (id: string) => crmApi.opportunities.delete(id),
    onSuccess: () => {
      addNotification({ type: 'success', title: '删除成功', message: '商机已删除' });
      queryClient.invalidateQueries({ queryKey: ['crm-opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['crm-opportunities-funnel'] });
      queryClient.invalidateQueries({ queryKey: ['crm-opportunities-stats'] });
    },
    onError: (error: unknown) => {
      logger.error('删除失败:', error);
      addNotification({ type: 'error', title: '删除失败', message: '无法删除商机' });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedOpportunity) {
        await updateOpportunityMutation.mutateAsync({
          id: selectedOpportunity.id,
          data: formData as UpdateOpportunityRequest,
        });
      } else {
        await createOpportunityMutation.mutateAsync(formData);
      }
      setShowDialog(false);
      resetForm();
    } catch (error: unknown) {
      logger.error('操作失败:', error);
    }
  };

  const handleDelete = (id: string) => {
    openConfirmDialog({
      title: '确认删除',
      message: '确定要删除这个商机吗?',
      danger: true,
      onConfirm: () => {
        deleteOpportunityMutation.mutate(id);
      },
    });
  };

  const handleEdit = (opportunity: Opportunity) => {
    setSelectedOpportunity(opportunity);
    setFormData({
      name: opportunity.name,
      customer_id: opportunity.customer_id,
      value: opportunity.value,
      probability: opportunity.probability,
      close_date: opportunity.close_date || '',
      notes: opportunity.notes || '',
    });
    setShowDialog(true);
  };

  const handleViewDetail = (opportunity: Opportunity) => {
    setSelectedOpportunity(opportunity);
    setShowDetailDialog(true);
  };

  const resetForm = () => {
    setSelectedOpportunity(null);
    setFormData({
      name: '',
      value: undefined,
      probability: undefined,
      close_date: '',
      notes: '',
    });
  };

  const getStageBadge = (stage: string) => {
    const stageMap: Record<
      string,
      {
        label: string;
        color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
      }
    > = {
      prospecting: { label: '线索', color: 'default' },
      qualified: { label: '合格', color: 'info' },
      proposal: { label: '提案', color: 'primary' },
      negotiation: { label: '谈判', color: 'warning' },
      closed_won: { label: '赢单', color: 'success' },
      closed_lost: { label: '输单', color: 'error' },
    };
    const s = stageMap[stage] || { label: stage, color: 'default' };
    return (
      <StatusBadge
        status={stage}
        label={s.label}
        color={s.color}
      />
    );
  };

  const maxValue = Math.max(...funnelData.map((f) => f.total_value || 0), 1);

  const columns = useMemo<ColumnDef<Opportunity>[]>(
    () => [
      {
        id: 'name',
        label: '商机名称',
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
        id: 'value',
        label: '金额',
        render: (row) => `¥${(row.value || 0).toLocaleString()}`,
      },
      {
        id: 'stage',
        label: '阶段',
        render: (row) => getStageBadge(row.stage),
      },
      {
        id: 'probability',
        label: '概率',
        render: (row) => (row.probability ? `${row.probability}%` : '-'),
      },
      {
        id: 'close_date',
        label: '预计成交日期',
        render: (row) =>
          row.close_date ? new Date(row.close_date).toLocaleDateString('zh-CN') : '-',
      },
    ],
    []
  );

  const rowActions = useMemo<RowAction<Opportunity>[]>(
    () => [
      {
        label: '查看',
        icon: <Eye size={16} />,
        onClick: (row) => handleViewDetail(row),
      },
      {
        label: '编辑',
        icon: <Edit size={16} />,
        onClick: (row) => handleEdit(row),
      },
      {
        label: '删除',
        icon: <Trash2 size={16} />,
        color: 'error',
        onClick: (row) => handleDelete(row.id),
        confirm: true,
        confirmMessage: '确定要删除这个商机吗?',
      },
    ],

    []
  );

  const filters = useMemo<FilterConfig[]>(
    () => [
      {
        id: 'stage',
        label: '阶段',
        type: 'select',
        options: [
          { value: '', label: '全部' },
          { value: 'lead', label: '线索' },
          { value: 'qualified', label: '合格' },
          { value: 'proposal', label: '提案' },
          { value: 'negotiation', label: '谈判' },
          { value: 'closed_won', label: '赢单' },
          { value: 'closed_lost', label: '输单' },
        ],
        value: urlFilters.stage,
        onChange: (value) => {
          setFilter('stage', value as string);
        },
      },
    ],
    [urlFilters.stage, setFilter]
  );

  const exportFields = useMemo(
    () => [
      { key: 'name', title: '商机名称' },
      { key: 'customer_name', title: '客户名称' },
      { key: 'stage', title: '商机阶段' },
      { key: 'value', title: '商机金额' },
      { key: 'probability', title: '概率' },
      { key: 'expected_close_date', title: '预计关闭日期' },
      { key: 'status', title: '状态' },
    ],
    []
  );

  return (
    <PageContainer
      title='商机管理'
      subtitle='管理商机信息，跟踪销售机会和成交进度'
      autoTitle
      autoBreadcrumbs
    >
      <>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' },
            gap: 2,
            mb: 3,
          }}
        >
          <Card>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                <Target sx={{ width: 18, height: 18, color: 'primary.main' }} />
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  商机总数
                </Typography>
              </Box>
              <Typography
                variant='h4'
                sx={{ fontWeight: 'bold' }}
              >
                {stats?.total_count || 0}
              </Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                <TrendingUp sx={{ width: 18, height: 18, color: 'warning.main' }} />
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  总金额
                </Typography>
              </Box>
              <Typography
                variant='h4'
                sx={{ fontWeight: 'bold' }}
              >
                ¥{(stats?.total_value || 0).toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                <CheckCircle sx={{ width: 18, height: 18, color: 'success.main' }} />
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  赢单数量
                </Typography>
              </Box>
              <Typography
                variant='h4'
                sx={{ fontWeight: 'bold', color: 'success.main' }}
              >
                {stats?.won_count || 0}
              </Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                <XCircle sx={{ width: 18, height: 18, color: 'error.main' }} />
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  输单数量
                </Typography>
              </Box>
              <Typography
                variant='h4'
                sx={{ fontWeight: 'bold', color: 'error.main' }}
              >
                {stats?.lost_count || 0}
              </Typography>
            </CardContent>
          </Card>
        </Box>

        <Card sx={{ mb: 3 }}>
          <CardHeader>
            <Typography
              variant='h6'
              sx={{
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <TrendingUp style={{ width: 20, height: 20 }} />
              销售漏斗
            </Typography>
            <Typography
              variant='body2'
              sx={{ color: 'grey.500' }}
            >
              各阶段商机数量与金额统计
            </Typography>
          </CardHeader>
          <CardContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {funnelData.map((item, index) => {
                const widthPercent = 100 - index * 10;
                const stageColors: Record<string, string> = {
                  prospecting: 'text.disabled',
                  qualified: 'primary.main',
                  proposal: 'secondary.main',
                  negotiation: 'warning.main',
                  closed_won: 'success.main',
                  closed_lost: 'error.main',
                };
                return (
                  <Box
                    key={item.stage}
                    sx={{ display: 'flex', alignItems: 'center', gap: 3 }}
                  >
                    <Box sx={{ width: 80, textAlign: 'right' }}>
                      <Typography
                        variant='body1'
                        sx={{ fontWeight: 500 }}
                      >
                        {item.stage_label}
                      </Typography>
                    </Box>
                    <Box sx={{ flex: 1, maxWidth: '400px' }}>
                      <Box
                        sx={{
                          height: 40,
                          bgcolor: 'grey.100',
                          borderRadius: 1,
                          overflow: 'hidden',
                          position: 'relative',
                        }}
                      >
                        <Box
                          sx={{
                            height: '100%',
                            bgcolor: stageColors[item.stage] || 'grey.500',
                            width: `${widthPercent}%`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            px: 2,
                            transition: 'width 0.3s',
                          }}
                        >
                          <Typography
                            variant='body2'
                            sx={{ color: 'white', fontWeight: 500 }}
                          >
                            {item.count} 个商机
                          </Typography>
                          <Typography
                            variant='body2'
                            sx={{ color: 'white' }}
                          >
                            ¥{(item.total_value || 0).toLocaleString()}
                          </Typography>
                        </Box>
                      </Box>
                      {item.avg_probability !== undefined && (
                        <Box
                          sx={{
                            mt: 0.5,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                          }}
                        >
                          <LinearProgress
                            variant='determinate'
                            value={item.avg_probability}
                            sx={{ flex: 1, height: 4, borderRadius: 3 }}
                          />
                          <Typography
                            variant='caption'
                            sx={{
                              color: 'text.secondary',
                              width: 40,
                              textAlign: 'right',
                            }}
                          >
                            {item.avg_probability.toFixed(0)}%
                          </Typography>
                        </Box>
                      )}
                    </Box>
                    <Box sx={{ width: 100, textAlign: 'right' }}>
                      <Typography
                        variant='body2'
                        sx={{ color: 'text.secondary' }}
                      >
                        平均概率
                      </Typography>
                      <Typography
                        variant='body1'
                        sx={{ fontWeight: 500 }}
                      >
                        {item.avg_probability ? `${item.avg_probability.toFixed(0)}%` : '-'}
                      </Typography>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </CardContent>
        </Card>

        <ListPageTemplate<Opportunity>
          title=''
          subtitle=''
          backButton={{
            href: '/dashboard',
          }}
          columns={columns}
          data={opportunities}
          loading={loading}
          searchable
          searchPlaceholder='搜索商机名称...'
          searchValue={searchQuery}
          onSearch={(value) => {
            setSearchTerm(value);
          }}
          filters={filters}
          rowActions={rowActions}
          pagination={{
            page: currentPage - 1,
            pageSize,
            total,
            onPageChange: (page) => {
              listState.setCurrentPage(page + 1);
            },
            onPageSizeChange: (newPageSize) => {
              listState.setPageSize(newPageSize);
            },
          }}
          actions={[
            {
              label: '导出',
              icon: <Eye size={18} />,
              onClick: () => {},
              variant: 'outlined',
            },
            {
              label: '新增商机',
              icon: <Plus size={18} />,
              onClick: () => {
                resetForm();
                setShowDialog(true);
              },
              variant: 'contained',
            },
          ]}
          headerContent={
            <DataExport
              data={opportunities as unknown as Record<string, unknown>[]}
              fields={exportFields}
              defaultFileName='商机数据'
              buttonText=''
            />
          }
        />

        <Dialog
          open={showDialog}
          onClose={() => setShowDialog(false)}
          title={selectedOpportunity ? '编辑商机' : '新增商机'}
          maxWidth='md'
          fullWidth
          cancelButton={{ label: '取消' }}
          confirmButton={{
            label: '保存',
            onClick: () => handleSubmit({ preventDefault: () => {} } as React.FormEvent),
          }}
        >
          <form onSubmit={handleSubmit}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 2,
                pt: 1,
              }}
            >
              <FormField
                name='name'
                label='商机名称 *'
                required
                value={formData.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                fullWidth
                sx={{ gridColumn: 'span 2' }}
              />
              <FormField
                name='value'
                label='金额'
                type='number'
                value={formData.value || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({
                    ...formData,
                    value: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                fullWidth
              />
              <FormField
                name='probability'
                label='成交概率 (%)'
                type='number'
                value={formData.probability || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({
                    ...formData,
                    probability: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                fullWidth
              />
              <FormField
                name='close_date'
                label='预计成交日期'
                type='date'
                value={formData.close_date}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, close_date: e.target.value })
                }
                fullWidth
                sx={{ gridColumn: 'span 2' }}
              />
              <FormField
                name='notes'
                label='备注'
                multiline
                rows={3}
                value={formData.notes}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                fullWidth
                sx={{ gridColumn: 'span 2' }}
              />
            </Box>
          </form>
        </Dialog>

        <Dialog
          open={showDetailDialog}
          onClose={() => setShowDetailDialog(false)}
          title='商机详情'
          maxWidth='md'
          fullWidth
          confirmButton={{ label: '关闭' }}
        >
          {selectedOpportunity && (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 2,
              }}
            >
              <Box>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  商机名称
                </Typography>
                <Typography sx={{ fontWeight: 'medium' }}>{selectedOpportunity.name}</Typography>
              </Box>
              <Box>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  金额
                </Typography>
                <Typography>¥{(selectedOpportunity.value || 0).toLocaleString()}</Typography>
              </Box>
              <Box>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  阶段
                </Typography>
                <Box sx={{ mt: 0.5 }}>{getStageBadge(selectedOpportunity.stage)}</Box>
              </Box>
              <Box>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  成交概率
                </Typography>
                <Typography>
                  {selectedOpportunity.probability ? `${selectedOpportunity.probability}%` : '-'}
                </Typography>
              </Box>
              <Box>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  预计成交日期
                </Typography>
                <Typography>
                  {selectedOpportunity.close_date
                    ? new Date(selectedOpportunity.close_date).toLocaleDateString('zh-CN')
                    : '-'}
                </Typography>
              </Box>
              <Box>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  创建时间
                </Typography>
                <Typography>
                  {new Date(selectedOpportunity.created_at).toLocaleString('zh-CN')}
                </Typography>
              </Box>
              <Box sx={{ gridColumn: 'span 2' }}>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  备注
                </Typography>
                <Typography>{selectedOpportunity.notes || '-'}</Typography>
              </Box>
            </Box>
          )}
        </Dialog>
      </>

      <ConfirmDialog
        isOpen={confirmDialogOpen}
        onClose={setConfirmDialogClosed}
        onConfirm={() => {
          confirmDialogConfig?.onConfirm();
          setConfirmDialogClosed();
        }}
        title={confirmDialogConfig?.title || ''}
        message={confirmDialogConfig?.message || ''}
        danger={confirmDialogConfig?.danger}
      />
    </PageContainer>
  );
};

export default OpportunityManagementPage;
