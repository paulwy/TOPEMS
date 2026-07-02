import {
  Box,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Paper,
  Typography,
  Button,
} from '@mui/material';
import React, { useState, useEffect, useMemo } from 'react';
import type { CustomerScore, ScoreFactor } from '@/api/crm';
import { crmApi } from '@/api/crm';
import { useAppStore } from '@/store';
import { ListPageTemplate, type ColumnDef, type RowAction } from '@/components/templates';
import { PageContainer } from '@/components/common';
import { apiLogger } from '@/utils/logger';
import { Star, TrendingUp, TrendingDown, Minus, Award, Calculator, Eye } from 'lucide-react';

const CRMCustomerScoringPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [scores, setScores] = useState<CustomerScore[]>([]);
  const [selectedScore, setSelectedScore] = useState<CustomerScore | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 10;

  const { addNotification } = useAppStore();

  const loadCustomerScores = async () => {
    try {
      setLoading(true);
      const response = await crmApi.customerScoring.list();
      setScores(response.data?.items || []);
    } catch (error: unknown) {
      apiLogger.error('加载客户评分失败:', error);
      addNotification({
        type: 'error',
        title: '加载失败',
        message: '无法加载客户评分数据',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomerScores();
  }, []);

  const handleBatchCalculate = async () => {
    try {
      const customerResponse = await crmApi.customers.list({
        page: 1,
        pageSize: 100,
      });
      const customerIds = customerResponse.data?.items?.map((c) => c.id) || [];

      if (customerIds.length === 0) {
        addNotification({
          type: 'warning',
          title: '提示',
          message: '请先添加客户',
        });
        return;
      }

      setLoading(true);
      await crmApi.customerScoring.calculateBatch(customerIds);
      addNotification({
        type: 'success',
        title: '成功',
        message: '已批量计算客户评分',
      });
      loadCustomerScores();
    } catch (error: unknown) {
      apiLogger.error('批量计算评分失败:', error);
      addNotification({
        type: 'error',
        title: '计算失败',
        message: '批量计算客户评分失败',
      });
    } finally {
      setLoading(false);
    }
  };

  const getGradeBadge = (scoreLevel: string) => {
    const gradeConfig: Record<
      string,
      {
        label: string;
        color: string;
      }
    > = {
      A: { label: 'A', color: 'success.main' },
      B: { label: 'B', color: 'primary.main' },
      C: { label: 'C', color: 'warning.main' },
      D: { label: 'D', color: 'error.main' },
    };
    const config = gradeConfig[scoreLevel] || {
      label: scoreLevel,
      color: 'grey.500',
    };
    return (
      <Chip
        size='small'
        sx={{
          bgcolor: config.color,
          color: 'white',
          fontWeight: 'bold',
          fontSize: '1.125rem',
          px: 1.5,
        }}
        label={config.label}
      />
    );
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'success.main';
    if (score >= 60) return 'primary.main';
    if (score >= 40) return 'warning.main';
    return 'error.main';
  };

  const getScoreTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp sx={{ width: 16, height: 16, color: 'success.main' }} />;
      case 'down':
        return <TrendingDown sx={{ width: 16, height: 16, color: 'error.main' }} />;
      default:
        return <Minus sx={{ width: 16, height: 16, color: 'grey.500' }} />;
    }
  };

  const gradeDistribution = useMemo(
    () => ({
      A: scores.filter((s) => s.scorelevel === 'A').length,
      B: scores.filter((s) => s.scorelevel === 'B').length,
      C: scores.filter((s) => s.scorelevel === 'C').length,
      D: scores.filter((s) => s.scorelevel === 'D').length,
    }),
    [scores]
  );

  const filteredScores = useMemo(() => {
    if (!searchQuery) return scores;
    return scores.filter((score) =>
      score.customer_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [scores, searchQuery]);

  const paginatedScores = useMemo(() => {
    const start = currentPage * pageSize;
    return filteredScores.slice(start, start + pageSize);
  }, [filteredScores, currentPage]);

  const columns: ColumnDef<CustomerScore>[] = [
    {
      id: 'customer_name',
      label: '客户名称',
      width: 200,
      sortable: true,
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              bgcolor: 'grey.100',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography
              variant='body1'
              sx={{ fontWeight: 'bold' }}
            >
              {row.customer_name.charAt(0)}
            </Typography>
          </Box>
          <Typography sx={{ fontWeight: 500 }}>{row.customer_name}</Typography>
        </Box>
      ),
    },
    {
      id: 'score',
      label: '综合评分',
      width: 120,
      align: 'center',
      sortable: true,
      render: (row) => (
        <Typography
          variant='h6'
          sx={{
            fontWeight: 'bold',
            color: getScoreColor(row.score),
          }}
        >
          {row.score}
        </Typography>
      ),
    },
    {
      id: 'scorelevel',
      label: '客户等级',
      width: 100,
      align: 'center',
      render: (row) => getGradeBadge(row.scorelevel),
    },
    {
      id: 'trend',
      label: '趋势',
      width: 80,
      align: 'center',
      render: (row) => getScoreTrendIcon(row.trend),
    },
    {
      id: 'scoring_date',
      label: '评分日期',
      width: 150,
      sortable: true,
      render: (row) => new Date(row.scoring_date).toLocaleDateString('zh-CN'),
    },
    {
      id: 'last_score',
      label: '上次评分',
      width: 120,
      align: 'center',
      render: (row) => (
        <Typography
          variant='body2'
          sx={{
            color:
              row.last_score !== undefined
                ? row.score > row.last_score
                  ? 'success.main'
                  : row.score < row.last_score
                    ? 'error.main'
                    : 'text.secondary'
                : 'text.secondary',
          }}
        >
          {row.last_score !== undefined ? row.last_score : '-'}
        </Typography>
      ),
    },
  ];

  const rowActions: RowAction<CustomerScore>[] = [
    {
      label: '详情',
      icon: <Eye size={16} />,
      onClick: (row) => {
        setSelectedScore(row);
        setShowDetailDialog(true);
      },
      color: 'primary',
    },
  ];

  const StatCard: React.FC<{
    label: string;
    value: number;
    color: string;
    bgColor: string;
  }> = ({ label, value, color, bgColor }) => (
    <Box sx={{ bgcolor: bgColor, borderRadius: 3, p: 3 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box>
          <Typography
            variant='body2'
            sx={{
              color,
              fontWeight: 500,
              fontSize: '0.875rem',
            }}
          >
            {label}
          </Typography>
          <Typography
            variant='h5'
            sx={{ fontWeight: 'bold', color, mt: 0.5 }}
          >
            {value}
          </Typography>
        </Box>
        <Box
          sx={{
            width: 48,
            height: 48,
            bgcolor: color,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Star sx={{ width: 24, height: 24, color: 'white' }} />
        </Box>
      </Box>
    </Box>
  );

  const headerContent = useMemo(
    () => (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(2, 1fr)',
            md: 'repeat(4, 1fr)',
          },
          gap: 2,
          mb: 3,
        }}
      >
        <StatCard
          label='A级客户'
          value={gradeDistribution.A}
          color='success.main'
          bgColor='success.light'
        />
        <StatCard
          label='B级客户'
          value={gradeDistribution.B}
          color='primary.main'
          bgColor='primary.light'
        />
        <StatCard
          label='C级客户'
          value={gradeDistribution.C}
          color='warning.main'
          bgColor='warning.light'
        />
        <StatCard
          label='D级客户'
          value={gradeDistribution.D}
          color='error.main'
          bgColor='error.light'
        />
      </Box>
    ),
    [gradeDistribution]
  );

  return (
    <PageContainer
      title='客户价值评分'
      subtitle='根据客户数据自动计算客户价值评分和等级'
      autoTitle
      autoBreadcrumbs
    >
      <>
        <ListPageTemplate
          title=''
          subtitle=''
          breadcrumbs={[
            { label: '首页', href: '/dashboard' },
            { label: '客户关系管理', href: '/crm' },
            { label: '客户评分' },
          ]}
          columns={columns}
          data={paginatedScores}
          loading={loading}
          pagination={{
            page: currentPage,
            pageSize,
            total: filteredScores.length,
            onPageChange: setCurrentPage,
          }}
          searchable
          searchPlaceholder='搜索客户名称...'
          searchValue={searchQuery}
          onSearch={(value) => {
            setSearchQuery(value);
            setCurrentPage(0);
          }}
          actions={[
            {
              label: '批量计算评分',
              icon: <Calculator sx={{ width: 16, height: 16 }} />,
              onClick: handleBatchCalculate,
              variant: 'contained',
            },
          ]}
          rowActions={rowActions}
          onRefresh={loadCustomerScores}
          showRowNumber
          headerContent={headerContent}
        />

        <Dialog
          open={showDetailDialog}
          onClose={() => setShowDetailDialog(false)}
        >
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Award sx={{ width: 20, height: 20 }} />
            {selectedScore?.customer_name} - 评分详情
          </DialogTitle>
          <DialogContent sx={{ maxWidth: 550 }}>
            {selectedScore && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: 4,
                    py: 2,
                  }}
                >
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography
                      variant='h3'
                      sx={{
                        fontWeight: 'bold',
                        color: getScoreColor(selectedScore.score),
                      }}
                    >
                      {selectedScore.score}
                    </Typography>
                    <Typography
                      variant='body2'
                      sx={{ color: 'text.secondary', mt: 0.5 }}
                    >
                      综合评分
                    </Typography>
                    {selectedScore.last_score !== undefined && (
                      <Typography
                        variant='caption'
                        sx={{
                          color:
                            selectedScore.score > selectedScore.last_score
                              ? 'success.main'
                              : selectedScore.score < selectedScore.last_score
                                ? 'error.main'
                                : 'text.secondary',
                          mt: 0.5,
                          display: 'block',
                        }}
                      >
                        上次评分: {selectedScore.last_score}
                      </Typography>
                    )}
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    {getGradeBadge(selectedScore.scorelevel)}
                    <Typography
                      variant='body2'
                      sx={{ color: 'text.secondary', mt: 0.5 }}
                    >
                      客户等级
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {(selectedScore.factors as ScoreFactor[]).map((factor, index) => (
                    <Paper
                      key={index}
                      sx={{ p: 2, bgcolor: 'grey.100' }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          mb: 1,
                        }}
                      >
                        <Typography
                          variant='body1'
                          sx={{ fontWeight: 500 }}
                        >
                          {factor.name}
                        </Typography>
                        <Typography
                          variant='body2'
                          sx={{ color: 'text.secondary' }}
                        >
                          权重: {factor.weight}%
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{ flex: 1 }}>
                          <LinearProgress
                            variant='determinate'
                            value={(factor.score / factor.max_score) * 100}
                            sx={{
                              height: 8,
                              borderRadius: 1,
                              bgcolor: 'grey.300',
                            }}
                          />
                        </Box>
                        <Typography
                          variant='body2'
                          sx={{
                            fontWeight: 500,
                            width: 60,
                            textAlign: 'right',
                          }}
                        >
                          {factor.score}/{factor.max_score}
                        </Typography>
                      </Box>
                    </Paper>
                  ))}
                </Box>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowDetailDialog(false)}>关闭</Button>
          </DialogActions>
        </Dialog>
      </>
    </PageContainer>
  );
};

export default CRMCustomerScoringPage;
