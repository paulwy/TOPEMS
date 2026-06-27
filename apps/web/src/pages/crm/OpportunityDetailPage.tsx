import { Chip, Typography, Box, InputLabel, LinearProgress } from '@mui/material';
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TrendingUp, Calendar, DollarSign, Building2, Clock } from 'lucide-react';
import { crmApi } from '@/api/crm';
import type { Opportunity } from '@/api/crm';
import { useNotification } from '@/hooks/useNotification';
import { apiLogger } from '@/utils/logger';
import { DetailPageTemplate, type TabConfig, type SectionConfig } from '@/components/templates';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { PageContainer } from '@/components/common';

const OpportunityDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error } = useNotification();

  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [customerName, setCustomerName] = useState<string>('');

  useEffect(() => {
    if (id) {
      loadOpportunity(id);
    }
  }, [id]);

  const loadOpportunity = async (opportunityId: string) => {
    setLoading(true);
    setErrorMessage(undefined);
    try {
      const res = await crmApi.opportunities.get(opportunityId);
      if (res.success && res.data) {
        setOpportunity(res.data);
        if (res.data.customer_id) {
          const customerRes = await crmApi.customers.get(res.data.customer_id);
          if (customerRes.success && customerRes.data) {
            setCustomerName(customerRes.data.name);
          }
        }
      } else {
        throw new Error(res.message || '加载商机信息失败');
      }
    } catch (err: unknown) {
      apiLogger.error('Failed to load opportunity:', err);
      setErrorMessage('加载商机信息失败');
      error('加载商机信息失败');
    } finally {
      setLoading(false);
    }
  };

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
    const colors: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
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
            <Chip size='small' color={getStageColor(opportunity.stage)} label={getStageLabel(opportunity.stage)} />
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
          <Typography variant='h6' sx={{ fontWeight: 600 }}>
            {opportunity.probability || 0}%
          </Typography>
        </Box>
        {opportunity.probability !== undefined && (
          <Box>
            <Typography variant='body2' color='text.secondary'>
              加权预期金额: {formatMoney(opportunity.value ? opportunity.value * (opportunity.probability / 100) : undefined)}
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
          <Box sx={{ bgcolor: 'grey.100', borderRadius: 2, p: 2 }}>
            <Typography variant='body2' color='text.secondary'>创建时间</Typography>
            <Typography sx={{ fontWeight: 'medium', mt: 0.5 }}>{formatDateTime(opportunity.created_at)}</Typography>
          </Box>
          <Box sx={{ bgcolor: 'grey.100', borderRadius: 2, p: 2 }}>
            <Typography variant='body2' color='text.secondary'>更新时间</Typography>
            <Typography sx={{ fontWeight: 'medium', mt: 0.5 }}>{formatDateTime(opportunity.updated_at)}</Typography>
          </Box>
          <Box sx={{ bgcolor: 'grey.100', borderRadius: 2, p: 2 }}>
            <Typography variant='body2' color='text.secondary'>商机ID</Typography>
            <Typography sx={{ fontWeight: 'medium', mt: 0.5, fontFamily: 'monospace', fontSize: '0.875rem' }}>
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
          color='#1976d2'
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
          value: formatMoney(opportunity?.value && opportunity?.probability ? opportunity.value * (opportunity.probability / 100) : undefined),
        },
      ],
    }),
    [opportunity, customerName]
  );

  const handleDelete = async () => {
    if (!id) return;
    try {
      const res = await crmApi.opportunities.delete(id);
      if (res.success) {
        success('商机删除成功');
        navigate('/crm/opportunities');
      }
    } catch (err: unknown) {
      apiLogger.error('Failed to delete opportunity:', err);
      error('删除商机失败');
    }
    setDeleteDialogOpen(false);
  };

  return (
    <PageContainer title='商机详情' subtitle='查看和编辑商机信息'>
      <DetailPageTemplate
        title=''
        subtitle=''
        backHref='/crm/opportunities'
        loading={loading}
        error={errorMessage}
        onEdit={() => navigate(`/crm/opportunities/${id}`)}
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