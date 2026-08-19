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
import i18n from '@/i18n';
import type { Contract, ContractMilestone, ContractPaymentSchedule } from '@/api/pm';
import { pmApi } from '@/api/pm';
import { DetailPageTemplate, type TabConfig } from '@/components/templates';
import { PageContainer } from '@/components/common';
import { designTokens } from '@/theme/tokens';
import { PM_PATHS } from '@/modules/pm/config';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';
const ct= designTokens.colors;
const getContractStatusLabels = (): Record<string, string> => ({
  draft: i18n.t('pm.pm_contract_detail_page.k0'),
  pending: i18n.t('pm.pm_contract_detail_page.k1'),
  approved: i18n.t('pm.pm_contract_detail_page.k2'),
  active: i18n.t('pm.pm_contract_detail_page.k3'),
  completed: i18n.t('pm.pm_contract_detail_page.k4'),
  cancelled: i18n.t('pm.pm_contract_detail_page.k5'),
});
const STATUS_COLORS: Record<string, { bgcolor: string; color: string }> = {
  draft: { bgcolor: 'grey.100', color: 'grey.700' },
  pending: { bgcolor: 'warning.100', color: ct.yellow[700] },
  approved: { bgcolor: 'secondary.100', color: ct.purple[800] },
  active: { bgcolor: 'success.lighter', color: ct.success[800] },
  completed: { bgcolor: 'primary.100', color: 'primary.800' },
  cancelled: { bgcolor: 'grey.100', color: 'grey.800' },
};
const getContractTypeLabels = (): Record<string, string> => ({
  construction: i18n.t('pm.pm_contract_detail_page.k6'),
  service: i18n.t('pm.pm_contract_detail_page.k7'),
  purchase: i18n.t('pm.pm_contract_detail_page.k8'),
  sales: i18n.t('pm.pm_contract_detail_page.k9'),
});
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
              {i18n.t('pages.pm_contract_detail_page.k0')}
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
              <Typography sx={{ color: 'grey.500' }}>{i18n.t('pm.pm_contract_detail_page.k10')}</Typography>
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
              <Typography sx={{ color: 'grey.500' }}>{i18n.t('pm.pm_contract_detail_page.k11')}</Typography>
              <Typography sx={{ fontWeight: 500, color: 'grey.900' }}>
                {getContractTypeLabels()[contract.contract_type] || contract.contract_type}
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
              <Typography sx={{ color: 'grey.500' }}>{i18n.t('pm.pm_contract_detail_page.k12')}</Typography>
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
              <Typography sx={{ color: 'grey.500' }}>{i18n.t('pm.pm_contract_detail_page.k13')}</Typography>
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
              <Typography sx={{ color: 'grey.500' }}>{i18n.t('pm.pm_contract_detail_page.k14')}</Typography>
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
              {i18n.t('pages.pm_contract_detail_page.k1')}
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
              <Typography sx={{ color: 'grey.500' }}>{i18n.t('pm.pm_contract_detail_page.k15')}</Typography>
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
              <Typography sx={{ color: 'grey.500' }}>{i18n.t('pm.pm_contract_detail_page.k16')}</Typography>
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
              <Typography sx={{ color: 'grey.500' }}>{i18n.t('pm.pm_contract_detail_page.k17')}</Typography>
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
              <Typography sx={{ color: 'grey.500' }}>{i18n.t('pm.pm_contract_detail_page.k18')}</Typography>
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
              {i18n.t('pages.pm_contract_detail_page.k2')}
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
            {i18n.t('pages.pm_contract_detail_page.k3')}
          </Typography>
        </CardHeader>
        <CardContent>
          {milestones.length === 0 ? (
            <Typography sx={{ textAlign: 'center', color: 'grey.500', py: 6 }}>
              {i18n.t('pages.pm_contract_detail_page.k4')}
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
                            ? i18n.t('pm.pm_contract_detail_page.k19')
                            : milestone.status === 'pending'
                              ? i18n.t('pm.pm_contract_detail_page.k20')
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
                        {i18n.t('pages.pm_contract_detail_page.k5')}
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
            {i18n.t('pages.pm_contract_detail_page.k6')}
          </Typography>
        </CardHeader>
        <CardContent sx={{ p: 0 }}>
          {payments.length === 0 ? (
            <Typography sx={{ textAlign: 'center', color: 'grey.500', py: 6 }}>
              {i18n.t('pages.pm_contract_detail_page.k7')}
            </Typography>
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>{i18n.t('pm.pm_contract_detail_page.k21')}</TableCell>
                    <TableCell>{i18n.t('pm.pm_contract_detail_page.k22')}</TableCell>
                    <TableCell>{i18n.t('pm.pm_contract_detail_page.k23')}</TableCell>
                    <TableCell>{i18n.t('pm.pm_contract_detail_page.k24')}</TableCell>
                    <TableCell>{i18n.t('pm.pm_contract_detail_page.k25')}</TableCell>
                    <TableCell>{i18n.t('pm.pm_contract_detail_page.k26')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {payments.map((payment: ContractPaymentSchedule, index: number) => (
                    <TableRow
                      key={payment.id}
                      sx={{ '&:hover': { bgcolor: 'grey.50' } }}
                    >
                      <TableCell sx={{ fontWeight: 500 }}>{i18n.t('pages.pm_contract_detail_page.index1_0')}</TableCell>
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
                            ? i18n.t('pm.pm_contract_detail_page.k27')
                            : payment.status === 'pending'
                              ? i18n.t('pm.pm_contract_detail_page.k28')
                              : payment.status === 'overdue'
                                ? i18n.t('pm.pm_contract_detail_page.k29')
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
        label: i18n.t('pm.pm_contract_detail_page.k30'),
        content: overviewContent,
      },
      {
        id: 'milestones',
        label: i18n.t('pm.pm_contract_detail_page.k31'),
        content: milestonesContent,
      },
      {
        id: 'payments',
        label: i18n.t('pm.pm_contract_detail_page.k32'),
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
        getContractStatusLabels()[statusKey],
        getContractTypeLabels()[contract.contract_type] || contract.contract_type,
      ],
      stats: [
        { label: i18n.t('pm.pm_contract_detail_page.k33'), value: formatCurrency(contract.amount) },
        { label: i18n.t('pm.pm_contract_detail_page.k34'), value: contract.party_a || '-' },
        { label: i18n.t('pm.pm_contract_detail_page.k35'), value: contract.party_b || '-' },
        { label: i18n.t('pm.pm_contract_detail_page.k36'), value: formatDate(contract.sign_date) },
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
      title={contract?.contract_name || i18n.t('pm.pm_contract_detail_page.k37')}
      subtitle={contract?.contractNo}
    >
      <DetailPageTemplate
        title=''
        subtitle=''
        detailItemName={contract?.name || contract?.contractNo || i18n.t('pm.pm_contract_detail_page.k38')}
        breadcrumbs={[
          { label: i18n.t('pm.pm_contract_detail_page.k39'), href: '/dashboard' },
          { label: i18n.t('pm.pm_contract_detail_page.k40'), href: PM_PATHS.projects },
          { label: i18n.t('pm.pm_contract_detail_page.k41'), href: PM_PATHS.contracts },
          { label: i18n.t('pm.pm_contract_detail_page.k42') },
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