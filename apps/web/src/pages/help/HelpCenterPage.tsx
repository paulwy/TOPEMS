import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  Stack,
  TextField,
  useTheme,
  CircularProgress,
} from '@mui/material';
import {
  FileText,
  MessageCircle,
  Search,
  ChevronRight,
  BookOpen,
  Video,
  Shield,
  Clock,
  Users,
  Rocket,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CardListTemplate, type CardRenderConfig } from '@/components/templates';
import { useTranslation } from 'react-i18next';
import { DASHBOARD_PATHS } from '@/routes/dashboard';
import { helpApi } from '@/api';
import type { Faq, Guide } from '@/api/help';
import { useQuery } from '@tanstack/react-query';
import { useNotificationStore } from '@/store';
import { apiLogger } from '@/utils/logger';

import { QUERY_KEYS } from '@/lib/reactQuery';
import i18n from '@/i18n';

const HELP_CATEGORIES = [
  {
    id: 'getting-started',
    title: i18n.t('help.help_center_page.k0'),
    description: i18n.t('help.help_center_page.k1'),
    icon: Rocket,
    color: 'primary',
    count: 5,
    items: [
      i18n.t('help.help_center_page.k6'),
      i18n.t('help.help_center_page.k5'),
      i18n.t('help.help_center_page.k4'),
      i18n.t('help.help_center_page.k3'),
      i18n.t('help.help_center_page.k2'),
    ],
  },
  {
    id: 'hrm',
    title: i18n.t('help.help_center_page.k7'),
    description: i18n.t('help.help_center_page.hr_8'),
    icon: Users,
    color: 'success',
    count: 8,
    items: [
      i18n.t('help.help_center_page.k13'),
      i18n.t('help.help_center_page.k12'),
      i18n.t('help.help_center_page.k11'),
      i18n.t('help.help_center_page.k10'),
      i18n.t('help.help_center_page.k9'),
    ],
  },
  {
    id: 'finance',
    title: i18n.t('help.help_center_page.k14'),
    description: i18n.t('help.help_center_page.k15'),
    icon: FileText,
    color: 'warning',
    count: 12,
    items: [
      i18n.t('help.help_center_page.k20'),
      i18n.t('help.help_center_page.k19'),
      i18n.t('help.help_center_page.k18'),
      i18n.t('help.help_center_page.k17'),
      i18n.t('help.help_center_page.k16'),
    ],
  },
  {
    id: 'workflow',
    title: i18n.t('help.help_center_page.k21'),
    description: i18n.t('help.help_center_page.k22'),
    icon: Clock,
    color: 'info',
    count: 6,
    items: [
      i18n.t('help.help_center_page.k27'),
      i18n.t('help.help_center_page.k26'),
      i18n.t('help.help_center_page.k25'),
      i18n.t('help.help_center_page.k24'),
      i18n.t('help.help_center_page.k23'),
    ],
  },
  {
    id: 'security',
    title: i18n.t('help.help_center_page.k28'),
    description: i18n.t('help.help_center_page.k29'),
    icon: Shield,
    color: 'error',
    count: 4,
    items: [
      i18n.t('help.help_center_page.k33'),
      i18n.t('help.help_center_page.k32'),
      i18n.t('help.help_center_page.k31'),
      i18n.t('help.help_center_page.k30'),
    ],
  },
  {
    id: 'ai',
    title: i18n.t('pages.help_center_page.ai_0'),
    description: i18n.t('pages.help_center_page.ai_1'),
    icon: MessageCircle,
    color: 'secondary',
    count: 3,
    items: [
      i18n.t('pages.help_center_page.ai_2'),
      i18n.t('help.help_center_page.k35'),
      i18n.t('help.help_center_page.k34'),
    ],
  },
];

const LATEST_UPDATES = [
  { id: '1', title: i18n.t('help.help_center_page.k36'), date: '2024-12-15', type: 'new' },
  { id: '2', title: i18n.t('help.help_center_page.k37'), date: '2024-12-14', type: 'update' },
  { id: '3', title: i18n.t('help.help_center_page.bug_38'), date: '2024-12-13', type: 'fix' },
];

