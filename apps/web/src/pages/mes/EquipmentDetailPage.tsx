import { Typography, Box, InputLabel, Chip, type ChipProps } from '@mui/material';
import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { QUERY_KEYS, queryClient, CACHE_DURATIONS } from '@/lib/reactQuery';
import { Wrench } from 'lucide-react';
import { assetApi, type Asset } from '@/api/erp';
import { useNotification } from '@/hooks/useNotification';
import { apiLogger } from '@/utils/logger';
import { designTokens } from '@/theme/tokens';
import { DetailPageTemplate, type TabConfig, type SectionConfig } from '@/components/templates';
import { ConfirmDialog } from '@topems/shared-components';
import { PageContainer } from '@/components/common';
import { MES_PATHS } from '@/modules/mes/config';
import i18n from '@/i18n';
import { getChipStatusColor as getStatusColor } from '@/utils/status';

const ct = designTokens.colors;
const EquipmentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error } = useNotification();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const {
    data: equipment,
    isPending: loading,
    error: queryError,
  } = useQuery<Asset | null>({
    queryKey: id ? QUERY_KEYS.MES.EQUIPMENT_DETAIL(id) : ['mes', 'equipment', 'null'],
    queryFn: async () => {
      if (!id) return null;
      const res = await assetApi.get(id);
      if (res.code === 200 && res.data) {
        return res.data;
      }
      throw new Error(
        res.message || i18n.t('mes.equipment_detail_page.notifications.load_error.message')
      );
    },
    enabled: !!id,

    staleTime: CACHE_DURATIONS.MEDIUM,
  });
  const errorMessage = queryError
    ? i18n.t('mes.equipment_detail_page.notifications.load_error.message')
    : undefined;
  const deleteMutation = useMutation({
    mutationFn: (equipmentId: string) => assetApi.delete(equipmentId),
    onSuccess: (res) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.ERP.ASSETS,
        exact: false,
        refetchType: 'active',
      });
      if (res.code === 200) {
        success(i18n.t('mes.equipment_detail_page.notifications.delete_success.message'));
        navigate(MES_PATHS.equipment);
      } else {
        error(
          res.message || i18n.t('mes.equipment_detail_page.notifications.delete_error.message')
        );
      }
    },
    onError: (err: unknown) => {
      apiLogger.error('Failed to delete equipment:', err);
      error(i18n.t('mes.equipment_detail_page.notifications.delete_error.message'));
    },
    onSettled: () => {
      setDeleteDialogOpen(false);
    },
  });
  const handleDelete = () => {
    if (!id) return;
    deleteMutation.mutate(id);
  };
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'idle':
        return i18n.t('mes.equipment_detail_page.status_idle');
      case 'in_use':
        return i18n.t('mes.equipment_detail_page.status_in_use');
      case 'maintenance':
        return i18n.t('mes.equipment_detail_page.status_maintenance');
      case 'scrapped':
        return i18n.t('mes.equipment_detail_page.status_scrapped');
      default:
        return status;
    }
  };
  const formatDate = (date: string | undefined) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('zh-CN');
  };
  const formatCurrency = (amount: number | undefined) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
    }).format(amount);
  };
  const basicInfoContent = useMemo(() => {
    if (!equipment) return null;
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
            {i18n.t('mes.equipment_detail_page.field_equipment_number')}
          </InputLabel>
          <Typography sx={{ fontWeight: 'medium', mt: 0.5 }}>
            {equipment.asset_number || '-'}
          </Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
            {i18n.t('mes.equipment_detail_page.field_equipment_name')}
          </InputLabel>
          <Typography sx={{ fontWeight: 'medium', mt: 0.5 }}>{equipment.name || '-'}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
            {i18n.t('mes.equipment_detail_page.field_equipment_category')}
          </InputLabel>
          <Typography sx={{ mt: 0.5 }}>{equipment.category || '-'}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
            {i18n.t('mes.equipment_detail_page.field_brand')}
          </InputLabel>
          <Typography sx={{ mt: 0.5 }}>{equipment.brand || '-'}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
            {i18n.t('mes.equipment_detail_page.field_model')}
          </InputLabel>
          <Typography sx={{ mt: 0.5 }}>{equipment.model || '-'}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
            {i18n.t('mes.equipment_detail_page.field_status')}
          </InputLabel>
          <Box sx={{ mt: 0.5 }}>
            <Chip
              label={getStatusLabel(equipment.status)}
              color={getStatusColor(equipment.status)}
              size='small'
            />
          </Box>
        </Box>
      </Box>
    );
  }, [equipment, i18n.t]);
  const specsContent = useMemo(() => {
    if (!equipment) return null;
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
            {i18n.t('mes.equipment_detail_page.field_serial_no')}
          </InputLabel>
          <Typography sx={{ mt: 0.5 }}>{equipment.serial_number || '-'}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
            {i18n.t('mes.equipment_detail_page.field_manufacturer')}
          </InputLabel>
          <Typography sx={{ mt: 0.5 }}>{equipment.manufacturer || '-'}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
            {i18n.t('mes.equipment_detail_page.field_rated_power')}
          </InputLabel>
          <Typography sx={{ mt: 0.5 }}>
            {equipment.rated_power ? `${equipment.rated_power} kW` : '-'}
          </Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
            {i18n.t('mes.equipment_detail_page.field_rated_voltage')}
          </InputLabel>
          <Typography sx={{ mt: 0.5 }}>
            {equipment.rated_voltage ? `${equipment.rated_voltage} V` : '-'}
          </Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
            {i18n.t('mes.equipment_detail_page.field_purchase_amount')}
          </InputLabel>
          <Typography sx={{ mt: 0.5 }}>{formatCurrency(equipment.purchase_amount)}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
            {i18n.t('mes.equipment_detail_page.field_location')}
          </InputLabel>
          <Typography sx={{ mt: 0.5 }}>{equipment.location || '-'}</Typography>
        </Box>
      </Box>
    );
  }, [equipment, i18n.t]);
  const purchaseInfoContent = useMemo(() => {
    if (!equipment) return null;
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
            {i18n.t('mes.equipment_detail_page.field_purchase_date')}
          </InputLabel>
          <Typography sx={{ mt: 0.5 }}>{formatDate(equipment.purchase_date)}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
            {i18n.t('mes.equipment_detail_page.field_purchase_amount')}
          </InputLabel>
          <Typography sx={{ mt: 0.5 }}>{formatCurrency(equipment.purchase_amount)}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
            {i18n.t('mes.equipment_detail_page.field_responsible_person')}
          </InputLabel>
          <Typography sx={{ mt: 0.5 }}>{equipment.responsible_id || '-'}</Typography>
        </Box>
      </Box>
    );
  }, [equipment, i18n.t]);
  const footerSection = useMemo<SectionConfig>(() => {
    if (!equipment) return { id: 'footer', content: null };
    return {
      id: 'footer',
      title: i18n.t('mes.equipment_detail_page.section_other_info'),
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
              {i18n.t('mes.equipment_detail_page.field_created_at')}
            </Typography>
            <Typography sx={{ fontWeight: 'medium', mt: 0.5 }}>
              {formatDate(equipment.created_at)}
            </Typography>
          </Box>
          <Box sx={{ bgcolor: 'grey.100', borderRadius: 3, p: 2 }}>
            <Typography
              variant='body2'
              color='text.secondary'
            >
              {i18n.t('mes.equipment_detail_page.field_updated_at')}
            </Typography>
            <Typography sx={{ fontWeight: 'medium', mt: 0.5 }}>
              {formatDate(equipment.updated_at)}
            </Typography>
          </Box>
          <Box sx={{ bgcolor: 'grey.100', borderRadius: 3, p: 2 }}>
            <Typography
              variant='body2'
              color='text.secondary'
            >
              {i18n.t('mes.equipment_detail_page.field_equipment_id')}
            </Typography>
            <Typography
              sx={{ fontWeight: 'medium', mt: 0.5, fontFamily: 'monospace', fontSize: designTokens.typography.fontSize.scale['0.875rem'] }}
            >
              {equipment.id.substring(0, 8)}...
            </Typography>
          </Box>
        </Box>
      ),
    };
  }, [equipment, i18n.t]);
  const tabs = useMemo<TabConfig[]>(
    () => [
      {
        id: 'basic',
        label: i18n.t('mes.equipment_detail_page.tab_basic'),
        content: basicInfoContent || <></>,
      },
      {
        id: 'specs',
        label: i18n.t('mes.equipment_detail_page.tab_specs'),
        content: specsContent || <></>,
      },
      {
        id: 'purchase',
        label: i18n.t('mes.equipment_detail_page.tab_purchase'),
        content: purchaseInfoContent || <></>,
      },
    ],
    [i18n.t, basicInfoContent, specsContent, purchaseInfoContent]
  );
  const infoCard = useMemo(
    () => ({
      avatar: (
        <Wrench
          size={32}
          color={ct.primary.dark}
        />
      ),
      title: equipment?.name,
      subtitle: equipment?.asset_number || undefined,
      tags: [equipment?.category || ''],
      stats: [
        {
          label: i18n.t('mes.equipment_detail_page.field_equipment_category'),
          value: equipment?.category || '-',
        },
        {
          label: i18n.t('mes.equipment_detail_page.field_status'),
          value: getStatusLabel(equipment?.status || ''),
        },
      ],
    }),
    [equipment, i18n.t]
  );
  return (
    <PageContainer
      autoTitle
      autoBreadcrumbs
      headerProps={{
        pageIcon: <Wrench style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.warning.main} 0%, ${ct.warning.dark} 100%)`,
      }}
    >
      <DetailPageTemplate
        title=''
        subtitle=''
        detailItemName={
          equipment?.name ||
          equipment?.asset_number ||
          equipment?.id ||
          i18n.t('mes.equipment_detail_page.k0')
        }
        backHref={MES_PATHS.equipment}
        loading={loading}
        error={errorMessage}
        onEdit={() => navigate(MES_PATHS.equipment)}
        onDelete={() => setDeleteDialogOpen(true)}
        infoCard={infoCard}
        tabs={tabs}
        sections={[footerSection]}
      />
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title={i18n.t('mes.equipment_detail_page.dialog_delete_title')}
        message={i18n.t('mes.equipment_detail_page.dialog_delete_message')}
        danger
      />
    </PageContainer>
  );
};
export default EquipmentDetailPage;
