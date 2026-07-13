import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  Stack,
  Button,
  LinearProgress,
  useTheme,
  CircularProgress,
} from '@mui/material';
import {
  BookOpen,
  PlayCircle,
  CheckCircle,
  Clock,
  ChevronRight,
  Award,
  Lightbulb,
  ArrowLeft,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageContainer } from '@/components/common';
import { useTranslation } from 'react-i18next';
import { DASHBOARD_PATHS } from '@/routes/dashboard';
import { helpApi } from '@/api';
import type { Guide } from '@/api/help';

interface GuideCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
}

const GUIDE_CATEGORIES: GuideCategory[] = [
  { id: 'beginner', name: '入门指南', icon: '🌱', color: 'primary' },
  { id: 'advanced', name: '进阶教程', icon: '🚀', color: 'success' },
  { id: 'expert', name: '高级技巧', icon: '💎', color: 'warning' },
];

export const GuidePage: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    fetchGuides();
    fetchCategories();
  }, [selectedCategory]);

  const fetchGuides = async () => {
    setLoading(true);
    try {
      const params = {
        category: selectedCategory === 'all' ? undefined : selectedCategory,
        page: 1,
        page_size: 50,
      };
      const response = await helpApi.listGuides(params);
      if (response.success && response.data) {
        setGuides(response.data.items);
      }
    } catch (error) {
      console.error('Failed to fetch guides:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await helpApi.getGuideCategories();
      if (response.success && response.data) {
        setCategories(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch guide categories:', error);
    }
  };

  const filteredGuides =
    selectedCategory === 'all'
      ? guides
      : guides.filter((guide) => guide.category === selectedCategory);

  const completedCount = guides.filter((g) => g.is_active).length;
  const totalProgress = guides.length > 0
    ? Math.round(guides.reduce((acc, g) => acc + (g.is_active ? 100 : 0), 0) / guides.length)
    : 0;

  const getCategoryInfo = (categoryId: string) => {
    const category = GUIDE_CATEGORIES.find((c) => c.id === categoryId);
    return category || { id: categoryId, name: categoryId, icon: '📚', color: 'primary' };
  };

  const getCategoryColor = (color: string) => {
    const colorMap: Record<string, string> = {
      primary: 'primary.main',
      success: 'success.main',
      warning: 'warning.main',
    };
    return colorMap[color] || colorMap.primary;
  };

  return (
    <PageContainer
      title={t('help_center.guide')}
      subtitle={t('help_center.guide_subtitle')}
      headerProps={{ pageIcon: <BookOpen size={20} /> }}
    >
      <Box sx={{ mb: 4 }}>
        <Button
          sx={{ textTransform: 'none' }}
          onClick={() => navigate(DASHBOARD_PATHS.helpCenter)}
        >
          <ArrowLeft size={16} sx={{ mr: 1 }} />
          返回帮助中心
        </Button>
      </Box>

      <Card sx={{ mb: 6, borderRadius: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 4 }}>
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: 2,
                bgcolor: 'primary.50',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Award sx={{ width: 32, height: 32, color: 'primary.main' }} />
            </Box>
            <Box>
              <Typography variant='h6' sx={{ fontWeight: 600 }}>
                学习进度
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                已完成 {completedCount}/{guides.length} 个课程
              </Typography>
            </Box>
          </Box>
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant='body2' color='text.secondary'>
                总体进度
              </Typography>
              <Typography variant='body2' sx={{ fontWeight: 600 }}>
                {totalProgress}%
              </Typography>
            </Box>
            <LinearProgress
              variant='determinate'
              value={totalProgress}
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>
        </CardContent>
      </Card>

      <Box sx={{ mb: 6 }}>
        <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
          {t('help_center.filter_category')}
        </Typography>
        <Stack direction='row' spacing={2} sx={{ flexWrap: 'wrap' }}>
          <Chip
            label='📋 全部'
            onClick={() => setSelectedCategory('all')}
            color={selectedCategory === 'all' ? 'primary' : 'default'}
            sx={{ cursor: 'pointer', fontWeight: selectedCategory === 'all' ? 600 : 400 }}
          />
          {[...new Set(categories)].map((category) => {
            const info = getCategoryInfo(category);
            return (
              <Chip
                key={category}
                label={`${info.icon} ${info.name}`}
                onClick={() => setSelectedCategory(category)}
                color={selectedCategory === category ? 'primary' : 'default'}
                sx={{ cursor: 'pointer', fontWeight: selectedCategory === category ? 600 : 400 }}
              />
            );
          })}
        </Stack>
      </Box>

      {loading ? (
        <Box sx={{ textAlign: 'center', py: 12 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {filteredGuides.map((guide) => {
            const categoryInfo = getCategoryInfo(guide.category);
            return (
              <Grid size={{ xs: 12, md: 6 }} key={guide.id}>
                <Card
                  sx={{
                    height: '100%',
                    borderRadius: 2,
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': { transform: 'translateY(-2px)', boxShadow: theme.shadows[3] },
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', gap: 3, mb: 3 }}>
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: 1,
                          bgcolor: guide.is_active ? 'success.50' : 'primary.50',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {guide.is_active ? (
                          <CheckCircle sx={{ width: 24, height: 24, color: 'success.main' }} />
                        ) : (
                          <PlayCircle sx={{ width: 24, height: 24, color: 'primary.main' }} />
                        )}
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                          <Typography variant='h6' sx={{ fontWeight: 600 }}>
                            {guide.title}
                          </Typography>
                          {guide.is_active && (
                            <Chip
                              size='small'
                              label='已完成'
                              color='success'
                              sx={{ fontWeight: 500 }}
                            />
                          )}
                        </Box>
                        <Typography variant='body2' color='text.secondary'>
                          {guide.description}
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Clock size={14} sx={{ color: theme.palette.text.disabled }} />
                        <Typography variant='body2' color='text.secondary'>
                          {guide.duration}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <BookOpen size={14} sx={{ color: theme.palette.text.disabled }} />
                        <Typography variant='body2' color='text.secondary'>
                          {guide.lessons_count} 节课
                        </Typography>
                      </Box>
                      <Chip
                        size='small'
                        label={categoryInfo.name}
                        sx={{ fontWeight: 400 }}
                      />
                    </Box>

                    {!guide.is_active && (
                      <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant='body2' color='text.secondary'>
                            学习进度
                          </Typography>
                          <Typography variant='body2' sx={{ fontWeight: 600 }}>
                            0%
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant='determinate'
                          value={0}
                          sx={{ height: 4, borderRadius: 2 }}
                        />
                      </Box>
                    )}

                    <Box sx={{ mt: 3 }}>
                      <Button
                        fullWidth
                        variant={guide.is_active ? 'outlined' : 'contained'}
                        sx={{ textTransform: 'none', borderRadius: 1 }}
                      >
                        {guide.is_active ? '复习课程' : '开始学习'}
                        <ChevronRight size={16} />
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {!loading && filteredGuides.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 12 }}>
          <BookOpen size={48} sx={{ color: theme.palette.text.disabled, mx: 'auto', mb: 3 }} />
          <Typography variant='h6' sx={{ mb: 2 }}>
            {t('help_center.no_results')}
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            {t('help_center.try_different')}
          </Typography>
        </Box>
      )}

      <Box sx={{ mt: 8 }}>
        <Card sx={{ borderRadius: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
              <Lightbulb size={20} sx={{ color: theme.palette.warning.main }} />
              <Typography variant='h6' sx={{ fontWeight: 600 }}>
                学习小贴士
              </Typography>
            </Box>
            <Grid container spacing={4}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Typography variant='body2' color='text.secondary'>
                  📖 <strong>循序渐进</strong>：建议按照入门→进阶→高级的顺序学习
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Typography variant='body2' color='text.secondary'>
                  👀 <strong>边学边练</strong>：跟随指南操作，加深理解和记忆
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Typography variant='body2' color='text.secondary'>
                  💬 <strong>遇到问题</strong>：参考FAQ或联系在线客服获取帮助
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Box>
    </PageContainer>
  );
};

export default GuidePage;