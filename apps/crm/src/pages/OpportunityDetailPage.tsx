import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Chip,
  CircularProgress,
  Alert,
  Button,
  Divider,
  Card,
  CardContent,
  LinearProgress,
} from '@mui/material';

import { useCrmStore } from '../store/crmStore';
import type { Opportunity } from '../api/crm';
import { ArrowLeft } from 'lucide-react';
const ArrowBackIcon = ArrowLeft;

interface OpportunityDetailPageProps {
  opportunityId?: string;
  onBack?: () => void;
}

const STAGE_LABELS: Record<string, string> = {
  prospecting: '线索',
  qualification: '资格审查',
  proposal: '方案报价',
  negotiation: '商务谈判',
  won: '成交',
  lost: '丢单',
};

const STAGE_PROGRESS: Record<string, number> = {
  prospecting: 20,
  qualification: 40,
  proposal: 60,
  negotiation: 80,
  won: 100,
  lost: 0,
};

export const OpportunityDetailPage: React.FC<OpportunityDetailPageProps> = ({
  opportunityId,
  onBack,
}) => {
  const { loadOpportunity } = useCrmStore();
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      if (!opportunityId) {
        setError('缺少商机 ID');
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const data = await loadOpportunity(opportunityId);
        if (data) {
          setOpportunity(data);
        } else {
          setError('未找到商机');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载商机详情失败');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [opportunityId, loadOpportunity]);

  if (loading) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !opportunity) {
    return (
      <Box sx={{ p: 3 }}>
        {onBack && (
          <Button startIcon={<ArrowBackIcon />} onClick={onBack} sx={{ mb: 2 }}>
            返回
          </Button>
        )}
        <Alert severity="error">{error || '商机不存在'}</Alert>
      </Box>
    );
  }

  const weightedValue = ((opportunity.value || 0) * (opportunity.probability || 0)) / 100;
  const progress = STAGE_PROGRESS[opportunity.stage] || 0;

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        {onBack && (
          <Button startIcon={<ArrowBackIcon />} onClick={onBack}>
            返回
          </Button>
        )}
        <Box>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
            {opportunity.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            商机详情
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                商机信息
              </Typography>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">商机阶段</Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <Chip
                      label={STAGE_LABELS[opportunity.stage] || opportunity.stage}
                      size="small"
                      color={opportunity.stage === 'won' ? 'success' : 'primary'}
                    />
                  </Box>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">商机价值</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>
                    ¥{(opportunity.value || 0).toLocaleString()}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">赢率</Typography>
                  <Typography variant="body2">{opportunity.probability || 0}%</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">加权价值</Typography>
                  <Typography variant="body2">¥{weightedValue.toLocaleString()}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">预计成交日期</Typography>
                  <Typography variant="body2">
                    {opportunity.close_date
                      ? new Date(opportunity.close_date).toLocaleDateString('zh-CN')
                      : '-'}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                销售管道
              </Typography>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">当前阶段</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {progress}%
                  </Typography>
                </Box>
                <LinearProgress variant="determinate" value={progress} sx={{ height: 8, borderRadius: 4 }} />
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
                {Object.entries(STAGE_LABELS).map(([key, label]) => (
                  <Box
                    key={key}
                    sx={{
                      p: 1,
                      borderRadius: 1,
                      bgcolor: opportunity.stage === key ? 'primary.light' : 'grey.100',
                      color: opportunity.stage === key ? 'primary.main' : 'text.secondary',
                    }}
                  >
                    <Typography variant="caption" sx={{ fontWeight: opportunity.stage === key ? 600 : 400 }}>
                      {label}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              备注
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {opportunity.notes || '暂无备注'}
            </Typography>
          </Paper>
        </Grid>

        <Grid>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              时间信息
            </Typography>
            <Divider sx={{ my: 1 }} />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">创建时间</Typography>
                <Typography variant="body2">
                  {new Date(opportunity.created_at).toLocaleString('zh-CN')}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">最后更新</Typography>
                <Typography variant="body2">
                  {new Date(opportunity.updated_at).toLocaleString('zh-CN')}
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default OpportunityDetailPage;
