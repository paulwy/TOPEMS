import {
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Chip,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material';
import React, { useState, useEffect, useCallback } from 'react';
import type { MrpPlan, CreateMrpPlanRequest, MrpCalculationResult } from '@/api/scm';
import { scmApi } from '@/api/scm';
import { useAppStore } from '@/store';
import {
  Plus,
  Edit,
  Trash2,
  Play,
  Check,
  XCircle,
  Calculator,
  Eye,
  AlertTriangle,
} from 'lucide-react';
import { apiLogger } from '@/utils/logger';
import { ListPageTemplate, type ColumnDef } from '@/components/templates';
import { PageContainer } from '@/components/common';
import { ConfirmDialog } from '@topems/shared-components';
import { designTokens } from '@/theme/tokens';

const ct = designTokens.colors;

const MrpPlanPage: React.FC = () => {
  const [plans, setPlans] = useState<MrpPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [showDialog, setShowDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<MrpPlan | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmDialogConfig, setConfirmDialogConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    danger?: boolean;
  } | null>(null);
  const [calculatingPlanId, setCalculatingPlanId] = useState<string | null>(null);
  const [calculationResult, setCalculationResult] = useState<MrpCalculationResult | null>(null);
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [formData, setFormData] = useState<CreateMrpPlanRequest>({
    plan_name: '',
    plan_code: '',
    start_date: '',
    end_date: '',
    description: '',
  });

  const { addNotification } = useAppStore();

  useEffect(() => {
    loadPlans();
  }, [currentPage, pageSize]);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const response = await scmApi.mrpPlans.list({
        page: currentPage,
        pageSize,
      });
      if (response.success && response.data) {
        setPlans(response.data.items || []);
        setTotal(response.data.total || 0);
      }
    } catch (error: unknown) {
      apiLogger.error('加载MRP计划失败:', error);
      addNotification({
        type: 'error',
        title: '加载失败',
        message: '无法加载MRP计划',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditing && selectedPlan) {
        await scmApi.mrpPlans.update(selectedPlan.id, {
          plan_name: formData.plan_name,
          plan_code: formData.plan_code,
          start_date: formData.start_date,
          end_date: formData.end_date,
          description: formData.description,
        });
        addNotification({
          type: 'success',
          title: '更新成功',
          message: 'MRP计划已更新',
        });
      } else {
        await scmApi.mrpPlans.create(formData);
        addNotification({
          type: 'success',
          title: '创建成功',
          message: 'MRP计划已创建',
        });
      }
      setShowDialog(false);
      resetForm();
      loadPlans();
    } catch (error: unknown) {
      apiLogger.error('操作失败:', error);
      addNotification({
        type: 'error',
        title: '操作失败',
        message: isEditing ? '更新MRP计划失败' : '创建MRP计划失败',
      });
    }
  };

  const handleEdit = (plan: MrpPlan) => {
    setSelectedPlan(plan);
    setFormData({
      plan_name: plan.plan_name,
      plan_code: plan.plan_code || '',
      start_date: plan.start_date,
      end_date: plan.end_date,
      description: plan.description || '',
    });
    setIsEditing(true);
    setShowDialog(true);
  };

  const handleDelete = async (plan: MrpPlan) => {
    openConfirmDialog({
      title: '确认删除',
      message: `确定要删除MRP计划 "${plan.plan_name}" 吗？`,
      onConfirm: async () => {
        try {
          await scmApi.mrpPlans.delete(plan.id);
          addNotification({
            type: 'success',
            title: '删除成功',
            message: 'MRP计划已删除',
          });
          loadPlans();
        } catch (error: unknown) {
          apiLogger.error('删除失败:', error);
          addNotification({
            type: 'error',
            title: '删除失败',
            message: '删除MRP计划失败',
          });
        }
      },
      danger: true,
    });
  };

  const handleCalculate = useCallback(
    (plan: MrpPlan) => {
      openConfirmDialog({
        title: '确认运算',
        message: `确定要对MRP计划 "${plan.plan_name}" 进行MRP运算吗？`,
        onConfirm: async () => {
          try {
            setCalculatingPlanId(plan.id);
            const response = await scmApi.mrpPlans.calculate(plan.id);
            if (response.success && response.data) {
              setCalculationResult(response.data);
              setShowResultDialog(true);
              addNotification({
                type: 'success',
                title: '运算完成',
                message: response.data.message || 'MRP运算已完成',
              });
            }
            loadPlans();
          } catch (error: unknown) {
            apiLogger.error('MRP运算失败:', error);
            addNotification({
              type: 'error',
              title: '运算失败',
              message: 'MRP运算执行失败',
            });
          } finally {
            setCalculatingPlanId(null);
          }
        },
      });
    },
    [addNotification]
  );

  const handleViewSuggestions = (plan: MrpPlan) => {
    window.location.href = `/scm/mrp-suggestion?plan_id=${plan.id}`;
  };

  const resetForm = () => {
    setFormData({
      plan_name: '',
      plan_code: '',
      start_date: '',
      end_date: '',
      description: '',
    });
    setIsEditing(false);
    setSelectedPlan(null);
  };

  const openConfirmDialog = (config: {
    title: string;
    message: string;
    onConfirm: () => void;
    danger?: boolean;
  }) => {
    setConfirmDialogConfig(config);
    setConfirmDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'default';
      case 'calculated':
        return 'success';
      case 'processing':
        return 'warning';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft':
        return '草稿';
      case 'calculated':
        return '已运算';
      case 'processing':
        return '处理中';
      case 'cancelled':
        return '已取消';
      default:
        return status;
    }
  };

  // 表格列定义
  const columns: ColumnDef<MrpPlan>[] = [
    {
      id: 'plan_code',
      label: '计划编号',
      render: (row) => <Box sx={{ fontWeight: 500 }}>{row.plan_code || '-'}</Box>,
    },
    {
      id: 'plan_name',
      label: '计划名称',
      render: (row) => <Box sx={{ fontWeight: 500 }}>{row.plan_name}</Box>,
    },
    {
      id: 'start_date',
      label: '开始日期',
      render: (row) => (
        <Box sx={{ fontSize: '0.875rem' }}>
          {new Date(row.start_date).toLocaleDateString('zh-CN')}
        </Box>
      ),
    },
    {
      id: 'end_date',
      label: '结束日期',
      render: (row) => (
        <Box sx={{ fontSize: '0.875rem' }}>
          {new Date(row.end_date).toLocaleDateString('zh-CN')}
        </Box>
      ),
    },
    {
      id: 'status',
      label: '状态',
      render: (row) => (
        <Chip
          size='small'
          label={getStatusLabel(row.status)}
          color={getStatusColor(row.status) as any}
          variant='outlined'
        />
      ),
    },
    {
      id: 'calculated_at',
      label: '运算时间',
      render: (row) => (
        <Box sx={{ fontSize: '0.875rem' }}>
          {row.calculated_at ? new Date(row.calculated_at).toLocaleString('zh-CN') : '-'}
        </Box>
      ),
    },
    {
      id: 'description',
      label: '描述',
      render: (row) => <Box sx={{ fontSize: '0.875rem' }}>{row.description || '-'}</Box>,
    },
    {
      id: 'status_actions',
      label: '状态操作',
      align: 'center',
      render: (row) => (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
          {row.status === 'draft' && (
            <Button
              size='small'
              color='primary'
              onClick={() => handleCalculate(row)}
              startIcon={
                calculatingPlanId === row.id ? (
                  <CircularProgress size={12} />
                ) : (
                  <Calculator size={12} />
                )
              }
              disabled={calculatingPlanId === row.id}
            >
              运算
            </Button>
          )}
          {row.status === 'calculated' && (
            <Button
              size='small'
              color='info'
              onClick={() => handleViewSuggestions(row)}
              startIcon={<Eye size={12} />}
            >
              查看建议
            </Button>
          )}
        </Box>
      ),
    },
  ];

  // 行操作
  const rowActions = [
    {
      label: '编辑',
      icon: <Edit size={14} />,
      onClick: (row: MrpPlan) => handleEdit(row),
    },
    {
      label: '删除',
      icon: <Trash2 size={14} />,
      color: 'error' as const,
      onClick: (row: MrpPlan) => handleDelete(row),
    },
  ];

  return (
    <PageContainer
      title='MRP计划'
      subtitle='MRP物料需求计划管理,包括计划创建、MRP运算、结果查看'
      maxWidth='xl'
    >
      <ListPageTemplate
        title=''
        subtitle=''
        columns={columns}
        data={plans}
        loading={loading}
        pagination={{
          page: currentPage - 1,
          pageSize,
          total,
          onPageChange: (page) => setCurrentPage(page + 1),
          onPageSizeChange: (size) => {
            setPageSize(size);
            setCurrentPage(1);
          },
        }}
        actions={[
          {
            label: '新建计划',
            icon: <Plus size={16} />,
            onClick: () => {
              resetForm();
              setShowDialog(true);
            },
            variant: 'contained',
          },
        ]}
        rowActions={rowActions}
        onRefresh={loadPlans}
        emptyMessage='暂无MRP计划数据'
      />

      <Dialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>{isEditing ? '编辑MRP计划' : '新建MRP计划'}</DialogTitle>
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
                label='计划名称 *'
                value={formData.plan_name}
                onChange={(e) => setFormData({ ...formData, plan_name: e.target.value })}
                size='small'
                required
              />
              <TextField
                label='计划编号'
                value={formData.plan_code}
                onChange={(e) => setFormData({ ...formData, plan_code: e.target.value })}
                size='small'
                disabled={isEditing}
              />
              <TextField
                label='开始日期 *'
                type='date'
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                size='small'
                required
                slotProps={{ inputLabel: { shrink: true } } as any}
              />
              <TextField
                label='结束日期 *'
                type='date'
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                size='small'
                required
                slotProps={{ inputLabel: { shrink: true } } as any}
              />
            </Box>
            <TextField
              label='描述'
              multiline
              rows={3}
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
                {isEditing ? '更新' : '保存'}
              </Button>
            </DialogActions>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showResultDialog}
        onClose={() => setShowResultDialog(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>MRP运算结果</DialogTitle>
        <DialogContent>
          {calculationResult && (
            <Box sx={{ py: 2 }}>
              <Alert
                severity='success'
                sx={{ mb: 2 }}
              >
                {calculationResult.message || 'MRP运算已完成'}
              </Alert>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr 1fr' },
                  gap: 2,
                }}
              >
                <Box sx={{ p: 2, border: `1px solid ${ct.border.default}`, borderRadius: 1 }}>
                  <Box sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>总物料项</Box>
                  <Box sx={{ fontSize: '1.5rem', fontWeight: 500 }}>
                    {calculationResult.totalitems}
                  </Box>
                </Box>
                <Box sx={{ p: 2, border: `1px solid ${ct.border.default}`, borderRadius: 1 }}>
                  <Box sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>总建议数</Box>
                  <Box sx={{ fontSize: '1.5rem', fontWeight: 500 }}>
                    {calculationResult.total_suggestions}
                  </Box>
                </Box>
                <Box sx={{ p: 2, border: `1px solid ${ct.border.default}`, borderRadius: 1 }}>
                  <Box sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>采购建议</Box>
                  <Box sx={{ fontSize: '1.5rem', fontWeight: 500, color: 'primary.main' }}>
                    {calculationResult.purchase_suggestions}
                  </Box>
                </Box>
                <Box sx={{ p: 2, border: `1px solid ${ct.border.default}`, borderRadius: 1 }}>
                  <Box sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>生产建议</Box>
                  <Box sx={{ fontSize: '1.5rem', fontWeight: 500, color: 'success.main' }}>
                    {calculationResult.production_suggestions}
                  </Box>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowResultDialog(false)}>关闭</Button>
          <Button
            variant='contained'
            onClick={() => {
              setShowResultDialog(false);
              if (selectedPlan) {
                handleViewSuggestions(selectedPlan);
              }
            }}
          >
            查看建议详情
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        isOpen={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        onConfirm={() => {
          confirmDialogConfig?.onConfirm();
          setConfirmDialogOpen(false);
        }}
        title={confirmDialogConfig?.title || ''}
        message={confirmDialogConfig?.message || ''}
        danger={confirmDialogConfig?.danger}
      />
    </PageContainer>
  );
};

export default MrpPlanPage;
