import React, { useState, useEffect, useCallback } from 'react';
import { Box, Chip, Typography } from '@mui/material';
import { TrendingUp, Plus, TrendingDown, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store';
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
} from '@/components/templates';
import apiClient from '@/api/client';

interface SalaryAdjustment {
  id: string;
  employee_id: string;
  employee_name: string;
  adjustment_type: 'promotion' | 'annual' | 'special' | 'correction';
  before_amount: number;
  after_amount: number;
  change_amount: number;
  change_percent: number;
  effective_date: string;
  status: 'pending' | 'approved' | 'rejected' | 'applied';
  reason: string;
  approver?: string;
  created_at: string;
}

const HrmSalaryAdjustmentPage: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);
  const [adjustments, setAdjustments] = useState<SalaryAdjustment[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAdjustments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.hrm.get('/api/hrm/salary-adjustments', {
        params: { page: 1, page_size: 50 },
      });
      if (res.success && res.data) {
        const data = res.data as any;
        setAdjustments(data.items || data || []);
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
    const map: Record<string, { label: string; color: 'primary' | 'success' | 'warning' | 'default' }> = {
      promotion: { label: '晋升调薪', color: 'primary' },
      annual: { label: '年度调薪', color: 'success' },
      special: { label: '特殊调薪', color: 'warning' },
      correction: { label: '纠正调薪', color: 'default' },
    };
    const cfg = map[type] || { label: type, color: 'default' as const };
    return <Chip label={cfg.label} color={cfg.color} size='small' />;
  };

  const getStatusChip = (status: string) => {
    const map: Record<string, { label: string; color: 'success' | 'warning' | 'error' | 'default'; icon: React.ReactNode }> = {
      approved: { label: '已批准', color: 'success', icon: <CheckCircle size={14} /> },
      pending: { label: '待审批', color: 'warning', icon: <Clock size={14} /> },
      rejected: { label: '已拒绝', color: 'error', icon: <XCircle size={14} /> },
      applied: { label: '已生效', color: 'success', icon: <CheckCircle size={14} /> },
    };
    const cfg = map[status] || { label: status, color: 'default' as const, icon: null };
    return <Chip label={cfg.label} color={cfg.color} size='small' icon={cfg.icon as any} />;
  };

  const columns: ColumnDef<SalaryAdjustment>[] = [
    {
      id: 'employee_name',
      label: '员工',
      width: 120,
    },
    {
      id: 'adjustment_type',
      label: '调薪类型',
      width: 120,
      render: (row) => getTypeChip(row.adjustment_type),
    },
    {
      id: 'before_amount',
      label: '调前薪资',
      width: 110,
      align: 'right',
      render: (row) => <Typography variant='body2'>¥{row.before_amount.toLocaleString()}</Typography>,
    },
    {
      id: 'after_amount',
      label: '调后薪资',
      width: 110,
      align: 'right',
      render: (row) => <Typography variant='body2' sx={{ fontWeight: 600 }}>¥{row.after_amount.toLocaleString()}</Typography>,
    },
    {
      id: 'change_amount',
      label: '变动',
      width: 110,
      align: 'right',
      render: (row: SalaryAdjustment) => {
        const isPositive = row.change_amount >= 0;
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'flex-end' }}>
            {isPositive ? <TrendingUp size={14} color="#10b981" /> : <TrendingDown size={14} color="#ef4444" />}
            <Typography
              variant='body2'
              color={isPositive ? 'success.main' : 'error.main'}
              sx={{ fontWeight: 600 }}
            >
              {isPositive ? '+' : ''}¥{row.change_amount.toLocaleString()} ({row.change_percent.toFixed(1)}%)
            </Typography>
          </Box>
        );
      },
    },
    {
      id: 'effective_date',
      label: '生效日期',
      width: 110,
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
        <Typography variant='body2' color='text.secondary' noWrap>
          {row.reason}
        </Typography>
      ),
    },
  ];

  const rowActions: RowAction<SalaryAdjustment>[] = [
    {
      label: '查看详情',
      icon: <TrendingUp size={16} />,
      onClick: (row) => {
        addNotification({ title: '调薪详情', type: 'info', message: `查看 ${row.employee_name} 的调薪详情` });
      },
    },
    {
      label: '审批',
      icon: <CheckCircle size={16} />,
      onClick: async (row) => {
        try {
          await apiClient.hrm.post(`/api/hrm/salary-adjustments/${row.id}/approve`, {});
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
    <ListPageTemplate<SalaryAdjustment>
      title='薪资调整'
      subtitle='员工薪资调整记录管理'
      columns={columns}
      data={adjustments}
      loading={loading}
      rowActions={rowActions}
      searchable
      onRefresh={loadAdjustments}
    />
  );
};

export default HrmSalaryAdjustmentPage;