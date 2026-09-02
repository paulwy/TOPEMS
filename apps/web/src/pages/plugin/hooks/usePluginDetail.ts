import { useState, useMemo, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPlugin, getPluginVersions, getPluginReviews, submitPluginReview } from '@/api/plugin';
import { usePluginStore } from '@/store/pluginStore';
import { useNotificationStore } from '@/store';
import { logger } from '@/utils/logger';

import { QUERY_KEYS } from '@/lib/reactQuery';

export function usePluginDetail() {
  const { t } = useTranslation();
  const { pluginCode } = useParams<{ pluginCode: string }>();
  const { installPlugin, isPluginInstalled, fetchHealthStatus, healthStatus } = usePluginStore();
  const { addNotification } = useNotificationStore();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState(0);
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
      logger.error(t('plugin.detail_page.log.load_detail_failed'), pluginQuery.error);
    }
  }, [pluginQuery.isError, pluginQuery.error, t]);

  useEffect(() => {
    if (versionsQuery.isError && versionsQuery.error) {
      logger.error(t('plugin.detail_page.log.load_versions_failed'), versionsQuery.error);
    }
  }, [versionsQuery.isError, versionsQuery.error, t]);

  useEffect(() => {
    if (reviewsQuery.isError && reviewsQuery.error) {
      logger.error(t('plugin.detail_page.log.load_reviews_failed'), reviewsQuery.error);
    }
  }, [reviewsQuery.isError, reviewsQuery.error, t]);

  useEffect(() => {
    if (healthQuery.isError && healthQuery.error) {
      logger.error(t('plugin.detail_page.log.load_health_failed'), healthQuery.error);
    }
  }, [healthQuery.isError, healthQuery.error, t]);

  useEffect(() => {
    const versions = versionsQuery.data || [];
    if (versions.length > 0 && !expandedVersion) {
      setExpandedVersion(versions[0].id);
    }
  }, [versionsQuery.data, expandedVersion]);

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
      logger.error(t('plugin.detail_page.log.submit_review_failed'), error);
      const err = error as { message?: string };
      addNotification({
        title: t('plugin.message.review_failed_title'),
        message: err.message || t('plugin.message.review_failed_message'),
        type: 'error',
      });
    },
  });

  const handleInstall = useCallback(async () => {
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
  }, [pluginCode, installPlugin, addNotification, t, plugin?.name]);

  const handleSubmitReview = useCallback(async () => {
    if (!pluginCode || rating === 0) return;
    await submitReviewMutation.mutateAsync({
      rating,
      title: reviewTitle || undefined,
      content: reviewContent || undefined,
    });
  }, [pluginCode, rating, reviewTitle, reviewContent, submitReviewMutation]);

  const formatFileSize = useCallback((bytes?: number) => {
    if (!bytes) return '-';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  }, []);

  const healthStatusValue = pluginCode ? healthStatus[pluginCode] : null;

  return {
    pluginCode,
    plugin,
    versions,
    reviews,
    averageRating,
    loading,
    error,
    installed,
    isInstalling,
    activeTab,
    setActiveTab,
    rating,
    setRating,
    reviewTitle,
    setReviewTitle,
    reviewContent,
    setReviewContent,
    expandedVersion,
    setExpandedVersion,
    submitReviewMutation,
    handleInstall,
    handleSubmitReview,
    formatFileSize,
    healthStatusValue,
  };
}
