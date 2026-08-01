import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Card,
  CardContent,
  CardActions,
  Chip,
  Divider,
  IconButton,
  Button,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Avatar,
  Rating,
  Grid,
  Snackbar,
  Alert,
  LinearProgress,
  Tooltip,
} from '@mui/material';
import {
  Store as StoreIcon,
  Download as DownloadIcon,
  Search as SearchIcon,
  Star as StarIcon,
  Clock as ClockIcon,
  TrendingUp as TrendingUpIcon,
  X as XIcon,
  Check as CheckIcon,
  ChevronRight as ChevronRightIcon,
  Folder as FolderIcon,
  Zap as ZapIcon,
  MessageSquare as MessageSquareIcon,
  Layers as LayersIcon,
  Package as PackageIcon,
  ThumbsUp as ThumbsUpIcon,
  Trash as TrashIcon,
  ArrowLeft as ArrowLeftIcon,
  Gauge as GaugeIcon,
  Palette as PaletteIcon,
  Users as UsersIcon,
  BarChart3 as BarChart3Icon,
  Edit3 as Edit3Icon,
  GitBranch as GitBranchIcon,
  Database as DatabaseIcon,
  Shield as ShieldIcon,
  Moon as MoonIcon,
  CheckCircle as CheckCircleIcon,
  Settings as SettingsIcon,
  Bell as BellIcon,
} from 'lucide-react';
import {
  moduleMarket,
  type MarketplaceModule,
  type Category,
  type ModuleReview,
  type ModuleSortType,
} from './module-market';

type TabType = 'browse' | 'installed' | 'recommended' | 'top';

interface ModuleMarketplaceProps {
  onClose?: () => void;
}

const getCategoryIcon = (iconName: string) => {
  switch (iconName) {
    case 'briefcase':
      return <FolderIcon size={18} />;
    case 'gauge':
      return <GaugeIcon size={18} />;
    case 'wrench':
      return <ZapIcon size={18} />;
    case 'plug':
      return <LayersIcon size={18} />;
    case 'palette':
      return <PaletteIcon size={18} />;
    default:
      return <PackageIcon size={18} />;
  }
};

const getModuleIcon = (iconName: string) => {
  switch (iconName) {
    case 'users':
      return <UsersIcon size={28} />;
    case 'gauge':
      return <GaugeIcon size={28} />;
    case 'bar-chart-3':
      return <BarChart3Icon size={28} />;
    case 'edit-3':
      return <Edit3Icon size={28} />;
    case 'git-branch':
      return <GitBranchIcon size={28} />;
    case 'database':
      return <DatabaseIcon size={28} />;
    case 'shield':
      return <ShieldIcon size={28} />;
    case 'moon':
      return <MoonIcon size={28} />;
    case 'palette':
      return <PaletteIcon size={28} />;
    case 'check-circle':
      return <CheckCircleIcon size={28} />;
    case 'settings':
      return <SettingsIcon size={28} />;
    case 'bell':
      return <BellIcon size={28} />;
    default:
      return <PackageIcon size={28} />;
  }
};

const formatDate = (timestamp: number): string => {
  return new Date(timestamp).toLocaleDateString('zh-CN');
};

const formatNumber = (num: number): string => {
  if (num >= 10000) return `${(num / 10000).toFixed(1)}w`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
  return String(num);
};

