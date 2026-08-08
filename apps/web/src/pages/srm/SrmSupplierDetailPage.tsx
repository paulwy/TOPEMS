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

const SrmSupplierDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const supplierQuery = useQuery<Supplier | null>({
    queryKey: QUERY_KEYS.SRM.SUPPLIER(id || ''),
    queryFn: async () => {
      if (!id) throw new Error('供应商ID为空');
      const res = await srmApi.getSupplier(id);
      if (res.success && res.data) return res.data;
      throw new Error(res.message || '加载供应商信息失败');
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });

  const supplier = supplierQuery.data ?? null;
  const loading = supplierQuery.isLoading;
  const error = supplierQuery.isError
    ? supplierQuery.error instanceof Error
      ? supplierQuery.error.message
      : '加载供应商信息失败'
    : null;

  useEffect(() => {
    if (supplierQuery.isError) {
      apiLogger.error('加载供应商信息失败', supplierQuery.error);
    }
  }, [supplierQuery.isError, supplierQuery.error]);

  const statusColors: Record<string, string> = {
    active: 'success',
    inactive: 'error',
    pending: 'warning',
  };

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
          color='#fff'
        />
      ),
      title: supplier?.name,
      subtitle: supplier?.supplier_no,
      tags: [
        supplier?.status === 'active'
          ? '活跃'
          : supplier?.status === 'inactive'
            ? '停用'
            : '待审核',
      ],
    }),
    [supplier]
  );

  const contactSection = useMemo<SectionConfig>(() => {
    if (!supplier) return { id: 'contact', content: null };
    return {
      id: 'contact',
      title: '联系信息',
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
                <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>联系人</InputLabel>
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
                <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>联系电话</InputLabel>
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
                <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>邮箱</InputLabel>
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
                <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>地址</InputLabel>
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
                <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>官网</InputLabel>
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
      title: '基本信息',
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
              <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>法定名称</InputLabel>
              <Typography sx={{ mt: 0.5 }}>{supplier.legal_name}</Typography>
            </Box>
          )}
          {supplier.tax_id && (
            <Box>
              <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>税号</InputLabel>
              <Typography sx={{ mt: 0.5 }}>{supplier.tax_id}</Typography>
            </Box>
          )}
          <Box>
            <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>品类</InputLabel>
            <Typography sx={{ mt: 0.5 }}>{supplier.category}</Typography>
          </Box>
          <Box>
            <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>风险等级</InputLabel>
            <Box sx={{ mt: 0.5 }}>
              <Chip
                icon={<AlertTriangle sx={{ width: 14, height: 14 }} />}
                label={
                  supplier.risklevel === 'low'
                    ? '低'
                    : supplier.risklevel === 'medium'
                      ? '中'
                      : '高'
                }
                color={riskColors[supplier.risklevel] as React.ComponentProps<typeof Chip>['color']}
                size='small'
              />
            </Box>
          </Box>
          {supplier.credit_rating && (
            <Box>
              <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>信用等级</InputLabel>
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
            <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>创建时间</InputLabel>
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
      <PageContainer title='供应商详情'>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <Typography>加载中...</Typography>
        </Box>
      </PageContainer>
    );
  }

  if (error || !supplier) {
    return (
      <PageContainer title='供应商详情'>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <Typography color='error'>{error || '供应商不存在'}</Typography>
        </Box>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title='供应商详情'
      autoTitle
      autoBreadcrumbs
    >
      <DetailPageTemplate
        title=''
        subtitle=''
        detailItemName={supplier?.name || supplier?.id || '供应商详情'}
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
