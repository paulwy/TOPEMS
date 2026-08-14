import { Chip, Typography, Box, InputLabel, LinearProgress } from '@mui/material';
import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { crmApi } from '@/api/crm';
import { apiLogger } from '@/utils/logger';
import { DetailPageTemplate, type TabConfig, type SectionConfig } from '@/components/templates';
import { ConfirmDialog } from '@topems/shared-components';
import { CRM_PATHS } from '@/modules/crm/config';
import { PageContainer } from '@/components/common';
import { designTokens } from '@/theme/tokens';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/lib/reactQuery';

const ct= designTokens.colors;

const OpportunityDetailPage: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const opportunityQuery = useQuery({
    queryKey: QUERY_KEYS.CRM.OPPORTUNITY(id || ''),
    queryFn: () => crmApi.opportunities.get(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });

  const customerQuery = useQuery({
    queryKey: QUERY_KEYS.CRM.CUSTOMER(opportunityQuery.data?.data?.customer_id || ''),
    queryFn: () => crmApi.customers.get(opportunityQuery.data!.data!.customer_id!),
    enabled: !!opportunityQuery.data?.data?.customer_id,
    staleTime: 5 * 60 * 1000,
  });

  const deleteMutation = useMutation({
    mutationFn: (opportunityId: string) => crmApi.opportunities.delete(opportunityId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CRM.OPPORTUNITIES ,
  exact: false,
  refetchType: 'active',
});
      navigate(CRM_PATHS.opportunities);
    },
  });

  const opportunity =
    opportunityQuery.data?.success && opportunityQuery.data.data
      ? opportunityQuery.data.data
      : null;
  const customerName =
    customerQuery.data?.success && customerQuery.data.data ? customerQuery.data.data.name : '';
  const loading = opportunityQuery.isLoading;
  const errorMessage = opportunityQuery.isError ? t('crm.opportunityDetail.error_load') : undefined;

  const formatMoney = (amount?: number) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
    }).format(amount);
  };

  const formatDate = (date?: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('zh-CN');
  };

  const formatDateTime = (date?: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('zh-CN');
  };

  const getStageLabel = (stage: string) => {
    const stages: Record<string, string> = {
      prospecting: t('crm.opportunityDetail.stage_prospecting'),
      qualified: t('crm.opportunityDetail.stage_qualified'),
      proposal: t('crm.opportunityDetail.stage_proposal'),
      negotiation: t('crm.opportunityDetail.stage_negotiation'),
      closed_won: t('crm.opportunityDetail.stage_closed_won'),
      closed_lost: t('crm.opportunityDetail.stage_closed_lost'),
    };
    return stages[stage] || stage;
  };

  const getStageColor = (stage: string) => {
    const colors: Record<
      string,
      'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'
    > = {
      prospecting: 'default',
      qualified: 'info',
      proposal: 'primary',
      negotiation: 'warning',
      closed_won: 'success',
      closed_lost: 'error',
    };
    return colors[stage] || 'default';
  };

  const basicInfoContent = useMemo(() => {
    if (!opportunity) return null;
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
            {t('crm.opportunityDetail.field_name')}
          </InputLabel>
          <Typography sx={{ fontWeight: 'medium', mt: 0.5 }}>{opportunity.name}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
            {t('crm.opportunityDetail.field_amount')}
          </InputLabel>
          <Typography sx={{ fontWeight: 'medium', mt: 0.5, color: 'primary.main' }}>
            {formatMoney(opportunity.value)}
          </Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
            {t('crm.opportunityDetail.field_stage')}
          </InputLabel>
          <Box sx={{ mt: 0.5 }}>
            <Chip
              size='small'
              color={getStageColor(opportunity.stage)}
              label={getStageLabel(opportunity.stage)}
            />
          </Box>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
            {t('crm.opportunityDetail.field_customer')}
          </InputLabel>
          <Typography sx={{ mt: 0.5 }}>{customerName || opportunity.customer_id || '-'}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
            {t('crm.opportunityDetail.field_close_date')}
          </InputLabel>
          <Typography sx={{ mt: 0.5 }}>{formatDate(opportunity.close_date)}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
            {t('crm.opportunityDetail.field_probability')}
          </InputLabel>
          <Typography sx={{ mt: 0.5 }}>{opportunity.probability || 0}%</Typography>
        </Box>
        {opportunity.notes && (
          <Box sx={{ gridColumn: 'span 3', mt: 2 }}>
            <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
              {t('crm.opportunityDetail.field_notes')}
            </InputLabel>
            <Typography sx={{ mt: 0.5, color: 'text.secondary' }}>{opportunity.notes}</Typography>
          </Box>
        )}
      </Box>
    );
  }, [opportunity, customerName, t]);

  const probabilityContent = useMemo(() => {
    if (!opportunity) return null;
    return (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <LinearProgress
            variant='determinate'
            value={opportunity.probability || 0}
            sx={{ flex: 1, height: 10, borderRadius: 5 }}
          />
          <Typography
            variant='h6'
            sx={{ fontWeight: 600 }}
          >
            {opportunity.probability || 0}%
          </Typography>
        </Box>
        {opportunity.probability !== undefined && (
          <Box>
            <Typography
              variant='body2'
              color='text.secondary'
            >
              {t('crm.opportunityDetail.weighted_expected_amount')}{' '}
              {formatMoney(
                opportunity.value ? opportunity.value * (opportunity.probability / 100) : undefined
              )}
            </Typography>
          </Box>
        )}
      </Box>
    );
  }, [opportunity, t]);

  const footerSection = useMemo<SectionConfig>(() => {
    if (!opportunity) return { id: 'footer', content: null };
    return {
      id: 'footer',
      title: t('crm.opportunityDetail.section_other'),
      content: (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
            gap: 2,
          }}
        >
          <Box sx={{ bgcolor: 'grey.100', borderRadius: 3, p: 2 }}>
            <Typography
              variant='body2'
              color='text.secondary'
            >
              {t('crm.common.create_time')}
            </Typography>
            <Typography sx={{ fontWeight: 'medium', mt: 0.5 }}>
              {formatDateTime(opportunity.created_at)}
            </Typography>
          </Box>
          <Box sx={{ bgcolor: 'grey.100', borderRadius: 3, p: 2 }}>
            <Typography
              variant='body2'
              color='text.secondary'
            >
              {t('crm.common.update_time')}
            </Typography>
            <Typography sx={{ fontWeight: 'medium', mt: 0.5 }}>
              {formatDateTime(opportunity.updated_at)}
            </Typography>
          </Box>
          <Box sx={{ bgcolor: 'grey.100', borderRadius: 3, p: 2 }}>
            <Typography
              variant='body2'
              color='text.secondary'
            >
              {t('crm.opportunityDetail.field_opportunity_id')}
            </Typography>
            <Typography
              sx={{ fontWeight: 'medium', mt: 0.5, fontFamily: 'monospace', fontSize: '0.875rem' }}
            >
              {opportunity.id.substring(0, 8)}...
            </Typography>
          </Box>
        </Box>
      ),
    };
  }, [opportunity, t]);

  const tabs = useMemo<TabConfig[]>(
    () => [
      {
        id: 'basic',
        label: t('crm.opportunityDetail.tab_basic'),
        content: basicInfoContent || <></>,
      },
      {
        id: 'probability',
        label: t('crm.opportunityDetail.tab_probability'),
        content: probabilityContent || <></>,
      },
    ],
    [basicInfoContent, probabilityContent, t]
  );

  const infoCard = useMemo(
    () => ({
      avatar: (
        <TrendingUp
          size={32}
          color={ct.primary.dark}
        />
      ),
      title: opportunity?.name,
      subtitle: getStageLabel(opportunity?.stage || ''),
      tags: customerName ? [customerName] : [],
      stats: [
        { label: t('crm.opportunityDetail.stat_amount'), value: formatMoney(opportunity?.value) },
        {
          label: t('crm.opportunityDetail.stat_probability'),
          value: `${opportunity?.probability || 0}%`,
        },
        {
          label: t('crm.opportunityDetail.stat_expected'),
          value: formatMoney(
            opportunity?.value && opportunity?.probability
              ? opportunity.value * (opportunity.probability / 100)
              : undefined
          ),
        },
      ],
    }),
    [opportunity, customerName, t]
  );

  const handleDelete = async () => {
    if (!id) return;
    try {
      await deleteMutation.mutateAsync(id);
    } catch (err: unknown) {
      apiLogger.error('Failed to delete opportunity:', err);
    }
  };

  return (
    <PageContainer
      title={t('crm.opportunityDetail.title')}
      subtitle={t('crm.opportunityDetail.subtitle')}
      autoTitle
      autoBreadcrumbs
    >
      <DetailPageTemplate
        title=''
        subtitle=''
        detailItemName={opportunity?.name || opportunity?.id || '商机详情'}
        backHref={CRM_PATHS.opportunities}
        loading={loading}
        error={errorMessage}
        onEdit={() => navigate(CRM_PATHS.opportunityDetail.replace(':id', id!))}
        onDelete={() => setDeleteDialogOpen(true)}
        infoCard={infoCard}
        tabs={tabs}
        sections={[footerSection]}
      />
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title={t('crm.opportunityDetail.dialog_delete_title')}
        message={t('crm.opportunityDetail.dialog_delete_message')}
        danger
      />
    </PageContainer>
  );
};

export default OpportunityDetailPage;