const StatCard: React.FC<{
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}> = ({ label, value, icon, color }) => (
  <Card sx={{ flex: 1, minWidth: 0 }}>
    <CardContent>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant='body2'
            color='text.secondary'
            sx={{ mb: 0.5 }}
          >
            {label}
          </Typography>
          <Typography
            variant='h5'
            sx={{ fontWeight: 700, color }}
          >
            {value}
          </Typography>
        </Box>
        <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: `${color}15`, color, flexShrink: 0 }}>
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const ModuleCard: React.FC<{
  module: MarketplaceModule;
  onClick: () => void;
  onInstall?: () => void;
  onUninstall?: () => void;
}> = ({ module: mod, onClick, onInstall, onUninstall }) => (
  <Card
    sx={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      cursor: 'pointer',
      transition: 'all 0.2s',
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: 4,
      },
    }}
    onClick={onClick}
  >
    <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <Avatar
          sx={{
            width: 56,
            height: 56,
            bgcolor: 'primary.main',
            color: 'white',
          }}
        >
          {getModuleIcon(mod.icon)}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant='subtitle1'
            sx={{ fontWeight: 600, lineHeight: 1.2 }}
          >
            {mod.name}
          </Typography>
          <Chip
            label={mod.version}
            size='small'
            variant='outlined'
            sx={{ mt: 0.5, fontSize: '0.75rem' }}
          />
        </Box>
        {mod.installed && (
          <Chip
            icon={<CheckIcon size={14} />}
            label='已安装'
            size='small'
            color='success'
            sx={{ alignSelf: 'flex-start' }}
          />
        )}
      </Box>

      <Typography
        variant='body2'
        color='text.secondary'
        sx={{
          mb: 2,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          flex: 1,
        }}
      >
        {mod.description}
      </Typography>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
        {mod.tags.slice(0, 3).map((tag) => (
          <Chip
            key={tag}
            label={tag}
            size='small'
            variant='outlined'
          />
        ))}
      </Box>

      <Box
        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 'auto' }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <StarIcon
            size={16}
            style={{ color: '#f59e0b', fill: '#f59e0b' }}
          />
          <Typography
            variant='body2'
            sx={{ fontWeight: 600 }}
          >
            {mod.rating}
          </Typography>
          <Typography
            variant='caption'
            color='text.secondary'
          >
            ({mod.review_count})
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
          <DownloadIcon size={16} />
          <Typography variant='caption'>{formatNumber(mod.download_count)}</Typography>
        </Box>
      </Box>
    </CardContent>

    <Divider />

    <CardActions sx={{ p: 2, pt: 1.5, pb: 1.5 }}>
      {mod.installed ? (
        <Button
          size='small'
          color='error'
          startIcon={<TrashIcon size={16} />}
          onClick={(e) => {
            e.stopPropagation();
            onUninstall?.();
          }}
          fullWidth
        >
          卸载
        </Button>
      ) : (
        <Button
          size='small'
          variant='contained'
          startIcon={<DownloadIcon size={16} />}
          onClick={(e) => {
            e.stopPropagation();
            onInstall?.();
          }}
          fullWidth
        >
          安装
        </Button>
      )}
    </CardActions>
  </Card>
);

