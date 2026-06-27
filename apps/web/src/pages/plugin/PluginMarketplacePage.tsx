import React, { useState, useEffect, useMemo } from 'react';
import {
  Package,
  Star,
  Download,
  Shield,
  Clock,
  Search,
  Filter,
  Grid3X3,
  List,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  Sparkles,
  TrendingUp,
  Users,
  X,
  Heart,
  ShoppingCart,
  ExternalLink,
  RefreshCw,
  Loader2,
} from 'lucide-react';
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
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Avatar,
  Divider,
  Alert,
  CircularProgress,
} from '@mui/material';
import type { Plugin, PluginReview, PluginVersion } from '@/api/plugin';
import {
  SuiteInfo,
  SUITES,
  PLUGIN_SUITE_MAP,
  getMarketplaceSummary,
  listPlugins,
  getPlugin,
  getPluginReviews,
  getPluginVersions,
  submitPluginReview,
} from '@/api/plugin';
import { usePluginStore } from '@/store/pluginStore';
import { useAppStore } from '@/store';
import { PageContainer } from '@/components/common';

type SortOption = 'popular' | 'rating' | 'newest' | 'price';
type ViewMode = 'grid' | 'list';

interface PluginCardProps {
  plugin: Plugin;
  healthStatus?: boolean;
  onViewDetails?: () => void;
}

