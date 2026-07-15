import { Chip, Typography, Box, InputLabel, LinearProgress } from '@mui/material';
import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TrendingUp } from 'lucide-react';
import { crmApi } from '@/api/crm';
import { apiLogger } from '@/utils/logger';
import { DetailPageTemplate, type TabConfig, type SectionConfig } from '@/components/templates';
import { ConfirmDialog } from '@topems/shared-components';
import { CRM_PATHS } from '@/modules/crm/config';
import { PageContainer } from '@/components/common';
import { designTokens } from '@/theme/tokens';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';

const ct = designTokens.colors;

const OpportunityDetailPage: React.FC = () => {
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
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CRM.OPPORTUNITIES });
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
  const errorMessage = opportunityQuery.isError ? '加载商机信息失败' : undefined;

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
      prospecting: '线索',
      qualified: '资格确认',
      proposal: '方案报价',
      negotiation: '谈判审核',
      closed_won: '赢单',
      closed_lost: '输单',
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
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>商机名称</InputLabel>
          <Typography sx={{ fontWeight: 'medium', mt: 0.5 }}>{opportunity.name}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>商机金额</InputLabel>
          <Typography sx={{ fontWeight: 'medium', mt: 0.5, color: 'primary.main' }}>
            {formatMoney(opportunity.value)}
          </Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>阶段</InputLabel>
          <Box sx={{ mt: 0.5 }}>
            <Chip
              size='small'
              color={getStageColor(opportunity.stage)}
              label={getStageLabel(opportunity.stage)}
            />
          </Box>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>所属客户</InputLabel>
          <Typography sx={{ mt: 0.5 }}>{customerName || opportunity.customer_id || '-'}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>预计成交日期</InputLabel>
          <Typography sx={{ mt: 0.5 }}>{formatDate(opportunity.close_date)}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>成交概率</InputLabel>
          <Typography sx={{ mt: 0.5 }}>{opportunity.probability || 0}%</Typography>
        </Box>
        {opportunity.notes && (
          <Box sx={{ gridColumn: 'span 3', mt: 2 }}>
            <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>备注</InputLabel>
            <Typography sx={{ mt: 0.5, color: 'text.secondary' }}>{opportunity.notes}</Typography>
          </Box>
        )}
      </Box>
    );
  }, [opportunity, customerName]);

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
              加权预期金额:{' '}
              {formatMoney(
                opportunity.value ? opportunity.value * (opportunity.probability / 100) : undefined
              )}
            </Typography>
          </Box>
        )}
      </Box>
    );
  }, [opportunity]);

  const footerSection = useMemo<SectionConfig>(() => {
    if (!opportunity) return { id: 'footer', content: null };
    return {
      id: 'footer',
      title: '其他信息',
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
              创建时间
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
              更新时间
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
              商机ID
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
  }, [opportunity]);

  const tabs = useMemo<TabConfig[]>(
    () => [
      { id: 'basic', label: '基本信息', content: basicInfoContent || <></> },
      { id: 'probability', label: '成交概率', content: probabilityContent || <></> },
    ],
    [basicInfoContent, probabilityContent]
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
        { label: '商机金额', value: formatMoney(opportunity?.value) },
        { label: '成交概率', value: `${opportunity?.probability || 0}%` },
        {
          label: '预期金额',
          value: formatMoney(
            opportunity?.value && opportunity?.probability
              ? opportunity.value * (opportunity.probability / 100)
              : undefined
          ),
        },
      ],
    }),
    [opportunity, customerName]
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
      title='商机详情'
      subtitle='查看和编辑商机信息'
      autoTitle
      autoBreadcrumbs
    >
      <DetailPageTemplate
        title=''
        subtitle=''
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
        title='确认删除'
        message='确定要删除此商机吗？'
        danger
      />
    </PageContainer>
  );
};

export default OpportunityDetailPage;
