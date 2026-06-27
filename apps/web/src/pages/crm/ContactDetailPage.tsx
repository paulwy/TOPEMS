import { Chip, Typography, Box, InputLabel } from '@mui/material';
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Phone, Mail, MapPin, Building2 } from 'lucide-react';
import { crmApi } from '@/api/crm';
import type { Contact } from '@/api/crm';
import { useNotification } from '@/hooks/useNotification';
import { apiLogger } from '@/utils/logger';
import { DetailPageTemplate, type TabConfig, type SectionConfig } from '@/components/templates';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { PageContainer } from '@/components/common';

const ContactDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error } = useNotification();

  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [customerName, setCustomerName] = useState<string>('');

  useEffect(() => {
    if (id) {
      loadContact(id);
    }
  }, [id]);

  const loadContact = async (contactId: string) => {
    setLoading(true);
    setErrorMessage(undefined);
    try {
      const res = await crmApi.contacts.get(contactId);
      if (res.success && res.data) {
        setContact(res.data);
        if (res.data.customer_id) {
          const customerRes = await crmApi.customers.get(res.data.customer_id);
          if (customerRes.success && customerRes.data) {
            setCustomerName(customerRes.data.name);
          }
        }
      } else {
        throw new Error(res.message || '加载联系人信息失败');
      }
    } catch (err: unknown) {
      apiLogger.error('Failed to load contact:', err);
      setErrorMessage('加载联系人信息失败');
      error('加载联系人信息失败');
    } finally {
      setLoading(false);
    }
  };

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
          <Box sx={{ bgcolor: 'grey.100', borderRadius: 2, p: 2 }}>
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
          <Box sx={{ bgcolor: 'grey.100', borderRadius: 2, p: 2 }}>
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
          <Box sx={{ bgcolor: 'grey.100', borderRadius: 2, p: 2 }}>
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
          color='#1976d2'
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
      const res = await crmApi.contacts.delete(id);
      if (res.success) {
        success('联系人删除成功');
        navigate('/crm/contacts');
      }
    } catch (err: unknown) {
      apiLogger.error('Failed to delete contact:', err);
      error('删除联系人失败');
    }
    setDeleteDialogOpen(false);
  };

  return (
    <PageContainer
      title='联系人详情'
      subtitle='查看和编辑联系人信息'
    >
      <DetailPageTemplate
        title=''
        subtitle=''
        backHref='/crm/contacts'
        loading={loading}
        error={errorMessage}
        onEdit={() => navigate(`/crm/contacts/${id}`)}
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
