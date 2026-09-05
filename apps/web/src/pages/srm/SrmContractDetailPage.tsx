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
import { designTokens } from '@topems/tokens';
import i18n from '@/i18n';

const statusLabels: Record<string, string> = {
  pending: i18n.t('pages.srm_contract_detail_page.k4'),
  signed: i18n.t('pages.srm_contract_detail_page.k5'),
  expired: i18n.t('pages.srm_contract_detail_page.k6'),
  terminated: i18n.t('pages.srm_contract_detail_page.k7'),
  active: i18n.t('pages.srm_contract_detail_page.k8'),
};

const SrmContractDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const contractQuery = useQuery<SupplierContract | null>({
    queryKey: QUERY_KEYS.SRM.CONTRACT(id || ''),
    queryFn: async () => {
      if (!id) throw new Error(i18n.t('pages.srm_contract_detail_page.id_0'));
      const res = await srmApi.getContract(id);
      if (res.success && res.data) return res.data;
      throw new Error(res.message || i18n.t('pages.srm_contract_detail_page.k1'));
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });

  const contract = contractQuery.data ?? null;
  const loading = contractQuery.isLoading;
  const error = contractQuery.isError
    ? contractQuery.error instanceof Error
      ? contractQuery.error.message
      : i18n.t('pages.srm_contract_detail_page.k2')
    : undefined;

  useEffect(() => {
    if (contractQuery.isError) {
      apiLogger.error(i18n.t('pages.srm_contract_detail_page.k3'), contractQuery.error);
    }
  }, [contractQuery.isError, contractQuery.error]);

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
      title: i18n.t('pages.srm_contract_detail_page.k9'),
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
                <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
                  {i18n.t('pages.srm_contract_detail_page.k10')}
                </InputLabel>
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
                <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
                  {i18n.t('pages.srm_contract_detail_page.k11')}
                </InputLabel>
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
                <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
                  {i18n.t('pages.srm_contract_detail_page.k12')}
                </InputLabel>
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
      title: i18n.t('pages.srm_contract_detail_page.k13'),
      content: (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
            gap: 3,
          }}
        >
          <Box>
            <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
              {i18n.t('pages.srm_contract_detail_page.k14')}
            </InputLabel>
            <Typography sx={{ mt: 0.5 }}>{contract.contract_type}</Typography>
          </Box>
          <Box>
            <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
              {i18n.t('pages.srm_contract_detail_page.k15')}
            </InputLabel>
            <Box sx={{ mt: 0.5 }}>
              <Chip
                icon={<Building2 sx={{ width: 14, height: 14 }} />}
                label={contract.supplier_name || i18n.t('pages.srm_contract_detail_page.k16')}
                size='small'
              />
            </Box>
          </Box>
          <Box>
            <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
              {i18n.t('pages.srm_contract_detail_page.k17')}
            </InputLabel>
            <Box sx={{ mt: 0.5 }}>
              <Chip
                icon={<DollarSign sx={{ width: 14, height: 14 }} />}
                label={`${contract.total_amount?.toLocaleString()} ${contract.currency}`}
                size='small'
              />
            </Box>
          </Box>
          <Box>
            <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
              {i18n.t('pages.srm_contract_detail_page.id_18')}
            </InputLabel>
            <Typography sx={{ mt: 0.5 }}>{contract.supplier_id}</Typography>
          </Box>
          {contract.remarks && (
            <Box sx={{ gridColumn: 'span 2' }}>
              <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
                {i18n.t('pages.srm_contract_detail_page.k19')}
              </InputLabel>
              <Typography sx={{ mt: 0.5 }}>{contract.remarks}</Typography>
            </Box>
          )}
          <Box>
            <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
              {i18n.t('pages.srm_contract_detail_page.k20')}
            </InputLabel>
            <Typography sx={{ mt: 0.5 }}>
              {new Date(contract.created_at).toLocaleString('zh-CN')}
            </Typography>
          </Box>
          <Box>
            <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
              {i18n.t('pages.srm_contract_detail_page.k21')}
            </InputLabel>
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
      <PageContainer title={i18n.t('pages.srm_contract_detail_page.k22')}>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <Typography>{i18n.t('pages.srm_contract_detail_page.k0')}</Typography>
        </Box>
      </PageContainer>
    );
  }

  if (error || !contract) {
    return (
      <PageContainer title={i18n.t('pages.srm_contract_detail_page.k23')}>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <Typography color='error'>
            {error || i18n.t('pages.srm_contract_detail_page.k24')}
          </Typography>
        </Box>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title={i18n.t('pages.srm_contract_detail_page.k25')}
      autoTitle
      autoBreadcrumbs
    >
      <DetailPageTemplate
        title=''
        subtitle=''
        detailItemName={
          contract?.title ||
          contract?.contractNo ||
          contract?.id ||
          i18n.t('pages.srm_contract_detail_page.k26')
        }
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
