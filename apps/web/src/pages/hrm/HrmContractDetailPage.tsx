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
} from '@mui/material';
import { Button } from '@mui/material';
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Calendar, User, Building2, Edit2, Trash2, Clock } from 'lucide-react';
import { contractApi, type Contract } from '@/api/hrm';
import { useNotification } from '@/hooks/useNotification';
import { logger } from '@/utils/logger';

const HrmContractDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error } = useNotification();

  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);

  const loadContract = useCallback(
    async (contractId: string) => {
      setLoading(true);
      try {
        const res = await contractApi.get(contractId);
        if (res.code === 200 && res.data) {
          setContract(res.data.contract);
        }
      } catch (err: unknown) {
        logger.error('Failed to load contract:', err);
        error('加载合同信息失败');
      } finally {
        setLoading(false);
      }
    },
    [error]
  );

  useEffect(() => {
    if (id) {
      loadContract(id);
    }
  }, [id, loadContract]);

  const handleDelete = async () => {
    if (!id || !window.confirm('确定要删除此合同吗？')) return;

    try {
      const res = await contractApi.delete(id);
      if (res.code === 200) {
        success('合同删除成功');
        navigate('/hrm/contracts');
      } else {
        error(res.message || '删除失败');
      }
    } catch (err: unknown) {
      logger.error('Failed to delete contract:', err);
      error('删除合同失败');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'expired':
        return 'error';
      case 'pending':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return '生效中';
      case 'expired':
        return '已过期';
      case 'pending':
        return '待生效';
      default:
        return status;
    }
  };

  const formatDate = (date: string | undefined) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('zh-CN');
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

  if (!contract) {
    return (
      <Container
        maxWidth='lg'
        sx={{ py: 3 }}
      >
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color='text.secondary'>合同不存在或已被删除</Typography>
          <Button
            variant='outlined'
            sx={{ mt: 2 }}
            onClick={() => navigate('/hrm/contracts')}
          >
            返回合同列表
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
              onClick={() => navigate('/hrm/contracts')}
              startIcon={<ArrowLeft style={{ width: 20, height: 20 }} />}
            >
              返回
            </Button>
            <Box>
              <Typography
                variant='h5'
                sx={{ fontWeight: 'bold' }}
              >
                {contract.contract_no || '合同详情'}
              </Typography>
              <Typography
                variant='body2'
                color='text.secondary'
              >
                查看合同详细信息
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant='outlined'
              startIcon={<Edit2 style={{ width: 18, height: 18 }} />}
              onClick={() => navigate(`/hrm/contract/${id}/edit`)}
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
          <Box
            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}
          >
            <Typography
              variant='h6'
              sx={{ fontWeight: 600 }}
            >
              基本信息
            </Typography>
            <Chip
              label={getStatusLabel(contract.status)}
              color={getStatusColor(contract.status) as 'success' | 'error' | 'warning' | 'default'}
              size='small'
            />
          </Box>
          <Divider sx={{ mb: 2 }} />
          <Grid
            container
            spacing={3}
          >
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FileText style={{ width: 18, height: 18, color: 'grey.500' }} />
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    合同编号
                  </Typography>
                  <Typography
                    variant='body2'
                    sx={{ fontWeight: 500 }}
                  >
                    {contract.contract_no || '-'}
                  </Typography>
                </Box>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FileText style={{ width: 18, height: 18, color: 'grey.500' }} />
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    合同类型
                  </Typography>
                  <Typography
                    variant='body2'
                    sx={{ fontWeight: 500 }}
                  >
                    {contract.contract_type || '-'}
                  </Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ p: 3 }}>
          <Typography
            variant='h6'
            sx={{ fontWeight: 600, mb: 2 }}
          >
            合同期限
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Grid
            container
            spacing={3}
          >
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Calendar style={{ width: 18, height: 18, color: 'grey.500' }} />
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    开始日期
                  </Typography>
                  <Typography
                    variant='body2'
                    sx={{ fontWeight: 500 }}
                  >
                    {formatDate(contract.start_date)}
                  </Typography>
                </Box>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Calendar style={{ width: 18, height: 18, color: 'grey.500' }} />
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    结束日期
                  </Typography>
                  <Typography
                    variant='body2'
                    sx={{ fontWeight: 500 }}
                  >
                    {formatDate(contract.end_date)}
                  </Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Container>
  );
};

export default HrmContractDetailPage;
