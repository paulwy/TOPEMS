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
  FileText,
  Building2,
  Calendar,
  DollarSign,
  Clock,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { srmApi, type SupplierContract } from '@/api/srm';
import { SRM_PATHS } from '@/modules/srm/config';
import { apiLogger } from '@/utils/logger';
import { PageContainer } from '@/components/common';

const SrmContractDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [contract, setContract] = useState<SupplierContract | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadContract();
  }, [id]);

  const loadContract = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!id) {
        throw new Error('合同ID为空');
      }
      const res = await srmApi.getContract(id);
      if (res.success && res.data) {
        setContract(res.data);
      } else {
        setError(res.message || '加载合同信息失败');
      }
    } catch (err: unknown) {
      apiLogger.error('加载合同信息失败', err);
      setError('加载合同信息失败');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <PageContainer title='合同详情'>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <Typography>加载中...</Typography>
        </Box>
      </PageContainer>
    );
  }

  if (error || !contract) {
    return (
      <PageContainer title='合同详情'>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <Typography color='error'>{error || '合同不存在'}</Typography>
        </Box>
      </PageContainer>
    );
  }

  const statusColors: Record<string, string> = {
    pending: 'warning',
    signed: 'success',
    expired: 'error',
    terminated: 'error',
    active: 'success',
  };

  const statusLabels: Record<string, string> = {
    pending: '待签署',
    signed: '已签署',
    expired: '已到期',
    terminated: '已终止',
    active: '履行中',
  };

  return (
    <PageContainer
      title='合同详情'
      backButton={{ href: SRM_PATHS.contract }}
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
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: 2,
                }}
              >
                <FileText sx={{ width: 40, height: 40, color: 'primary.main' }} />
              </Box>
              <Typography variant='h5' sx={{ fontWeight: 600 }}>
                {contract.title}
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                {contract.contract_no}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 9 }}>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Chip
                    label={statusLabels[contract.status] || contract.status}
                    color={statusColors[contract.status] as any}
                    size='small'
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Chip
                    icon={<DollarSign sx={{ width: 14, height: 14 }} />}
                    label={`${contract.total_amount?.toLocaleString()} ${contract.currency}`}
                    size='small'
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Chip
                    icon={<Building2 sx={{ width: 14, height: 14 }} />}
                    label={contract.supplier_name || '未知供应商'}
                    size='small'
                  />
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant='h6' sx={{ fontWeight: 600, mb: 3 }}>
            时间信息
          </Typography>
          <Grid container spacing={3}>
            {contract.sign_date && (
              <Grid size={{ xs: 12, sm: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: 'primary.light', width: 32, height: 32 }}>
                    <Calendar sx={{ width: 16, height: 16, color: 'primary.main' }} />
                  </Avatar>
                  <Box>
                    <Typography variant='body2' color='text.secondary'>
                      签署日期
                    </Typography>
                    <Typography variant='body1'>{new Date(contract.sign_date).toLocaleDateString('zh-CN')}</Typography>
                  </Box>
                </Box>
              </Grid>
            )}
            {contract.start_date && (
              <Grid size={{ xs: 12, sm: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: 'primary.light', width: 32, height: 32 }}>
                    <Calendar sx={{ width: 16, height: 16, color: 'primary.main' }} />
                  </Avatar>
                  <Box>
                    <Typography variant='body2' color='text.secondary'>
                      开始日期
                    </Typography>
                    <Typography variant='body1'>{new Date(contract.start_date).toLocaleDateString('zh-CN')}</Typography>
                  </Box>
                </Box>
              </Grid>
            )}
            {contract.end_date && (
              <Grid size={{ xs: 12, sm: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: 'primary.light', width: 32, height: 32 }}>
                    <Calendar sx={{ width: 16, height: 16, color: 'primary.main' }} />
                  </Avatar>
                  <Box>
                    <Typography variant='body2' color='text.secondary'>
                      结束日期
                    </Typography>
                    <Typography variant='body1'>{new Date(contract.end_date).toLocaleDateString('zh-CN')}</Typography>
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
            合同信息
          </Typography>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant='body2' color='text.secondary'>
                合同类型
              </Typography>
              <Typography variant='body1'>{contract.contract_type}</Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant='body2' color='text.secondary'>
                供应商ID
              </Typography>
              <Typography variant='body1'>{contract.supplier_id}</Typography>
            </Grid>
            {contract.remarks && (
              <Grid size={{ xs: 12 }}>
                <Typography variant='body2' color='text.secondary'>
                  备注
                </Typography>
                <Typography variant='body1'>{contract.remarks}</Typography>
              </Grid>
            )}
            <Grid size={{ xs: 12, sm: 6 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Clock sx={{ width: 16, height: 16, color: 'text.secondary' }} />
                <Typography variant='body2' color='text.secondary'>
                  创建时间
                </Typography>
              </Box>
              <Typography variant='body1'>{new Date(contract.created_at).toLocaleString('zh-CN')}</Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Clock sx={{ width: 16, height: 16, color: 'text.secondary' }} />
                <Typography variant='body2' color='text.secondary'>
                  更新时间
                </Typography>
              </Box>
              <Typography variant='body1'>{new Date(contract.updated_at).toLocaleString('zh-CN')}</Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </PageContainer>
  );
};

export default SrmContractDetailPage;