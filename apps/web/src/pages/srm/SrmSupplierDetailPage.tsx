import React, { useEffect, useMemo } from 'react';
import { Box, Typography, Chip, Avatar, InputLabel } from '@mui/material';
import { Building2, Phone, Mail, MapPin, CreditCard, AlertTriangle } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { srmApi, type Supplier } from '@/api/srm';
import { SRM_PATHS } from '@/modules/srm/config';
import { apiLogger } from '@/utils/logger';
import { PageContainer } from '@/components/common';
import { DetailPageTemplate, type SectionConfig } from '@/components/templates';
import { useQuery } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/lib/reactQuery';
import { designTokens } from '@topems/tokens';
import i18n from '@/i18n';

const SrmSupplierDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const supplierQuery = useQuery<Supplier | null>({
    queryKey: QUERY_KEYS.SRM.SUPPLIER(id || ''),
    queryFn: async () => {
      if (!id) throw new Error(i18n.t('pages.srm_supplier_detail_page.id_0'));
      const res = await srmApi.getSupplier(id);
      if (res.success && res.data) return res.data;
      throw new Error(res.message || i18n.t('pages.srm_supplier_detail_page.k1'));
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });

  const supplier = supplierQuery.data ?? null;
  const loading = supplierQuery.isLoading;
  const error = supplierQuery.isError
    ? supplierQuery.error instanceof Error
      ? supplierQuery.error.message
      : i18n.t('pages.srm_supplier_detail_page.k2')
    : null;

  useEffect(() => {
    if (supplierQuery.isError) {
      apiLogger.error(i18n.t('pages.srm_supplier_detail_page.k3'), supplierQuery.error);
    }
  }, [supplierQuery.isError, supplierQuery.error]);

  const riskColors: Record<string, string> = {
    low: 'success',
    medium: 'warning',
    high: 'error',
  };

  const infoCard = useMemo(
    () => ({
      avatar: (
        <Building2
          size={36}
          color={designTokens.colors.background.paper}
        />
      ),
      title: supplier?.name,
      subtitle: supplier?.supplier_no,
      tags: [
        supplier?.status === 'active'
          ? i18n.t('pages.srm_supplier_detail_page.k4')
          : supplier?.status === 'inactive'
            ? i18n.t('pages.srm_supplier_detail_page.k5')
            : i18n.t('pages.srm_supplier_detail_page.k6'),
      ],
    }),
    [supplier]
  );

  const contactSection = useMemo<SectionConfig>(() => {
    if (!supplier) return { id: 'contact', content: null };
    return {
      id: 'contact',
      title: i18n.t('pages.srm_supplier_detail_page.k7'),
      content: (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
            gap: 3,
          }}
        >
          {supplier.contact_person && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: 'primary.light', width: 32, height: 32 }}>
                <Building2 sx={{ width: 16, height: 16, color: 'primary.main' }} />
              </Avatar>
              <Box>
                <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
                  {i18n.t('pages.srm_supplier_detail_page.k8')}
                </InputLabel>
                <Typography sx={{ mt: 0.5 }}>{supplier.contact_person}</Typography>
              </Box>
            </Box>
          )}
          {supplier.phone && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: 'primary.light', width: 32, height: 32 }}>
                <Phone sx={{ width: 16, height: 16, color: 'primary.main' }} />
              </Avatar>
              <Box>
                <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
                  {i18n.t('pages.srm_supplier_detail_page.k9')}
                </InputLabel>
                <Typography sx={{ mt: 0.5 }}>{supplier.phone}</Typography>
              </Box>
            </Box>
          )}
          {supplier.email && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: 'primary.light', width: 32, height: 32 }}>
                <Mail sx={{ width: 16, height: 16, color: 'primary.main' }} />
              </Avatar>
              <Box>
                <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
                  {i18n.t('pages.srm_supplier_detail_page.k10')}
                </InputLabel>
                <Typography sx={{ mt: 0.5 }}>{supplier.email}</Typography>
              </Box>
            </Box>
          )}
          {supplier.address && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: 'primary.light', width: 32, height: 32 }}>
                <MapPin sx={{ width: 16, height: 16, color: 'primary.main' }} />
              </Avatar>
              <Box>
                <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
                  {i18n.t('pages.srm_supplier_detail_page.k11')}
                </InputLabel>
                <Typography sx={{ mt: 0.5 }}>{supplier.address}</Typography>
              </Box>
            </Box>
          )}
          {supplier.website && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: 'primary.light', width: 32, height: 32 }}>
                <Building2 sx={{ width: 16, height: 16, color: 'primary.main' }} />
              </Avatar>
              <Box>
                <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
                  {i18n.t('pages.srm_supplier_detail_page.k12')}
                </InputLabel>
                <Typography sx={{ mt: 0.5 }}>{supplier.website}</Typography>
              </Box>
            </Box>
          )}
        </Box>
      ),
    };
  }, [supplier]);

  const basicInfoSection = useMemo<SectionConfig>(() => {
    if (!supplier) return { id: 'basic', content: null };
    return {
      id: 'basic',
      title: i18n.t('pages.srm_supplier_detail_page.k13'),
      content: (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
            gap: 3,
          }}
        >
          {supplier.legal_name && (
            <Box>
              <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
                {i18n.t('pages.srm_supplier_detail_page.k14')}
              </InputLabel>
              <Typography sx={{ mt: 0.5 }}>{supplier.legal_name}</Typography>
            </Box>
          )}
          {supplier.tax_id && (
            <Box>
              <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
                {i18n.t('pages.srm_supplier_detail_page.k15')}
              </InputLabel>
              <Typography sx={{ mt: 0.5 }}>{supplier.tax_id}</Typography>
            </Box>
          )}
          <Box>
            <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
              {i18n.t('pages.srm_supplier_detail_page.k16')}
            </InputLabel>
            <Typography sx={{ mt: 0.5 }}>{supplier.category}</Typography>
          </Box>
          <Box>
            <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
              {i18n.t('pages.srm_supplier_detail_page.k17')}
            </InputLabel>
            <Box sx={{ mt: 0.5 }}>
              <Chip
                icon={<AlertTriangle sx={{ width: 14, height: 14 }} />}
                label={
                  supplier.risklevel === 'low'
                    ? i18n.t('pages.srm_supplier_detail_page.k18')
                    : supplier.risklevel === 'medium'
                      ? i18n.t('pages.srm_supplier_detail_page.k19')
                      : i18n.t('pages.srm_supplier_detail_page.k20')
                }
                color={riskColors[supplier.risklevel] as React.ComponentProps<typeof Chip>['color']}
                size='small'
              />
            </Box>
          </Box>
          {supplier.credit_rating && (
            <Box>
              <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
                {i18n.t('pages.srm_supplier_detail_page.k21')}
              </InputLabel>
              <Box sx={{ mt: 0.5 }}>
                <Chip
                  icon={<CreditCard sx={{ width: 14, height: 14 }} />}
                  label={supplier.credit_rating}
                  size='small'
                />
              </Box>
            </Box>
          )}
          <Box>
            <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
              {i18n.t('pages.srm_supplier_detail_page.k22')}
            </InputLabel>
            <Typography sx={{ mt: 0.5 }}>
              {new Date(supplier.created_at).toLocaleString('zh-CN')}
            </Typography>
          </Box>
        </Box>
      ),
    };
  }, [supplier]);

  if (loading) {
    return (
      <PageContainer title={i18n.t('pages.srm_supplier_detail_page.k23')}>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <Typography>{i18n.t('pages.srm_supplier_detail_page.k0')}</Typography>
        </Box>
      </PageContainer>
    );
  }

  if (error || !supplier) {
    return (
      <PageContainer title={i18n.t('pages.srm_supplier_detail_page.k24')}>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <Typography color='error'>
            {error || i18n.t('pages.srm_supplier_detail_page.k25')}
          </Typography>
        </Box>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title={i18n.t('pages.srm_supplier_detail_page.k26')}
      autoTitle
      autoBreadcrumbs
    >
      <DetailPageTemplate
        title=''
        subtitle=''
        detailItemName={
          supplier?.name || supplier?.id || i18n.t('pages.srm_supplier_detail_page.k27')
        }
        backHref={SRM_PATHS.supplier}
        loading={loading}
        error={error || undefined}
        infoCard={infoCard}
        sections={[contactSection, basicInfoSection]}
      />
    </PageContainer>
  );
};

export default SrmSupplierDetailPage;
