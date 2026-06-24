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
import { useToast } from '@/hooks/use-toast';

type SortOption = 'popular' | 'rating' | 'newest' | 'price';
type ViewMode = 'grid' | 'list';

interface PluginCardProps {
  plugin: Plugin;
  healthStatus?: boolean;
  onViewDetails?: () => void;
}

const PluginCard: React.FC<PluginCardProps> = ({ plugin, healthStatus, onViewDetails }) => {
  const { installPlugin, isPluginInstalled } = usePluginStore();
  const { toast } = useToast();
  const [isInstalling, setIsInstalling] = useState(false);
  const installed = isPluginInstalled(plugin.code);

  const handleInstall = async () => {
    setIsInstalling(true);
    try {
      const success = await installPlugin(plugin.code);
      if (success) {
        toast({
          title: '安装成功',
          description: `${plugin.name} 插件已安装`,
        });
      } else {
        toast({
          title: '安装失败',
          description: '无法安装插件，请稍后重试',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: '安装失败',
        description: error.message || '无法安装插件',
        variant: 'destructive',
      });
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <Card
      className='h-full flex flex-col hover:shadow-lg transition-shadow duration-300'
      sx={{ borderRadius: 2 }}
    >
      <CardContent className='flex flex-col h-full'>
        <div className='flex items-start justify-between mb-3'>
          <div className='flex items-center gap-2'>
            <div className='w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center'>
              <Package className='w-6 h-6 text-white' />
            </div>
            <div>
              <Typography
                variant='h6'
                fontWeight='bold'
              >
                {plugin.name}
              </Typography>
              <Typography
                variant='body2'
                color='textSecondary'
              >
                v{plugin.version}
              </Typography>
            </div>
          </div>
          {healthStatus !== undefined && (
            <div
              className={`w-3 h-3 rounded-full ${healthStatus ? 'bg-green-500' : 'bg-red-500'}`}
            />
          )}
        </div>

        <Typography
          variant='body2'
          color='textSecondary'
          className='mb-3 flex-grow'
        >
          {plugin.description || '暂无描述'}
        </Typography>

        <div className='flex flex-wrap gap-1 mb-3'>
          {plugin.tags?.slice(0, 3).map((tag) => (
            <Chip
              key={tag}
              label={tag}
              size='small'
              variant='outlined'
              sx={{ fontSize: 10 }}
            />
          ))}
        </div>

        <div className='flex items-center justify-between mb-3'>
          <div className='flex items-center gap-1'>
            <Star className='w-4 h-4 text-yellow-500 fill-yellow-500' />
            <Typography
              variant='body2'
              fontWeight='medium'
            >
              {plugin.rating || 0}
            </Typography>
            <Typography
              variant='body2'
              color='textSecondary'
            >
              ({plugin.rating_count || 0})
            </Typography>
          </div>
          <div className='flex items-center gap-1'>
            <Download className='w-4 h-4 text-gray-400' />
            <Typography
              variant='body2'
              color='textSecondary'
            >
              {plugin.install_count?.toLocaleString() || 0}
            </Typography>
          </div>
        </div>

        <div className='flex gap-2'>
          <Button
            variant='outlined'
            size='small'
            fullWidth
            onClick={onViewDetails}
            startIcon={<ExternalLink className='w-4 h-4' />}
          >
            详情
          </Button>
          {installed ? (
            <Button
              variant='contained'
              size='small'
              fullWidth
              disabled
              startIcon={<CheckCircle className='w-4 h-4' />}
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
                  <Loader2 className='w-4 h-4 animate-spin' />
                ) : (
                  <ShoppingCart className='w-4 h-4' />
                )
              }
            >
              {isInstalling ? '安装中...' : plugin.is_free ? '免费安装' : '购买'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const PluginDetailModal: React.FC<{
  plugin: Plugin;
  onClose: () => void;
}> = ({ plugin, onClose }) => {
  const { installPlugin, isPluginInstalled } = usePluginStore();
  const { toast } = useToast();
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
      toast({
        title: '评价成功',
        description: '感谢您的评价',
      });
      setRating(0);
      setReviewTitle('');
      setReviewContent('');
      getPluginReviews(plugin.code).then((res) => {
        if (res.success && res.data) {
          setReviews(res.data.reviews);
        }
      });
    } catch (error: any) {
      toast({
        title: '评价失败',
        description: error.message || '无法提交评价',
        variant: 'destructive',
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
        toast({
          title: '安装成功',
          description: `${plugin.name} 插件已安装`,
        });
        onClose();
      } else {
        toast({
          title: '安装失败',
          description: '无法安装插件，请稍后重试',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: '安装失败',
        description: error.message || '无法安装插件',
        variant: 'destructive',
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
      <DialogTitle className='flex items-center justify-between'>
        <div className='flex items-center gap-3'>
          <div className='w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center'>
            <Package className='w-6 h-6 text-white' />
          </div>
          <div>
            <Typography
              variant='h5'
              fontWeight='bold'
            >
              {plugin.name}
            </Typography>
            <Typography
              variant='body2'
              color='textSecondary'
            >
              v{plugin.version}
            </Typography>
          </div>
        </div>
        <Button
          onClick={onClose}
          startIcon={<X className='w-5 h-5' />}
        >
          关闭
        </Button>
      </DialogTitle>

      <DialogContent className='max-h-[70vh] overflow-y-auto'>
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
          <div className='lg:col-span-2 space-y-6'>
            <div>
              <Typography
                variant='h6'
                fontWeight='bold'
              >
                描述
              </Typography>
              <Typography
                variant='body1'
                color='textSecondary'
              >
                {plugin.description || '暂无描述'}
              </Typography>
            </div>

            <div>
              <Typography
                variant='h6'
                fontWeight='bold'
              >
                版本历史
              </Typography>
              <div className='space-y-2'>
                {versions.length > 0 ? (
                  versions.map((v) => (
                    <div
                      key={v.id}
                      className='p-3 bg-gray-50 rounded-lg'
                    >
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center gap-2'>
                          <Typography fontWeight='medium'>{v.version}</Typography>
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
                        </div>
                        <Typography
                          variant='body2'
                          color='textSecondary'
                        >
                          {new Date(v.created_at).toLocaleDateString()}
                        </Typography>
                      </div>
                      {v.release_notes && (
                        <Typography
                          variant='body2'
                          color='textSecondary'
                          className='mt-1'
                        >
                          {v.release_notes}
                        </Typography>
                      )}
                    </div>
                  ))
                ) : (
                  <Typography
                    variant='body2'
                    color='textSecondary'
                  >
                    暂无版本信息
                  </Typography>
                )}
              </div>
            </div>

            <div>
              <Typography
                variant='h6'
                fontWeight='bold'
              >
                用户评价 ({reviews.length})
              </Typography>
              <div className='space-y-4'>
                {reviews.length > 0 ? (
                  reviews.map((review) => (
                    <div
                      key={review.id}
                      className='p-4 bg-gray-50 rounded-lg'
                    >
                      <div className='flex items-center justify-between mb-2'>
                        <div className='flex items-center gap-2'>
                          <Avatar>{review.user_name?.charAt(0) || 'U'}</Avatar>
                          <div>
                            <Typography fontWeight='medium'>
                              {review.user_name || '匿名用户'}
                            </Typography>
                            <Typography
                              variant='body2'
                              color='textSecondary'
                            >
                              {new Date(review.created_at).toLocaleDateString()}
                            </Typography>
                          </div>
                        </div>
                        <Rating
                          value={review.rating || 0}
                          readOnly
                          size='small'
                        />
                      </div>
                      {review.title && <Typography fontWeight='medium'>{review.title}</Typography>}
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
                          className='mt-2'
                        />
                      )}
                    </div>
                  ))
                ) : (
                  <Typography
                    variant='body2'
                    color='textSecondary'
                  >
                    暂无评价
                  </Typography>
                )}
              </div>
            </div>
          </div>

          <div className='space-y-6'>
            <Card>
              <CardContent className='space-y-4'>
                <div className='flex items-center justify-between'>
                  <Typography
                    variant='h6'
                    fontWeight='bold'
                  >
                    评分
                  </Typography>
                  <div className='text-center'>
                    <Typography
                      variant='h3'
                      fontWeight='bold'
                    >
                      {plugin.rating || 0}
                    </Typography>
                    <Rating
                      value={plugin.rating || 0}
                      readOnly
                    />
                  </div>
                </div>

                <Divider />

                <div className='flex items-center justify-between'>
                  <span className='text-gray-600'>下载量</span>
                  <Typography fontWeight='medium'>
                    {plugin.install_count?.toLocaleString() || 0}
                  </Typography>
                </div>

                <div className='flex items-center justify-between'>
                  <span className='text-gray-600'>分类</span>
                  <Typography fontWeight='medium'>{plugin.category}</Typography>
                </div>

                <div className='flex items-center justify-between'>
                  <span className='text-gray-600'>作者</span>
                  <Typography fontWeight='medium'>{plugin.author_name || '未知'}</Typography>
                </div>

                <Divider />

                <Button
                  variant='contained'
                  fullWidth
                  size='large'
                  disabled={installed}
                  onClick={handleInstall}
                  startIcon={
                    installed ? (
                      <CheckCircle className='w-5 h-5' />
                    ) : isInstalling ? (
                      <Loader2 className='w-5 h-5 animate-spin' />
                    ) : (
                      <ShoppingCart className='w-5 h-5' />
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
                  fontWeight='bold'
                  className='mb-4'
                >
                  发表评价
                </Typography>
                <div className='space-y-3'>
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
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
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
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      try {
        await Promise.all([fetchMarketplacePlugins(), fetchHealthStatus()]);
      } catch (err) {
        console.error('Failed to load marketplace data:', err);
      }
    };
    fetchData();
  }, [fetchMarketplacePlugins, fetchHealthStatus]);

  const handleRefresh = () => {
    fetchMarketplacePlugins(true);
    fetchHealthStatus(true);
    toast({
      title: '刷新成功',
      description: '插件列表已更新',
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
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
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
    <div className='min-h-screen bg-gray-50'>
      <div className='bg-gradient-to-r from-primary-600 to-primary-700 text-white py-8 px-6'>
        <div className='max-w-7xl mx-auto'>
          <div className='flex items-center gap-3 mb-2'>
            <Sparkles className='w-8 h-8' />
            <Typography
              variant='h4'
              fontWeight='bold'
            >
              插件市场
            </Typography>
          </div>
          <Typography
            variant='body1'
            opacity={0.9}
          >
            发现和安装强大的插件，扩展您的 TOPEMS 功能
          </Typography>
        </div>
      </div>

      {error && (
        <div className='max-w-7xl mx-auto px-6 py-4'>
          <Alert
            severity='error'
            onClose={() => {}}
          >
            {error}
          </Alert>
        </div>
      )}

      <div className='max-w-7xl mx-auto px-6 py-8'>
        <div className='flex flex-col lg:flex-row gap-6 mb-8'>
          <div className='flex-1 relative'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400' />
            <TextField
              placeholder='搜索插件...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              fullWidth
              sx={{ pl: 10 }}
            />
          </div>

          <div className='flex gap-3'>
            <FormControl
              size='small'
              className='min-w-[160px]'
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
              className='min-w-[140px]'
            >
              <InputLabel>排序方式</InputLabel>
              <Select
                value={sortBy}
                label='排序方式'
                onChange={(e) => setSortBy(e.target.value as SortOption)}
              >
                <MenuItem value='popular'>
                  <TrendingUp className='w-4 h-4 mr-2' />
                  最受欢迎
                </MenuItem>
                <MenuItem value='rating'>
                  <Star className='w-4 h-4 mr-2' />
                  评分最高
                </MenuItem>
                <MenuItem value='newest'>
                  <Clock className='w-4 h-4 mr-2' />
                  最新发布
                </MenuItem>
                <MenuItem value='price'>
                  <ShoppingCart className='w-4 h-4 mr-2' />
                  价格排序
                </MenuItem>
              </Select>
            </FormControl>

            <Button
              variant='outlined'
              size='small'
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            >
              {viewMode === 'grid' ? <List className='w-5 h-5' /> : <Grid3X3 className='w-5 h-5' />}
            </Button>

            <Button
              variant='outlined'
              size='small'
              onClick={handleRefresh}
              startIcon={<RefreshCw className='w-4 h-4' />}
            >
              刷新
            </Button>
          </div>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8'>
          {SUITES.map((suite) => (
            <Card
              key={suite.id}
              className='cursor-pointer hover:shadow-lg transition-shadow'
              onClick={() => setSelectedSuite(suite.code)}
            >
              <CardContent className='flex items-center gap-4'>
                <div className='w-14 h-14 rounded-xl bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center'>
                  <Package className='w-7 h-7 text-primary-600' />
                </div>
                <div className='flex-1'>
                  <Typography
                    variant='h6'
                    fontWeight='bold'
                  >
                    {suite.name}
                  </Typography>
                  <Typography
                    variant='body2'
                    color='textSecondary'
                  >
                    {suite.description}
                  </Typography>
                  <div className='flex items-center gap-2 mt-1'>
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
                  </div>
                </div>
                <ChevronRight className='w-5 h-5 text-gray-400' />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className='flex items-center justify-between mb-6'>
          <Typography
            variant='h5'
            fontWeight='bold'
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
        </div>

        <div
          className={`grid gap-6 ${
            viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'
          }`}
        >
          {filteredPlugins.map((plugin) => (
            <PluginCard
              key={plugin.id}
              plugin={plugin}
              healthStatus={healthStatus[plugin.code]?.healthy}
              onViewDetails={() => setSelectedPlugin(plugin)}
            />
          ))}
        </div>

        {filteredPlugins.length === 0 && (
          <div className='text-center py-16'>
            <Package className='w-16 h-16 text-gray-300 mx-auto mb-4' />
            <Typography
              variant='h6'
              fontWeight='medium'
            >
              未找到匹配的插件
            </Typography>
            <Typography
              variant='body2'
              color='textSecondary'
            >
              尝试调整搜索条件或选择其他分类
            </Typography>
          </div>
        )}
      </div>

      {selectedPlugin && (
        <PluginDetailModal
          plugin={selectedPlugin}
          onClose={() => setSelectedPlugin(null)}
        />
      )}
    </div>
  );
};

export default PluginMarketplacePage;
