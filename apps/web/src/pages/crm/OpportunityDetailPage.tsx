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
  LinearProgress,
} from '@mui/material';
import { Button } from '@mui/material';
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  TrendingUp,
  User,
  Building2,
  Calendar,
  DollarSign,
  Edit2,
  Trash2,
  Phone,
  Mail,
  Clock,
} from 'lucide-react';
import { useAppStore } from '@/store';
import { logger } from '@/utils/logger';
import type { Opportunity } from '@/api/modules/crm/crm';
import { crmApi } from '@/api/modules/crm/crm';

const OpportunityDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addNotification } = useAppStore();

  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [loading, setLoading] = useState(true);

  const loadOpportunity = useCallback(
    async (opportunityId: string) => {
      setLoading(true);
      try {
        const response = await crmApi.opportunities.get(opportunityId);
        if (response.success && response.data) {
          setOpportunity(response.data);
        } else {
          addNotification({
            type: 'error',
            title: '加载失败',
            message: response.message || '无法加载商机信息',
          });
        }
      } catch (err: unknown) {
        logger.error('Failed to load opportunity:', err);
        addNotification({
          type: 'error',
          title: '加载失败',
          message: '无法加载商机信息',
        });
      } finally {
        setLoading(false);
      }
    },
    [addNotification]
  );

  useEffect(() => {
    if (id) {
      loadOpportunity(id);
    }
  }, [id, loadOpportunity]);

  const handleDelete = async () => {
    if (!id || !window.confirm('确定要删除此商机吗？')) return;
    try {
      await crmApi.opportunities.delete(id);
      addNotification({
        type: 'success',
        title: '删除成功',
        message: '商机已删除',
      });
      navigate('/crm/opportunities');
    } catch (err: unknown) {
      logger.error('Failed to delete opportunity:', err);
      addNotification({
        type: 'error',
        title: '删除失败',
        message: '无法删除商机',
      });
    }
  };

  const getStageLabel = (stage: string) => {
    const stages: Record<string, string> = {
      prospecting: '线索',
      qualified: '资格确认',
      proposal: '方案报价',
      negotiation: '谈判审核',
      closed_won: '赢单',
      closed_lost: '输单',
    };
    return stages[stage] || stage;
  };

  const getStageColor = (stage: string) => {
    const colors: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'error'> = {
      prospecting: 'default',
      qualified: 'primary',
      proposal: 'primary',
      negotiation: 'warning',
      closed_won: 'success',
      closed_lost: 'error',
    };
    return colors[stage] || 'default';
  };

  const formatMoney = (amount?: number) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
    }).format(amount);
  };

  const formatDate = (date?: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('zh-CN');
  };

  const formatDateTime = (date?: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('zh-CN');
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

  if (!opportunity) {
    return (
      <Container
        maxWidth='lg'
        sx={{ py: 3 }}
      >
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color='text.secondary'>商机不存在或已被删除</Typography>
          <Button
            variant='outlined'
            sx={{ mt: 2 }}
            onClick={() => navigate('/crm/opportunities')}
          >
            返回商机列表
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
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              variant='text'
              onClick={() => navigate('/crm/opportunities')}
              startIcon={<ArrowLeft style={{ width: 20, height: 20 }} />}
            >
              返回
            </Button>
            <Box>
              <Typography
                variant='h5'
                sx={{ fontWeight: 'bold' }}
              >
                {opportunity.name}
              </Typography>
              <Typography
                variant='body2'
                color='text.secondary'
              >
                商机详情
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant='outlined'
              startIcon={<Edit2 style={{ width: 18, height: 18 }} />}
              onClick={() => navigate(`/crm/opportunity/${id}/edit`)}
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
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 2,
            }}
          >
            <Typography
              variant='h6'
              sx={{ fontWeight: 600 }}
            >
              基本信息
            </Typography>
            <Chip
              label={getStageLabel(opportunity.stage)}
              color={getStageColor(opportunity.stage)}
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
                <TrendingUp style={{ width: 18, height: 18, color: 'grey.500' }} />
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    商机金额
                  </Typography>
                  <Typography
                    variant='body2'
                    sx={{ fontWeight: 500 }}
                  >
                    {formatMoney(opportunity.value)}
                  </Typography>
                </Box>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Building2 style={{ width: 18, height: 18, color: 'grey.500' }} />
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    客户ID
                  </Typography>
                  <Typography
                    variant='body2'
                    sx={{ fontWeight: 500 }}
                  >
                    {opportunity.customer_id || '-'}
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
                    预计成交日期
                  </Typography>
                  <Typography
                    variant='body2'
                    sx={{ fontWeight: 500 }}
                  >
                    {formatDate(opportunity.close_date)}
                  </Typography>
                </Box>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Clock style={{ width: 18, height: 18, color: 'grey.500' }} />
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    创建时间
                  </Typography>
                  <Typography
                    variant='body2'
                    sx={{ fontWeight: 500 }}
                  >
                    {formatDateTime(opportunity.created_at)}
                  </Typography>
                </Box>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Clock style={{ width: 18, height: 18, color: 'grey.500' }} />
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    更新时间
                  </Typography>
                  <Typography
                    variant='body2'
                    sx={{ fontWeight: 500 }}
                  >
                    {formatDateTime(opportunity.updated_at)}
                  </Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography
            variant='h6'
            sx={{ fontWeight: 600, mb: 2 }}
          >
            成交概率
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <LinearProgress
              variant='determinate'
              value={opportunity.probability || 0}
              sx={{ flex: 1, height: 10, borderRadius: 5 }}
            />
            <Typography
              variant='h6'
              sx={{ fontWeight: 600 }}
            >
              {opportunity.probability || 0}%
            </Typography>
          </Box>
          {opportunity.probability !== undefined && (
            <Box sx={{ mt: 2 }}>
              <Typography
                variant='body2'
                color='text.secondary'
              >
                加权预期金额:{' '}
                {formatMoney(
                  opportunity.value
                    ? opportunity.value * (opportunity.probability / 100)
                    : undefined
                )}
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ p: 3 }}>
          <Typography
            variant='h6'
            sx={{ fontWeight: 600, mb: 2 }}
          >
            备注信息
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Typography
            variant='body2'
            color='text.secondary'
          >
            {opportunity.notes || '暂无备注'}
          </Typography>
        </CardContent>
      </Card>
    </Container>
  );
};

export default OpportunityDetailPage;
