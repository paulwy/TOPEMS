import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Chip,
  Card,
  CardContent,
  Grid,
  Avatar,
} from '@mui/material';
import {
  Building2,
  Phone,
  Mail,
  MapPin,
  Clock,
  CreditCard,
  AlertTriangle,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { srmApi, type Supplier } from '@/api/srm';
import { SRM_PATHS } from '@/modules/srm/config';
import { apiLogger } from '@/utils/logger';
import { PageContainer } from '@/components/common';

const SrmSupplierDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSupplier();
  }, [id]);

  const loadSupplier = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!id) {
        throw new Error('供应商ID为空');
      }
      const res = await srmApi.getSupplier(id);
      if (res.success && res.data) {
        setSupplier(res.data);
      } else {
        setError(res.message || '加载供应商信息失败');
      }
    } catch (err: unknown) {
      apiLogger.error('加载供应商信息失败', err);
      setError('加载供应商信息失败');
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <PageContainer
      title='供应商详情'
      backButton={{ href: SRM_PATHS.supplier }}
    >
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={4}>
            <Grid size={{ xs: 12, md: 3 }}>
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  bgcolor: 'primary.light',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: 2,
                }}
              >
                <Building2 sx={{ width: 40, height: 40, color: 'primary.main' }} />
              </Box>
              <Typography variant='h5' sx={{ fontWeight: 600 }}>
                {supplier.name}
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                {supplier.supplier_no}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 9 }}>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Chip
                    label={supplier.status === 'active' ? '活跃' : supplier.status === 'inactive' ? '停用' : '待审核'}
                    color={statusColors[supplier.status] as any}
                    size='small'
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Chip
                    icon={<AlertTriangle sx={{ width: 14, height: 14 }} />}
                    label={`风险等级: ${supplier.risklevel === 'low' ? '低' : supplier.risklevel === 'medium' ? '中' : '高'}`}
                    color={riskColors[supplier.risklevel] as any}
                    size='small'
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  {supplier.credit_rating && (
                    <Chip
                      icon={<CreditCard sx={{ width: 14, height: 14 }} />}
                      label={`信用等级: ${supplier.credit_rating}`}
                      size='small'
                    />
                  )}
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant='h6' sx={{ fontWeight: 600, mb: 3 }}>
            联系信息
          </Typography>
          <Grid container spacing={3}>
            {supplier.contact_person && (
              <Grid size={{ xs: 12, sm: 6 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: 'primary.light', width: 32, height: 32 }}>
                    <Building2 sx={{ width: 16, height: 16, color: 'primary.main' }} />
                  </Avatar>
                  <Box>
                    <Typography variant='body2' color='text.secondary'>
                      联系人
                    </Typography>
                    <Typography variant='body1'>{supplier.contact_person}</Typography>
                  </Box>
                </Box>
              </Grid>
            )}
            {supplier.phone && (
              <Grid size={{ xs: 12, sm: 6 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: 'primary.light', width: 32, height: 32 }}>
                    <Phone sx={{ width: 16, height: 16, color: 'primary.main' }} />
                  </Avatar>
                  <Box>
                    <Typography variant='body2' color='text.secondary'>
                      联系电话
                    </Typography>
                    <Typography variant='body1'>{supplier.phone}</Typography>
                  </Box>
                </Box>
              </Grid>
            )}
            {supplier.email && (
              <Grid size={{ xs: 12, sm: 6 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: 'primary.light', width: 32, height: 32 }}>
                    <Mail sx={{ width: 16, height: 16, color: 'primary.main' }} />
                  </Avatar>
                  <Box>
                    <Typography variant='body2' color='text.secondary'>
                      邮箱
                    </Typography>
                    <Typography variant='body1'>{supplier.email}</Typography>
                  </Box>
                </Box>
              </Grid>
            )}
            {supplier.address && (
              <Grid size={{ xs: 12, sm: 6 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: 'primary.light', width: 32, height: 32 }}>
                    <MapPin sx={{ width: 16, height: 16, color: 'primary.main' }} />
                  </Avatar>
                  <Box>
                    <Typography variant='body2' color='text.secondary'>
                      地址
                    </Typography>
                    <Typography variant='body1'>{supplier.address}</Typography>
                  </Box>
                </Box>
              </Grid>
            )}
            {supplier.website && (
              <Grid size={{ xs: 12, sm: 6 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: 'primary.light', width: 32, height: 32 }}>
                    <Building2 sx={{ width: 16, height: 16, color: 'primary.main' }} />
                  </Avatar>
                  <Box>
                    <Typography variant='body2' color='text.secondary'>
                      官网
                    </Typography>
                    <Typography variant='body1'>{supplier.website}</Typography>
                  </Box>
                </Box>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>

      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant='h6' sx={{ fontWeight: 600, mb: 3 }}>
            基本信息
          </Typography>
          <Grid container spacing={3}>
            {supplier.legal_name && (
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant='body2' color='text.secondary'>
                  法定名称
                </Typography>
                <Typography variant='body1'>{supplier.legal_name}</Typography>
              </Grid>
            )}
            {supplier.tax_id && (
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant='body2' color='text.secondary'>
                  税号
                </Typography>
                <Typography variant='body1'>{supplier.tax_id}</Typography>
              </Grid>
            )}
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant='body2' color='text.secondary'>
                品类
              </Typography>
              <Typography variant='body1'>{supplier.category}</Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Clock sx={{ width: 16, height: 16, color: 'text.secondary' }} />
                <Typography variant='body2' color='text.secondary'>
                  创建时间
                </Typography>
              </Box>
              <Typography variant='body1'>{new Date(supplier.created_at).toLocaleString('zh-CN')}</Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </PageContainer>
  );
};

export default SrmSupplierDetailPage;