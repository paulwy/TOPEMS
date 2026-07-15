import { Chip, Typography, Box, InputLabel } from '@mui/material';
import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Phone, Mail, MapPin, Building2 } from 'lucide-react';
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
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CRM.CONTACTS });
      navigate(CRM_PATHS.contacts);
    },
  });

  const contact =
    contactQuery.data?.success && contactQuery.data.data ? contactQuery.data.data : null;
  const customerName =
    customerQuery.data?.success && customerQuery.data.data ? customerQuery.data.data.name : '';
  const loading = contactQuery.isLoading;
  const errorMessage = contactQuery.isError ? '加载联系人信息失败' : undefined;

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
      active: { label: '活跃', color: 'success' },
      inactive: { label: '非活跃', color: 'default' },
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
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>联系人姓名</InputLabel>
          <Typography sx={{ fontWeight: 'medium', mt: 0.5 }}>
            {contact.last_name ? `${contact.last_name}${contact.first_name}` : contact.first_name}
          </Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>所属客户</InputLabel>
          <Typography sx={{ mt: 0.5 }}>{customerName || '-'}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>职位</InputLabel>
          <Typography sx={{ mt: 0.5 }}>{contact.position || '-'}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>电话</InputLabel>
          <Typography sx={{ mt: 0.5 }}>{contact.phone || '-'}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>邮箱</InputLabel>
          <Typography sx={{ mt: 0.5 }}>{contact.email || '-'}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>状态</InputLabel>
          <Box sx={{ mt: 0.5 }}>{getStatusBadge(contact.status)}</Box>
        </Box>
        {contact.notes && (
          <Box sx={{ gridColumn: 'span 3', mt: 2 }}>
            <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>备注</InputLabel>
            <Typography sx={{ mt: 0.5, color: 'text.secondary' }}>{contact.notes}</Typography>
          </Box>
        )}
      </Box>
    );
  }, [contact, customerName]);

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
            联系方式
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
            <Typography color='text.secondary'>电话</Typography>
            <Typography sx={{ fontWeight: 'medium' }}>{contact.phone || '-'}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
            <Typography color='text.secondary'>邮箱</Typography>
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
            关联信息
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
            <Typography color='text.secondary'>所属客户</Typography>
            <Typography sx={{ fontWeight: 'medium' }}>{customerName || '-'}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
            <Typography color='text.secondary'>职位</Typography>
            <Typography sx={{ fontWeight: 'medium' }}>{contact.position || '-'}</Typography>
          </Box>
        </Box>
      </Box>
    );
  }, [contact, customerName]);

  const footerSection = useMemo<SectionConfig>(() => {
    if (!contact) return { id: 'footer', content: null };
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
              {formatDate(contact.created_at)}
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
              {formatDate(contact.updated_at)}
            </Typography>
          </Box>
          <Box sx={{ bgcolor: 'grey.100', borderRadius: 3, p: 2 }}>
            <Typography
              variant='body2'
              color='text.secondary'
            >
              联系人ID
            </Typography>
            <Typography
              sx={{ fontWeight: 'medium', mt: 0.5, fontFamily: 'monospace', fontSize: '0.875rem' }}
            >
              {contact.id.substring(0, 8)}...
            </Typography>
          </Box>
        </Box>
      ),
    };
  }, [contact]);

  const tabs = useMemo<TabConfig[]>(
    () => [
      { id: 'basic', label: '基本信息', content: basicInfoContent || <></> },
      { id: 'contact', label: '联系信息', content: contactInfoContent || <></> },
    ],
    [basicInfoContent, contactInfoContent]
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
      title='联系人详情'
      subtitle='查看和编辑联系人信息'
      autoTitle
      autoBreadcrumbs
    >
      <DetailPageTemplate
        title=''
        subtitle=''
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
        title='确认删除'
        message='确定要删除此联系人吗？'
        danger
      />
    </PageContainer>
  );
};

export default ContactDetailPage;
