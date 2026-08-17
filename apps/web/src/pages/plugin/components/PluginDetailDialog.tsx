import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Package, X } from 'lucide-react';
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
  Avatar,
  Divider,
} from '@mui/material';
import type { Plugin } from '@/api/plugin';
import { getPluginReviews, getPluginVersions, submitPluginReview } from '@/api/plugin';
import { useNotificationStore } from '@/store';
import { logger } from '@/utils/logger';
import { PluginInstallProgress } from './PluginInstallProgress';

import { CACHE_DURATIONS, QUERY_KEYS } from '@/lib/reactQuery';

export interface PluginDetailDialogProps {
  plugin: Plugin;
  onClose: () => void;
}

export const PluginDetailDialog: React.FC<PluginDetailDialogProps> = ({ plugin, onClose }) => {
  const { t } = useTranslation();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const [rating, setRating] = useState(0);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewContent, setReviewContent] = useState('');
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
      logger.error(t('plugin.marketplace_page.log.load_reviews_failed'), reviewsQuery.error);
    }
  }, [reviewsQuery.isError, reviewsQuery.error]);

  useEffect(() => {
    if (versionsQuery.isError && versionsQuery.error) {
      logger.error('plugin.marketplace_page.log.load_versions_failed', versionsQuery.error);
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
      logger.error(t('plugin.marketplace_page.log.submit_review_failed'), error);
      const err = error as { message?: string };
      addNotification({
        title: t('plugin.message.review_failed_title'),
        message: err.message || " + t('plugin.message.review_failed_message') + ",
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
                {plugin.description || ` + ${t('plugin.common.no_description')}`}
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
                              {review.user_name || ` + ${t('plugin.common.anonymous_user')}`}
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

                <PluginInstallProgress
                  plugin={plugin}
                  size='large'
                  onSuccess={onClose}
                />
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
                      ? ` + ${t('plugin.common.submitting')} + `
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

export default PluginDetailDialog;
