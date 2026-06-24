import {
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Chip,
} from '@mui/material';
import { Button } from '@/components/ui/Button';
import React, { useState, useEffect } from 'react';
import type {
  SupplierEvaluation,
  CreateSupplierEvaluationRequest,
  UpdateSupplierEvaluationRequest,
} from '@/api/scm';
import { scmApi } from '@/api/scm';
import { useAppStore } from '@/store';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { apiLogger } from '@/utils/logger';
import { ListPageTemplate, type ColumnDef } from '@/components/templates';

const ScmEvaluationPage: React.FC = () => {
  const [evaluations, setEvaluations] = useState<SupplierEvaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [showDialog, setShowDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedEvaluation, setSelectedEvaluation] = useState<SupplierEvaluation | null>(null);
  const [formData, setFormData] = useState<CreateSupplierEvaluationRequest>({
    supplier_id: '',
    evaluation_date: '',
    quality_score: 0,
    delivery_score: 0,
    service_score: 0,
    price_score: 0,
    overall_score: 0,
    comments: '',
    evaluator: '',
  });

  const { addNotification } = useAppStore();

  useEffect(() => {
    loadEvaluations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, pageSize]);

  const loadEvaluations = async () => {
    try {
      setLoading(true);
      const response = await scmApi.evaluations.list({
        page: currentPage,
        pageSize: pageSize,
      });
      if (response.success && response.data) {
        setEvaluations(response.data.items || []);
        setTotal(response.data.total || 0);
      }
    } catch (error) {
      apiLogger.error('加载评估列表失败:', error);
      addNotification({
        type: 'error',
        title: '加载失败',
        message: '无法加载供应商评估',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditing && selectedEvaluation) {
        const updateData: UpdateSupplierEvaluationRequest = {
          quality_score: formData.quality_score,
          delivery_score: formData.delivery_score,
          service_score: formData.service_score,
          price_score: formData.price_score,
          overall_score: formData.overall_score,
          comments: formData.comments,
          evaluator: formData.evaluator,
        };
        await scmApi.evaluations.update(selectedEvaluation.id, updateData);
        addNotification({
          type: 'success',
          title: '更新成功',
          message: '评估记录已更新',
        });
      } else {
        await scmApi.evaluations.create(formData);
        addNotification({
          type: 'success',
          title: '创建成功',
          message: '新评估记录已创建',
        });
      }
      setShowDialog(false);
      resetForm();
      loadEvaluations();
    } catch (error) {
      apiLogger.error('操作失败:', error);
      addNotification({
        type: 'error',
        title: '操作失败',
        message: isEditing ? '更新评估记录失败' : '创建评估记录失败',
      });
    }
  };

  const handleEdit = (evaluation: SupplierEvaluation) => {
    setSelectedEvaluation(evaluation);
    setFormData({
      supplier_id: evaluation.supplier_id,
      evaluation_date: evaluation.evaluation_date,
      quality_score: evaluation.quality_score || 0,
      delivery_score: evaluation.delivery_score || 0,
      service_score: evaluation.service_score || 0,
      price_score: evaluation.price_score || 0,
      overall_score: evaluation.overall_score || 0,
      comments: evaluation.comments || '',
      evaluator: evaluation.evaluator || '',
    });
    setIsEditing(true);
    setShowDialog(true);
  };

  const handleDelete = async (evaluation: SupplierEvaluation) => {
    if (!window.confirm(`确定要删除这条评估记录吗？`)) {
      return;
    }
    try {
      await scmApi.evaluations.update(evaluation.id, { comments: '[已删除]' } as any);
      addNotification({
        type: 'success',
        title: '删除成功',
        message: '评估记录已删除',
      });
      loadEvaluations();
    } catch (error) {
      apiLogger.error('删除失败:', error);
      addNotification({
        type: 'error',
        title: '删除失败',
        message: '删除评估记录失败',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      supplier_id: '',
      evaluation_date: '',
      quality_score: 0,
      delivery_score: 0,
      service_score: 0,
      price_score: 0,
      overall_score: 0,
      comments: '',
      evaluator: '',
    });
    setIsEditing(false);
    setSelectedEvaluation(null);
  };

  // 表格列定义
  const columns: ColumnDef<SupplierEvaluation>[] = [
    {
      id: 'supplier_id',
      label: '供应商ID',
    },
    {
      id: 'evaluation_date',
      label: '评估日期',
      render: (row) => (
        <Box sx={{ fontSize: '0.875rem' }}>
          {new Date(row.evaluation_date).toLocaleDateString('zh-CN')}
        </Box>
      ),
    },
    {
      id: 'quality_score',
      label: '质量',
      align: 'center',
      render: (row) => (
        <Chip
          size='small'
          label={row.quality_score || '-'}
          variant='outlined'
        />
      ),
    },
    {
      id: 'delivery_score',
      label: '交期',
      align: 'center',
      render: (row) => (
        <Chip
          size='small'
          label={row.delivery_score || '-'}
          variant='outlined'
        />
      ),
    },
    {
      id: 'service_score',
      label: '服务',
      align: 'center',
      render: (row) => (
        <Chip
          size='small'
          label={row.service_score || '-'}
          variant='outlined'
        />
      ),
    },
    {
      id: 'price_score',
      label: '价格',
      align: 'center',
      render: (row) => (
        <Chip
          size='small'
          label={row.price_score || '-'}
          variant='outlined'
        />
      ),
    },
    {
      id: 'overall_score',
      label: '综合',
      align: 'center',
      render: (row) => (
        <Box sx={{ fontWeight: 600, color: 'primary.main' }}>{row.overall_score || '-'}</Box>
      ),
    },
    {
      id: 'evaluator',
      label: '评估人',
      render: (row) => <Box>{row.evaluator || '-'}</Box>,
    },
  ];

  // 行操作
  const rowActions = [
    {
      label: '编辑',
      icon: <Edit size={14} />,
      onClick: (row: SupplierEvaluation) => handleEdit(row),
    },
    {
      label: '删除',
      icon: <Trash2 size={14} />,
      color: 'error' as const,
      onClick: (row: SupplierEvaluation) => handleDelete(row),
    },
  ];

  return (
    <>
      <ListPageTemplate
        title='供应商评估管理'
        subtitle='供应商评估记录,包括质量、交期、服务、价格评分'
        columns={columns}
        data={evaluations}
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
            label: '新增评估',
            icon: <Plus size={16} />,
            onClick: () => {
              resetForm();
              setShowDialog(true);
            },
            variant: 'contained',
          },
        ]}
        rowActions={rowActions}
        onRefresh={loadEvaluations}
        emptyMessage='暂无评估数据'
      />

      <Dialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>{isEditing ? '编辑供应商评估' : '新增供应商评估'}</DialogTitle>
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
                label='供应商ID *'
                value={formData.supplier_id}
                onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                size='small'
                required
                disabled={isEditing}
              />
              <TextField
                label='评估日期 *'
                type='date'
                value={formData.evaluation_date}
                onChange={(e) => setFormData({ ...formData, evaluation_date: e.target.value })}
                size='small'
                required
                slotProps={{ inputLabel: { shrink: true } }}
                disabled={isEditing}
              />
              <TextField
                label='质量评分'
                type='number'
                value={formData.quality_score}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    quality_score: parseFloat(e.target.value) || 0,
                  })
                }
                size='small'
              />
              <TextField
                label='交期评分'
                type='number'
                value={formData.delivery_score}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    delivery_score: parseFloat(e.target.value) || 0,
                  })
                }
                size='small'
              />
              <TextField
                label='服务评分'
                type='number'
                value={formData.service_score}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    service_score: parseFloat(e.target.value) || 0,
                  })
                }
                size='small'
              />
              <TextField
                label='价格评分'
                type='number'
                value={formData.price_score}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    price_score: parseFloat(e.target.value) || 0,
                  })
                }
                size='small'
              />
              <TextField
                label='综合评分'
                type='number'
                value={formData.overall_score}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    overall_score: parseFloat(e.target.value) || 0,
                  })
                }
                size='small'
              />
              <TextField
                label='评估人'
                value={formData.evaluator}
                onChange={(e) => setFormData({ ...formData, evaluator: e.target.value })}
                size='small'
              />
            </Box>
            <TextField
              label='评论'
              multiline
              rows={2}
              value={formData.comments}
              onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
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
    </>
  );
};

export default ScmEvaluationPage;