export const HelpCenterPage: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigate = useNavigate();
  const { addNotification } = useNotificationStore();
  const [searchQuery, setSearchQuery] = useState('');

  const faqsQuery = useQuery<Faq[]>({
    queryKey: QUERY_KEYS.AD_HOC.HELP_CENTER_FAQS_BASE,
    queryFn: async () => {
      const response = await helpApi.listFaqs({ page: 1, page_size: 4 });
      if (response.success && response.data) {
        return response.data.items || [];
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });
  const faqs = faqsQuery.data || [];

  const guidesQuery = useQuery<Guide[]>({
    queryKey: QUERY_KEYS.AD_HOC.HELP_CENTER_GUIDES_BASE,
    queryFn: async () => {
      const response = await helpApi.listGuides({ page: 1, page_size: 6 });
      if (response.success && response.data) {
        return response.data.items || [];
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });
  const loading = faqsQuery.isLoading || guidesQuery.isLoading;

  React.useEffect(() => {
    if (faqsQuery.isError) {
      apiLogger.error(i18n.t('pages.help_center_page.faq_3'), faqsQuery.error);
      addNotification({
        type: 'error',
        title: i18n.t('help.help_center_page.k39'),
        message: i18n.t('help.help_center_page.faq_40'),
      });
    }
  }, [faqsQuery.isError, faqsQuery.error, apiLogger, addNotification]);

  React.useEffect(() => {
    if (guidesQuery.isError) {
      apiLogger.error(i18n.t('pages.help_center_page.k4'), guidesQuery.error);
      addNotification({
        type: 'error',
        title: i18n.t('help.help_center_page.k41'),
        message: i18n.t('help.help_center_page.k42'),
      });
    }
  }, [guidesQuery.isError, guidesQuery.error, apiLogger, addNotification]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const getCategoryColor = (color: string) => {
    const colorMap: Record<string, { bg: string; icon: string }> = {
      primary: { bg: 'primary.50', icon: 'primary.main' },
      success: { bg: 'success.50', icon: 'success.main' },
      warning: { bg: 'warning.50', icon: 'warning.main' },
      info: { bg: 'info.50', icon: 'info.main' },
      error: { bg: 'error.50', icon: 'error.main' },
      secondary: { bg: 'secondary.50', icon: 'secondary.main' },
    };
    return colorMap[color] || colorMap.primary;
  };

  const getTypeChip = (type: string) => {
    const typeMap: Record<string, { label: string; color: string }> = {
      new: { label: i18n.t('help.help_center_page.k43'), color: 'success' },
      update: { label: i18n.t('help.help_center_page.k44'), color: 'primary' },
      fix: { label: i18n.t('help.help_center_page.k45'), color: 'warning' },
    };
    return typeMap[type] || typeMap.update;
  };

  // 将 HELP_CATEGORIES 卡片网格数据转换为 CardListTemplate 的 data 格式
  const categoriesData = HELP_CATEGORIES.map((category) => ({
    id: category.id,
    title: category.title,
    description: category.description,
    icon: category.icon,
    color: category.color,
    count: category.count,
    item_0: category.items[0],
    item_1: category.items[1],
    item_2: category.items[2],
  }));

  const cardConfig: CardRenderConfig = {
    title: (item: unknown) => (item as { title: string }).title,
    description: (item: unknown) => (item as { description: string }).description,
    icon: (item: Record<string, unknown>) => {
      const Icon = item.icon as unknown as React.ComponentType<{ sx?: object }>;
      const colors = getCategoryColor(item.color as string);
      return <Icon sx={{ width: 24, height: 24, color: colors.icon }} />;
    },
    iconBgColor: (item: Record<string, unknown>) => getCategoryColor(item.color as string).bg,
    meta: [
      { field: 'item_0', icon: <ChevronRight size={14} /> },
      { field: 'item_1', icon: <ChevronRight size={14} /> },
      { field: 'item_2', icon: <ChevronRight size={14} /> },
      {
        field: 'count',
        format: (value: unknown) =>
          `${i18n.t('pages.help_center_page.k0')} ${value} ${i18n.t('pages.help_center_page.k1')}`,
      },
    ],
  };

  const cardActions = [
    {
      label: i18n.t('pages.help_center_page.k2'),
      icon: <ChevronRight size={16} />,
      onClick: () => {},
      color: 'primary' as const,
      variant: 'text' as const,
    },
  ];

  return (
    <>
      <CardListTemplate
        title={t('help_center.title')}
        subtitle={t('help_center.subtitle')}
        customToolbar={
          <Box sx={{ maxWidth: 600, mx: 'auto', position: 'relative' }}>
            <Search
              sx={{
                position: 'absolute',
                left: 16,
                top: '50%',
                transform: 'translateY(-50%)',
                color: theme.palette.text.disabled,
              }}
            />
            <TextField
              fullWidth
              placeholder={t('help_center.search_placeholder')}
              value={searchQuery}
              onChange={handleSearch}
              sx={{ pl: 10 }}
            />
          </Box>
        }
        data={categoriesData as unknown as Record<string, unknown>[]}
        cardConfig={cardConfig}
        cardActions={cardActions}
        gridColumns={{ xs: 1, sm: 2, lg: 3 }}
        showStatsOverview={false}
      />

      <Box sx={{ p: { xs: 2, md: 3 }, pt: 0 }}>
        <Grid
          container
          spacing={6}
        >
          <Grid size={{ xs: 12, lg: 8 }}>
            <Typography
              variant='h5'
              sx={{ fontWeight: 600, mb: 4 }}
            >
              {t('help_center.faq')}
            </Typography>
            {loading ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                <Stack spacing={2}>
                  {faqs.map((faq) => (
                    <Card
                      key={faq.id}
                      sx={{
                        borderRadius: 1,
                        cursor: 'pointer',
                        transition: 'box-shadow 0.2s',
                        '&:hover': { boxShadow: theme.shadows[2] },
                      }}
                    >
                      <CardContent
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <Typography variant='body1'>{faq.question}</Typography>
                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                          <Typography
                            variant='body2'
                            color='text.secondary'
                          >
                            {i18n.t('pages.help_center_page.k3')} {faq.views.toLocaleString()}
                          </Typography>
                          <ChevronRight
                            size={16}
                            sx={{ color: theme.palette.text.disabled }}
                          />
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
                <Box sx={{ mt: 4, textAlign: 'right' }}>
                  <Button
                    size='small'
                    sx={{ textTransform: 'none' }}
                    onClick={() => navigate(DASHBOARD_PATHS.helpFaq)}
                  >
                    {i18n.t('pages.help_center_page.faq_0')}
                    <ChevronRight size={16} />
                  </Button>
                </Box>
              </>
            )}
          </Grid>

          <Grid size={{ xs: 12, lg: 4 }}>
            <Typography
              variant='h5'
              sx={{ fontWeight: 600, mb: 4 }}
            >
              {t('help_center.latest_updates')}
            </Typography>
            <Stack spacing={3}>
              {LATEST_UPDATES.map((update) => (
                <Box key={update.id}>
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 1 }}>
                    <Chip
                      size='small'
                      label={getTypeChip(update.type).label}
                      color={
                        getTypeChip(update.type).color as React.ComponentProps<typeof Chip>['color']
                      }
                      sx={{ fontWeight: 500 }}
                    />
                    <Typography
                      variant='body2'
                      color='text.secondary'
                    >
                      {update.date}
                    </Typography>
                  </Box>
                  <Typography
                    variant='body1'
                    sx={{ fontWeight: 500 }}
                  >
                    {update.title}
                  </Typography>
                </Box>
              ))}
            </Stack>

            <Card sx={{ mt: 6, borderRadius: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', gap: 3, mb: 3 }}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 1,
                      bgcolor: 'primary.50',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <MessageCircle sx={{ width: 24, height: 24, color: 'primary.main' }} />
                  </Box>
                  <Box>
                    <Typography
                      variant='h6'
                      sx={{ fontWeight: 600 }}
                    >
                      {i18n.t('pages.help_center_page.k1')}
                    </Typography>
                    <Typography
                      variant='body2'
                      color='text.secondary'
                    >
                      {i18n.t('pages.help_center_page.k2')}
                    </Typography>
                  </Box>
                </Box>
                <Button
                  fullWidth
                  variant='contained'
                  sx={{ textTransform: 'none', borderRadius: 1 }}
                >
                  {i18n.t('pages.help_center_page.k3')}
                </Button>
                <Typography
                  variant='body2'
                  color='text.secondary'
                  sx={{ mt: 2, textAlign: 'center' }}
                >
                  {i18n.t('pages.help_center_page.k4')}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Box sx={{ mt: 8 }}>
          <Card sx={{ borderRadius: 2 }}>
            <CardContent>
              <Grid
                container
                spacing={4}
              >
                <Grid
                  size={{ xs: 12, sm: 4 }}
                  onClick={() => navigate(DASHBOARD_PATHS.helpGuide)}
                  sx={{ cursor: 'pointer' }}
                >
                  <Box sx={{ textAlign: 'center' }}>
                    <BookOpen
                      size={32}
                      sx={{ color: theme.palette.primary.main, mb: 2 }}
                    />
                    <Typography
                      variant='body1'
                      sx={{ fontWeight: 600, mb: 1 }}
                    >
                      {i18n.t('pages.help_center_page.k5')}
                    </Typography>
                    <Typography
                      variant='body2'
                      color='text.secondary'
                    >
                      {i18n.t('pages.help_center_page.k6')}
                    </Typography>
                  </Box>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Video
                      size={32}
                      sx={{ color: theme.palette.success.main, mb: 2 }}
                    />
                    <Typography
                      variant='body1'
                      sx={{ fontWeight: 600, mb: 1 }}
                    >
                      {i18n.t('pages.help_center_page.k7')}
                    </Typography>
                    <Typography
                      variant='body2'
                      color='text.secondary'
                    >
                      {i18n.t('pages.help_center_page.k8')}
                    </Typography>
                  </Box>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <MessageCircle
                      size={32}
                      sx={{ color: theme.palette.info.main, mb: 2 }}
                    />
                    <Typography
                      variant='body1'
                      sx={{ fontWeight: 600, mb: 1 }}
                    >
                      {i18n.t('pages.help_center_page.k9')}
                    </Typography>
                    <Typography
                      variant='body2'
                      color='text.secondary'
                    >
                      {i18n.t('pages.help_center_page.k10')}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </>
  );
};

export default HelpCenterPage;
