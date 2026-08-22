import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Package,
  Star,
  Download,
  Clock,
  Grid3X3,
  List,
  ChevronRight,
  CheckCircle,
  TrendingUp,
  X,
  ShoppingCart,
  ExternalLink,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import i18n from '@/i18n';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Rating,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Avatar,
  Divider,
} from '@mui/material';
import type { FilterConfig } from '@topems/shared-components';
import type { Plugin, PluginReview, PluginVersion } from '@/api/plugin';
import {
  SUITES,
  PLUGIN_SUITE_MAP,
  getPluginReviews,
  getPluginVersions,
  submitPluginReview,
} from '@/api/plugin';
import { usePluginStore } from '@/store/pluginStore';
import { useNotificationStore } from '@/store';
import { ListPageTemplate } from '@/components/templates';
import type { ColumnDef } from '@/components/templates/list/types';
import { logger } from '@/utils/logger';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { CACHE_DURATIONS, QUERY_KEYS } from '@/lib/reactQuery';

type SortOption = 'popular' | 'rating' | 'newest' | 'price';
type ViewMode = 'grid' | 'list';

interface PluginCardProps {
  plugin: Plugin;
  healthStatus?: boolean;
  onViewDetails?: () => void;
}

const PluginCard: React.FC<PluginCardProps> = ({ plugin, healthStatus, onViewDetails }) => {
  const { t } = useTranslation();
  const { installPlugin, isPluginInstalled } = usePluginStore();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const [isInstalling, setIsInstalling] = useState(false);
  const installed = isPluginInstalled(plugin.code);

  const handleInstall = async () => {
    setIsInstalling(true);
    try {
      const success = await installPlugin(plugin.code);
      if (success) {
        addNotification({
          title: t('plugin.message.install_success'),
          message: t('plugin.marketplace_page.install_success_message', { name: plugin.name }),
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

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        '&:hover': { boxShadow: 4 },
        transition: 'box-shadow 0.3s ease',
        borderRadius: 3,
      }}
    >
      <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box
          sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 3 }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 3,
                background: 'linear-gradient(135deg, primary.main 0%, primary.main 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Package
                sx={{
                  width: 24,
                  height: 24,
                  color: 'common.white',
                }}
              />
            </Box>
            <Box>
              <Typography
                variant='h6'
                sx={{ fontWeight: 'bold' }}
              >
                {plugin.name}
              </Typography>
              <Typography
                variant='body2'
                color='textSecondary'
              >
                v{plugin.version}
              </Typography>
            </Box>
          </Box>
          {healthStatus !== undefined && (
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                bgcolor: healthStatus ? 'success.main' : 'error.main',
              }}
            />
          )}
        </Box>

        <Typography
          variant='body2'
          color='textSecondary'
          sx={{ mb: 3, flexGrow: 1 }}
        >
          {plugin.description || t('plugin.common.no_description')}
        </Typography>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
          {plugin.tags?.slice(0, 3).map((tag) => (
            <Chip
              key={tag}
              label={tag}
              size='small'
              variant='outlined'
              sx={{ fontSize: 10 }}
            />
          ))}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Star sx={{ width: 16, height: 16, color: 'warning.main', fill: 'warning.main' }} />
            <Typography
              variant='body2'
              sx={{ fontWeight: 'medium' }}
            >
              {plugin.rating || 0}
            </Typography>
            <Typography
              variant='body2'
              color='textSecondary'
            >
              ({plugin.rating_count || 0})
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Download sx={{ width: 16, height: 16, color: 'grey.400' }} />
            <Typography
              variant='body2'
              color='textSecondary'
            >
              {plugin.install_count?.toLocaleString() || 0}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant='outlined'
            size='small'
            fullWidth
            onClick={onViewDetails}
            startIcon={<ExternalLink sx={{ width: 16, height: 16 }} />}
          >
            {t('plugin.common.details')}
          </Button>
          {installed ? (
            <Button
              variant='contained'
              size='small'
              fullWidth
              disabled
              startIcon={<CheckCircle sx={{ width: 16, height: 16 }} />}
            >
              {t('plugin.common.installed')}
            </Button>
          ) : (
            <Button
              variant='contained'
              size='small'
              fullWidth
              onClick={handleInstall}
              disabled={isInstalling}
              startIcon={
                isInstalling ? (
                  <Loader2 sx={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />
                ) : (
                  <ShoppingCart sx={{ width: 16, height: 16 }} />
                )
              }
            >
              {isInstalling
                ? t('plugin.common.installing')
                : plugin.is_free
                  ? t('plugin.common.free_install')
                  : t('plugin.common.purchase')}
            </Button>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

const PluginDetailModal: React.FC<{
  plugin: Plugin;
  onClose: () => void;
}> = ({ plugin, onClose }) => {
  const { t } = useTranslation();
  const { installPlugin, isPluginInstalled } = usePluginStore();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const [rating, setRating] = useState(0);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewContent, setReviewContent] = useState('');
  const [isInstalling, setIsInstalling] = useState(false);
  const installed = isPluginInstalled(plugin.code);
  const queryClient = useQueryClient();

  const reviewsQuery = useQuery({
    queryKey: [...QUERY_KEYS.AD_HOC.PLUGIN_REVIEWS_BASE, plugin.code],
    queryFn: async () => {
      const res = await getPluginReviews(plugin.code);
      if (res.success && res.data) {
        return res.data.reviews;
      }
      return [];
    },

    staleTime: CACHE_DURATIONS.MEDIUM,
  });

  const versionsQuery = useQuery({
    queryKey: [...QUERY_KEYS.AD_HOC.PLUGIN_VERSIONS_BASE, plugin.code],
    queryFn: async () => {
      const res = await getPluginVersions(plugin.code);
      if (res.success && res.data) {
        return res.data;
      }
      return [];
    },

    staleTime: CACHE_DURATIONS.MEDIUM,
  });

  useEffect(() => {
    if (reviewsQuery.isError && reviewsQuery.error) {
      logger.error(i18n.t('pages.plugin_marketplace_page.k0'), reviewsQuery.error);
    }
  }, [reviewsQuery.isError, reviewsQuery.error]);

  useEffect(() => {
    if (versionsQuery.isError && versionsQuery.error) {
      logger.error(i18n.t('pages.plugin_marketplace_page.k1'), versionsQuery.error);
    }
  }, [versionsQuery.isError, versionsQuery.error]);

  const reviews = reviewsQuery.data || [];
  const versions = versionsQuery.data || [];

  const submitReviewMutation = useMutation({
    mutationFn: (data: { rating: number; title?: string; content?: string }) =>
      submitPluginReview(plugin.code, data),
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
        queryKey: [...QUERY_KEYS.AD_HOC.PLUGIN_REVIEWS_BASE, plugin.code],
        exact: false,
        refetchType: 'active',
      });
    },
    onError: (error: unknown) => {
      logger.error(i18n.t('pages.plugin_marketplace_page.k2'), error);
      const err = error as { message?: string };
      addNotification({
        title: t('plugin.message.review_failed_title'),
        message: err.message || t('plugin.message.review_failed_message'),
        type: 'error',
      });
    },
  });

  const handleSubmitReview = async () => {
    if (rating === 0) return;
    await submitReviewMutation.mutateAsync({
      rating,
      title: reviewTitle || undefined,
      content: reviewContent || undefined,
    });
  };

  const handleInstall = async () => {
    setIsInstalling(true);
    try {
      const success = await installPlugin(plugin.code);
      if (success) {
        addNotification({
          title: t('plugin.message.install_success'),
          message: t('plugin.marketplace_page.install_success_message', { name: plugin.name }),
          type: 'success',
        });
        onClose();
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

  return (
    <Dialog
      open
      onClose={onClose}
      maxWidth='lg'
      fullWidth
      sx={{ borderRadius: 3 }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 3,
              background: 'linear-gradient(135deg, primary.main 0%, primary.main 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Package
              sx={{
                width: 24,
                height: 24,
                color: 'common.white',
              }}
            />
          </Box>
          <Box>
            <Typography
              variant='h5'
              sx={{ fontWeight: 'bold' }}
            >
              {plugin.name}
            </Typography>
            <Typography
              variant='body2'
              color='textSecondary'
            >
              v{plugin.version}
            </Typography>
          </Box>
        </Box>
        <Button
          onClick={onClose}
          startIcon={<X sx={{ width: 20, height: 20 }} />}
        >
          {t('plugin.action.close')}
        </Button>
      </DialogTitle>

      <DialogContent sx={{ maxHeight: '70vh', overflowY: 'auto' }}>
        <Box
          sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(3, 1fr)' }, gap: 6 }}
        >
          <Box
            sx={{
              gridColumn: { xs: '1', lg: 'span 2' },
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <Box>
              <Typography
                variant='h6'
                sx={{ fontWeight: 'bold' }}
              >
                {t('plugin.common.description_label')}
              </Typography>
              <Typography
                variant='body1'
                color='textSecondary'
              >
                {plugin.description || t('plugin.common.no_description')}
              </Typography>
            </Box>

            <Box>
              <Typography
                variant='h6'
                sx={{ fontWeight: 'bold' }}
              >
                {t('plugin.common.version_history')}
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {versions.length > 0 ? (
                  versions.map((v) => (
                    <Box
                      key={v.id}
                      sx={{ p: 3, bgcolor: 'grey.50', borderRadius: 1 }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Typography sx={{ fontWeight: 'medium' }}>{v.version}</Typography>
                          {v.is_latest && (
                            <Chip
                              label={t('plugin.common.latest')}
                              size='small'
                              color='primary'
                              variant='outlined'
                            />
                          )}
                          {v.is_stable && (
                            <Chip
                              label={t('plugin.common.stable')}
                              size='small'
                              color='success'
                              variant='outlined'
                            />
                          )}
                        </Box>
                        <Typography
                          variant='body2'
                          color='textSecondary'
                        >
                          {new Date(v.created_at).toLocaleDateString()}
                        </Typography>
                      </Box>
                      {v.release_notes && (
                        <Typography
                          variant='body2'
                          color='textSecondary'
                          sx={{ mt: 1 }}
                        >
                          {v.release_notes}
                        </Typography>
                      )}
                    </Box>
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
            </Box>

            <Box>
              <Typography
                variant='h6'
                sx={{ fontWeight: 'bold' }}
              >
                {t('plugin.marketplace_page.review_label', { count: reviews.length })}
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {reviews.length > 0 ? (
                  reviews.map((review) => (
                    <Box
                      key={review.id}
                      sx={{ p: 4, bgcolor: 'grey.50', borderRadius: 1 }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          mb: 2,
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar>{review.user_name?.charAt(0) || 'U'}</Avatar>
                          <Box>
                            <Typography sx={{ fontWeight: 'medium' }}>
                              {review.user_name || t('plugin.common.anonymous_user')}
                            </Typography>
                            <Typography
                              variant='body2'
                              color='textSecondary'
                            >
                              {new Date(review.created_at).toLocaleDateString()}
                            </Typography>
                          </Box>
                        </Box>
                        <Rating
                          value={review.rating || 0}
                          readOnly
                          size='small'
                        />
                      </Box>
                      {review.title && (
                        <Typography sx={{ fontWeight: 'medium' }}>{review.title}</Typography>
                      )}
                      {review.content && (
                        <Typography
                          variant='body2'
                          color='textSecondary'
                        >
                          {review.content}
                        </Typography>
                      )}
                      {review.is_verified_purchase && (
                        <Chip
                          label={t('plugin.common.purchased')}
                          size='small'
                          color='primary'
                          variant='outlined'
                          sx={{ mt: 2 }}
                        />
                      )}
                    </Box>
                  ))
                ) : (
                  <Typography
                    variant='body2'
                    color='textSecondary'
                  >
                    {t('plugin.common.no_reviews')}
                  </Typography>
                )}
              </Box>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Card>
              <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <Box
                  sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <Typography
                    variant='h6'
                    sx={{ fontWeight: 'bold' }}
                  >
                    {t('plugin.field.rating')}
                  </Typography>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography
                      variant='h3'
                      sx={{ fontWeight: 'bold' }}
                    >
                      {plugin.rating || 0}
                    </Typography>
                    <Rating
                      value={plugin.rating || 0}
                      readOnly
                    />
                  </Box>
                </Box>

                <Divider />

                <Box
                  sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <Typography sx={{ color: 'grey.600' }}>{t('plugin.field.downloads')}</Typography>
                  <Typography sx={{ fontWeight: 'medium' }}>
                    {plugin.install_count?.toLocaleString() || 0}
                  </Typography>
                </Box>

                <Box
                  sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <Typography sx={{ color: 'grey.600' }}>{t('plugin.field.category')}</Typography>
                  <Typography sx={{ fontWeight: 'medium' }}>{plugin.category}</Typography>
                </Box>

                <Box
                  sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <Typography sx={{ color: 'grey.600' }}>{t('plugin.field.author')}</Typography>
                  <Typography sx={{ fontWeight: 'medium' }}>
                    {plugin.author_name || t('plugin.common.unknown')}
                  </Typography>
                </Box>

                <Divider />

                <Button
                  variant='contained'
                  fullWidth
                  size='large'
                  disabled={installed}
                  onClick={handleInstall}
                  startIcon={
                    installed ? (
                      <CheckCircle sx={{ width: 20, height: 20 }} />
                    ) : isInstalling ? (
                      <Loader2
                        sx={{ width: 20, height: 20, animation: 'spin 1s linear infinite' }}
                      />
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
                        ? t('plugin.common.free_install')
                        : t('plugin.common.purchase')}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography
                  variant='h6'
                  sx={{ fontWeight: 'bold', mb: 4 }}
                >
                  {t('plugin.common.post_review')}
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <Rating
                    value={rating}
                    onChange={(_, newValue) => setRating(newValue || 0)}
                  />
                  <TextField
                    label={t('plugin.field.title_field')}
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
                    rows={3}
                  />
                  <Button
                    variant='contained'
                    fullWidth
                    onClick={handleSubmitReview}
                    disabled={rating === 0 || submitReviewMutation.isPending}
                  >
                    {submitReviewMutation.isPending
                      ? t('plugin.common.submitting')
                      : t('plugin.common.submit_review')}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

const PluginActionsCell: React.FC<{ plugin: Plugin; onViewDetails: () => void }> = ({
  plugin,
  onViewDetails,
}) => {
  const { t } = useTranslation();
  const { installPlugin, isPluginInstalled } = usePluginStore();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const [isInstalling, setIsInstalling] = useState(false);
  const installed = isPluginInstalled(plugin.code);

  const handleInstall = async () => {
    setIsInstalling(true);
    try {
      const success = await installPlugin(plugin.code);
      if (success) {
        addNotification({
          title: t('plugin.message.install_success'),
          message: t('plugin.marketplace_page.install_success_message', { name: plugin.name }),
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

  return (
    <Box sx={{ display: 'flex', gap: 1 }}>
      <Button
        variant='outlined'
        size='small'
        onClick={(e) => {
          e.stopPropagation();
          onViewDetails();
        }}
        startIcon={<ExternalLink sx={{ width: 16, height: 16 }} />}
      >
        {t('plugin.common.details')}
      </Button>
      {installed ? (
        <Button
          variant='contained'
          size='small'
          disabled
          startIcon={<CheckCircle sx={{ width: 16, height: 16 }} />}
        >
          {t('plugin.common.installed')}
        </Button>
      ) : (
        <Button
          variant='contained'
          size='small'
          onClick={(e) => {
            e.stopPropagation();
            handleInstall();
          }}
          disabled={isInstalling}
          startIcon={
            isInstalling ? (
              <Loader2 sx={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />
            ) : (
              <ShoppingCart sx={{ width: 16, height: 16 }} />
            )
          }
        >
          {isInstalling
            ? t('plugin.common.installing')
            : plugin.is_free
              ? t('plugin.common.free_install')
              : t('plugin.common.purchase')}
        </Button>
      )}
    </Box>
  );
};

const PluginMarketplacePage: React.FC = () => {
  const { t } = useTranslation();

  // 🔧 Dev tool: inject auth via URL query params (?_tok=JWT&_tid=TENANT_ID) for联调
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tok = params.get('_tok');
    const tid = params.get('_tid');
    if (tok) localStorage.setItem('token', tok);
    if (tid) localStorage.setItem('tenant_id', tid);
    if (tok || tid) {
      localStorage.setItem(
        'user',
        JSON.stringify({
          id: params.get('_uid') || '11111111-1111-1111-1111-111111111111',
          username: 'admin',
          role: 'admin',
          isSuperuser: true,
        })
      );
      localStorage.setItem('roles', JSON.stringify(['admin', 'user']));
      localStorage.setItem('permissions', JSON.stringify(['*']));
      localStorage.removeItem('topems-plugin-storage');
    }
  }, []);

  const {
    marketplacePlugins,
    healthStatus,
    searchQuery,
    setSearchQuery,
    fetchMarketplacePlugins,
    fetchHealthStatus,
    fetchInstalledPlugins,
  } = usePluginStore();
  const [selectedSuite, setSelectedSuite] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('popular');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedPlugin, setSelectedPlugin] = useState<Plugin | null>(null);
  const addNotification = useNotificationStore((state) => state.addNotification);

  const pluginsQuery = useQuery({
    queryKey: QUERY_KEYS.AD_HOC.MARKETPLACE_PLUGINS_BASE,
    queryFn: async () => {
      await Promise.all([fetchMarketplacePlugins(true), fetchInstalledPlugins(true)]);
      // 必须从 store.getState() 读取最新值（外层解构 const 是 render 快照，闭包里不变）
      return usePluginStore.getState().marketplacePlugins;
    },
    staleTime: 5 * 60 * 1000,
  });

  const healthQuery = useQuery({
    queryKey: QUERY_KEYS.AD_HOC.MARKETPLACE_HEALTH_BASE,
    queryFn: async () => {
      await fetchHealthStatus(true);
      return usePluginStore.getState().healthStatus;
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (pluginsQuery.isError && pluginsQuery.error) {
      logger.error(i18n.t('pages.plugin_marketplace_page.k3'), pluginsQuery.error);
    }
  }, [pluginsQuery.isError, pluginsQuery.error]);

  useEffect(() => {
    if (healthQuery.isError && healthQuery.error) {
      logger.error(i18n.t('pages.plugin_marketplace_page.k4'), healthQuery.error);
    }
  }, [healthQuery.isError, healthQuery.error]);

  const loading = pluginsQuery.isLoading;
  const plugins = pluginsQuery.data || [];
  const suites = useMemo(() => SUITES(), [t]);

  const handleRefresh = useCallback(() => {
    Promise.all([pluginsQuery.refetch(), healthQuery.refetch(), fetchInstalledPlugins(true)]);
    addNotification({
      title: t('plugin.message.refresh_success'),
      message: t('plugin.message.plugin_list_updated'),
      type: 'success',
    });
  }, [pluginsQuery, healthQuery, fetchInstalledPlugins, addNotification, t]);

  const filteredPlugins = useMemo(() => {
    let result = [...plugins];

    if (searchQuery) {
      const term = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.description?.toLowerCase().includes(term) ||
          p.tags?.some((tg) => tg.toLowerCase().includes(term))
      );
    }

    if (selectedSuite !== 'all') {
      result = result.filter((p) => PLUGIN_SUITE_MAP[p.code] === selectedSuite);
    }

    switch (sortBy) {
      case 'popular':
        result.sort((a, b) => (b.install_count || 0) - (a.install_count || 0));
        break;
      case 'rating':
        result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'newest':
        result.sort(
          (a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
        );
        break;
      case 'price':
        result.sort((a, b) => (a.price_cents || 0) - (b.price_cents || 0));
        break;
    }

    return result;
  }, [plugins, searchQuery, selectedSuite, sortBy]);

  const handleSearch = useCallback(
    (value: string) => {
      setSearchQuery(value);
    },
    [setSearchQuery]
  );

  const filters = useMemo<FilterConfig[]>(
    () => [
      {
        id: 'suite',
        label: t('plugin.marketplace_page.filter.suite_label'),
        type: 'select',
        value: selectedSuite,
        options: [
          { label: t('plugin.marketplace_page.filter.all_suites'), value: 'all' },
          ...suites.map((suite) => ({ label: suite.name, value: suite.code })),
        ],
        onChange: (value) => setSelectedSuite(String(value)),
      },
    ],
    [selectedSuite, suites, t]
  );

  const actions = useMemo(
    () => [
      {
        label: t('plugin.action.refresh'),
        icon: <RefreshCw sx={{ width: 16, height: 16 }} />,
        onClick: handleRefresh,
        variant: 'outlined' as const,
      },
    ],
    [handleRefresh, t]
  );

  const columns: ColumnDef<Plugin>[] = useMemo(
    () => [
      {
        id: 'plugin',
        label: t('plugin.field.plugin_name'),
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                background: 'linear-gradient(135deg, primary.main 0%, primary.main 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Package sx={{ width: 20, height: 20, color: 'common.white' }} />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 'bold' }}>{row.name}</Typography>
              <Typography
                variant='body2'
                color='textSecondary'
              >
                v{row.version}
              </Typography>
            </Box>
          </Box>
        ),
      },
      {
        id: 'description',
        label: t('plugin.field.description'),
        render: (row) => (
          <Typography
            variant='body2'
            color='textSecondary'
            noWrap
            sx={{ maxWidth: 300 }}
          >
            {row.description || t('plugin.common.no_description')}
          </Typography>
        ),
      },
      {
        id: 'tags',
        label: t('plugin.field.tags'),
        render: (row) => (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {row.tags?.slice(0, 3).map((tag) => (
              <Chip
                key={tag}
                label={tag}
                size='small'
                variant='outlined'
                sx={{ fontSize: 10 }}
              />
            ))}
          </Box>
        ),
      },
      {
        id: 'rating',
        label: t('plugin.field.rating'),
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Star sx={{ width: 16, height: 16, color: 'warning.main', fill: 'warning.main' }} />
            <Typography
              variant='body2'
              sx={{ fontWeight: 'medium' }}
            >
              {row.rating || 0}
            </Typography>
            <Typography
              variant='body2'
              color='textSecondary'
            >
              ({row.rating_count || 0})
            </Typography>
          </Box>
        ),
      },
      {
        id: 'downloads',
        label: t('plugin.field.downloads'),
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Download sx={{ width: 16, height: 16, color: 'grey.400' }} />
            <Typography
              variant='body2'
              color='textSecondary'
            >
              {row.install_count?.toLocaleString() || 0}
            </Typography>
          </Box>
        ),
      },
      {
        id: 'price',
        label: t('plugin.field.price'),
        render: (row) => (
          <Chip
            label={row.is_free ? t('plugin.common.free') : `¥${(row.price_cents || 0) / 100}`}
            size='small'
            color={row.is_free ? 'success' : 'primary'}
          />
        ),
      },
      {
        id: 'status',
        label: t('plugin.field.status'),
        render: (row) =>
          healthStatus[row.code]?.healthy !== undefined ? (
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                bgcolor: healthStatus[row.code]?.healthy ? 'success.main' : 'error.main',
              }}
            />
          ) : null,
      },
      {
        id: 'actions',
        label: t('plugin.action.install'),
        render: (row) => (
          <PluginActionsCell
            plugin={row}
            onViewDetails={() => setSelectedPlugin(row)}
          />
        ),
      },
    ],
    [healthStatus, t]
  );

  const renderCardView = useCallback(
    (data: Plugin[]) => (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            md: 'repeat(2, 1fr)',
            lg: 'repeat(3, 1fr)',
          },
          gap: 6,
        }}
      >
        {data.map((plugin) => (
          <PluginCard
            key={plugin.id}
            plugin={plugin}
            healthStatus={healthStatus[plugin.code]?.healthy}
            onViewDetails={() => setSelectedPlugin(plugin)}
          />
        ))}
      </Box>
    ),
    [healthStatus]
  );

  const headerContent = useMemo(
    () => (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 6, mb: 6 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              md: 'repeat(2, 1fr)',
              lg: 'repeat(3, 1fr)',
              xl: 'repeat(4, 1fr)',
            },
            gap: 6,
          }}
        >
          {suites.map((suite) => (
            <Card
              key={suite.id}
              sx={{
                cursor: 'pointer',
                '&:hover': { boxShadow: 4 },
                transition: 'box-shadow 0.3s ease',
              }}
              onClick={() => setSelectedSuite(suite.code)}
            >
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: 3,
                    background: 'linear-gradient(135deg, primary.light 0%, primary.main 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Package sx={{ width: 28, height: 28, color: 'primary.dark' }} />
                </Box>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography
                    variant='h6'
                    sx={{ fontWeight: 'bold' }}
                  >
                    {suite.name}
                  </Typography>
                  <Typography
                    variant='body2'
                    color='textSecondary'
                  >
                    {suite.description}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
                    <Chip
                      label={t('plugin.marketplace_page.suite_plugin_count', {
                        count: suite.plugins.length,
                      })}
                      size='small'
                      variant='outlined'
                    />
                    {suite.is_free ? (
                      <Chip
                        label={t('plugin.common.free')}
                        size='small'
                        color='success'
                      />
                    ) : (
                      <Chip
                        label={`¥${(suite.price_cents || 0) / 100}`}
                        size='small'
                        color='primary'
                      />
                    )}
                  </Box>
                </Box>
                <ChevronRight sx={{ width: 20, height: 20, color: 'grey.400' }} />
              </CardContent>
            </Card>
          ))}
        </Box>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 3,
          }}
        >
          <Box>
            <Typography
              variant='h5'
              sx={{ fontWeight: 'bold' }}
            >
              {selectedSuite === 'all'
                ? t('plugin.marketplace_page.all_plugins')
                : suites.find((s) => s.code === selectedSuite)?.name}
            </Typography>
            <Typography
              variant='body2'
              color='textSecondary'
            >
              {t('plugin.marketplace_page.plugin_count', { count: filteredPlugins.length })}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <FormControl
              size='small'
              sx={{ minWidth: 140 }}
            >
              <InputLabel>{t('plugin.marketplace_page.filter.sort_label')}</InputLabel>
              <Select
                value={sortBy}
                label={t('plugin.marketplace_page.filter.sort_label')}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
              >
                <MenuItem value='popular'>
                  <TrendingUp sx={{ width: 16, height: 16, mr: 2 }} />
                  {t('plugin.marketplace_page.sort.popular')}
                </MenuItem>
                <MenuItem value='rating'>
                  <Star sx={{ width: 16, height: 16, mr: 2 }} />
                  {t('plugin.marketplace_page.sort.rating')}
                </MenuItem>
                <MenuItem value='newest'>
                  <Clock sx={{ width: 16, height: 16, mr: 2 }} />
                  {t('plugin.marketplace_page.sort.newest')}
                </MenuItem>
                <MenuItem value='price'>
                  <ShoppingCart sx={{ width: 16, height: 16, mr: 2 }} />
                  {t('plugin.marketplace_page.sort.price')}
                </MenuItem>
              </Select>
            </FormControl>

            <Button
              variant='outlined'
              size='small'
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            >
              {viewMode === 'grid' ? (
                <List sx={{ width: 20, height: 20 }} />
              ) : (
                <Grid3X3 sx={{ width: 20, height: 20 }} />
              )}
            </Button>
          </Box>
        </Box>
      </Box>
    ),
    [suites, selectedSuite, sortBy, viewMode, filteredPlugins.length, t]
  );

  return (
    <>
      <ListPageTemplate<Plugin>
        title={t('plugin.marketplace_page.title')}
        subtitle={t('plugin.marketplace_page.subtitle')}
        columns={columns}
        data={filteredPlugins}
        loading={loading}
        searchable
        searchValue={searchQuery}
        searchPlaceholder={t('plugin.marketplace_page.search_placeholder')}
        onSearch={handleSearch}
        filters={filters}
        actions={actions}
        viewMode={viewMode === 'grid' ? 'card' : 'table'}
        viewModes={['table']}
        renderCardView={renderCardView}
        onRowClick={(row) => setSelectedPlugin(row)}
        emptyMessage={t('plugin.marketplace_page.empty_title')}
        emptyIcon={<Package sx={{ width: 48, height: 48, color: 'grey.400' }} />}
        headerContent={headerContent}
      />
      {selectedPlugin && (
        <PluginDetailModal
          plugin={selectedPlugin}
          onClose={() => setSelectedPlugin(null)}
        />
      )}
    </>
  );
};

export default PluginMarketplacePage;
