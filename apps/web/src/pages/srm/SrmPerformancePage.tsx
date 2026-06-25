import React, { useState, useEffect } from 'react';
import { Box, Card, CardContent, Typography, Chip, Divider } from '@mui/material';
import { Grid } from '@/components/Grid';
import { TrendingUp, Award, BarChart3, Users, ArrowUp, ArrowDown } from 'lucide-react';
import { srmApi } from '@/api/srm';
import type { SupplierPerformance, PerformanceSummary, ScoreLevelDistribution } from '@/api/srm';
import { useAppStore } from '@/store';
import { apiLogger } from '@/utils/logger';

const SrmPerformancePage: React.FC = () => {
  const [performanceSummary, setPerformanceSummary] = useState<PerformanceSummary | null>(null);
  const [topSuppliers, setTopSuppliers] = useState<SupplierPerformance[]>([]);
  const [scoreDistribution, setScoreDistribution] = useState<ScoreLevelDistribution[]>([]);
  const [categoryScores, setCategoryScores] = useState<
    { category: string; avg_score: number; supplier_count: number }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const addNotification = useAppStore((state) => state.addNotification);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [summaryRes, topRes, distributionRes] = await Promise.all([
        srmApi.getPerformanceSummary(),
        srmApi.getTopSuppliers(),
        srmApi.getScoreLevelDistribution(),
      ]);

      if (summaryRes.success && summaryRes.data) {
        setPerformanceSummary(summaryRes.data);
        setCategoryScores(summaryRes.data.category_scores);
      } else {
        addNotification({ title: '错误', message: '获取绩效汇总失败', type: 'error' });
      }

      if (topRes.success && topRes.data) {
        setTopSuppliers(topRes.data.top_by_score);
      } else {
        addNotification({ title: '错误', message: '获取TOP供应商失败', type: 'error' });
      }

      if (distributionRes.success && distributionRes.data) {
        setScoreDistribution(distributionRes.data.distribution);
      } else {
        addNotification({ title: '错误', message: '获取评分分布失败', type: 'error' });
      }
    } catch (err: unknown) {
      apiLogger.error('加载绩效数据失败:', err);
      addNotification({ title: '错误', message: '加载绩效数据失败', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return '#15803d';
    if (score >= 80) return 'primary.dark';
    if (score >= 70) return '#b45309';
    if (score >= 60) return '#92400e';
    return 'error.darker';
  };

  const getLevelColor = (level: string) => {
    const colorMap: Record<string, { bg: string; color: string }> = {
      A: { bg: 'success.lighter', color: '#15803d' },
      B: { bg: '#dbeafe', color: 'primary.dark' },
      C: { bg: 'warning.light', color: '#b45309' },
      D: { bg: 'warning.light', color: '#92400e' },
      E: { bg: 'error.lighter', color: 'error.darker' },
    };
    return colorMap[level] || { bg: 'grey.100', color: '#475569' };
  };

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, warning.light 0%, #f8fafc 100%)',
        }}
      >
        <Typography sx={{ color: 'slate.600' }}>加载中...</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, warning.light 0%, #f8fafc 100%)',
      }}
    >
      <Box
        component='header'
        sx={{
          bgcolor: 'background.paper',
          boxShadow: 1,
          borderBottom: 1,
          borderColor: 'divider',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <Box sx={{ maxWidth: 1280, mx: 'auto', px: { xs: 2, sm: 3, lg: 4 } }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              height: 64,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  background: 'linear-gradient(135deg, warning.main 0%, warning.dark 100%)',
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <TrendingUp sx={{ width: 24, height: 24, color: 'white' }} />
              </Box>
              <Box>
                <Typography
                  variant='h6'
                  sx={{
                    fontWeight: 700,
                    color: 'slate.900',
                    fontSize: '1.25rem',
                  }}
                >
                  供应商绩效报表
                </Typography>
                <Typography
                  variant='caption'
                  sx={{ color: 'slate.500', fontSize: '0.75rem' }}
                >
                  Supplier Performance Report
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>

      <Box
        component='main'
        sx={{ maxWidth: 1280, mx: 'auto', px: { xs: 2, sm: 3, lg: 4 }, py: 4 }}
      >
        <Grid
          container
          spacing={3}
        >
          <Grid
            item
            xs={12}
            md={3}
          >
            <Card sx={{ bgcolor: 'warning.light' }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      bgcolor: 'warning.light',
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Award sx={{ width: 24, height: 24, color: 'warning.dark' }} />
                  </Box>
                  <Box>
                    <Typography
                      variant='body2'
                      sx={{ color: 'slate.600', fontSize: '0.875rem' }}
                    >
                      综合评分
                    </Typography>
                    <Typography
                      variant='h4'
                      sx={{ fontWeight: 700, color: 'slate.900' }}
                    >
                      {performanceSummary?.avg_overall_score.toFixed(1) || '0'}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid
            item
            xs={12}
            md={3}
          >
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      bgcolor: '#dbeafe',
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <BarChart3 sx={{ width: 24, height: 24, color: 'primary.main' }} />
                  </Box>
                  <Box>
                    <Typography
                      variant='body2'
                      sx={{ color: 'slate.600', fontSize: '0.875rem' }}
                    >
                      评估覆盖率
                    </Typography>
                    <Typography
                      variant='h4'
                      sx={{ fontWeight: 700, color: 'slate.900' }}
                    >
                      {performanceSummary?.evaluation_rate || '0'}%
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid
            item
            xs={12}
            md={3}
          >
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      bgcolor: 'success.lighter',
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Users sx={{ width: 24, height: 24, color: 'success.dark' }} />
                  </Box>
                  <Box>
                    <Typography
                      variant='body2'
                      sx={{ color: 'slate.600', fontSize: '0.875rem' }}
                    >
                      已评估供应商
                    </Typography>
                    <Typography
                      variant='h4'
                      sx={{ fontWeight: 700, color: 'slate.900' }}
                    >
                      {performanceSummary?.evaluated_suppliers || '0'}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid
            item
            xs={12}
            md={3}
          >
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      bgcolor: 'secondary.light',
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Users sx={{ width: 24, height: 24, color: 'primary.light' }} />
                  </Box>
                  <Box>
                    <Typography
                      variant='body2'
                      sx={{ color: 'slate.600', fontSize: '0.875rem' }}
                    >
                      供应商总数
                    </Typography>
                    <Typography
                      variant='h4'
                      sx={{ fontWeight: 700, color: 'slate.900' }}
                    >
                      {performanceSummary?.total_suppliers || '0'}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Grid
          container
          spacing={3}
          sx={{ mt: 3 }}
        >
          <Grid
            item
            xs={12}
            md={6}
          >
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Typography
                  variant='h6'
                  sx={{
                    fontWeight: 600,
                    mb: 3,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <ArrowUp style={{ width: 20, height: 20, color: 'success.dark' }} />
                  TOP供应商（按评分）
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {topSuppliers.slice(0, 5).map((supplier, index) => (
                    <Box
                      key={supplier.supplier_id}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        p: 2,
                        borderRadius: 1,
                        bgcolor: index === 0 ? 'warning.light' : 'grey.50',
                      }}
                    >
                      <Box
                        sx={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          bgcolor: index === 0 ? 'warning.main' : '#94a3b8',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          color: 'white',
                          fontSize: '0.75rem',
                        }}
                      >
                        {index + 1}
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography
                          variant='body1'
                          sx={{ fontWeight: 600 }}
                        >
                          {supplier.supplier_name}
                        </Typography>
                        <Typography
                          variant='body2'
                          sx={{ color: 'slate.500' }}
                        >
                          评估次数: {supplier.evaluation_count} | 订单数: {supplier.total_orders}
                        </Typography>
                      </Box>
                      <Typography
                        variant='h6'
                        sx={{
                          fontWeight: 700,
                          color: getScoreColor(supplier.avg_overall_score || 0),
                        }}
                      >
                        {(supplier.avg_overall_score || 0).toFixed(1)}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid
            item
            xs={12}
            md={6}
          >
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Typography
                  variant='h6'
                  sx={{
                    fontWeight: 600,
                    mb: 3,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <BarChart3 style={{ width: 20, height: 20, color: 'primary.main' }} />
                  评分等级分布
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {scoreDistribution.map((item) => {
                    const colors = getLevelColor(item.level);
                    const maxCount = Math.max(...scoreDistribution.map((d) => d.count), 1);
                    const width = (item.count / maxCount) * 100;
                    return (
                      <Box
                        key={item.level}
                        sx={{ display: 'flex', alignItems: 'center', gap: 2 }}
                      >
                        <Chip
                          label={`${item.level}级`}
                          size='small'
                          sx={{
                            bgcolor: colors.bg,
                            color: colors.color,
                            width: 70,
                          }}
                        />
                        <Box
                          sx={{
                            flex: 1,
                            height: 20,
                            bgcolor: 'border.default',
                            borderRadius: 1,
                            overflow: 'hidden',
                          }}
                        >
                          <Box
                            sx={{
                              height: '100%',
                              width: `${width}%`,
                              bgcolor: colors.bg,
                              transition: 'width 0.3s ease',
                            }}
                          />
                        </Box>
                        <Typography
                          variant='body2'
                          sx={{
                            fontWeight: 600,
                            width: 40,
                            textAlign: 'right',
                          }}
                        >
                          {item.count}家
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
                <Divider sx={{ my: 3 }} />
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  <Typography
                    variant='body2'
                    sx={{ color: 'slate.500' }}
                  >
                    等级说明:
                  </Typography>
                  <Chip
                    label='A: 优秀(90+)'
                    size='small'
                    sx={{ bgcolor: 'success.lighter', color: '#15803d' }}
                  />
                  <Chip
                    label='B: 良好(80-89)'
                    size='small'
                    sx={{ bgcolor: '#dbeafe', color: 'primary.dark' }}
                  />
                  <Chip
                    label='C: 中等(70-79)'
                    size='small'
                    sx={{ bgcolor: 'warning.light', color: '#b45309' }}
                  />
                  <Chip
                    label='D: 及格(60-69)'
                    size='small'
                    sx={{ bgcolor: 'warning.light', color: '#92400e' }}
                  />
                  <Chip
                    label='E: 较差(<60)'
                    size='small'
                    sx={{ bgcolor: 'error.lighter', color: 'error.darker' }}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Grid
          container
          spacing={3}
          sx={{ mt: 3 }}
        >
          <Grid
            item
            xs={12}
          >
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Typography
                  variant='h6'
                  sx={{
                    fontWeight: 600,
                    mb: 3,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <BarChart3 style={{ width: 20, height: 20, color: 'secondary.main' }} />
                  各品类供应商评分对比
                </Typography>
                <Box sx={{ overflowX: 'auto' }}>
                  <Grid
                    container
                    spacing={2}
                  >
                    {categoryScores.map((item) => (
                      <Grid
                        item
                        xs={12}
                        sm={6}
                        md={4}
                        key={item.category}
                      >
                        <Box
                          sx={{
                            p: 3,
                            borderRadius: 2,
                            bgcolor: 'grey.50',
                            border: 1,
                            borderColor: 'border.default',
                          }}
                        >
                          <Typography
                            variant='body1'
                            sx={{ fontWeight: 600, mb: 2 }}
                          >
                            {item.category}
                          </Typography>
                          <Typography
                            variant='h3'
                            sx={{
                              fontWeight: 700,
                              color: getScoreColor(item.avg_score),
                              mb: 1,
                            }}
                          >
                            {item.avg_score.toFixed(1)}
                          </Typography>
                          <Typography
                            variant='body2'
                            sx={{ color: 'slate.500' }}
                          >
                            共 {item.supplier_count} 家供应商
                          </Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {performanceSummary?.top_supplier && performanceSummary?.bottom_supplier && (
          <Grid
            container
            spacing={3}
            sx={{ mt: 3 }}
          >
            <Grid
              item
              xs={12}
              md={6}
            >
              <Card sx={{ bgcolor: 'success.lighter' }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box
                      sx={{
                        width: 56,
                        height: 56,
                        bgcolor: 'success.light',
                        borderRadius: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <ArrowUp sx={{ width: 28, height: 28, color: '#15803d' }} />
                    </Box>
                    <Box>
                      <Typography
                        variant='body2'
                        sx={{
                          color: '#15803d',
                          fontSize: '0.875rem',
                          fontWeight: 600,
                        }}
                      >
                        最佳供应商
                      </Typography>
                      <Typography
                        variant='h5'
                        sx={{ fontWeight: 700, color: 'slate.900' }}
                      >
                        {performanceSummary.top_supplier.name}
                      </Typography>
                      <Typography
                        variant='body1'
                        sx={{ color: '#15803d', fontWeight: 600 }}
                      >
                        评分: {performanceSummary.top_supplier.avg_score.toFixed(1)}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid
              item
              xs={12}
              md={6}
            >
              <Card sx={{ bgcolor: 'error.lighter' }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box
                      sx={{
                        width: 56,
                        height: 56,
                        bgcolor: 'error.light',
                        borderRadius: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <ArrowDown sx={{ width: 28, height: 28, color: 'error.darker' }} />
                    </Box>
                    <Box>
                      <Typography
                        variant='body2'
                        sx={{
                          color: 'error.darker',
                          fontSize: '0.875rem',
                          fontWeight: 600,
                        }}
                      >
                        待改进供应商
                      </Typography>
                      <Typography
                        variant='h5'
                        sx={{ fontWeight: 700, color: 'slate.900' }}
                      >
                        {performanceSummary.bottom_supplier.name}
                      </Typography>
                      <Typography
                        variant='body1'
                        sx={{ color: 'error.darker', fontWeight: 600 }}
                      >
                        评分: {performanceSummary.bottom_supplier.avg_score.toFixed(1)}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </Box>
    </Box>
  );
};

export default SrmPerformancePage;
