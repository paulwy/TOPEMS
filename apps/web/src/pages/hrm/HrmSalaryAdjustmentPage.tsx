import React, { useState, useEffect, useCallback } from 'react';
import { Box, Chip, Typography } from '@mui/material';
import { TrendingUp, Plus, TrendingDown, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotificationStore } from '../../store';
import { ListPageTemplate, type ColumnDef, type RowAction } from '@/components/templates';
import { salaryAdjustmentApi } from '@/api/hrm';
import type { SalaryAdjustment } from '@/api/hrm';
import { PageContainer } from '@/components/common';

const HrmSalaryAdjustmentPage: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const [adjustments, setAdjustments] = useState<SalaryAdjustment[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAdjustments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await salaryAdjustmentApi.list({ page: 1, pagesize: 50 });
      if (res.success && res.data) {
        setAdjustments(res.data.items || []);
      }
    } catch (err) {
      setAdjustments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAdjustments();
  }, [loadAdjustments]);

  const getTypeChip = (type: string) => {
    const map: Record<
      string,
      { label: string; color: 'primary' | 'success' | 'warning' | 'default' }
    > = {
      promotion: { label: '晋升调薪', color: 'primary' },
      demotion: { label: '降职调薪', color: 'warning' },
      bonus: { label: '奖金调薪', color: 'success' },
      deduction: { label: '扣减调薪', color: 'warning' },
      annual: { label: '年度调薪', color: 'success' },
      special: { label: '特殊调薪', color: 'warning' },
      correction: { label: '纠正调薪', color: 'default' },
    };
    const cfg = map[type] || { label: type, color: 'default' as const };
    return (
      <Chip
        label={cfg.label}
        color={cfg.color}
        size='small'
      />
    );
  };

  const getStatusChip = (status: string) => {
    const map: Record<
      string,
      { label: string; color: 'success' | 'warning' | 'error' | 'default'; icon: React.ReactNode }
    > = {
      approved: { label: '已批准', color: 'success', icon: <CheckCircle size={14} /> },
      pending: { label: '待审批', color: 'warning', icon: <Clock size={14} /> },
      rejected: { label: '已拒绝', color: 'error', icon: <XCircle size={14} /> },
    };
    const cfg = map[status] || { label: status, color: 'default' as const, icon: null };
    return (
      <Chip
        label={cfg.label}
        color={cfg.color}
        size='small'
        icon={cfg.icon as any}
      />
    );
  };

  const columns: ColumnDef<SalaryAdjustment>[] = [
    {
      id: 'employee_name',
      label: '员工',
      width: 120,
    },
    {
      id: 'department',
      label: '部门',
      width: 120,
      render: (row) => (
        <Typography
          variant='body2'
          color='text.secondary'
          noWrap
        >
          {row.department || '-'}
        </Typography>
      ),
    },
    {
      id: 'adjustment_type',
      label: '调薪类型',
      width: 120,
      render: (row) => getTypeChip(row.adjustment_type),
    },
    {
      id: 'old_salary',
      label: '调前薪资',
      width: 110,
      align: 'right',
      render: (row) => (
        <Typography variant='body2'>¥{Number(row.old_salary || 0).toLocaleString()}</Typography>
      ),
    },
    {
      id: 'new_salary',
      label: '调后薪资',
      width: 110,
      align: 'right',
      render: (row) => (
        <Typography
          variant='body2'
          sx={{ fontWeight: 600 }}
        >
          ¥{Number(row.new_salary || 0).toLocaleString()}
        </Typography>
      ),
    },
    {
      id: 'adjustment_amount',
      label: '变动',
      width: 140,
      align: 'right',
      render: (row: SalaryAdjustment) => {
        const amount = Number(row.adjustment_amount || 0);
        const oldSalary = Number(row.old_salary || 0);
        const percent = oldSalary > 0 ? (amount / oldSalary) * 100 : 0;
        const isPositive = amount >= 0;
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'flex-end' }}>
            {isPositive ? (
              <TrendingUp
                size={14}
                color='success.main'
              />
            ) : (
              <TrendingDown
                size={14}
                color='error.main'
              />
            )}
            <Typography
              variant='body2'
              color={isPositive ? 'success.main' : 'error.main'}
              sx={{ fontWeight: 600 }}
            >
              {isPositive ? '+' : ''}¥{amount.toLocaleString()} ({percent.toFixed(1)}%)
            </Typography>
          </Box>
        );
      },
    },
    {
      id: 'effective_date',
      label: '生效日期',
      width: 110,
      render: (row) => (
        <Typography variant='body2'>
          {row.effective_date ? new Date(row.effective_date).toLocaleDateString('zh-CN') : '-'}
        </Typography>
      ),
    },
    {
      id: 'status',
      label: '状态',
      width: 100,
      render: (row) => getStatusChip(row.status),
    },
    {
      id: 'reason',
      label: '原因',
      render: (row) => (
        <Typography
          variant='body2'
          color='text.secondary'
          noWrap
        >
          {row.reason || '-'}
        </Typography>
      ),
    },
  ];

  const rowActions: RowAction<SalaryAdjustment>[] = [
    {
      label: '查看详情',
      icon: <TrendingUp size={16} />,
      onClick: (row) => {
        addNotification({
          title: '调薪详情',
          type: 'info',
          message: `查看 ${row.employee_name} 的调薪详情`,
        });
      },
    },
    {
      label: '审批',
      icon: <CheckCircle size={16} />,
      onClick: async (row) => {
        try {
          await salaryAdjustmentApi.approve(row.id, 'current-user');
          addNotification({ title: '审批成功', type: 'success', message: '已审批通过' });
          loadAdjustments();
        } catch (err) {
          addNotification({ title: '审批失败', type: 'error', message: '审批失败' });
        }
      },
      show: (row) => row.status === 'pending',
    },
  ];

  return (
    <PageContainer
      title='薪资调整'
      subtitle='员工薪资调整记录管理'
    >
      <ListPageTemplate<SalaryAdjustment>
        title=''
        subtitle=''
        columns={columns}
        data={adjustments}
        loading={loading}
        rowActions={rowActions}
        searchable
        onRefresh={loadAdjustments}
        exportable
        exportFileName='薪资调整列表'
        persistFilters
        persistSearch
        emptyActionButton={{
          label: '发起调薪',
          icon: <Plus size={16} />,
          onClick: () => {
            addNotification({ title: '功能开发中', type: 'info', message: '调薪申请功能即将上线' });
          },
        }}
      />
    </PageContainer>
  );
};

export default HrmSalaryAdjustmentPage;
