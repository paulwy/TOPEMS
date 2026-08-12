import React, { useMemo } from 'react';
import { Edit, FileText, Calendar, DollarSign, Building, CheckCircle } from 'lucide-react';
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
import { PageContainer } from '@/components/common';
import { designTokens } from '@/theme/tokens';
import { PM_PATHS } from '@/modules/pm/config';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/lib/reactQuery';

const ct = designTokens.colors;

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
  pending: { bgcolor: 'warning.100', color: ct.yellow[700] },
  approved: { bgcolor: 'secondary.100', color: ct.purple[800] },
  active: { bgcolor: 'success.lighter', color: ct.success[800] },
  completed: { bgcolor: 'primary.100', color: 'primary.800' },
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
  const queryClient = useQueryClient();

  const contractQuery = useQuery({
    queryKey: QUERY_KEYS.PM.CONTRACT(id || ''),
    queryFn: () => pmApi.contracts.get(id || ''),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const milestonesQuery = useQuery({
    queryKey: [...QUERY_KEYS.PM.CONTRACT(id || ''), 'milestones'],
    queryFn: () => pmApi.contracts.milestones.list(id || ''),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const paymentsQuery = useQuery({
    queryKey: [...QUERY_KEYS.PM.CONTRACT(id || ''), 'payments'],
    queryFn: () => pmApi.contracts.payments.list(id || ''),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const contract =
    contractQuery.data?.success && contractQuery.data.data ? contractQuery.data.data : null;
  const milestones =
    milestonesQuery.data?.success && milestonesQuery.data.data
      ? milestonesQuery.data.data.milestones || milestonesQuery.data.data || []
      : [];
  const payments =
    paymentsQuery.data?.success && paymentsQuery.data.data
      ? paymentsQuery.data.data.payments || paymentsQuery.data.data || []
      : [];
  const loading = contractQuery.isLoading || milestonesQuery.isLoading || paymentsQuery.isLoading;
  const error = contractQuery.error || milestonesQuery.error || paymentsQuery.error;

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
      return { bgcolor: 'success.lighter', color: ct.success[800] };
    }
    if (status === 'pending') {
      return { bgcolor: 'warning.100', color: ct.yellow[700] };
    }
    return { bgcolor: 'grey.100', color: 'grey.700' };
  };

  const getPaymentStatusSx = (status?: string) => {
    if (status === 'paid') {
      return { bgcolor: 'success.lighter', color: ct.success[800] };
    }
    if (status === 'pending') {
      return { bgcolor: 'warning.100', color: ct.yellow[700] };
    }
    if (status === 'overdue') {
      return { bgcolor: 'error.lighter', color: ct.error[800] };
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
            <Typography
              variant='h6'
              sx={{ fontSize: '1.125rem' }}
            >
              基本信息
            </Typography>
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
              <Typography sx={{ fontWeight: 500, color: 'grey.900' }}>
                {contract.contractNo}
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
              <Typography sx={{ fontWeight: 500, color: 'grey.900' }}>
                {formatCurrency(contract.amount)}
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
              <Typography sx={{ color: 'grey.500' }}>签署日期</Typography>
              <Typography sx={{ fontWeight: 500, color: 'grey.900' }}>
                {formatDate(contract.sign_date)}
              </Typography>
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
              <Typography sx={{ fontWeight: 500, color: 'grey.900' }}>
                {formatDate(contract.end_date)}
              </Typography>
            </Box>
          </CardContent>
        </Card>

        <Card>
          <CardHeader sx={{ pb: 2 }}>
            <Typography
              variant='h6'
              sx={{ fontSize: '1.125rem' }}
            >
              合同方信息
            </Typography>
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
              <Typography sx={{ fontWeight: 500, color: 'grey.900' }}>
                {contract.party_a || '-'}
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
              <Typography sx={{ color: 'grey.500' }}>乙方</Typography>
              <Typography sx={{ fontWeight: 500, color: 'grey.900' }}>
                {contract.party_b || '-'}
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
              <Typography sx={{ color: 'grey.500' }}>甲方联系人</Typography>
              <Typography sx={{ fontWeight: 500, color: 'grey.900' }}>-</Typography>
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
              <Typography sx={{ fontWeight: 500, color: 'grey.900' }}>-</Typography>
            </Box>
          </CardContent>
        </Card>

        <Card sx={{ lg: { gridColumn: 'span 2' } }}>
          <CardHeader sx={{ pb: 2 }}>
            <Typography
              variant='h6'
              sx={{ fontSize: '1.125rem' }}
            >
              合同描述
            </Typography>
          </CardHeader>
          <CardContent>
            <Typography sx={{ color: 'grey.700' }}>-</Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }, [contract]);

  const milestonesContent = useMemo(
    () => (
      <Card>
        <CardHeader sx={{ pb: 2 }}>
          <Typography
            variant='h6'
            sx={{ fontSize: '1.125rem' }}
          >
            合同里程碑
          </Typography>
        </CardHeader>
        <CardContent>
          {milestones.length === 0 ? (
            <Typography sx={{ textAlign: 'center', color: 'grey.500', py: 6 }}>
              暂无里程碑数据
            </Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {milestones.map((milestone: ContractMilestone) => (
                <Box
                  key={milestone.id}
                  sx={{
                    border: '1px solid grey.100',
                    borderRadius: 3,
                    p: 2,
                    transition: 'border-color 0.2s',
                    '&:hover': { borderColor: ct.primary[300] },
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
                        <Typography
                          variant='body2'
                          sx={{ color: 'grey.500', mt: 0.5 }}
                        >
                          {milestone.description}
                        </Typography>
                      )}
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography
                        variant='body2'
                        sx={{ color: 'grey.500' }}
                      >
                        目标日期
                      </Typography>
                      <Typography sx={{ fontWeight: 500 }}>
                        {formatDate(milestone.target_date)}
                      </Typography>
                      <Typography
                        variant='body2'
                        sx={{ color: 'secondary.dark', mt: 0.5 }}
                      >
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
    ),
    [milestones]
  );

  const paymentsContent = useMemo(
    () => (
      <Card>
        <CardHeader sx={{ pb: 2 }}>
          <Typography
            variant='h6'
            sx={{ fontSize: '1.125rem' }}
          >
            付款计划
          </Typography>
        </CardHeader>
        <CardContent sx={{ p: 0 }}>
          {payments.length === 0 ? (
            <Typography sx={{ textAlign: 'center', color: 'grey.500', py: 6 }}>
              暂无付款计划数据
            </Typography>
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
                  {payments.map((payment: ContractPaymentSchedule, index: number) => (
                    <TableRow
                      key={payment.id}
                      sx={{ '&:hover': { bgcolor: 'grey.50' } }}
                    >
                      <TableCell sx={{ fontWeight: 500 }}>第 {index + 1} 期</TableCell>
                      <TableCell sx={{ color: 'grey.600' }}>
                        {formatDate(payment.due_date)}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 500 }}>
                        {formatCurrency(payment.payment_amount)}
                      </TableCell>
                      <TableCell sx={{ color: 'grey.600' }}>
                        {payment.payment_percent || 0}%
                      </TableCell>
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
    ),
    [payments]
  );

  const tabs: TabConfig[] = useMemo(
    () => [
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
    ],
    [overviewContent, milestonesContent, paymentsContent]
  );

  const infoCard = useMemo(() => {
    if (!contract) return;

    const statusKey = contract.status || 'draft';

    return {
      title: contract.contract_name,
      subtitle: contract.contractNo,
      tags: [
        STATUS_LABELS[statusKey],
        CONTRACT_TYPE_LABELS[contract.contract_type] || contract.contract_type,
      ],
      stats: [
        { label: '合同金额', value: formatCurrency(contract.amount) },
        { label: '甲方', value: contract.party_a || '-' },
        { label: '乙方', value: contract.party_b || '-' },
        { label: '签署日期', value: formatDate(contract.sign_date) },
      ],
    };
  }, [contract]);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PM.CONTRACT(id || '') ,
  exact: false,
  refetchType: 'active',
});
    queryClient.invalidateQueries({
      queryKey: [...QUERY_KEYS.PM.CONTRACT(id || ''), 'milestones'],
    
  exact: false,
  refetchType: 'active',
});
    queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.PM.CONTRACT(id || ''), 'payments'] ,
  exact: false,
  refetchType: 'active',
});
  };

  return (
    <PageContainer
      title={contract?.contract_name || '合同详情'}
      subtitle={contract?.contractNo}
    >
      <DetailPageTemplate
        title=''
        subtitle=''
        detailItemName={contract?.name || contract?.contractNo || '合同详情'}
        breadcrumbs={[
          { label: '首页', href: '/dashboard' },
          { label: '项目管理', href: PM_PATHS.projects },
          { label: '合同', href: PM_PATHS.contracts },
          { label: '合同详情' },
        ]}
        loading={loading}
        error={error ? (error as Error).message : ''}
        backHref={PM_PATHS.contracts}
        onEdit={() => id && navigate(`${PM_PATHS.contracts}/${id}`)}
        tabs={tabs}
        defaultTab='overview'
        infoCard={infoCard}
        onRefresh={handleRefresh}
      />
    </PageContainer>
  );
};

export default PmContractDetailPage;
