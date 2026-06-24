import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Grid,
  Container,
  Skeleton,
  Divider,
  Paper,
  Avatar,
} from '@mui/material';
import { Button } from '@/components/ui/Button';
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Building2, Phone, Mail, Edit2, Trash2, MapPin } from 'lucide-react';
import { useNotification } from '@/hooks/useNotification';
import { logger } from '@/utils/logger';

interface Contact {
  id: string;
  name: string;
  customer_id: string;
  customer_name: string;
  title?: string;
  phone?: string;
  email?: string;
  address?: string;
  is_primary: boolean;
  notes?: string;
}

const ContactDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error } = useNotification();

  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadContact(id);
    }
  }, [id, loadContact]);

  const loadContact = useCallback(
    async (contactId: string) => {
      setLoading(true);
      try {
        setContact({
          id: contactId,
          name: '张经理',
          customer_id: '1',
          customer_name: '示例科技有限公司',
          title: '采购总监',
          phone: '13800138000',
          email: 'zhang@example.com',
          address: '北京市朝阳区',
          is_primary: true,
          notes: '主要对接人，负责采购决策',
        });
      } catch (err) {
        logger.error('Failed to load contact:', err);
        error('加载联系人信息失败');
      } finally {
        setLoading(false);
      }
    },
    [error]
  );

  const handleDelete = async () => {
    if (!id || !window.confirm('确定要删除此联系人吗？')) return;
    success('联系人删除成功');
    navigate('/crm/contacts');
  };

  if (loading) {
    return (
      <Container
        maxWidth='lg'
        sx={{ py: 3 }}
      >
        <Skeleton
          variant='rectangular'
          height={400}
          sx={{ borderRadius: 2 }}
        />
      </Container>
    );
  }

  if (!contact) {
    return (
      <Container
        maxWidth='lg'
        sx={{ py: 3 }}
      >
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color='text.secondary'>联系人不存在或已被删除</Typography>
          <Button
            variant='outlined'
            sx={{ mt: 2 }}
            onClick={() => navigate('/crm/contacts')}
          >
            返回联系人列表
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container
      maxWidth='lg'
      sx={{ py: 3 }}
    >
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              variant='text'
              onClick={() => navigate('/crm/contacts')}
              startIcon={<ArrowLeft style={{ width: 20, height: 20 }} />}
            >
              返回
            </Button>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ width: 48, height: 48, bgcolor: 'primary.main' }}>
                {contact.name.charAt(0)}
              </Avatar>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography
                    variant='h5'
                    sx={{ fontWeight: 'bold' }}
                  >
                    {contact.name}
                  </Typography>
                  {contact.is_primary && (
                    <Chip
                      label='主要联系人'
                      size='small'
                      color='primary'
                    />
                  )}
                </Box>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {contact.title || '联系人详情'}
                </Typography>
              </Box>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant='outlined'
              startIcon={<Edit2 style={{ width: 18, height: 18 }} />}
              onClick={() => navigate(`/crm/contact/${id}/edit`)}
            >
              编辑
            </Button>
            <Button
              variant='outlined'
              color='error'
              startIcon={<Trash2 style={{ width: 18, height: 18 }} />}
              onClick={handleDelete}
            >
              删除
            </Button>
          </Box>
        </Box>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography
            variant='h6'
            sx={{ fontWeight: 600, mb: 2 }}
          >
            联系信息
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Grid
            container
            spacing={3}
          >
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Building2 style={{ width: 18, height: 18, color: 'grey.500' }} />
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    所属客户
                  </Typography>
                  <Typography
                    variant='body2'
                    sx={{ fontWeight: 500 }}
                  >
                    {contact.customer_name}
                  </Typography>
                </Box>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Phone style={{ width: 18, height: 18, color: 'grey.500' }} />
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    电话
                  </Typography>
                  <Typography
                    variant='body2'
                    sx={{ fontWeight: 500 }}
                  >
                    {contact.phone || '-'}
                  </Typography>
                </Box>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Mail style={{ width: 18, height: 18, color: 'grey.500' }} />
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    邮箱
                  </Typography>
                  <Typography
                    variant='body2'
                    sx={{ fontWeight: 500 }}
                  >
                    {contact.email || '-'}
                  </Typography>
                </Box>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <MapPin style={{ width: 18, height: 18, color: 'grey.500' }} />
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    地址
                  </Typography>
                  <Typography
                    variant='body2'
                    sx={{ fontWeight: 500 }}
                  >
                    {contact.address || '-'}
                  </Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {contact.notes && (
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Typography
              variant='h6'
              sx={{ fontWeight: 600, mb: 2 }}
            >
              备注
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Typography
              variant='body2'
              color='text.secondary'
            >
              {contact.notes}
            </Typography>
          </CardContent>
        </Card>
      )}
    </Container>
  );
};

export default ContactDetailPage;
