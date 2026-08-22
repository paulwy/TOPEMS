import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS, CACHE_DURATIONS } from '@/lib/reactQuery';
import {
  Box,
  Typography,
  InputLabel,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { FileText, Calendar, User, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { hrmApi, type Contract } from '@/api/hrm';
import { HRM_PATHS } from '@/modules/hrm/config';
import { DetailPageTemplate, type TabConfig, type SectionConfig } from '@/components/templates';
import { PageContainer } from '@/components/common';
import { designTokens } from '@/theme/tokens';

import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

const ct = designTokens.colors;

const HrmContractDetailPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [showRenewDialog, setShowRenewDialog] = useState(false);

  const contractQuery = useQuery<Contract | null>({
    queryKey: [...QUERY_KEYS.HRM.CONTRACT, id || ''],
    enabled: !!id,
    queryFn: async () => {
      if (!id) {
        throw new Error(t('hrm.hrm_contract_detail_page.text_05b5ba'));
      }
      const res = await hrmApi.contracts.get(id);
      if (!res.success || !res.data) {
        throw new Error(t('hrm.hrm_contract_detail_page.detail'));
      }
      const contractData = res.data;
      const employeeRes = await hrmApi.employees.get(contractData.contract.employee_id);
      return {
        ...contractData.contract,
        employee_name: employeeRes.data?.name || contractData.contract.employee_name || '',
        employee_no: employeeRes.data?.employee_no || contractData.contract.employee_no || '',
        contract_name: contractData.contract.contract_name || t('hrm.hrm_contract_detail_page.e1'),
        department: employeeRes.data?.department_name || contractData.contract.department || '',
        position: employeeRes.data?.position || contractData.contract.position || '',
        probation_period: contractData.contract.probation_period || 0,
        probation_end_date: contractData.contract.probation_end_date || '',
        salary_type: contractData.contract.salary_type || '',
        base_salary: contractData.contract.base_salary || 0,
        currency: contractData.contract.currency || 'CNY',
        work_location: contractData.contract.work_location || '',
        contract_file: contractData.contract.contract_file || '',
        remark: contractData.contract.remark || '',
      };
    },

    staleTime: CACHE_DURATIONS.MEDIUM,
  });

  const contract = contractQuery.data ?? null;
  const loading = contractQuery.isLoading;
  const errorMessage = contractQuery.error ? t('hrm.hrm_contract_detail_page.detail_1') : undefined;

  const handleRenew = () => {
    navigate(HRM_PATHS.contractDetail.replace(':id', id!));
  };

  const getStatusConfig = (status: string) => {
    const config: Record<
      string,
      {
        color: 'success' | 'error' | 'default' | 'warning';
        label: string;
        icon: React.ReactElement;
      }
    > = {
      draft: {
        color: 'default',
        label: t('hrm.hrm_contract_detail_page.text_22b433'),
        icon: <FileText size={14} />,
      },
      pending: {
        color: 'warning',
        label: t('hrm.hrm_contract_detail_page.text_b0bf01'),
        icon: <Clock size={14} />,
      },
      approved: {
        color: 'success',
        label: t('hrm.hrm_contract_detail_page.text_618acb'),
        icon: <CheckCircle2 size={14} />,
      },
      active: {
        color: 'success',
        label: t('hrm.hrm_contract_detail_page.text_c062e3'),
        icon: <CheckCircle2 size={14} />,
      },
      expired: {
        color: 'error',
        label: t('hrm.hrm_contract_detail_page.text_e5b59f'),
        icon: <AlertCircle size={14} />,
      },
      terminated: {
        color: 'error',
        label: t('hrm.hrm_contract_detail_page.text_255412'),
        icon: <AlertCircle size={14} />,
      },
    };
    return config[status] || config.draft;
  };

  const getContractTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      labor: t('hrm.hrm_contract_detail_page.text_46f54e'),
      probation: t('hrm.hrm_contract_detail_page.text_144fe2'),
      project: t('hrm.hrm_contract_detail_page.text_ea048f'),
      outsourcing: t('hrm.hrm_contract_detail_page.text_42e7fe'),
      internship: t('hrm.hrm_contract_detail_page.text_5040bb'),
      part_time: t('hrm.hrm_contract_detail_page.text_a97d2a'),
      other: t('hrm.hrm_contract_detail_page.other'),
    };
    return labels[type] || type;
  };

  const getSalaryTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      monthly: t('hrm.hrm_contract_detail_page.text_4eb9e5'),
      daily: t('hrm.hrm_contract_detail_page.text_2eddda'),
      hourly: t('hrm.hrm_contract_detail_page.text_bae8cf'),
      project: t('hrm.hrm_contract_detail_page.text_66566b'),
      commission: t('hrm.hrm_contract_detail_page.text_2668b2'),
      other: t('hrm.hrm_contract_detail_page.other'),
    };
    return labels[type] || type;
  };

  const formatDate = (date: string | undefined) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('zh-CN');
  };

  const formatCurrency = (amount: number | undefined) => {
    const value = amount || 0;
    return `${value.toLocaleString('zh-CN', { minimumFractionDigits: 2 })} ${contract?.currency || 'CNY'}`;
  };

  const calculateDaysRemaining = () => {
    if (!contract?.end_date) return null;
    const endDate = new Date(contract.end_date);
    const today = new Date();
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const basicInfoContent = useMemo(() => {
    if (!contract) return null;
    const statusConfig = getStatusConfig(contract.status);
    const daysRemaining = calculateDaysRemaining();

    return (
      <Box>
        {daysRemaining !== null && (
          <Box
            sx={{
              mb: 3,
              p: 2,
              borderRadius: 1,
              bgcolor:
                daysRemaining < 30
                  ? 'error.light'
                  : daysRemaining < 90
                    ? 'warning.light'
                    : 'success.light',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            {daysRemaining < 30 ? (
              <AlertCircle sx={{ width: 20, height: 20, color: 'error.main' }} />
            ) : daysRemaining < 90 ? (
              <Clock sx={{ width: 20, height: 20, color: 'warning.main' }} />
            ) : (
              <CheckCircle2 sx={{ width: 20, height: 20, color: 'success.main' }} />
            )}
            <Typography
              variant='body1'
              sx={{ fontWeight: 'medium' }}
            >
              {daysRemaining < 0
                ? t('hrm.hrm_contract_detail_page.e2', { v1: Math.abs(daysRemaining) })
                : daysRemaining === 0
                  ? t('hrm.hrm_contract_detail_page.today')
                  : daysRemaining < 30
                    ? t('hrm.hrm_contract_detail_page.e3', { v1: daysRemaining })
                    : daysRemaining < 90
                      ? t('hrm.hrm_contract_detail_page.e4', { v1: daysRemaining })
                      : t('hrm.hrm_contract_detail_page.e5', { v1: daysRemaining })}
            </Typography>
          </Box>
        )}

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
            gap: 2,
            mb: 3,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <User sx={{ width: 48, height: 48, color: 'primary.main' }} />
            <Box>
              <Typography variant='h6'>{contract.employee_name || '-'}</Typography>
              <Typography
                variant='body2'
                color='text.secondary'
              >
                {contract.employee_no || ''} | {contract.department || ''} |{' '}
                {contract.position || ''}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'flex-end' }}>
            <Chip
              label={statusConfig.label}
              color={statusConfig.color}
              icon={statusConfig.icon}
              sx={{ fontSize: 14, padding: `${designTokens.spacing.xs} ${designTokens.spacing.md}px` }}
            />
          </Box>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
            gap: 2,
          }}
        >
          <Box>
            <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
              {t('hrm.hrm_contract_detail_page.k0')}
            </InputLabel>
            <Typography sx={{ mt: 0.5, fontFamily: 'monospace' }}>
              {contract.contractNo || '-'}
            </Typography>
          </Box>
          <Box>
            <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
              {t('hrm.hrm_contract_detail_page.k1')}
            </InputLabel>
            <Typography sx={{ mt: 0.5 }}>
              {getContractTypeLabel(contract.contract_type || '')}
            </Typography>
          </Box>
          <Box>
            <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
              {t('hrm.hrm_contract_detail_page.k2')}
            </InputLabel>
            <Typography sx={{ mt: 0.5 }}>{contract.contract_name || '-'}</Typography>
          </Box>
        </Box>
      </Box>
    );
  }, [contract]);

  const durationContent = useMemo(() => {
    if (!contract) return null;
    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
          gap: 2,
        }}
      >
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
            {i18n.t('hrm.hrm_contract_detail_page.k3')}
          </InputLabel>
          <Typography sx={{ mt: 0.5 }}>{formatDate(contract.start_date)}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
            {i18n.t('hrm.hrm_contract_detail_page.k4')}
          </InputLabel>
          <Typography sx={{ mt: 0.5 }}>{formatDate(contract.end_date)}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
            {i18n.t('hrm.hrm_contract_detail_page.k5')}
          </InputLabel>
          <Typography sx={{ mt: 0.5 }}>
            {t('hrm.hrm_contract_detail_page.m1', { v1: contract.probation_period || 0 })}
          </Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
            {i18n.t('hrm.hrm_contract_detail_page.k6')}
          </InputLabel>
          <Typography sx={{ mt: 0.5 }}>{formatDate(contract.probation_end_date)}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
            {i18n.t('hrm.hrm_contract_detail_page.k7')}
          </InputLabel>
          <Typography sx={{ mt: 0.5 }}>{contract.work_location || '-'}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
            {i18n.t('hrm.hrm_contract_detail_page.k8')}
          </InputLabel>
          <Typography sx={{ mt: 0.5 }}>{getSalaryTypeLabel(contract.salary_type || '')}</Typography>
        </Box>
      </Box>
    );
  }, [contract]);

  const salaryContent = useMemo(() => {
    if (!contract) return null;
    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
          gap: 2,
        }}
      >
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
            {i18n.t('hrm.hrm_contract_detail_page.k9')}
          </InputLabel>
          <Typography
            variant='h6'
            sx={{ mt: 0.5, color: 'primary.main' }}
          >
            {formatCurrency(contract.base_salary)}
          </Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
            {i18n.t('hrm.hrm_contract_detail_page.k10')}
          </InputLabel>
          <Typography sx={{ mt: 0.5 }}>{contract.currency || 'CNY'}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
            {i18n.t('hrm.hrm_contract_detail_page.k11')}
          </InputLabel>
          <Typography sx={{ mt: 0.5 }}>{contract.remark || '-'}</Typography>
        </Box>
      </Box>
    );
  }, [contract]);

  const tabs = useMemo<TabConfig[]>(
    () => [
      {
        id: 'basic',
        label: t('hrm.hrm_contract_detail_page.info'),
        content: basicInfoContent || <></>,
      },
      {
        id: 'duration',
        label: t('hrm.hrm_contract_detail_page.info_1'),
        content: durationContent || <></>,
      },
      {
        id: 'salary',
        label: t('hrm.hrm_contract_detail_page.info_2'),
        content: salaryContent || <></>,
      },
    ],
    [basicInfoContent, durationContent, salaryContent]
  );

  const infoCard = useMemo(
    () => ({
      avatar: (
        <FileText
          size={32}
          color={ct.primary.dark}
        />
      ),
      title: contract?.contract_name,
      subtitle: contract?.contractNo || undefined,
      tags: [getContractTypeLabel(contract?.contract_type || '')],
      stats: [
        {
          label: i18n.t('hrm.hrm_contract_detail_page.text_2ed392'),
          value: contract?.employee_name || '-',
        },
        {
          label: i18n.t('hrm.hrm_contract_detail_page.status'),
          value: getStatusConfig(contract?.status || '').label,
        },
      ],
    }),
    [contract]
  );

  return (
    <PageContainer
      title={t('hrm.hrm_contract_detail_page.detail_2')}
      subtitle={t('hrm.hrm_contract_detail_page.view')}
    >
      <DetailPageTemplate
        title=''
        subtitle=''
        detailItemName={
          contract?.contract_name ||
          contract?.contractNo ||
          contract?.id ||
          t('hrm.hrm_contract_detail_page.k12')
        }
        backHref={HRM_PATHS.contracts}
        loading={loading}
        error={errorMessage}
        onEdit={() => navigate(HRM_PATHS.contractDetail.replace(':id', id!))}
        infoCard={infoCard}
        tabs={tabs}
        actions={[
          {
            label: t('hrm.hrm_contract_detail_page.text_b53270'),
            icon: <Calendar style={{ width: 18, height: 18 }} />,
            onClick: () => setShowRenewDialog(true),
          },
        ]}
      />

      <Dialog
        open={showRenewDialog}
        onClose={() => setShowRenewDialog(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>{t('hrm.hrm_contract_detail_page.k13')}</DialogTitle>
        <DialogContent>
          <Typography variant='body1'>
            {t('hrm.hrm_contract_detail_page.e1', { v1: contract?.employee_name })}
          </Typography>
          <Box sx={{ mt: 2 }}>
            <Typography
              variant='body2'
              color='text.secondary'
            >
              {t('hrm.hrm_contract_detail_page.r1', { v1: contract?.contractNo })}
            </Typography>
            <Typography
              variant='body2'
              color='text.secondary'
            >
              {t('hrm.hrm_contract_detail_page.r2', { v1: formatDate(contract?.end_date) })}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowRenewDialog(false)}>
            {t('hrm.hrm_contract_detail_page.k14')}
          </Button>
          <Button
            onClick={handleRenew}
            color='primary'
          >
            {t('hrm.hrm_contract_detail_page.e6')}
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default HrmContractDetailPage;
