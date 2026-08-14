import React, { useEffect, useMemo } from 'react';
import { Box, Typography, Chip, Avatar, InputLabel } from '@mui/material';
import { FileText, Building2, Calendar, DollarSign } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { srmApi, type SupplierContract } from '@/api/srm';
import { SRM_PATHS } from '@/modules/srm/config';
import { apiLogger } from '@/utils/logger';
import { PageContainer } from '@/components/common';
import { DetailPageTemplate, type SectionConfig } from '@/components/templates';
import { useQuery } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/lib/reactQuery';
import { designTokens, semanticTokens } from '@topems/tokens';

const SrmContractDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const contractQuery = useQuery<SupplierContract | null>({
    queryKey: QUERY_KEYS.SRM.CONTRACT(id || ''),
    queryFn: async () => {
      if (!id) throw new Error('合同ID为空');
      const res = await srmApi.getContract(id);
      if (res.success && res.data) return res.data;
      throw new Error(res.message || '加载合同信息失败');
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });

  const contract = contractQuery.data ?? null;
  const loading = contractQuery.isLoading;
  const error = contractQuery.isError
    ? contractQuery.error instanceof Error
      ? contractQuery.error.message
      : '加载合同信息失败'
    : undefined;

  useEffect(() => {
    if (contractQuery.isError) {
      apiLogger.error('加载合同信息失败', contractQuery.error);
    }
  }, [contractQuery.isError, contractQuery.error]);

  const statusColors: Record<string, string> = {
    pending: 'warning',
    signed: 'success',
    expired: 'error',
    terminated: 'error',
    active: 'success',
  };

  const statusLabels: Record<string, string> = {
    pending: '待签署',
    signed: '已签署',
    expired: '已到期',
    terminated: '已终止',
    active: '履行中',
  };

  const infoCard = useMemo(
    () => ({
      avatar: (
        <FileText
          size={36}
          color={designTokens.colors.background.paper}
        />
      ),
      title: contract?.title || undefined,
      subtitle: contract?.contractNo || undefined,
      tags: [statusLabels[contract?.status || ''] || contract?.status || undefined].filter(
        (t): t is string => t !== undefined
      ),
    }),
    [contract]
  );

  const timeSection = useMemo<SectionConfig>(() => {
    if (!contract) return { id: 'time', content: null };
    return {
      id: 'time',
      title: '时间信息',
      content: (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
            gap: 3,
          }}
        >
          {contract.sign_date && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: 'primary.light', width: 32, height: 32 }}>
                <Calendar sx={{ width: 16, height: 16, color: 'primary.main' }} />
              </Avatar>
              <Box>
                <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>签署日期</InputLabel>
                <Typography sx={{ mt: 0.5 }}>
                  {new Date(contract.sign_date).toLocaleDateString('zh-CN')}
                </Typography>
              </Box>
            </Box>
          )}
          {contract.start_date && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: 'primary.light', width: 32, height: 32 }}>
                <Calendar sx={{ width: 16, height: 16, color: 'primary.main' }} />
              </Avatar>
              <Box>
                <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>开始日期</InputLabel>
                <Typography sx={{ mt: 0.5 }}>
                  {new Date(contract.start_date).toLocaleDateString('zh-CN')}
                </Typography>
              </Box>
            </Box>
          )}
          {contract.end_date && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: 'primary.light', width: 32, height: 32 }}>
                <Calendar sx={{ width: 16, height: 16, color: 'primary.main' }} />
              </Avatar>
              <Box>
                <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>结束日期</InputLabel>
                <Typography sx={{ mt: 0.5 }}>
                  {new Date(contract.end_date).toLocaleDateString('zh-CN')}
                </Typography>
              </Box>
            </Box>
          )}
        </Box>
      ),
    };
  }, [contract]);

  const contractInfoSection = useMemo<SectionConfig>(() => {
    if (!contract) return { id: 'contract', content: null };
    return {
      id: 'contract',
      title: '合同信息',
      content: (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
            gap: 3,
          }}
        >
          <Box>
            <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>合同类型</InputLabel>
            <Typography sx={{ mt: 0.5 }}>{contract.contract_type}</Typography>
          </Box>
          <Box>
            <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>供应商</InputLabel>
            <Box sx={{ mt: 0.5 }}>
              <Chip
                icon={<Building2 sx={{ width: 14, height: 14 }} />}
                label={contract.supplier_name || '未知供应商'}
                size='small'
              />
            </Box>
          </Box>
          <Box>
            <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>合同金额</InputLabel>
            <Box sx={{ mt: 0.5 }}>
              <Chip
                icon={<DollarSign sx={{ width: 14, height: 14 }} />}
                label={`${contract.total_amount?.toLocaleString()} ${contract.currency}`}
                size='small'
              />
            </Box>
          </Box>
          <Box>
            <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>供应商ID</InputLabel>
            <Typography sx={{ mt: 0.5 }}>{contract.supplier_id}</Typography>
          </Box>
          {contract.remarks && (
            <Box sx={{ gridColumn: 'span 2' }}>
              <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>备注</InputLabel>
              <Typography sx={{ mt: 0.5 }}>{contract.remarks}</Typography>
            </Box>
          )}
          <Box>
            <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>创建时间</InputLabel>
            <Typography sx={{ mt: 0.5 }}>
              {new Date(contract.created_at).toLocaleString('zh-CN')}
            </Typography>
          </Box>
          <Box>
            <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>更新时间</InputLabel>
            <Typography sx={{ mt: 0.5 }}>
              {new Date(contract.updated_at).toLocaleString('zh-CN')}
            </Typography>
          </Box>
        </Box>
      ),
    };
  }, [contract]);

  if (loading) {
    return (
      <PageContainer title='合同详情'>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <Typography>加载中...</Typography>
        </Box>
      </PageContainer>
    );
  }

  if (error || !contract) {
    return (
      <PageContainer title='合同详情'>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <Typography color='error'>{error || '合同不存在'}</Typography>
        </Box>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title='合同详情'
      autoTitle
      autoBreadcrumbs
    >
      <DetailPageTemplate
        title=''
        subtitle=''
        detailItemName={contract?.title || contract?.contractNo || contract?.id || '合同详情'}
        backHref={SRM_PATHS.contract}
        loading={loading}
        error={error || undefined}
        infoCard={infoCard}
        sections={[timeSection, contractInfoSection]}
      />
    </PageContainer>
  );
};

export default SrmContractDetailPage;
