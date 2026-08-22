import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Stack,
  Button,
  LinearProgress,
  useTheme,
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
import { ListPageTemplate } from '@/components/templates';
import type { ColumnDef } from '@/components/templates/list/types';
import { useTranslation } from 'react-i18next';
import { DASHBOARD_PATHS } from '@/routes/dashboard';
import { helpApi } from '@/api';
import type { Guide } from '@/api/help';
import { useQuery } from '@tanstack/react-query';
import { useNotificationStore } from '@/store';
import { apiLogger } from '@/utils/logger';

import { QUERY_KEYS } from '@/lib/reactQuery';
import i18n from '@/i18n';

interface GuideCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
}

const GUIDE_CATEGORIES: GuideCategory[] = [
  { id: 'beginner', name: i18n.t('help.guide_page.k0'), icon: '🌱', color: 'primary' },
  { id: 'advanced', name: i18n.t('help.guide_page.k1'), icon: '🚀', color: 'success' },
  { id: 'expert', name: i18n.t('help.guide_page.k2'), icon: '💎', color: 'warning' },
];

export const GuidePage: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigate = useNavigate();
  const { addNotification } = useNotificationStore();
  const [selectedCategory, setSelectedCategory] = useState('all');

  const guidesQuery = useQuery<Guide[]>({
    queryKey: [...QUERY_KEYS.AD_HOC.HELP_GUIDES_BASE, selectedCategory],
    queryFn: async () => {
      const params = {
        category: selectedCategory === 'all' ? undefined : selectedCategory,
        page: 1,
        page_size: 50,
      };
      const response = await helpApi.listGuides(params);
      if (response.success && response.data) {
        return response.data.items || [];
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });
  const guides = guidesQuery.data || [];
  const loading = guidesQuery.isLoading;

  const categoriesQuery = useQuery<string[]>({
    queryKey: QUERY_KEYS.AD_HOC.HELP_GUIDE_CATEGORIES_BASE,
    queryFn: async () => {
      const response = await helpApi.getGuideCategories();
      if (response.success && response.data) {
        return response.data;
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });
  const categories = categoriesQuery.data || [];

  useEffect(() => {
    if (guidesQuery.isError) {
      apiLogger.error(i18n.t('pages.guide_page.k0'), guidesQuery.error);
      addNotification({
        type: 'error',
        title: i18n.t('help.guide_page.k3'),
        message: i18n.t('help.guide_page.k4'),
      });
    }
  }, [guidesQuery.isError, guidesQuery.error, addNotification]);

  useEffect(() => {
    if (categoriesQuery.isError) {
      apiLogger.error(i18n.t('pages.guide_page.k1'), categoriesQuery.error);
    }
  }, [categoriesQuery.isError, categoriesQuery.error]);

  const filteredGuides = useMemo(
    () =>
      selectedCategory === 'all'
        ? guides
        : guides.filter((guide: Guide) => guide.category === selectedCategory),
    [selectedCategory, guides]
  );

  const completedCount = useMemo(() => guides.filter((g: Guide) => g.isActive).length, [guides]);
  const totalProgress = useMemo(
    () =>
      guides.length > 0
        ? Math.round(guides.reduce((acc, g) => acc + (g.isActive ? 100 : 0), 0) / guides.length)
        : 0,
    [guides]
  );

  const getCategoryInfo = useCallback((categoryId: string) => {
    const category = GUIDE_CATEGORIES.find((c) => c.id === categoryId);
    return category || { id: categoryId, name: categoryId, icon: '📚', color: 'primary' };
  }, []);

  const columns: ColumnDef<Guide>[] = useMemo(
    () => [
      {
        id: 'title',
        label: t('help_center.guide'),
        render: (row: Guide) => <Typography>{row.title}</Typography>,
      },
      {
        id: 'category',
        label: t('help_center.filter_category'),
        render: (row: Guide) => {
          const info = getCategoryInfo(row.category);
          return (
            <Chip
              label={info.name}
              size='small'
            />
          );
        },
      },
      {
        id: 'duration',
        label: 'Duration',
        render: (row: Guide) => <Typography>{row.duration}</Typography>,
      },
      {
        id: 'isActive',
        label: i18n.t('help.guide_page.k5'),
        render: (row: Guide) => (
          <Chip
            label={i18n.t('help.guide_page.k5')}
            color={row.isActive ? 'success' : 'default'}
            size='small'
          />
        ),
      },
    ],
    [t, getCategoryInfo]
  );

  const handleBackToHelpCenter = useCallback(() => {
    navigate(DASHBOARD_PATHS.helpCenter);
  }, [navigate]);

  const headerContent = useMemo(
    () => (
      <Box>
        <Box sx={{ mb: 4 }}>
          <Button
            sx={{ textTransform: 'none' }}
            onClick={handleBackToHelpCenter}
          >
            <ArrowLeft
              size={16}
              style={{ marginRight: 8 }}
            />
            {i18n.t('pages.guide_page.k2')}
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
                <Award style={{ width: 32, height: 32, color: theme.palette.primary.main }} />
              </Box>
              <Box>
                <Typography
                  variant='h6'
                  sx={{ fontWeight: 600 }}
                >
                  {i18n.t('pages.guide_page.k3')}
                </Typography>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {i18n.t('pages.guide_page.k0')} {completedCount}/{guides.length}{' '}
                  {i18n.t('pages.guide_page.k1')}
                </Typography>
              </Box>
            </Box>
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {i18n.t('pages.guide_page.k4')}
                </Typography>
                <Typography
                  variant='body2'
                  sx={{ fontWeight: 600 }}
                >
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
      </Box>
    ),
    [
      handleBackToHelpCenter,
      completedCount,
      guides.length,
      totalProgress,
      theme.palette.primary.main,
      t,
    ]
  );

  const filterContent = useMemo(
    () => (
      <Box sx={{ mb: 6 }}>
        <Typography
          variant='body2'
          color='text.secondary'
          sx={{ mb: 2 }}
        >
          {t('help_center.filter_category')}
        </Typography>
        <Stack
          direction='row'
          spacing={2}
          sx={{ flexWrap: 'wrap' }}
        >
          <Chip
            label={i18n.t('pages.guide_page.k5')}
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
    ),
    [selectedCategory, categories, getCategoryInfo, t]
  );

  const renderCardView = useCallback(
    (data: Guide[]) => (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
          gap: 3,
        }}
      >
        {data.map((guide) => {
          const categoryInfo = getCategoryInfo(guide.category);
          return (
            <Card
              key={guide.id}
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
                      bgcolor: guide.isActive ? 'success.50' : 'primary.50',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {guide.isActive ? (
                      <CheckCircle
                        style={{ width: 24, height: 24, color: theme.palette.success.main }}
                      />
                    ) : (
                      <PlayCircle
                        style={{ width: 24, height: 24, color: theme.palette.primary.main }}
                      />
                    )}
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                      <Typography
                        variant='h6'
                        sx={{ fontWeight: 600 }}
                      >
                        {guide.title}
                      </Typography>
                      {guide.isActive && (
                        <Chip
                          size='small'
                          label={i18n.t('help.guide_page.k5')}
                          color='success'
                          sx={{ fontWeight: 500 }}
                        />
                      )}
                    </Box>
                    <Typography
                      variant='body2'
                      color='text.secondary'
                    >
                      {guide.description}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Clock
                      size={14}
                      style={{ color: theme.palette.text.disabled }}
                    />
                    <Typography
                      variant='body2'
                      color='text.secondary'
                    >
                      {guide.duration}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <BookOpen
                      size={14}
                      style={{ color: theme.palette.text.disabled }}
                    />
                    <Typography
                      variant='body2'
                      color='text.secondary'
                    >
                      {guide.lessons_count} {i18n.t('pages.guide_page.k2')}
                    </Typography>
                  </Box>
                  <Chip
                    size='small'
                    label={categoryInfo.name}
                    sx={{ fontWeight: 400 }}
                  />
                </Box>

                {!guide.isActive && (
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography
                        variant='body2'
                        color='text.secondary'
                      >
                        {i18n.t('pages.guide_page.k6')}
                      </Typography>
                      <Typography
                        variant='body2'
                        sx={{ fontWeight: 600 }}
                      >
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
                    variant={guide.isActive ? 'outlined' : 'contained'}
                    sx={{ textTransform: 'none', borderRadius: 1 }}
                  >
                    {guide.isActive ? i18n.t('help.guide_page.k7') : i18n.t('help.guide_page.k6')}
                    <ChevronRight size={16} />
                  </Button>
                </Box>
              </CardContent>
            </Card>
          );
        })}
      </Box>
    ),
    [getCategoryInfo, theme, i18n.language]
  );

  const footerContent = useMemo(
    () => (
      <Box sx={{ mt: 8 }}>
        <Card sx={{ borderRadius: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
              <Lightbulb
                size={20}
                style={{ color: theme.palette.warning.main }}
              />
              <Typography
                variant='h6'
                sx={{ fontWeight: 600 }}
              >
                {i18n.t('pages.guide_page.k7')}
              </Typography>
            </Box>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
                gap: 4,
              }}
            >
              <Typography
                variant='body2'
                color='text.secondary'
              >
                📖 <strong>{i18n.t('help.guide_page.k8')}</strong>：{i18n.t('pages.guide_page.k8')}
                {t('help.guide_page.sequence_tip')}
              </Typography>
              <Typography
                variant='body2'
                color='text.secondary'
              >
                👀 <strong>{i18n.t('help.guide_page.k9')}</strong>：{i18n.t('pages.guide_page.k11')}
              </Typography>
              <Typography
                variant='body2'
                color='text.secondary'
              >
                💬 <strong>{i18n.t('help.guide_page.k10')}</strong>：
                {i18n.t('pages.guide_page.k12')}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>
    ),
    [theme.palette.warning.main, t]
  );

  return (
    <ListPageTemplate<Guide>
      title={t('help_center.guide')}
      subtitle={t('help_center.guide_subtitle')}
      columns={columns}
      data={filteredGuides}
      loading={loading}
      headerContent={headerContent}
      filterContent={filterContent}
      footerContent={footerContent}
      renderCardView={renderCardView}
      viewMode='card'
      viewModes={['card']}
      emptyMessage={t('help_center.no_results')}
      emptyIcon={<BookOpen style={{ width: 48, height: 48, color: theme.palette.text.disabled }} />}
    />
  );
};

export default GuidePage;
