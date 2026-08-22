import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import {
  Package,
  Star,
  CheckCircle,
  ShoppingCart,
  Loader2,
  Shield,
  HardDrive,
  ThumbsUp,
  Send,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  Box,
  Typography,
  Button,
  Chip,
  Rating,
  Avatar,
  Divider,
  Card,
  CardContent,
  TextField,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  useTheme,
} from '@mui/material';
import { PluginRating } from '@/components/plugin';
import { DetailPageTemplate } from '@/components/templates';
import type { TabConfig } from '@/components/templates/DetailPageTemplate';
import type { PluginVersion, PluginReview } from '@/api/plugin';
import { getPlugin, getPluginVersions, getPluginReviews, submitPluginReview } from '@/api/plugin';
import { usePluginStore } from '@/store/pluginStore';
import { useNotificationStore } from '@/store';
import { logger } from '@/utils/logger';
import { PLUGIN_PATHS } from '@/modules/plugin/config';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/lib/reactQuery';

const PluginDetailPage: React.FC = () => {
  const { t } = useTranslation();
  const { pluginCode } = useParams<{ pluginCode: string }>();
  const { installPlugin, isPluginInstalled, fetchHealthStatus, healthStatus } = usePluginStore();
  const { addNotification } = useNotificationStore();
  const queryClient = useQueryClient();
  const theme = useTheme();

  const [rating, setRating] = useState(0);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewContent, setReviewContent] = useState('');
  const [isInstalling, setIsInstalling] = useState(false);
  const [expandedVersion, setExpandedVersion] = useState<string | null>(null);

  const installed = useMemo(
    () => (pluginCode ? isPluginInstalled(pluginCode) : false),
    [pluginCode, isPluginInstalled]
  );

  const pluginQuery = useQuery({
    queryKey: [...QUERY_KEYS.AD_HOC.PLUGIN_DETAIL_BASE, pluginCode],
    queryFn: async () => {
      if (!pluginCode) throw new Error(t('plugin.message.plugin_code_empty'));
      const res = await getPlugin(pluginCode);
      if (res.success && res.data) {
        return res.data;
      }
      throw new Error(t('plugin.message.plugin_not_exist'));
    },
    enabled: !!pluginCode,
    staleTime: 5 * 60 * 1000,
  });

  const versionsQuery = useQuery({
    queryKey: [...QUERY_KEYS.AD_HOC.PLUGIN_VERSIONS_BASE, pluginCode],
    queryFn: async () => {
      if (!pluginCode) return [];
      const res = await getPluginVersions(pluginCode);
      if (res.success && res.data) {
        return res.data;
      }
      return [];
    },
    enabled: !!pluginCode,
    staleTime: 5 * 60 * 1000,
  });

  const reviewsQuery = useQuery({
    queryKey: [...QUERY_KEYS.AD_HOC.PLUGIN_REVIEWS_BASE, pluginCode],
    queryFn: async () => {
      if (!pluginCode) return { reviews: [], average_rating: 0 };
      const res = await getPluginReviews(pluginCode);
      if (res.success && res.data) {
        return res.data;
      }
      return { reviews: [], average_rating: 0 };
    },
    enabled: !!pluginCode,
    staleTime: 5 * 60 * 1000,
  });

  const healthQuery = useQuery({
    queryKey: [...QUERY_KEYS.AD_HOC.PLUGIN_HEALTH_BASE, pluginCode],
    queryFn: async () => {
      await fetchHealthStatus();
      return healthStatus;
    },
    enabled: !!pluginCode,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (pluginQuery.isError && pluginQuery.error) {
      logger.error(t('pages.plugin_detail_page.k0'), pluginQuery.error);
    }
  }, [pluginQuery.isError, pluginQuery.error, t]);

  useEffect(() => {
    if (versionsQuery.isError && versionsQuery.error) {
      logger.error(t('pages.plugin_detail_page.k1'), versionsQuery.error);
    }
  }, [versionsQuery.isError, versionsQuery.error, t]);

  useEffect(() => {
    if (reviewsQuery.isError && reviewsQuery.error) {
      logger.error(t('pages.plugin_detail_page.k2'), reviewsQuery.error);
    }
  }, [reviewsQuery.isError, reviewsQuery.error, t]);

  useEffect(() => {
    if (healthQuery.isError && healthQuery.error) {
      logger.error(t('pages.plugin_detail_page.k3'), healthQuery.error);
    }
  }, [healthQuery.isError, healthQuery.error, t]);

  const plugin = pluginQuery.data;
  const versions = versionsQuery.data || [];
  const reviews = reviewsQuery.data?.reviews || [];
  const averageRating = reviewsQuery.data?.average_rating || 0;
  const loading = pluginQuery.isLoading || versionsQuery.isLoading || reviewsQuery.isLoading;
  const error = pluginQuery.error;

  const submitReviewMutation = useMutation({
    mutationFn: (data: { rating: number; title?: string; content?: string }) => {
      if (!pluginCode) throw new Error(t('plugin.message.plugin_code_empty'));
      return submitPluginReview(pluginCode, data);
    },
    onSuccess: () => {
      addNotification({
        title: t('plugin.message.review_success_title'),
        message: t('plugin.message.review_success_message'),
        type: 'success',
      });
      setRating(0);
      setReviewTitle('');
      setReviewContent('');
      queryClient.invalidateQueries({
        queryKey: [...QUERY_KEYS.AD_HOC.PLUGIN_REVIEWS_BASE, pluginCode],
        exact: false,
        refetchType: 'active',
      });
    },
    onError: (error: unknown) => {
      logger.error(t('pages.plugin_detail_page.k4'), error);
      const err = error as { message?: string };
      addNotification({
        title: t('plugin.message.review_failed_title'),
        message: err.message || t('plugin.message.review_failed_message'),
        type: 'error',
      });
    },
  });

  if (versions.length > 0 && !expandedVersion) {
    setExpandedVersion(versions[0].id);
  }

  const handleInstall = async () => {
    if (!pluginCode) return;
    setIsInstalling(true);
    try {
      const success = await installPlugin(pluginCode);
      if (success) {
        addNotification({
          title: t('plugin.message.install_success'),
          message: t('plugin.detail_page.install_success_message', {
            name: plugin?.name || t('plugin.title'),
          }),
          type: 'success',
        });
      } else {
        addNotification({
          title: t('plugin.message.install_failed'),
          message: t('plugin.message.install_failed_message'),
          type: 'error',
        });
      }
    } catch (error: unknown) {
      const err = error as { message?: string };
      addNotification({
        title: t('plugin.message.install_failed'),
        message: err.message || t('plugin.message.install_failed_short'),
        type: 'error',
      });
    } finally {
      setIsInstalling(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!pluginCode || rating === 0) return;
    await submitReviewMutation.mutateAsync({
      rating,
      title: reviewTitle || undefined,
      content: reviewContent || undefined,
    });
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <DetailPageTemplate
        title={plugin?.name || t('plugin.title')}
        subtitle={plugin?.description}
        backHref={PLUGIN_PATHS.marketplace}
        loading={true}
      />
    );
  }

  if (error || !plugin) {
    return (
      <DetailPageTemplate
        title={t('plugin.title')}
        subtitle=''
        backHref={PLUGIN_PATHS.marketplace}
        error={error ? (error as Error).message : t('plugin.message.plugin_not_exist')}
      />
    );
  }

  const features = [
    t('plugin.detail_page.feature.business_flow'),
    t('plugin.detail_page.feature.flexible_config'),
    t('plugin.detail_page.feature.rich_api'),
    t('plugin.detail_page.feature.multi_platform'),
    t('plugin.detail_page.feature.data_security'),
    t('plugin.detail_page.feature.continuous_update'),
  ];

  const introTabContent = (
    <Box>
      <Typography
        variant='h6'
        sx={{ fontWeight: 'bold', mb: 2 }}
      >
        {t('plugin.detail_page.section.plugin_intro')}
      </Typography>
      <Typography
        variant='body1'
        sx={{ mb: 4, lineHeight: 1.8 }}
      >
        {plugin.description}
      </Typography>

      <Typography
        variant='h6'
        sx={{ fontWeight: 'bold', mb: 2 }}
      >
        {t('plugin.detail_page.section.main_features')}
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, mb: 4 }}>
        {features.map((feature, idx) => (
          <Box
            key={`plugin-feature-${idx}`}
            sx={{ display: 'flex', alignItems: 'center', gap: 2 }}
          >
            <CheckCircle sx={{ width: 20, height: 20, color: 'success.main', flexShrink: 0 }} />
            <Typography variant='body2'>{feature}</Typography>
          </Box>
        ))}
      </Box>

      <Typography
        variant='h6'
        sx={{ fontWeight: 'bold', mb: 2 }}
      >
        {t('plugin.detail_page.section.tags')}
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {plugin.tags?.map((tag) => (
          <Chip
            key={tag}
            label={tag}
            variant='outlined'
          />
        ))}
      </Box>
    </Box>
  );

  const versionsTabContent = (
    <Box>
      <Typography
        variant='h6'
        sx={{ fontWeight: 'bold', mb: 3 }}
      >
        {t('plugin.detail_page.section.version_history')}
      </Typography>
      {versions.length > 0 ? (
        versions.map((version: PluginVersion) => (
          <Accordion
            key={version.id}
            expanded={expandedVersion === version.id}
            onChange={() => setExpandedVersion(expandedVersion === version.id ? null : version.id)}
            sx={{ mb: 2, borderRadius: 3 }}
          >
            <AccordionSummary
              expandIcon={expandedVersion === version.id ? <ChevronUp /> : <ChevronDown />}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                <Typography sx={{ fontWeight: 'medium' }}>{version.version}</Typography>
                {version.is_latest && (
                  <Chip
                    label={t('plugin.common.latest')}
                    size='small'
                    color='primary'
                  />
                )}
                {version.is_stable && (
                  <Chip
                    label={t('plugin.common.stable')}
                    size='small'
                    color='success'
                    variant='outlined'
                  />
                )}
                <Box sx={{ flexGrow: 1 }} />
                <Typography
                  variant='body2'
                  color='textSecondary'
                >
                  {new Date(version.created_at).toLocaleDateString()}
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              {version.release_notes && (
                <Box sx={{ mb: 2 }}>
                  <Typography
                    variant='subtitle2'
                    sx={{ mb: 1 }}
                  >
                    {t('plugin.detail_page.version.update_notes')}
                  </Typography>
                  <Typography
                    variant='body2'
                    color='textSecondary'
                  >
                    {version.release_notes}
                  </Typography>
                </Box>
              )}
              <Box sx={{ display: 'flex', gap: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <HardDrive sx={{ width: 16, height: 16, color: 'grey.500' }} />
                  <Typography
                    variant='body2'
                    color='textSecondary'
                  >
                    {t('plugin.detail_page.version.size_label', {
                      size: formatFileSize(version.filesize),
                    })}
                  </Typography>
                </Box>
                {version.min_app_version && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Shield sx={{ width: 16, height: 16, color: 'grey.500' }} />
                    <Typography
                      variant='body2'
                      color='textSecondary'
                    >
                      {t('plugin.detail_page.version.min_version_label', {
                        version: version.min_app_version,
                      })}
                    </Typography>
                  </Box>
                )}
              </Box>
            </AccordionDetails>
          </Accordion>
        ))
      ) : (
        <Typography
          variant='body2'
          color='textSecondary'
        >
          {t('plugin.common.no_version_info')}
        </Typography>
      )}
    </Box>
  );

  const reviewsTabContent = (
    <Box>
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography
            variant='h6'
            sx={{ fontWeight: 'bold', mb: 2 }}
          >
            {t('plugin.detail_page.section.post_review')}
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant='body2'>{t('plugin.common.rating_label')}</Typography>
              <Rating
                value={rating}
                onChange={(_, newValue) => setRating(newValue || 0)}
                size='large'
              />
            </Box>
            <TextField
              label={t('plugin.field.review_title')}
              value={reviewTitle}
              onChange={(e) => setReviewTitle(e.target.value)}
              fullWidth
            />
            <TextField
              label={t('plugin.field.review_content')}
              value={reviewContent}
              onChange={(e) => setReviewContent(e.target.value)}
              fullWidth
              multiline
              rows={4}
            />
            <Button
              variant='contained'
              onClick={handleSubmitReview}
              disabled={rating === 0 || submitReviewMutation.isPending}
              startIcon={
                submitReviewMutation.isPending ? (
                  <Loader2 sx={{ width: 18, height: 18, animation: 'spin 1s linear infinite' }} />
                ) : (
                  <Send sx={{ width: 18, height: 18 }} />
                )
              }
              sx={{ alignSelf: 'flex-end' }}
            >
              {submitReviewMutation.isPending
                ? t('plugin.common.submitting')
                : t('plugin.common.submit_review')}
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Typography
        variant='h6'
        sx={{ fontWeight: 'bold', mb: 3 }}
      >
        {t('plugin.detail_page.section.all_reviews', { count: reviews.length })}
      </Typography>
      {reviews.length > 0 ? (
        reviews.map((review: PluginReview) => (
          <Card
            key={review.id}
            sx={{ mb: 2 }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
                <Avatar>{review.user_name?.charAt(0) || 'U'}</Avatar>
                <Box sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 0.5 }}>
                    <Typography sx={{ fontWeight: 'medium' }}>
                      {review.user_name || t('plugin.common.anonymous_user')}
                    </Typography>
                    {review.is_verified_purchase && (
                      <Chip
                        label={t('plugin.common.purchased')}
                        size='small'
                        color='primary'
                        variant='outlined'
                      />
                    )}
                    {review.is_featured && (
                      <Chip
                        label={t('plugin.common.featured')}
                        size='small'
                        color='warning'
                        variant='outlined'
                      />
                    )}
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Rating
                      value={review.rating || 0}
                      readOnly
                      size='small'
                    />
                    <Typography
                      variant='caption'
                      color='textSecondary'
                    >
                      {new Date(review.created_at).toLocaleDateString()}
                    </Typography>
                  </Box>
                </Box>
                {review.helpful_count !== undefined && review.helpful_count > 0 && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <ThumbsUp sx={{ width: 14, height: 14, color: 'grey.500' }} />
                    <Typography
                      variant='caption'
                      color='textSecondary'
                    >
                      {review.helpful_count}
                    </Typography>
                  </Box>
                )}
              </Box>
              {review.title && (
                <Typography sx={{ fontWeight: 'medium', mb: 1 }}>{review.title}</Typography>
              )}
              {review.content && (
                <Typography
                  variant='body2'
                  color='textSecondary'
                >
                  {review.content}
                </Typography>
              )}
            </CardContent>
          </Card>
        ))
      ) : (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Star sx={{ width: 48, height: 48, color: 'grey.300', mx: 'auto', mb: 2 }} />
          <Typography>{t('plugin.common.no_reviews')}</Typography>
          <Typography
            variant='body2'
            color='textSecondary'
          >
            {t('plugin.detail_page.review.first_reviewer')}
          </Typography>
        </Box>
      )}
    </Box>
  );

  const tabs: TabConfig[] = [
    {
      id: 'intro',
      label: t('plugin.detail_page.tabs.intro'),
      content: introTabContent,
    },
    {
      id: 'versions',
      label: t('plugin.detail_page.tabs.version_history', { count: versions.length }),
      content: versionsTabContent,
    },
    {
      id: 'reviews',
      label: t('plugin.detail_page.tabs.reviews', { count: reviews.length }),
      content: reviewsTabContent,
    },
  ];

  const sidebarContent = (
    <Box sx={{ position: 'sticky', top: 24 }}>
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Box>
            <Typography
              variant='h5'
              sx={{ fontWeight: 'bold', mb: 1 }}
            >
              {plugin.is_free
                ? t('plugin.common.free')
                : `¥${((plugin.price_cents || 0) / 100).toFixed(2)}`}
            </Typography>
            {!plugin.is_free && (
              <Typography
                variant='body2'
                color='textSecondary'
              >
                {t('plugin.detail_page.pricing.permanent_usage')}
              </Typography>
            )}
          </Box>

          <Button
            variant='contained'
            fullWidth
            size='large'
            disabled={installed || isInstalling}
            onClick={handleInstall}
            startIcon={
              installed ? (
                <CheckCircle sx={{ width: 20, height: 20 }} />
              ) : isInstalling ? (
                <Loader2 sx={{ width: 20, height: 20, animation: 'spin 1s linear infinite' }} />
              ) : (
                <ShoppingCart sx={{ width: 20, height: 20 }} />
              )
            }
          >
            {installed
              ? t('plugin.common.installed')
              : isInstalling
                ? t('plugin.common.installing')
                : plugin.is_free
                  ? t('plugin.common.install_now')
                  : t('plugin.common.buy_now')}
          </Button>

          <Divider />

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography color='textSecondary'>{t('plugin.field.category')}</Typography>
              <Typography sx={{ fontWeight: 'medium' }}>{plugin.category}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography color='textSecondary'>{t('plugin.field.type')}</Typography>
              <Chip
                label={
                  plugin.plugin_type === 'core'
                    ? t('plugin.plugin_type.core')
                    : t('plugin.plugin_type.business')
                }
                size='small'
                variant='outlined'
              />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography color='textSecondary'>{t('plugin.field.latest_version')}</Typography>
              <Typography sx={{ fontWeight: 'medium' }}>v{plugin.version}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography color='textSecondary'>{t('plugin.field.publish_time')}</Typography>
              <Typography sx={{ fontWeight: 'medium' }}>
                {plugin.created_at ? new Date(plugin.created_at).toLocaleDateString() : '-'}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography
            variant='h6'
            sx={{ fontWeight: 'bold', mb: 2 }}
          >
            {t('plugin.common.rating_overview')}
          </Typography>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Typography
              variant='h3'
              sx={{ fontWeight: 'bold' }}
            >
              {(averageRating || plugin.rating || 0).toFixed(1)}
            </Typography>
            <Rating
              value={averageRating || plugin.rating || 0}
              readOnly
            />
            <Typography
              variant='body2'
              color='textSecondary'
            >
              {t('plugin.common.review_count', { count: reviews.length })}
            </Typography>
          </Box>
          {[5, 4, 3, 2, 1].map((star) => {
            const count = reviews.filter(
              (r: PluginReview) => Math.floor(r.rating || 0) === star
            ).length;
            const percent = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
            return (
              <Box
                key={star}
                sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}
              >
                <Typography
                  variant='body2'
                  sx={{ width: 24 }}
                >
                  {t('plugin.common.star_label', { star })}
                </Typography>
                <Box
                  sx={{
                    flexGrow: 1,
                    height: 8,
                    bgcolor: 'grey.200',
                    borderRadius: 4,
                    overflow: 'hidden',
                  }}
                >
                  <Box
                    sx={{
                      width: `${percent}%`,
                      height: '100%',
                      bgcolor: 'warning.main',
                      borderRadius: 4,
                      transition: 'width 0.3s ease',
                    }}
                  />
                </Box>
                <Typography
                  variant='body2'
                  color='textSecondary'
                  sx={{ width: 32, textAlign: 'right' }}
                >
                  {count}
                </Typography>
              </Box>
            );
          })}
        </CardContent>
      </Card>
    </Box>
  );

  return (
    <DetailPageTemplate
      title={plugin.name}
      subtitle={plugin.description}
      backHref={PLUGIN_PATHS.marketplace}
      loading={false}
      error={error ? (error as Error).message : undefined}
      infoCard={{
        avatar: (
          <Box
            sx={{
              width: '100%',
              height: '100%',
              borderRadius: 2,
              background: `linear-gradient(135deg, ${theme.palette.primary.light} 0%, ${theme.palette.primary.main} 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Package sx={{ width: 40, height: 40, color: 'common.white' }} />
          </Box>
        ),
        title: plugin.name,
        subtitle: plugin.description,
        tags: plugin.tags,
        stats: [
          {
            label: t('plugin.common.rating'),
            value: (
              <PluginRating
                value={averageRating || plugin.rating || 0}
                count={reviews.length}
                size='medium'
              />
            ),
          },
          {
            label: t('plugin.common.downloads'),
            value: plugin.install_count?.toLocaleString() || '0',
          },
          {
            label: t('plugin.common.author'),
            value: plugin.author_name || t('plugin.common.unknown_author'),
          },
        ],
      }}
      actions={[
        {
          label: installed
            ? t('plugin.common.installed')
            : isInstalling
              ? t('plugin.common.installing')
              : plugin.is_free
                ? t('plugin.common.install_now')
                : t('plugin.common.buy_now'),
          icon: installed ? (
            <CheckCircle sx={{ width: 20, height: 20 }} />
          ) : isInstalling ? (
            <Loader2 sx={{ width: 20, height: 20, animation: 'spin 1s linear infinite' }} />
          ) : (
            <ShoppingCart sx={{ width: 20, height: 20 }} />
          ),
          onClick: handleInstall,
          variant: 'contained',
          disabled: installed || isInstalling,
          loading: isInstalling,
        },
      ]}
      tabs={tabs}
      defaultTab='intro'
      sidebar={sidebarContent}
    />
  );
};

export default PluginDetailPage;