const PluginCard: React.FC<PluginCardProps> = ({ plugin, healthStatus, onViewDetails }) => {
  const { installPlugin, isPluginInstalled } = usePluginStore();
  const addNotification = useAppStore((state) => state.addNotification);
  const [isInstalling, setIsInstalling] = useState(false);
  const installed = isPluginInstalled(plugin.code);

  const handleInstall = async () => {
    setIsInstalling(true);
    try {
      const success = await installPlugin(plugin.code);
      if (success) {
        addNotification({
          title: '安装成功',
          message: `${plugin.name} 插件已安装`,
          type: 'success',
        });
      } else {
        addNotification({
          title: '安装失败',
          message: '无法安装插件，请稍后重试',
          type: 'error',
        });
      }
    } catch (error: unknown) {
      const err = error as { message?: string };
      addNotification({
        title: '安装失败',
        message: err.message || '无法安装插件',
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
        borderRadius: 2,
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
                borderRadius: 2,
                background: 'linear-gradient(135deg, primary.main 0%, primary.main 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Package sx={{ width: 24, height: 24, color: 'white' }} />
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
          {plugin.description || '暂无描述'}
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
            详情
          </Button>
          {installed ? (
            <Button
              variant='contained'
              size='small'
              fullWidth
              disabled
              startIcon={<CheckCircle sx={{ width: 16, height: 16 }} />}
            >
              已安装
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
              {isInstalling ? '安装中...' : plugin.is_free ? '免费安装' : '购买'}
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
  const { installPlugin, isPluginInstalled } = usePluginStore();
  const addNotification = useAppStore((state) => state.addNotification);
  const [reviews, setReviews] = useState<PluginReview[]>([]);
  const [versions, setVersions] = useState<PluginVersion[]>([]);
  const [rating, setRating] = useState(0);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewContent, setReviewContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const installed = isPluginInstalled(plugin.code);

  useEffect(() => {
    getPluginReviews(plugin.code).then((res) => {
      if (res.success && res.data) {
        setReviews(res.data.reviews);
      }
    });
    getPluginVersions(plugin.code).then((res) => {
      if (res.success && res.data) {
        setVersions(res.data);
      }
    });
  }, [plugin.code]);

  const handleSubmitReview = async () => {
    if (rating === 0) return;
    setIsSubmitting(true);
    try {
      await submitPluginReview(plugin.code, {
        rating,
        title: reviewTitle || undefined,
        content: reviewContent || undefined,
      });
      addNotification({
        title: '评价成功',
        message: '感谢您的评价',
        type: 'success',
      });
      setRating(0);
      setReviewTitle('');
      setReviewContent('');
      getPluginReviews(plugin.code).then((res) => {
        if (res.success && res.data) {
          setReviews(res.data.reviews);
        }
      });
    } catch (error: unknown) {
      const err = error as { message?: string };
      addNotification({
        title: '评价失败',
        message: err.message || '无法提交评价',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInstall = async () => {
    setIsInstalling(true);
    try {
      const success = await installPlugin(plugin.code);
      if (success) {
        addNotification({
        title: '安装成功',
        message: `${plugin.name} 插件已安装`,
        type: 'success',
      });
        onClose();
      } else {
        addNotification({
          title: '安装失败',
          message: '无法安装插件，请稍后重试',
          type: 'error',
        });
      }
    } catch (error: unknown) {
      const err = error as { message?: string };
      addNotification({
        title: '安装失败',
        message: err.message || '无法安装插件',
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
      sx={{ borderRadius: 2 }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              background: 'linear-gradient(135deg, primary.main 0%, primary.main 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Package sx={{ width: 24, height: 24, color: 'white' }} />
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
          关闭
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
                描述
              </Typography>
              <Typography
                variant='body1'
                color='textSecondary'
              >
                {plugin.description || '暂无描述'}
              </Typography>
            </Box>

            <Box>
              <Typography
                variant='h6'
                sx={{ fontWeight: 'bold' }}
              >
                版本历史
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
                              label='最新'
                              size='small'
                              color='primary'
                              variant='outlined'
                            />
                          )}
                          {v.is_stable && (
                            <Chip
                              label='稳定'
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
                    暂无版本信息
                  </Typography>
                )}
              </Box>
            </Box>

            <Box>
              <Typography
                variant='h6'
                sx={{ fontWeight: 'bold' }}
              >
                用户评价 ({reviews.length})
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
                              {review.user_name || '匿名用户'}
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
                          label='已购买'
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
                    暂无评价
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
                    评分
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
                  <Typography sx={{ color: 'grey.600' }}>下载量</Typography>
                  <Typography sx={{ fontWeight: 'medium' }}>
                    {plugin.install_count?.toLocaleString() || 0}
                  </Typography>
                </Box>

                <Box
                  sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <Typography sx={{ color: 'grey.600' }}>分类</Typography>
                  <Typography sx={{ fontWeight: 'medium' }}>{plugin.category}</Typography>
                </Box>

                <Box
                  sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <Typography sx={{ color: 'grey.600' }}>作者</Typography>
                  <Typography sx={{ fontWeight: 'medium' }}>
                    {plugin.author_name || '未知'}
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
                    ? '已安装'
                    : isInstalling
                      ? '安装中...'
                      : plugin.is_free
                        ? '免费安装'
                        : '购买'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography
                  variant='h6'
                  sx={{ fontWeight: 'bold', mb: 4 }}
                >
                  发表评价
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <Rating
                    value={rating}
                    onChange={(_, newValue) => setRating(newValue || 0)}
                  />
                  <TextField
                    label='标题'
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
                    rows={3}
                  />
                  <Button
                    variant='contained'
                    fullWidth
                    onClick={handleSubmitReview}
                    disabled={rating === 0 || isSubmitting}
                  >
                    {isSubmitting ? '提交中...' : '提交评价'}
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

const PluginMarketplacePage: React.FC = () => {
  const {
    marketplacePlugins,
    healthStatus,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    fetchMarketplacePlugins,
    fetchHealthStatus,
  } = usePluginStore();
  const [selectedSuite, setSelectedSuite] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('popular');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedPlugin, setSelectedPlugin] = useState<Plugin | null>(null);
  const addNotification = useAppStore((state) => state.addNotification);

  useEffect(() => {
    const fetchData = async () => {
      try {
        await Promise.all([fetchMarketplacePlugins(), fetchHealthStatus()]);
      } catch (err: unknown) {
        console.error('Failed to load marketplace data:', err);
      }
    };
    fetchData();
  }, [fetchMarketplacePlugins, fetchHealthStatus]);

  const handleRefresh = () => {
    fetchMarketplacePlugins(true);
    fetchHealthStatus(true);
    addNotification({
      title: '刷新成功',
      message: '插件列表已更新',
      type: 'success',
    });
  };

  const filteredPlugins = useMemo(() => {
    let result = [...marketplacePlugins];

    if (searchQuery) {
      const term = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.description?.toLowerCase().includes(term) ||
          p.tags?.some((t) => t.toLowerCase().includes(term))
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
  }, [marketplacePlugins, searchQuery, selectedSuite, sortBy]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <PageContainer padding={false} maxWidth={false}>
      <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50' }}>
      <Box
        sx={{
          background: 'linear-gradient(90deg, primary.main 0%, primary.main 100%)',
          color: 'white',
          py: 8,
          px: 6,
        }}
      >
        <Box sx={{ maxWidth: '1200px', mx: 'auto' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 2 }}>
            <Sparkles sx={{ width: 32, height: 32 }} />
            <Typography
              variant='h4'
              sx={{ fontWeight: 'bold' }}
            >
              插件市场
            </Typography>
          </Box>
          <Typography
            variant='body1'
            sx={{ opacity: 0.6 }}
          >
            发现和安装强大的插件，扩展您的 TOPEMS 功能
          </Typography>
        </Box>
      </Box>

      {error && (
        <Box sx={{ maxWidth: '1200px', mx: 'auto', px: 6, py: 4 }}>
          <Alert
            severity='error'
            onClose={() => {}}
          >
            {error}
          </Alert>
        </Box>
      )}

      <Box sx={{ maxWidth: '1200px', mx: 'auto', px: 6, py: 8 }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, gap: 6, mb: 8 }}>
          <Box sx={{ flexGrow: 1, position: 'relative' }}>
            <Search
              sx={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 20,
                height: 20,
                color: 'grey.400',
              }}
            />
            <TextField
              placeholder='搜索插件...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              fullWidth
              sx={{ pl: 10 }}
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 3 }}>
            <FormControl
              size='small'
              sx={{ minWidth: 160 }}
            >
              <InputLabel>套件分类</InputLabel>
              <Select
                value={selectedSuite}
                label='套件分类'
                onChange={(e) => setSelectedSuite(e.target.value)}
              >
                <MenuItem value='all'>全部套件</MenuItem>
                {SUITES.map((suite) => (
                  <MenuItem
                    key={suite.code}
                    value={suite.code}
                  >
                    {suite.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl
              size='small'
              sx={{ minWidth: 140 }}
            >
              <InputLabel>排序方式</InputLabel>
              <Select
                value={sortBy}
                label='排序方式'
                onChange={(e) => setSortBy(e.target.value as SortOption)}
              >
                <MenuItem value='popular'>
                  <TrendingUp sx={{ width: 16, height: 16, mr: 2 }} />
                  最受欢迎
                </MenuItem>
                <MenuItem value='rating'>
                  <Star sx={{ width: 16, height: 16, mr: 2 }} />
                  评分最高
                </MenuItem>
                <MenuItem value='newest'>
                  <Clock sx={{ width: 16, height: 16, mr: 2 }} />
                  最新发布
                </MenuItem>
                <MenuItem value='price'>
                  <ShoppingCart sx={{ width: 16, height: 16, mr: 2 }} />
                  价格排序
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

            <Button
              variant='outlined'
              size='small'
              onClick={handleRefresh}
              startIcon={<RefreshCw sx={{ width: 16, height: 16 }} />}
            >
              刷新
            </Button>
          </Box>
        </Box>

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
            mb: 8,
          }}
        >
          {SUITES.map((suite) => (
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
                    borderRadius: 2,
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
                      label={`${suite.plugins.length} 个插件`}
                      size='small'
                      variant='outlined'
                    />
                    {suite.is_free ? (
                      <Chip
                        label='免费'
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

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 6 }}>
          <Typography
            variant='h5'
            sx={{ fontWeight: 'bold' }}
          >
            {selectedSuite === 'all'
              ? '全部插件'
              : SUITES.find((s) => s.code === selectedSuite)?.name}
          </Typography>
          <Typography
            variant='body2'
            color='textSecondary'
          >
            共 {filteredPlugins.length} 个插件
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gap: 6,
            gridTemplateColumns:
              viewMode === 'grid'
                ? { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }
                : '1fr',
          }}
        >
          {filteredPlugins.map((plugin) => (
            <PluginCard
              key={plugin.id}
              plugin={plugin}
              healthStatus={healthStatus[plugin.code]?.healthy}
              onViewDetails={() => setSelectedPlugin(plugin)}
            />
          ))}
        </Box>

        {filteredPlugins.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 16 }}>
            <Package sx={{ width: 64, height: 64, color: 'grey.300', mx: 'auto', mb: 4 }} />
            <Typography
              variant='h6'
              sx={{ fontWeight: 'medium' }}
            >
              未找到匹配的插件
            </Typography>
            <Typography
              variant='body2'
              color='textSecondary'
            >
              尝试调整搜索条件或选择其他分类
            </Typography>
          </Box>
        )}
      </Box>

      {selectedPlugin && (
        <PluginDetailModal
          plugin={selectedPlugin}
          onClose={() => setSelectedPlugin(null)}
        />
      )}
      </Box>
    </PageContainer>
  );
};

export default PluginMarketplacePage;
