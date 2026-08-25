import { Chip, Typography, Box, InputLabel } from '@mui/material';
import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Phone, Building2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { crmApi } from '@/api/crm';
import type { Contact } from '@/api/crm';
import { apiLogger } from '@/utils/logger';
import { DetailPageTemplate, type TabConfig, type SectionConfig } from '@/components/templates';
import { ConfirmDialog } from '@topems/shared-components';
import { CRM_PATHS } from '@/modules/crm/config';
import { PageContainer } from '@/components/common';
import { designTokens } from '@/theme/tokens';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/lib/reactQuery';

const ct = designTokens.colors;

const ContactDetailPage: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const contactQuery = useQuery({
    queryKey: QUERY_KEYS.CRM.CONTACT(id || ''),
    queryFn: () => crmApi.contacts.get(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });

  const customerQuery = useQuery({
    queryKey: QUERY_KEYS.CRM.CUSTOMER(contactQuery.data?.data?.customer_id || ''),
    queryFn: () => crmApi.customers.get(contactQuery.data!.data!.customer_id!),
    enabled: !!contactQuery.data?.data?.customer_id,
    staleTime: 5 * 60 * 1000,
  });

  const deleteMutation = useMutation({
    mutationFn: (contactId: string) => crmApi.contacts.delete(contactId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.CRM.CONTACTS,
        exact: false,
        refetchType: 'active',
      });
      navigate(CRM_PATHS.contacts);
    },
  });

  const contact =
    contactQuery.data?.success && contactQuery.data.data ? contactQuery.data.data : null;
  const customerName =
    customerQuery.data?.success && customerQuery.data.data ? customerQuery.data.data.name : '';
  const loading = contactQuery.isLoading;
  const errorMessage = contactQuery.isError ? t('crm.contactDetail.error_load') : undefined;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('zh-CN');
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<
      string,
      {
        label: string;
        color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
      }
    > = {
      active: { label: t('crm.contactDetail.status_active'), color: 'success' },
      inactive: { label: t('crm.contactDetail.status_inactive'), color: 'default' },
    };
    const s = statusMap[status] || { label: status, color: 'default' };
    return (
      <Chip
        size='small'
        color={s.color}
        label={s.label}
      />
    );
  };

  const basicInfoContent = useMemo(() => {
    if (!contact) return null;
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
            {t('crm.contactDetail.field_name')}
          </InputLabel>
          <Typography sx={{ fontWeight: 'medium', mt: 0.5 }}>
            {contact.last_name ? `${contact.last_name}${contact.first_name}` : contact.first_name}
          </Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
            {t('crm.contactDetail.field_customer')}
          </InputLabel>
          <Typography sx={{ mt: 0.5 }}>{customerName || '-'}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
            {t('crm.contactDetail.field_position')}
          </InputLabel>
          <Typography sx={{ mt: 0.5 }}>{contact.position || '-'}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
            {t('crm.contactDetail.field_phone')}
          </InputLabel>
          <Typography sx={{ mt: 0.5 }}>{contact.phone || '-'}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
            {t('crm.contactDetail.field_email')}
          </InputLabel>
          <Typography sx={{ mt: 0.5 }}>{contact.email || '-'}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
            {t('crm.contactDetail.field_status')}
          </InputLabel>
          <Box sx={{ mt: 0.5 }}>{getStatusBadge(contact.status)}</Box>
        </Box>
        {contact.notes && (
          <Box sx={{ gridColumn: 'span 3', mt: 2 }}>
            <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
              {t('crm.contactDetail.field_notes')}
            </InputLabel>
            <Typography sx={{ mt: 0.5, color: 'text.secondary' }}>{contact.notes}</Typography>
          </Box>
        )}
      </Box>
    );
  }, [contact, customerName, t]);

  const contactInfoContent = useMemo(() => {
    if (!contact) return null;
    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
          gap: 3,
        }}
      >
        <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
          <Typography
            variant='subtitle1'
            sx={{ fontWeight: 600, mb: 2 }}
          >
            <Phone
              size={16}
              style={{ marginRight: 8 }}
            />
            {t('crm.contactDetail.section_contact_method')}
          </Typography>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              py: 1,
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            <Typography color='text.secondary'>{t('crm.contactDetail.field_phone')}</Typography>
            <Typography sx={{ fontWeight: 'medium' }}>{contact.phone || '-'}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
            <Typography color='text.secondary'>{t('crm.contactDetail.field_email')}</Typography>
            <Typography sx={{ fontWeight: 'medium' }}>{contact.email || '-'}</Typography>
          </Box>
        </Box>
        <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
          <Typography
            variant='subtitle1'
            sx={{ fontWeight: 600, mb: 2 }}
          >
            <Building2
              size={16}
              style={{ marginRight: 8 }}
            />
            {t('crm.contactDetail.section_related')}
          </Typography>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              py: 1,
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            <Typography color='text.secondary'>{t('crm.contactDetail.field_customer')}</Typography>
            <Typography sx={{ fontWeight: 'medium' }}>{customerName || '-'}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
            <Typography color='text.secondary'>{t('crm.contactDetail.field_position')}</Typography>
            <Typography sx={{ fontWeight: 'medium' }}>{contact.position || '-'}</Typography>
          </Box>
        </Box>
      </Box>
    );
  }, [contact, customerName, t]);

  const footerSection = useMemo<SectionConfig>(() => {
    if (!contact) return { id: 'footer', content: null };
    return {
      id: 'footer',
      title: t('crm.contactDetail.section_other'),
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
              {formatDate(contact.created_at)}
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
              {formatDate(contact.updated_at)}
            </Typography>
          </Box>
          <Box sx={{ bgcolor: 'grey.100', borderRadius: 3, p: 2 }}>
            <Typography
              variant='body2'
              color='text.secondary'
            >
              {t('crm.contactDetail.field_contact_id')}
            </Typography>
            <Typography
              sx={{
                fontWeight: 'medium',
                mt: 0.5,
                fontFamily: 'monospace',
                fontSize: designTokens.typography.fontSize.scale['0.875rem'],
              }}
            >
              {contact.id.substring(0, 8)}...
            </Typography>
          </Box>
        </Box>
      ),
    };
  }, [contact, t]);

  const tabs = useMemo<TabConfig[]>(
    () => [
      { id: 'basic', label: t('crm.contactDetail.tab_basic'), content: basicInfoContent || <></> },
      {
        id: 'contact',
        label: t('crm.contactDetail.tab_contact'),
        content: contactInfoContent || <></>,
      },
    ],
    [basicInfoContent, contactInfoContent, t]
  );

  const infoCard = useMemo(
    () => ({
      avatar: (
        <User
          size={32}
          color={ct.primary.dark}
        />
      ),
      title: contact
        ? contact.last_name
          ? `${contact.last_name}${contact.first_name}`
          : contact.first_name
        : undefined,
      subtitle: contact?.position || undefined,
      tags: customerName ? [customerName] : [],
    }),
    [contact, customerName]
  );

  const handleDelete = async () => {
    if (!id) return;
    try {
      await deleteMutation.mutateAsync(id);
    } catch (err: unknown) {
      apiLogger.error('Failed to delete contact:', err);
    }
    setDeleteDialogOpen(false);
  };

  return (
    <PageContainer
      title={t('crm.contactDetail.title')}
      subtitle={t('crm.contactDetail.subtitle')}
      autoTitle
      autoBreadcrumbs
    >
      <DetailPageTemplate
        title=''
        subtitle=''
        detailItemName={
          (contact?.last_name ? `${contact.last_name}${contact.first_name || ''}` : '') ||
          contact?.id ||
          t('crm.contact_detail_page.k0')
        }
        backHref={CRM_PATHS.contacts}
        loading={loading}
        error={errorMessage}
        onEdit={() => navigate(CRM_PATHS.contactDetail.replace(':id', id!))}
        onDelete={() => setDeleteDialogOpen(true)}
        infoCard={infoCard}
        tabs={tabs}
        sections={[footerSection]}
      />
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title={t('crm.contactDetail.dialog_delete_title')}
        message={t('crm.contactDetail.dialog_delete_message')}
        danger
      />
    </PageContainer>
  );
};

export default ContactDetailPage;
