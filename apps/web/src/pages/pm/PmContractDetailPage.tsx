import React, { useState, useEffect, useMemo } from 'react';
import { logger } from '@/utils/logger';
import {
  Edit,
  FileText,
  Calendar,
  DollarSign,
  Building,
  CheckCircle,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardHeader,
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@mui/material';

import type { Contract, ContractMilestone, ContractPaymentSchedule } from '@/api/pm';
import { pmApi } from '@/api/pm';
import { DetailPageTemplate, type TabConfig } from '@/components/templates';

const STATUS_LABELS: Record<string, string> = {
  draft: '草稿',
  pending: '待审批',
  approved: '已批准',
  active: '执行中',
  completed: '已完成',
  cancelled: '已取消',
};

const STATUS_COLORS: Record<string, { bgcolor: string; color: string }> = {
  draft: { bgcolor: 'grey.100', color: 'grey.700' },
  pending: { bgcolor: '#fef9c3', color: '#a16207' },
  approved: { bgcolor: '#f3e8ff', color: '#6b21a8' },
  active: { bgcolor: 'success.lighter', color: '#166534' },
  completed: { bgcolor: '#dbeafe', color: '#1e40af' },
  cancelled: { bgcolor: 'grey.100', color: 'grey.800' },
};

const CONTRACT_TYPE_LABELS: Record<string, string> = {
  construction: '工程合同',
  service: '服务合同',
  purchase: '采购合同',
  sales: '销售合同',
};

const PmContractDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [contract, setContract] = useState<Contract | null>(null);
  const [milestones, setMilestones] = useState<ContractMilestone[]>([]);
  const [payments, setPayments] = useState<ContractPaymentSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (id) {
      loadContractData(id);
    }
  }, [id]);

  const loadContractData = async (contractId: string) => {
    setLoading(true);
    setError('');
    try {
      const [contractRes, milestonesRes, paymentsRes] = await Promise.all([
        pmApi.contracts.get(contractId),
        pmApi.contracts.milestones.list(contractId),
        pmApi.contracts.payments.list(contractId),
      ]);

      if (contractRes.success && contractRes.data) {
        setContract(contractRes.data);
      }
      if (milestonesRes.success && milestonesRes.data) {
        setMilestones(milestonesRes.data.milestones || milestonesRes.data || []);
      }
      if (paymentsRes.success && paymentsRes.data) {
        setPayments(paymentsRes.data.payments || paymentsRes.data || []);
      }
    } catch (error: unknown) {
      logger.error('Failed to load contract data:', error);
      setError('加载合同数据失败');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('zh-CN');
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getMilestoneStatusSx = (status?: string) => {
    if (status === 'completed') {
      return { bgcolor: 'success.lighter', color: '#166534' };
    }
    if (status === 'pending') {
      return { bgcolor: '#fef9c3', color: '#a16207' };
    }
    return { bgcolor: 'grey.100', color: 'grey.700' };
  };

  const getPaymentStatusSx = (status?: string) => {
    if (status === 'paid') {
      return { bgcolor: 'success.lighter', color: '#166534' };
    }
    if (status === 'pending') {
      return { bgcolor: '#fef9c3', color: '#a16207' };
    }
    if (status === 'overdue') {
      return { bgcolor: 'error.lighter', color: '#991b1b' };
    }
    return { bgcolor: 'grey.100', color: 'grey.700' };
  };

  const overviewContent = useMemo(() => {
    if (!contract) return null;

    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
          gap: 3,
        }}
      >
        <Card>
          <CardHeader sx={{ pb: 2 }}>
            <Typography variant='h6' sx={{ fontSize: '1.125rem' }}>基本信息</Typography>
          </CardHeader>
          <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                py: 1,
                borderBottom: '1px solid',
                borderColor: 'grey.100',
              }}
            >
              <Typography sx={{ color: 'grey.500' }}>合同编号</Typography>
              <Typography sx={{ fontWeight: 500, color: 'grey.900' }}>{contract.contract_code}</Typography>
            </Box>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                py: 1,
                borderBottom: '1px solid',
                borderColor: 'grey.100',
              }}
            >
              <Typography sx={{ color: 'grey.500' }}>合同类型</Typography>
              <Typography sx={{ fontWeight: 500, color: 'grey.900' }}>
                {CONTRACT_TYPE_LABELS[contract.contract_type] || contract.contract_type}
              </Typography>
            </Box>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                py: 1,
                borderBottom: '1px solid',
                borderColor: 'grey.100',
              }}
            >
              <Typography sx={{ color: 'grey.500' }}>合同金额</Typography>
              <Typography sx={{ fontWeight: 500, color: 'grey.900' }}>{formatCurrency(contract.amount)}</Typography>
            </Box>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                py: 1,
                borderBottom: '1px solid',
                borderColor: 'grey.100',
              }}
            >
              <Typography sx={{ color: 'grey.500' }}>签署日期</Typography>
              <Typography sx={{ fontWeight: 500, color: 'grey.900' }}>{formatDate(contract.signing_date)}</Typography>
            </Box>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                py: 1,
              }}
            >
              <Typography sx={{ color: 'grey.500' }}>到期日期</Typography>
              <Typography sx={{ fontWeight: 500, color: 'grey.900' }}>{formatDate(contract.end_date)}</Typography>
            </Box>
          </CardContent>
        </Card>

        <Card>
          <CardHeader sx={{ pb: 2 }}>
            <Typography variant='h6' sx={{ fontSize: '1.125rem' }}>合同方信息</Typography>
          </CardHeader>
          <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                py: 1,
                borderBottom: '1px solid',
                borderColor: 'grey.100',
              }}
            >
              <Typography sx={{ color: 'grey.500' }}>甲方</Typography>
              <Typography sx={{ fontWeight: 500, color: 'grey.900' }}>{contract.party_a_name || '-'}</Typography>
            </Box>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                py: 1,
                borderBottom: '1px solid',
                borderColor: 'grey.100',
              }}
            >
              <Typography sx={{ color: 'grey.500' }}>乙方</Typography>
              <Typography sx={{ fontWeight: 500, color: 'grey.900' }}>{contract.party_b_name || '-'}</Typography>
            </Box>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                py: 1,
                borderBottom: '1px solid',
                borderColor: 'grey.100',
              }}
            >
              <Typography sx={{ color: 'grey.500' }}>甲方联系人</Typography>
              <Typography sx={{ fontWeight: 500, color: 'grey.900' }}>{contract.party_a_contact || '-'}</Typography>
            </Box>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                py: 1,
              }}
            >
              <Typography sx={{ color: 'grey.500' }}>乙方联系人</Typography>
              <Typography sx={{ fontWeight: 500, color: 'grey.900' }}>{contract.party_b_contact || '-'}</Typography>
            </Box>
          </CardContent>
        </Card>

        <Card sx={{ lg: { gridColumn: 'span 2' } }}>
          <CardHeader sx={{ pb: 2 }}>
            <Typography variant='h6' sx={{ fontSize: '1.125rem' }}>合同描述</Typography>
          </CardHeader>
          <CardContent>
            <Typography sx={{ color: 'grey.700' }}>{contract.description || '-'}</Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }, [contract]);

  const milestonesContent = useMemo(() => (
    <Card>
      <CardHeader sx={{ pb: 2 }}>
        <Typography variant='h6' sx={{ fontSize: '1.125rem' }}>合同里程碑</Typography>
      </CardHeader>
      <CardContent>
        {milestones.length === 0 ? (
          <Typography sx={{ textAlign: 'center', color: 'grey.500', py: 6 }}>暂无里程碑数据</Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {milestones.map((milestone) => (
              <Box
                key={milestone.id}
                sx={{
                  border: '1px solid grey.100',
                  borderRadius: 2,
                  p: 2,
                  transition: 'border-color 0.2s',
                  '&:hover': { borderColor: '#93c5fd' },
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                  }}
                >
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography sx={{ fontWeight: 500 }}>{milestone.name}</Typography>
                      <Badge sx={getMilestoneStatusSx(milestone.status)}>
                        {milestone.status === 'completed'
                          ? '已完成'
                          : milestone.status === 'pending'
                            ? '进行中'
                            : milestone.status}
                      </Badge>
                    </Box>
                    {milestone.description && (
                      <Typography variant='body2' sx={{ color: 'grey.500', mt: 0.5 }}>
                        {milestone.description}
                      </Typography>
                    )}
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant='body2' sx={{ color: 'grey.500' }}>目标日期</Typography>
                    <Typography sx={{ fontWeight: 500 }}>{formatDate(milestone.target_date)}</Typography>
                    <Typography variant='body2' sx={{ color: '#7e22ce', mt: 0.5 }}>
                      {formatCurrency(milestone.payment_amount)}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  ), [milestones]);

  const paymentsContent = useMemo(() => (
    <Card>
      <CardHeader sx={{ pb: 2 }}>
        <Typography variant='h6' sx={{ fontSize: '1.125rem' }}>付款计划</Typography>
      </CardHeader>
      <CardContent sx={{ p: 0 }}>
        {payments.length === 0 ? (
          <Typography sx={{ textAlign: 'center', color: 'grey.500', py: 6 }}>暂无付款计划数据</Typography>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>期次</TableCell>
                  <TableCell>付款日期</TableCell>
                  <TableCell>金额</TableCell>
                  <TableCell>比例</TableCell>
                  <TableCell>状态</TableCell>
                  <TableCell>备注</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {payments.map((payment, index) => (
                  <TableRow key={payment.id} sx={{ '&:hover': { bgcolor: 'grey.50' } }}>
                    <TableCell sx={{ fontWeight: 500 }}>第 {index + 1} 期</TableCell>
                    <TableCell sx={{ color: 'grey.600' }}>{formatDate(payment.due_date)}</TableCell>
                    <TableCell sx={{ fontWeight: 500 }}>{formatCurrency(payment.payment_amount)}</TableCell>
                    <TableCell sx={{ color: 'grey.600' }}>{payment.payment_percent || 0}%</TableCell>
                    <TableCell>
                      <Badge sx={getPaymentStatusSx(payment.status)}>
                        {payment.status === 'paid'
                          ? '已支付'
                          : payment.status === 'pending'
                            ? '待支付'
                            : payment.status === 'overdue'
                              ? '已逾期'
                              : payment.status || '-'}
                      </Badge>
                    </TableCell>
                    <TableCell sx={{ color: 'grey.600' }}>{payment.remark || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </CardContent>
    </Card>
  ), [payments]);

  const tabs: TabConfig[] = useMemo(() => [
    {
      id: 'overview',
      label: '合同概览',
      content: overviewContent,
    },
    {
      id: 'milestones',
      label: '里程碑',
      content: milestonesContent,
    },
    {
      id: 'payments',
      label: '付款计划',
      content: paymentsContent,
    },
  ], [overviewContent, milestonesContent, paymentsContent]);

  const infoCard = useMemo(() => {
    if (!contract) return undefined;

    const statusKey = contract.status || 'draft';
    const statusSx = STATUS_COLORS[statusKey];

    return {
      title: contract.contract_name,
      subtitle: contract.contract_code,
      tags: [
        <Badge key='status' sx={statusSx}>{STATUS_LABELS[statusKey]}</Badge>,
        <Badge key='type' variant='standard' sx={{ bgcolor: '#f3e8ff', color: '#6b21a8' }}>
          {CONTRACT_TYPE_LABELS[contract.contract_type] || contract.contract_type}
        </Badge>,
      ],
      stats: [
        { label: '合同金额', value: formatCurrency(contract.amount) },
        { label: '甲方', value: contract.party_a_name || '-' },
        { label: '乙方', value: contract.party_b_name || '-' },
        { label: '签署日期', value: formatDate(contract.signing_date) },
      ],
    };
  }, [contract]);

  return (
    <DetailPageTemplate
      title={contract?.contract_name || '合同详情'}
      subtitle={contract?.contract_code}
      breadcrumbs={[{ label: '首页', href: '/dashboard' }, { label: '项目管理', href: '/pm/projects' }, { label: '合同', href: '/pm/contracts' }, { label: '合同详情' }]}
      loading={loading}
      error={error}
      backHref='/pm/contracts'
      onEdit={() => id && navigate(`/pm/contracts/${id}/edit`)}
      tabs={tabs}
      defaultTab='overview'
      infoCard={infoCard}
      onRefresh={() => id && loadContractData(id)}
    />
  );
};

export default PmContractDetailPage;