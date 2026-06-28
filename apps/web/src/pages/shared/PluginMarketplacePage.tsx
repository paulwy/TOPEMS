import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  Star,
  Download,
  Search,
  Grid3X3,
  List,
  Sparkles,
  TrendingUp,
  Clock,
  ShoppingCart,
  RefreshCw,
  Zap,
  ArrowRight,
} from 'lucide-react';
import {
  Box,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Chip,
  Tab,
  Tabs,
} from '@mui/material';
import { PageContainer } from '@/components/common';
import { PluginCard, PluginCategoryNav } from '@/components/plugin';
import type { Plugin, PluginCategory } from '@/api/plugin';
import {
  getPluginCategories,
  listPlugins,
  getMarketplaceSummary,
} from '@/api/plugin';
import { usePluginStore } from '@/store/pluginStore';
import { useAppStore } from '@/store';

type SortOption = 'popular' | 'rating' | 'newest' | 'price';
type ViewMode = 'grid' | 'list';

const PluginMarketplacePage: React.FC = () => {
  const navigate = useNavigate();
  const { healthStatus, fetchHealthStatus } = usePluginStore();
  const addNotification = useAppStore((state) => state.addNotification);

  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [categories, setCategories] = useState<PluginCategory[]>([]);
  const [featuredPlugins, setFeaturedPlugins] = useState<Plugin[]>([]);
  const [newPlugins, setNewPlugins] = useState<Plugin[]>([]);
  const [topRatedPlugins, setTopRatedPlugins] = useState<Plugin[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [sortBy, setSortBy] = useState<SortOption>('popular');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [activeTab, setActiveTab] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [summaryRes, categoriesRes] = await Promise.all([
          getMarketplaceSummary(),
          getPluginCategories(),
        ]);

        if (summaryRes.success && summaryRes.data) {
          setFeaturedPlugins(summaryRes.data.featured_plugins);
          setNewPlugins(summaryRes.data.new_plugins);
          setTopRatedPlugins(summaryRes.data.top_rated);
          setPlugins(summaryRes.data.featured_plugins);
        }

        if (categoriesRes.success && categoriesRes.data) {
          setCategories(categoriesRes.data);
        }

        fetchHealthStatus();
      } catch (err: unknown) {
        setError('加载失败，请稍后重试');
        console.error('Failed to load marketplace:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [fetchHealthStatus]);

  useEffect(() => {
    if (activeTab !== 0 || activeCategory !== 'all' || searchQuery) {
      const fetchPlugins = async () => {
        setIsRefreshing(true);
        try {
          const params: any = {
            sort_by: sortBy,
          };

          if (searchQuery) params.search = searchQuery;
          if (activeCategory !== 'all') params.category = activeCategory;

          const res = await listPlugins(params);
          if (res.success && res.data) {
            setPlugins(res.data.plugins);
          }
        } catch (err: unknown) {
          console.error('Failed to load plugins:', err);
        } finally {
          setIsRefreshing(false);
        }
      };

      fetchPlugins();
    }
  }, [activeCategory, sortBy, searchQuery, activeTab]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const [summaryRes, categoriesRes] = await Promise.all([
        getMarketplaceSummary(),
        getPluginCategories(),
      ]);

      if (summaryRes.success && summaryRes.data) {
        setFeaturedPlugins(summaryRes.data.featured_plugins);
        setNewPlugins(summaryRes.data.new_plugins);
        setTopRatedPlugins(summaryRes.data.top_rated);
      }

      if (categoriesRes.success && categoriesRes.data) {
        setCategories(categoriesRes.data);
      }

      fetchHealthStatus(true);

      addNotification({
        title: '刷新成功',
        message: '插件列表已更新',
        type: 'success',
      });
    } catch (err: unknown) {
      addNotification({
        title: '刷新失败',
        message: '请稍后重试',
        type: 'error',
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const displayPlugins = useMemo(() => {
    if (activeTab === 0 && activeCategory === 'all' && !searchQuery) {
      return featuredPlugins;
    }
    return plugins;
  }, [activeTab, activeCategory, searchQuery, plugins, featuredPlugins]);

  const handleViewDetails = (pluginCode: string) => {
    navigate(`/plugin/${pluginCode}`);
  };

  if (loading) {
    return (
      <PageContainer>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <CircularProgress />
        </Box>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      maxWidth={false}
      padding={false}
      bgcolor='background.default'
    >
      <Box
        sx={{
          background: 'linear-gradient(135deg, primary.main 0%, primary.dark 100%)',
          color: 'white',
          py: 10,
          px: 6,
        }}
      >
        <Box sx={{ maxWidth: '1200px', mx: 'auto' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 2 }}>
            <Sparkles sx={{ width: 40, height: 40 }} />
            <Typography
              variant='h3'
              sx={{ fontWeight: 'bold' }}
            >
              插件市场
            </Typography>
          </Box>
          <Typography
            variant='h6'
            sx={{ opacity: 0.9, mb: 4, maxWidth: 600 }}
          >
            发现和安装强大的插件，扩展您的 TOPEMS 功能，打造专属的企业管理平台
          </Typography>

          <Box sx={{ maxWidth: 600 }}>
            <TextField
              placeholder='搜索插件、功能或作者...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              fullWidth
              size='medium'
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'rgba(255,255,255,0.15)',
                  color: 'white',
                  '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                  '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
                  '&.Mui-focused fieldset': { borderColor: 'white' },
                },
                '& .MuiInputBase-input::placeholder': {
                  color: 'rgba(255,255,255,0.6)',
                },
              }}
              slotProps={{
                input: {
                  startAdornment: (
                    <Search sx={{ color: 'rgba(255,255,255,0.6)', mr: 1, width: 24, height: 24 }} />
                  ),
                },
              }}
            />
          </Box>
        </Box>
      </Box>

      {error && (
        <Box sx={{ maxWidth: '1200px', mx: 'auto', px: 6, py: 4 }}>
          <Alert severity='error'>{error}</Alert>
        </Box>
      )}

      <Box sx={{ maxWidth: '1200px', mx: 'auto', px: 6, py: 6 }}>
        <Box sx={{ mb: 6 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
            <Typography
              variant='h5'
              sx={{ fontWeight: 'bold' }}
            >
              插件分类
            </Typography>
          </Box>
          <PluginCategoryNav
            categories={categories}
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
          />
        </Box>

        <Box sx={{ mb: 4 }}>
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            sx={{ mb: 3 }}
          >
            <Tab
              icon={<Sparkles sx={{ width: 18, height: 18, mr: 1 }} />}
              label='精选推荐'
              iconPosition='start'
            />
            <Tab
              icon={<TrendingUp sx={{ width: 18, height: 18, mr: 1 }} />}
              label='热门排行'
              iconPosition='start'
            />
            <Tab
              icon={<Clock sx={{ width: 18, height: 18, mr: 1 }} />}
              label='最新上架'
              iconPosition='start'
            />
            <Tab
              icon={<Star sx={{ width: 18, height: 18, mr: 1 }} />}
              label='高分好评'
              iconPosition='start'
            />
          </Tabs>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography
            variant='h6'
            sx={{ fontWeight: 'bold' }}
          >
            {activeCategory === 'all'
              ? '全部插件'
              : categories.find((c) => c.code === activeCategory)?.name}
            <Typography
              component='span'
              variant='body2'
              color='textSecondary'
              sx={{ ml: 2 }}
            >
              共 {displayPlugins.length} 个插件
            </Typography>
          </Typography>

          <Box sx={{ display: 'flex', gap: 2 }}>
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
                  <TrendingUp sx={{ width: 16, height: 16, mr: 1 }} />
                  最受欢迎
                </MenuItem>
                <MenuItem value='rating'>
                  <Star sx={{ width: 16, height: 16, mr: 1 }} />
                  评分最高
                </MenuItem>
                <MenuItem value='newest'>
                  <Clock sx={{ width: 16, height: 16, mr: 1 }} />
                  最新发布
                </MenuItem>
                <MenuItem value='price'>
                  <ShoppingCart sx={{ width: 16, height: 16, mr: 1 }} />
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
              disabled={isRefreshing}
              startIcon={<RefreshCw sx={{ width: 16, height: 16 }} />}
            >
              刷新
            </Button>
          </Box>
        </Box>

        {isRefreshing && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        )}

        {!isRefreshing && displayPlugins.length > 0 && (
          <Box
            sx={{
              display: 'grid',
              gap: 3,
              gridTemplateColumns:
                viewMode === 'grid'
                  ? { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)', xl: 'repeat(4, 1fr)' }
                  : '1fr',
            }}
          >
            {displayPlugins.map((plugin) => (
              <PluginCard
                key={plugin.id}
                plugin={plugin}
                healthStatus={healthStatus[plugin.code]?.healthy}
                onViewDetails={() => handleViewDetails(plugin.code)}
                variant={viewMode}
              />
            ))}
          </Box>
        )}

        {!isRefreshing && displayPlugins.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 16 }}>
            <Package sx={{ width: 64, height: 64, color: 'grey.300', mx: 'auto', mb: 3 }} />
            <Typography
              variant='h6'
              sx={{ fontWeight: 'medium', mb: 1 }}
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

        {activeTab === 0 && activeCategory === 'all' && !searchQuery && (
          <>
            <DividerWithTitle
              title='热门排行'
              icon={<TrendingUp sx={{ width: 20, height: 20 }} />}
              action={
                <Button
                  size='small'
                  endIcon={<ArrowRight sx={{ width: 16, height: 16 }} />}
                  onClick={() => setActiveTab(1)}
                >
                  查看更多
                </Button>
              }
            />

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
                gap: 3,
                mb: 8,
              }}
            >
              {topRatedPlugins.slice(0, 3).map((plugin, index) => (
                <Card
                  key={plugin.id}
                  sx={{
                    position: 'relative',
                    '&:hover': { boxShadow: 3 },
                    transition: 'box-shadow 0.3s ease',
                    cursor: 'pointer',
                  }}
                  onClick={() => handleViewDetails(plugin.code)}
                >
                  <CardContent>
                    <Box sx={{ position: 'absolute', top: 12, right: 12 }}>
                      <Chip
                        label={`#${index + 1}`}
                        size='small'
                        color={index === 0 ? 'warning' : index === 1 ? 'default' : 'info'}
                        sx={{ fontWeight: 'bold' }}
                      />
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: 1.5,
                          background:
                            'linear-gradient(135deg, primary.light 0%, primary.main 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Package sx={{ width: 20, height: 20, color: 'white' }} />
                      </Box>
                      <Box>
                        <Typography sx={{ fontWeight: 'medium' }}>{plugin.name}</Typography>
                        <Typography
                          variant='caption'
                          color='textSecondary'
                        >
                          v{plugin.version}
                        </Typography>
                      </Box>
                    </Box>
                    <Typography
                      variant='body2'
                      color='textSecondary'
                      sx={{ mb: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                    >
                      {plugin.description}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Star sx={{ width: 14, height: 14, color: 'warning.main', fill: 'warning.main' }} />
                        <Typography
                          variant='body2'
                          sx={{ fontWeight: 'medium' }}
                        >
                          {plugin.rating}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Download sx={{ width: 14, height: 14, color: 'grey.400' }} />
                        <Typography
                          variant='caption'
                          color='textSecondary'
                        >
                          {plugin.install_count?.toLocaleString()}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>

            <DividerWithTitle
              title='最新上架'
              icon={<Clock sx={{ width: 20, height: 20 }} />}
              action={
                <Button
                  size='small'
                  endIcon={<ArrowRight sx={{ width: 16, height: 16 }} />}
                  onClick={() => setActiveTab(2)}
                >
                  查看更多
                </Button>
              }
            />

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
                gap: 3,
                mb: 8,
              }}
            >
              {newPlugins.slice(0, 4).map((plugin) => (
                <Card
                  key={plugin.id}
                  sx={{
                    '&:hover': { boxShadow: 3 },
                    transition: 'box-shadow 0.3s ease',
                    cursor: 'pointer',
                  }}
                  onClick={() => handleViewDetails(plugin.code)}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: 1.5,
                          background:
                            'linear-gradient(135deg, primary.light 0%, primary.main 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Package sx={{ width: 20, height: 20, color: 'white' }} />
                      </Box>
                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Typography
                          sx={{ fontWeight: 'medium', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                        >
                          {plugin.name}
                        </Typography>
                        <Typography
                          variant='caption'
                          color='textSecondary'
                        >
                          v{plugin.version}
                        </Typography>
                      </Box>
                    </Box>
                    <Chip
                      icon={<Zap sx={{ width: 12, height: 12 }} />}
                      label='NEW'
                      size='small'
                      color='success'
                    />
                  </CardContent>
                </Card>
              ))}
            </Box>
          </>
        )}
      </Box>
    </PageContainer>
  );
};

const DividerWithTitle: React.FC<{
  title: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}> = ({ title, icon, action }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, mt: 6 }}>
    {icon && <Box sx={{ mr: 1.5, display: 'flex', color: 'primary.main' }}>{icon}</Box>}
    <Typography
      variant='h5'
      sx={{ fontWeight: 'bold', flexGrow: 1 }}
    >
      {title}
    </Typography>
    {action}
  </Box>
);

export default PluginMarketplacePage;