const ModuleDetailDialog: React.FC<{
  open: boolean;
  module: MarketplaceModule | null;
  reviews: ModuleReview[];
  onClose: () => void;
  onInstall: () => void;
  onUninstall: () => void;
}> = ({ open, module: mod, reviews, onClose, onInstall, onUninstall }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');

  if (!mod) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth='md'
      fullWidth
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ width: 56, height: 56, bgcolor: 'primary.main' }}>
            {getModuleIcon(mod.icon)}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography
              variant='h6'
              sx={{ fontWeight: 700 }}
            >
              {mod.name}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
              <StarIcon
                size={16}
                style={{ color: '#f59e0b', fill: '#f59e0b' }}
              />
              <Typography
                variant='body2'
                sx={{ fontWeight: 600 }}
              >
                {mod.rating}
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                ({mod.review_count} 条评价)
              </Typography>
              <Typography
                variant='caption'
                color='text.divider'
              >
                |
              </Typography>
              <DownloadIcon
                size={14}
                style={{ color: 'var(--mui-palette-text-secondary)' }}
              />
              <Typography
                variant='caption'
                color='text.secondary'
              >
                {formatNumber(mod.download_count)} 次下载
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={onClose}>
            <XIcon size={20} />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          sx={{ mb: 2 }}
        >
          <Tab label='详情' />
          <Tab label='依赖' />
          <Tab label={`评价 (${reviews.length})`} />
        </Tabs>

        {activeTab === 0 && (
          <Box>
            <Typography
              variant='body1'
              sx={{ mb: 2 }}
            >
              {mod.description}
            </Typography>

            <Typography
              variant='subtitle2'
              sx={{ mb: 1, mt: 3, fontWeight: 600 }}
            >
              主要功能
            </Typography>
            <List dense>
              {mod.features.map((feature, idx) => (
                <ListItem
                  key={idx}
                  sx={{ pl: 0, py: 0.5 }}
                >
                  <CheckIcon
                    size={16}
                    style={{ color: '#10b981', marginRight: 8 }}
                  />
                  <ListItemText primary={feature} />
                </ListItem>
              ))}
            </List>

            <Grid
              container
              spacing={2}
              sx={{ mt: 2 }}
            >
              <Grid size={{ xs: 6, sm: 3 }}>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  版本
                </Typography>
                <Typography
                  variant='body2'
                  sx={{ fontWeight: 600 }}
                >
                  {mod.version}
                </Typography>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  大小
                </Typography>
                <Typography
                  variant='body2'
                  sx={{ fontWeight: 600 }}
                >
                  {mod.size_kb} KB
                </Typography>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  许可证
                </Typography>
                <Typography
                  variant='body2'
                  sx={{ fontWeight: 600 }}
                >
                  {mod.license}
                </Typography>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  更新时间
                </Typography>
                <Typography
                  variant='body2'
                  sx={{ fontWeight: 600 }}
                >
                  {formatDate(mod.updated_at)}
                </Typography>
              </Grid>
            </Grid>

            <Box sx={{ mt: 2 }}>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                作者: {mod.author}
              </Typography>
            </Box>
          </Box>
        )}

        {activeTab === 1 && (
          <Box>
            {mod.dependencies.length === 0 ? (
              <Typography
                variant='body2'
                color='text.secondary'
              >
                该模块无外部依赖
              </Typography>
            ) : (
              <List>
                {mod.dependencies.map((dep, idx) => (
                  <ListItem
                    key={idx}
                    divider
                  >
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PackageIcon size={16} />
                        <Typography
                          variant='body2'
                          sx={{ fontWeight: 600 }}
                        >
                          {dep.module_id}
                        </Typography>
                        {dep.is_optional && (
                          <Chip
                            label='可选'
                            size='small'
                            variant='outlined'
                            color='info'
                          />
                        )}
                      </Box>
                      <Typography
                        variant='caption'
                        color='text.secondary'
                      >
                        需要版本: {dep.required_version}
                      </Typography>
                    </Box>
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        )}

        {activeTab === 2 && (
          <Box>
            <Box sx={{ mb: 3, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
              <Typography
                variant='subtitle2'
                sx={{ mb: 1 }}
              >
                写评价
              </Typography>
              <Rating
                value={newRating}
                onChange={(_, v) => setNewRating(v || 0)}
              />
              <TextField
                fullWidth
                multiline
                rows={2}
                placeholder='分享你的使用体验...'
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                size='small'
                sx={{ mt: 1 }}
              />
              <Button
                size='small'
                variant='contained'
                sx={{ mt: 1 }}
              >
                提交评价
              </Button>
            </Box>

            {reviews.length === 0 ? (
              <Typography
                variant='body2'
                color='text.secondary'
              >
                暂无评价
              </Typography>
            ) : (
              reviews.map((review) => (
                <Box
                  key={review.id}
                  sx={{ mb: 2, pb: 2, borderBottom: 1, borderColor: 'divider' }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Avatar sx={{ width: 32, height: 32, fontSize: '0.875rem' }}>
                      {review.user_name[0]}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography
                        variant='body2'
                        sx={{ fontWeight: 600 }}
                      >
                        {review.user_name}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Rating
                          value={review.rating}
                          size='small'
                          readOnly
                        />
                        <Typography
                          variant='caption'
                          color='text.secondary'
                        >
                          {formatDate(review.created_at)}
                        </Typography>
                      </Box>
                    </Box>
                    <Tooltip title='有帮助'>
                      <IconButton size='small'>
                        <ThumbsUpIcon size={14} />
                      </IconButton>
                    </Tooltip>
                    <Typography
                      variant='caption'
                      color='text.secondary'
                    >
                      {review.helpful_count}
                    </Typography>
                  </Box>
                  <Typography variant='body2'>{review.comment}</Typography>
                </Box>
              ))
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>关闭</Button>
        {mod.installed ? (
          <Button
            color='error'
            variant='contained'
            onClick={onUninstall}
            startIcon={<TrashIcon size={18} />}
          >
            卸载模块
          </Button>
        ) : (
          <Button
            variant='contained'
            onClick={onInstall}
            startIcon={<DownloadIcon size={18} />}
          >
            安装模块
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

const ModuleMarketplace: React.FC<ModuleMarketplaceProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<TabType>('browse');
  const [modules, setModules] = useState<MarketplaceModule[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [sortType, setSortType] = useState<ModuleSortType>('popular');
  const [selectedModule, setSelectedModule] = useState<MarketplaceModule | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [reviews, setReviews] = useState<ModuleReview[]>([]);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    type: 'success' | 'error';
  }>({
    open: false,
    message: '',
    type: 'success',
  });

  const refreshModules = useCallback(() => {
    const options: {
      category?: string;
      keyword?: string;
      sort?: ModuleSortType;
      installed_only?: boolean;
    } = { sort: sortType };

    if (selectedCategory) options.category = selectedCategory;
    if (searchKeyword) options.keyword = searchKeyword;
    if (activeTab === 'installed') options.installed_only = true;

    let result: MarketplaceModule[];

    if (activeTab === 'recommended') {
      result = moduleMarket.getRecommendedModules(12);
    } else if (activeTab === 'top') {
      result = moduleMarket.listModules({ sort: 'rating' });
    } else {
      result = moduleMarket.listModules(options);
    }

    setModules(result);
  }, [activeTab, selectedCategory, searchKeyword, sortType]);

  useEffect(() => {
    setCategories(moduleMarket.getCategories());
    refreshModules();
    const unsubscribe = moduleMarket.subscribe(() => refreshModules());
    return unsubscribe;
  }, [refreshModules]);

  const handleInstall = (moduleId: string) => {
    const success = moduleMarket.installModule(moduleId);
    if (success) {
      setSnackbar({ open: true, message: '模块安装成功', type: 'success' });
    }
  };

  const handleUninstall = (moduleId: string) => {
    const success = moduleMarket.uninstallModule(moduleId);
    if (success) {
      setSnackbar({ open: true, message: '模块已卸载', type: 'success' });
      if (selectedModule?.id === moduleId) {
        setSelectedModule(null);
        setDetailOpen(false);
      }
    }
  };

  const openDetail = (mod: MarketplaceModule) => {
    setSelectedModule(mod);
    setReviews(moduleMarket.getModuleReviews(mod.id));
    setDetailOpen(true);
  };

  const installedCount = moduleMarket.getInstalledModules().length;
  const totalCount = moduleMarket.listModules().length;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <Box
        sx={{
          p: 2,
          borderBottom: 1,
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          gap: 2,
        }}
      >
        {onClose && (
          <IconButton
            onClick={onClose}
            size='small'
          >
            <ArrowLeftIcon size={20} />
          </IconButton>
        )}
        <StoreIcon
          size={24}
          style={{ color: 'var(--mui-palette-primary-main)' }}
        />
        <Typography
          variant='h6'
          sx={{ fontWeight: 700 }}
        >
          模块市场
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Chip
          label={`已安装 ${installedCount}/${totalCount}`}
          color='primary'
          variant='outlined'
        />
      </Box>

      <Box sx={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <Box
          sx={{
            width: 220,
            borderRight: 1,
            borderColor: 'divider',
            p: 2,
            overflow: 'auto',
            flexShrink: 0,
          }}
        >
          <Typography
            variant='subtitle2'
            sx={{ mb: 1, fontWeight: 600 }}
          >
            分类
          </Typography>
          <List
            dense
            sx={{ mb: 2 }}
          >
            <ListItemButton
              selected={!selectedCategory}
              onClick={() => setSelectedCategory('')}
              sx={{ borderRadius: 1, mb: 0.5 }}
            >
              <FolderIcon
                size={18}
                style={{ marginRight: 12, opacity: 0.7 }}
              />
              <ListItemText
                primary='全部'
                secondary={`${totalCount} 个模块`}
              />
            </ListItemButton>
            {categories.map((cat) => (
              <ListItemButton
                key={cat.id}
                selected={selectedCategory === cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                sx={{ borderRadius: 1, mb: 0.5 }}
              >
                {getCategoryIcon(cat.icon)}
                <Box sx={{ ml: 2, flex: 1 }}>
                  <Typography
                    variant='body2'
                    sx={{ fontWeight: selectedCategory === cat.id ? 600 : 400 }}
                  >
                    {cat.name}
                  </Typography>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    {cat.module_count} 个
                  </Typography>
                </Box>
              </ListItemButton>
            ))}
          </List>

          <Divider sx={{ my: 2 }} />

          <Typography
            variant='subtitle2'
            sx={{ mb: 1, fontWeight: 600 }}
          >
            排序
          </Typography>
          <FormControl
            fullWidth
            size='small'
          >
            <Select
              value={sortType}
              onChange={(e) => setSortType(e.target.value as ModuleSortType)}
            >
              <MenuItem value='popular'>最热门</MenuItem>
              <MenuItem value='newest'>最新发布</MenuItem>
              <MenuItem value='rating'>评分最高</MenuItem>
              <MenuItem value='downloads'>下载最多</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Tabs
              value={activeTab}
              onChange={(_, v) => setActiveTab(v)}
            >
              <Tab
                value='browse'
                label='浏览'
                icon={<StoreIcon size={16} />}
                iconPosition='start'
              />
              <Tab
                value='installed'
                label='已安装'
                icon={<CheckIcon size={16} />}
                iconPosition='start'
              />
              <Tab
                value='recommended'
                label='推荐'
                icon={<TrendingUpIcon size={16} />}
                iconPosition='start'
              />
              <Tab
                value='top'
                label='评分榜'
                icon={<StarIcon size={16} />}
                iconPosition='start'
              />
            </Tabs>
          </Box>

          <Box sx={{ p: 2, pb: 0 }}>
            <TextField
              fullWidth
              size='small'
              placeholder='搜索模块名称、描述或标签...'
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position='start'>
                      <SearchIcon size={18} />
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Box>

          <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
            {modules.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <PackageIcon
                  size={48}
                  style={{ opacity: 0.3, marginBottom: 16 }}
                />
                <Typography color='text.secondary'>暂无匹配的模块</Typography>
              </Box>
            ) : (
              <Grid
                container
                spacing={2}
              >
                {modules.map((mod) => (
                  <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={mod.id}>
                    <ModuleCard
                      module={mod}
                      onClick={() => openDetail(mod)}
                      onInstall={() => handleInstall(mod.id)}
                      onUninstall={() => handleUninstall(mod.id)}
                    />
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        </Box>
      </Box>

      <ModuleDetailDialog
        open={detailOpen}
        module={selectedModule}
        reviews={reviews}
        onClose={() => setDetailOpen(false)}
        onInstall={() => selectedModule && handleInstall(selectedModule.id)}
        onUninstall={() => selectedModule && handleUninstall(selectedModule.id)}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          severity={snackbar.type}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ModuleMarketplace;
