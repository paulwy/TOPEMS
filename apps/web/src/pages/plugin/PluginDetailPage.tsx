import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Package,
  Star,
  Download,
  CheckCircle,
  ArrowLeft,
  ShoppingCart,
  Loader2,
  Clock,
  Shield,
  Calendar,
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
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { PageContainer } from '@/components/common';
import { PluginRating } from '@/components/plugin';
import type { Plugin, PluginVersion, PluginReview, PluginReviewListResponse } from '@/api/plugin';
import { getPlugin, getPluginVersions, getPluginReviews, submitPluginReview } from '@/api/plugin';
import { usePluginStore } from '@/store/pluginStore';
import { useNotificationStore } from '@/store';
import { logger } from '@/utils/logger';
import { PLUGIN_PATHS } from '@/modules/plugin/config';
import { DetailPageTemplate, type TabConfig } from '@/components/templates';

const PluginDetailPage: React.FC = () => {
  const { pluginCode } = useParams<{ pluginCode: string }>();
  const navigate = useNavigate();
  const { installPlugin, isPluginInstalled, fetchHealthStatus, healthStatus } = usePluginStore();
  const addNotification = useNotificationStore((state) => state.addNotification);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const queryClient = useQueryClient();

  const pluginQuery = useQuery<Plugin | null>({
    queryKey: ['plugin-detail', pluginCode],
    queryFn: async () => {
      if (!pluginCode) return null;
      const res = await getPlugin(pluginCode);
      if (res.success && res.data) return res.data;
      return null;
    },
    enabled: !!pluginCode,
    staleTime: 5 * 60 * 1000,
  });

  const versionsQuery = useQuery<PluginVersion[]>({
    queryKey: ['plugin-versions', pluginCode],
    queryFn: async () => {
      if (!pluginCode) return [];
      const res = await getPluginVersions(pluginCode);
      if (res.success && res.data) return res.data;
      return [];
    },
    enabled: !!pluginCode,
    staleTime: 5 * 60 * 1000,
  });

  const reviewsQuery = useQuery<PluginReviewListResponse | null>({
    queryKey: ['plugin-reviews', pluginCode],
    queryFn: async () => {
      if (!pluginCode) return null;
      const res = await getPluginReviews(pluginCode);
      if (res.success && res.data) return res.data;
      return null;
    },
    enabled: !!pluginCode,
    staleTime: 5 * 60 * 1000,
  });

  const plugin = pluginQuery.data ?? null;
  const versions = versionsQuery.data ?? [];
  const reviews = reviewsQuery.data?.reviews ?? [];
  const averageRating = reviewsQuery.data?.average_rating ?? 0;
  const loading = pluginQuery.isLoading || versionsQuery.isLoading || reviewsQuery.isLoading;
  const pluginNotFound = !loading && !pluginQuery.isError && !plugin;
  const error = pluginQuery.isError ? '加载失败，请稍后重试' : pluginNotFound ? '插件不存在' : null;

  const [activeTab, setActiveTab] = useState(0);
  const [rating, setRating] = useState(0);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewContent, setReviewContent] = useState('');
  const [expandedVersion, setExpandedVersion] = useState<string | null>(null);

  const installed = useMemo(
    () => (pluginCode ? isPluginInstalled(pluginCode) : false),
    [pluginCode, isPluginInstalled]
  );

  useEffect(() => {
    if (pluginQuery.isError) {
      logger.error('Failed to load plugin detail:', pluginQuery.error);
    }
  }, [pluginQuery.isError, pluginQuery.error]);

  useEffect(() => {
    if (pluginCode) {
      fetchHealthStatus();
    }
  }, [pluginCode, fetchHealthStatus]);

  useEffect(() => {
    if (versions.length > 0 && !expandedVersion) {
      setExpandedVersion(versions[0].id);
    }
  }, [versions, expandedVersion]);

  const installMutation = useMutation({
    mutationFn: (code: string) => installPlugin(code),
    onSuccess: (success) => {
      if (success) {
        addNotification({
          title: '安装成功',
          message: `${plugin?.name || '插件'} 已成功安装`,
          type: 'success',
        });
      } else {
        addNotification({
          title: '安装失败',
          message: '无法安装插件，请稍后重试',
          type: 'error',
        });
      }
    },
    onError: (err: unknown) => {
      const e = err as { message?: string };
      addNotification({
        title: '安装失败',
        message: e.message || '无法安装插件',
        type: 'error',
      });
    },
  });

  const handleInstall = () => {
    if (!pluginCode) return;
    installMutation.mutate(pluginCode);
  };

  const submitReviewMutation = useMutation({
    mutationFn: (params: {
      code: string;
      data: { rating: number; title?: string; content?: string };
    }) => submitPluginReview(params.code, params.data),
    onSuccess: (res) => {
      if (res.success) {
        addNotification({
          title: '评价成功',
          message: '感谢您的评价',
          type: 'success',
        });
        setRating(0);
        setReviewTitle('');
        setReviewContent('');
        queryClient.invalidateQueries({ queryKey: ['plugin-reviews', pluginCode] });
      }
    },
    onError: (err: unknown) => {
      const e = err as { message?: string };
      addNotification({
        title: '评价失败',
        message: e.message || '无法提交评价',
        type: 'error',
      });
    },
  });

  const handleSubmitReview = () => {
    if (!pluginCode || rating === 0) return;
    submitReviewMutation.mutate({
      code: pluginCode,
      data: {
        rating,
        title: reviewTitle || undefined,
        content: reviewContent || undefined,
      },
    });
  };

  const isInstalling = installMutation.isPending;
  const isSubmitting = submitReviewMutation.isPending;

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const healthStatusValue = pluginCode ? healthStatus[pluginCode] : null;

  const infoCard = useMemo(
    () => ({
      avatar: (
        <Package
          size={36}
          color='#fff'
        />
      ),
      title: plugin?.name,
      subtitle: plugin?.description,
      tags: [
        plugin?.category || '',
        plugin?.plugin_type === 'core' ? '核心插件' : '业务插件',
      ].filter(Boolean),
    }),
    [plugin]
  );

  const sidebar = useMemo(() => {
    if (!plugin) return null;
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Card>
          <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box>
              <Typography
                variant='h5'
                sx={{ fontWeight: 'bold', mb: 1 }}
              >
                {plugin.is_free ? '免费' : `¥${((plugin.price_cents || 0) / 100).toFixed(2)}`}
              </Typography>
              {!plugin.is_free && (
                <Typography
                  variant='body2'
                  color='textSecondary'
                >
                  一次性购买，永久使用
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
                ? '已安装'
                : isInstalling
                  ? '安装中...'
                  : plugin.is_free
                    ? '立即安装'
                    : '立即购买'}
            </Button>

            <Divider />

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography color='textSecondary'>分类</Typography>
                <Typography sx={{ fontWeight: 'medium' }}>{plugin.category}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography color='textSecondary'>类型</Typography>
                <Chip
                  label={plugin.plugin_type === 'core' ? '核心插件' : '业务插件'}
                  size='small'
                  variant='outlined'
                />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography color='textSecondary'>最新版本</Typography>
                <Typography sx={{ fontWeight: 'medium' }}>v{plugin.version}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography color='textSecondary'>发布时间</Typography>
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
              评分概览
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
                {reviews.length} 条评价
              </Typography>
            </Box>
            {[5, 4, 3, 2, 1].map((star) => {
              const count = reviews.filter((r) => Math.floor(r.rating || 0) === star).length;
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
                    {star}星
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
  }, [plugin, installed, isInstalling, reviews, averageRating]);

  const introductionContent = useMemo(() => {
    if (!plugin) return null;
    return (
      <Box>
        <Typography
          variant='h6'
          sx={{ fontWeight: 'bold', mb: 2 }}
        >
          插件介绍
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
          主要功能
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
            gap: 2,
            mb: 4,
          }}
        >
          {[
            '完整的业务流程支持',
            '灵活的配置选项',
            '丰富的API接口',
            '多端适配支持',
            '数据安全保障',
            '持续更新维护',
          ].map((feature, idx) => (
            <Box
              key={idx}
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
          标签
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
  }, [plugin]);

  const versionsContent = useMemo(() => {
    return (
      <Box>
        <Typography
          variant='h6'
          sx={{ fontWeight: 'bold', mb: 3 }}
        >
          版本历史
        </Typography>
        {versions.length > 0 ? (
          versions.map((version) => (
            <Accordion
              key={version.id}
              expanded={expandedVersion === version.id}
              onChange={() =>
                setExpandedVersion(expandedVersion === version.id ? null : version.id)
              }
              sx={{ mb: 2, borderRadius: 3 }}
            >
              <AccordionSummary
                expandIcon={expandedVersion === version.id ? <ChevronUp /> : <ChevronDown />}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                  <Typography sx={{ fontWeight: 'medium' }}>{version.version}</Typography>
                  {version.is_latest && (
                    <Chip
                      label='最新'
                      size='small'
                      color='primary'
                    />
                  )}
                  {version.is_stable && (
                    <Chip
                      label='稳定'
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
                      更新说明
                    </Typography>
                    <Typography
                      variant='body2'
                      color='textSecondary'
                    >
                      {version.release_notes}
                    </Typography>
                  </Box>
                )}
                <Box
                  sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 4,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <HardDrive sx={{ width: 16, height: 16, color: 'grey.500' }} />
                    <Typography
                      variant='body2'
                      color='textSecondary'
                    >
                      大小: {formatFileSize(version.filesize)}
                    </Typography>
                  </Box>
                  {version.min_app_version && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Shield sx={{ width: 16, height: 16, color: 'grey.500' }} />
                      <Typography
                        variant='body2'
                        color='textSecondary'
                      >
                        最低版本: v{version.min_app_version}
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
            暂无版本信息
          </Typography>
        )}
      </Box>
    );
  }, [versions, expandedVersion]);

  const reviewsContent = useMemo(() => {
    return (
      <Box>
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography
              variant='h6'
              sx={{ fontWeight: 'bold', mb: 2 }}
            >
              发表评价
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant='body2'>评分：</Typography>
                <Rating
                  value={rating}
                  onChange={(_, newValue) => setRating(newValue || 0)}
                  size='large'
                />
              </Box>
              <TextField
                label='评价标题'
                value={reviewTitle}
                onChange={(e) => setReviewTitle(e.target.value)}
                fullWidth
              />
              <TextField
                label='评价内容'
                value={reviewContent}
                onChange={(e) => setReviewContent(e.target.value)}
                fullWidth
                multiline
                rows={4}
              />
              <Button
                variant='contained'
                onClick={handleSubmitReview}
                disabled={rating === 0 || isSubmitting}
                startIcon={
                  isSubmitting ? (
                    <Loader2 sx={{ width: 18, height: 18, animation: 'spin 1s linear infinite' }} />
                  ) : (
                    <Send sx={{ width: 18, height: 18 }} />
                  )
                }
                sx={{ alignSelf: 'flex-end' }}
              >
                {isSubmitting ? '提交中...' : '提交评价'}
              </Button>
            </Box>
          </CardContent>
        </Card>

        <Typography
          variant='h6'
          sx={{ fontWeight: 'bold', mb: 3 }}
        >
          全部评价 ({reviews.length})
        </Typography>
        {reviews.length > 0 ? (
          reviews.map((review) => (
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
                        {review.user_name || '匿名用户'}
                      </Typography>
                      {review.is_verified_purchase && (
                        <Chip
                          label='已购买'
                          size='small'
                          color='primary'
                          variant='outlined'
                        />
                      )}
                      {review.is_featured && (
                        <Chip
                          label='精选'
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
            <Typography>暂无评价</Typography>
            <Typography
              variant='body2'
              color='textSecondary'
            >
              成为第一个评价的用户
            </Typography>
          </Box>
        )}
      </Box>
    );
  }, [reviews, rating, reviewTitle, reviewContent, isSubmitting]);

  const tabs = useMemo<TabConfig[]>(
    () => [
      { id: 'introduction', label: '介绍', content: introductionContent || <></> },
      { id: 'versions', label: `版本历史 (${versions.length})`, content: versionsContent },
      { id: 'reviews', label: `用户评价 (${reviews.length})`, content: reviewsContent },
    ],
    [introductionContent, versions.length, versionsContent, reviews.length, reviewsContent]
  );

  if (loading) {
    return (
      <PageContainer>
        <Box
          sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}
        >
          <CircularProgress />
        </Box>
      </PageContainer>
    );
  }

  if (error || !plugin) {
    return (
      <PageContainer>
        <Alert severity='error'>{error || '插件不存在'}</Alert>
      </PageContainer>
    );
  }

  return (
    <PageContainer maxWidth='lg'>
      <DetailPageTemplate
        title=''
        subtitle=''
        backHref={PLUGIN_PATHS.marketplace}
        loading={loading}
        error={error || undefined}
        infoCard={infoCard}
        tabs={tabs}
        sidebar={sidebar}
      />
    </PageContainer>
  );
};

export default PluginDetailPage;
