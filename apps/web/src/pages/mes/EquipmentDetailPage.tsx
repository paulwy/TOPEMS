import { Typography, Box, InputLabel, Chip, useTheme } from '@mui/material';
import styles from './EquipmentDetailPage.module.css';
import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { QUERY_KEYS, queryClient, CACHE_DURATIONS } from '@/lib/reactQuery';
import { Wrench } from 'lucide-react';
import { equipmentApi, type Equipment } from '@/api/mes';
import type { ApiResponse } from '@/api/client';
import { useNotification } from '@/hooks/useNotification';
import { apiLogger } from '@/utils/logger';
import { designTokens } from '@/theme/tokens';
import { DetailPageTemplate, type TabConfig, type SectionConfig } from '@/components/templates';
import { ConfirmDialog } from '@topems/shared-components';
import { PageContainer } from '@/components/common';
import { MES_PATHS } from '@/module-configs/mes/config';
import i18n from '@/i18n';
import { getChipStatusColor as getStatusColor } from '@/utils/status';

const EquipmentDetailPage: React.FC = () => {
  const theme = useTheme();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error } = useNotification();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const {
    data: equipmentData,
    isPending: loading,
    error: queryError,
  } = useQuery<Equipment | null>({
    queryKey: id ? QUERY_KEYS.MES.EQUIPMENT_DETAIL(id) : ['mes', 'equipment', 'null'],
    queryFn: async () => {
      if (!id) return null;
      const res = await equipmentApi.get(id);
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
  const equipment: Equipment | null = equipmentData ?? null;
  const errorMessage = queryError
    ? i18n.t('mes.equipment_detail_page.notifications.load_error.message')
    : undefined;
  const deleteMutation = useMutation({
    mutationFn: (equipmentId: string) => equipmentApi.delete(equipmentId),
    onSuccess: (res: ApiResponse<string>) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.MES_EQUIPMENT_BASE,
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
      case 'available':
        return i18n.t('mes.equipment_detail_page.status_available');
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
  const formatDate = (date: string | null | undefined) => {
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
            {equipment.code || equipment.equipment_no || '-'}
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
          <Typography sx={{ mt: 0.5 }}>{equipment.type || '-'}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
            {i18n.t('mes.equipment_detail_page.field_manufacturer')}
          </InputLabel>
          <Typography sx={{ mt: 0.5 }}>{equipment.manufacturer || '-'}</Typography>
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
  }, [equipment]);
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
            {i18n.t('mes.equipment_detail_page.field_maintenance_frequency')}
          </InputLabel>
          <Typography sx={{ mt: 0.5 }}>
            {equipment.maintenance_frequency_days ? `${equipment.maintenance_frequency_days}` : '-'}
          </Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
            {i18n.t('mes.equipment_detail_page.field_last_maintenance')}
          </InputLabel>
          <Typography sx={{ mt: 0.5 }}>{formatDate(equipment.last_maintenance_date)}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
            {i18n.t('mes.equipment_detail_page.field_next_maintenance')}
          </InputLabel>
          <Typography sx={{ mt: 0.5 }}>{formatDate(equipment.next_maintenance_date)}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
            {i18n.t('mes.equipment_detail_page.field_warranty_expiry')}
          </InputLabel>
          <Typography sx={{ mt: 0.5 }}>{formatDate(equipment.warranty_expiry_date)}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
            {i18n.t('mes.equipment_detail_page.field_location')}
          </InputLabel>
          <Typography sx={{ mt: 0.5 }}>{equipment.location || '-'}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
            {i18n.t('mes.equipment_detail_page.field_description')}
          </InputLabel>
          <Typography sx={{ mt: 0.5 }}>{equipment.description || '-'}</Typography>
        </Box>
      </Box>
    );
  }, [equipment]);
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
          <Typography sx={{ mt: 0.5 }}>{formatCurrency(equipment.value)}</Typography>
        </Box>
      </Box>
    );
  }, [equipment]);
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
              sx={{
                fontWeight: 'medium',
                mt: 0.5,
                fontFamily: 'monospace',
                fontSize: designTokens.typography.fontSize.scale['0.875rem'],
              }}
            >
              {equipment.id.substring(0, 8)}...
            </Typography>
          </Box>
        </Box>
      ),
    };
  }, [equipment]);
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
    [basicInfoContent, specsContent, purchaseInfoContent]
  );
  const infoCard = useMemo(
    () => ({
      avatar: (
        <Wrench
          size={32}
          color={theme.palette.primary.dark}
        />
      ),
      title: equipment?.name,
      subtitle: equipment?.code || equipment?.equipment_no || undefined,
      tags: [equipment?.type || ''],
      stats: [
        {
          label: i18n.t('mes.equipment_detail_page.field_equipment_category'),
          value: equipment?.type || '-',
        },
        {
          label: i18n.t('mes.equipment_detail_page.field_status'),
          value: getStatusLabel(equipment?.status || ''),
        },
      ],
    }),
    [equipment]
  );
  return (
    <PageContainer
      autoTitle
      autoBreadcrumbs
      headerProps={{
        pageIcon: <Wrench className={styles.il1} />,
        pageGradient: `linear-gradient(135deg, ${theme.palette.warning.main} 0%, ${theme.palette.warning.dark} 100%)`,
      }}
    >
      <DetailPageTemplate
        title=''
        subtitle=''
        detailItemName={
          equipment?.name ||
          equipment?.code ||
          equipment?.equipment_no ||
          equipment?.id ||
          i18n.t('mes.equipment_detail_page.k0')
        }
        backHref={MES_PATHS.equipment}
        loading={loading}
        emptyState={{ show: !loading && !equipment }}
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
