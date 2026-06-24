import React, { useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Chip,
  CircularProgress,
  Alert,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  CardContent,
  Divider,
} from '@mui/material';
import { Refresh as RefreshIcon, TrendingUp as TrendingUpIcon } from '@mui/icons-material';
import { useCrmStore } from '../store/crmStore';

const getLevelColor = (level: string): 'default' | 'primary' | 'success' | 'warning' | 'error' => {
  switch (level) {
    case 'A':
      return 'success';
    case 'B':
      return 'primary';
    case 'C':
      return 'warning';
    case 'D':
      return 'error';
    default:
      return 'default';
  }
};

const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
  switch (trend) {
    case 'up':
      return '↑';
    case 'down':
      return '↓';
    case 'stable':
      return '→';
    default:
      return '';
  }
};

export const CustomerScoringPage: React.FC = () => {
  const { customerScores, loading, error, loadCustomerScores } = useCrmStore();

  useEffect(() => {
    loadCustomerScores({ page: 1, pageSize: 20 });
  }, [loadCustomerScores]);

  // 计算统计数据
  const stats = {
    total: customerScores.length,
    aCount: customerScores.filter((s) => s.score_level === 'A').length,
    bCount: customerScores.filter((s) => s.score_level === 'B').length,
    avgScore:
      customerScores.length > 0
        ? Math.round(
            customerScores.reduce((sum, s) => sum + s.score, 0) / customerScores.length
          )
        : 0,
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
            客户评分
          </Typography>
          <Typography variant="body2" color="text.secondary">
            基于多维度因子的客户价值评估
          </Typography>
        </Box>
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => loadCustomerScores({ page: 1, pageSize: 20 })}>
          刷新
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">评分总数</Typography>
              <Typography variant="h4" sx={{ mt: 1, fontWeight: 600 }}>
                {stats.total}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">A级客户</Typography>
              <Typography variant="h4" sx={{ mt: 1, fontWeight: 600, color: 'success.main' }}>
                {stats.aCount}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">B级客户</Typography>
              <Typography variant="h4" sx={{ mt: 1, fontWeight: 600, color: 'primary.main' }}>
                {stats.bCount}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">平均分数</Typography>
              <Typography variant="h4" sx={{ mt: 1, fontWeight: 600 }}>
                {stats.avgScore}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper>
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <TrendingUpIcon color="primary" />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            客户评分列表
          </Typography>
        </Box>
        <Divider />
        {loading ? (
          <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
            <CircularProgress />
          </Box>
        ) : customerScores.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">暂无评分数据</Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>客户</TableCell>
                  <TableCell>分数</TableCell>
                  <TableCell>等级</TableCell>
                  <TableCell>趋势</TableCell>
                  <TableCell>上次评分</TableCell>
                  <TableCell>评分日期</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {customerScores.map((score) => (
                  <TableRow key={score.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {score.customer_name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                        {score.score}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={score.score_level}
                        size="small"
                        color={getLevelColor(score.score_level)}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{
                          color:
                            score.trend === 'up'
                              ? 'success.main'
                              : score.trend === 'down'
                              ? 'error.main'
                              : 'text.secondary',
                        }}
                      >
                        {getTrendIcon(score.trend)} {score.trend}
                      </Typography>
                    </TableCell>
                    <TableCell>{score.last_score ?? '-'}</TableCell>
                    <TableCell>
                      {score.scoring_date
                        ? new Date(score.scoring_date).toLocaleDateString('zh-CN')
                        : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
};

export default CustomerScoringPage;
