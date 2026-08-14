import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  IconButton,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Button,
  TextField,
  InputAdornment,
  Divider,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import i18n from '@/i18n';
import { Star, Trash2, Search, Clock, FileText, Users, Package, Plus } from 'lucide-react';
import { PageContainer } from '@/components/common';
import { favoriteApi, searchApi, type Favorite, type SearchResult } from '@/api/shared';
import { useNotificationStore } from '@/store';
import { QUERY_KEYS, CACHE_DURATIONS } from '@/lib/reactQuery';
import { apiLogger } from '@/utils/logger';
import { sanitizeHtml } from '@/lib/security';
import { useNavigate } from 'react-router-dom';

const ENTITY_TYPES = ['customer', 'product', 'document', 'order', 'project', 'task'] as const;

const FavoritesPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  // 添加收藏对话框状态
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newFavType, setNewFavType] = useState<string>('document');
  const [newFavId, setNewFavId] = useState('');
  const [newFavName, setNewFavName] = useState('');

  // 搜索建议
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // 获取收藏列表
  const { data: favoritesData, isPending: favoritesLoading } = useQuery({
    queryKey: QUERY_KEYS.SEARCH.FAVORITES,
    queryFn: async () => {
      const response = await favoriteApi.list();
      if (response.success && response.data) {
        return response.data;
      }
      return [];
    },

    staleTime: CACHE_DURATIONS.MEDIUM,
  });

  // 获取最近搜索
  const { data: recentSearchesData, isPending: searchesLoading } = useQuery({
    queryKey: QUERY_KEYS.SEARCH.HISTORY,
    queryFn: async () => {
      const response = await searchApi.getRecentSearches();
      if (response.success && response.data) {
        return response.data;
      }
      return [];
    },

    staleTime: CACHE_DURATIONS.MEDIUM,
  });

  // 搜索结果
  const { data: searchResults, isPending: searching } = useQuery({
    queryKey: [QUERY_KEYS.SEARCH.GLOBAL, searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return [];
      const response = await searchApi.search(searchQuery, { page: 1, pagesize: 20 });
      if (response.success && response.data) {
        return response.data.results;
      }
      return [];
    },
    enabled: searchQuery.trim().length > 1,

    staleTime: CACHE_DURATIONS.MEDIUM,
  });

  // 删除收藏
  const removeMutation = useMutation({
    mutationFn: (id: string) => favoriteApi.remove(id),
    onSuccess: () => {
      addNotification({ type: 'success', title: i18n.t('pages.favorites_page.k1'), message: i18n.t('pages.favorites_page.k0') });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.SEARCH.FAVORITES,
        exact: false,
        refetchType: 'active',
      });
    },
    onError: (error: unknown) => {
      apiLogger.error(i18n.t('pages.favorites_page.k0'), error);
      addNotification({ type: 'error', title: i18n.t('pages.favorites_page.k3'), message: i18n.t('pages.favorites_page.k2') });
    },
  });

  // 清除搜索历史
  const clearHistoryMutation = useMutation({
    mutationFn: () => searchApi.clearRecentSearches(),
    onSuccess: () => {
      addNotification({ type: 'success', title: i18n.t('pages.favorites_page.k5'), message: i18n.t('pages.favorites_page.k4') });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.SEARCH.HISTORY,
        exact: false,
        refetchType: 'active',
      });
    },
  });

  // 添加收藏
  const addFavoriteMutation = useMutation({
    mutationFn: () =>
      favoriteApi.add({
        entity_type: newFavType,
        entity_id: newFavId,
        entity_name: newFavName,
      }),
    onSuccess: () => {
      addNotification({ type: 'success', title: i18n.t('pages.favorites_page.k7'), message: i18n.t('pages.favorites_page.k6') });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.SEARCH.FAVORITES,
        exact: false,
        refetchType: 'active',
      });
      setAddDialogOpen(false);
      setNewFavId('');
      setNewFavName('');
    },
    onError: (error: unknown) => {
      apiLogger.error(i18n.t('pages.favorites_page.k1'), error);
      addNotification({ type: 'error', title: i18n.t('pages.favorites_page.k9'), message: i18n.t('pages.favorites_page.k8') });
    },
  });

  // 检查是否已收藏
  const checkFavorite = async (entityType: string, entityId: string) => {
    try {
      const response = await favoriteApi.check(entityType, entityId);
      if (response.success && response.data) {
        addNotification({
          type: 'info',
          title: i18n.t('pages.favorites_page.k10'),
          message: response.data ? i18n.t('pages.favorites_page.k12') : i18n.t('pages.favorites_page.k11'),
        });
      }
    } catch (error) {
      apiLogger.error(i18n.t('pages.favorites_page.k2'), error);
    }
  };

  // 获取搜索建议
  const fetchSuggestions = async (query: string) => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    try {
      const response = await searchApi.getSuggestions(query);
      if (response.success && response.data) {
        setSuggestions(response.data);
      }
    } catch (error) {
      apiLogger.error(i18n.t('pages.favorites_page.k3'), error);
    }
  };

  const getEntityIcon = (entityType: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      customer: <Users size={18} />,
      product: <Package size={18} />,
      document: <FileText size={18} />,
      order: <FileText size={18} />,
    };
    return iconMap[entityType] || <Star size={18} />;
  };

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    fetchSuggestions(value);
  };

  const handleResultClick = (result: SearchResult) => {
    navigate(result.url);
  };

  const favorites = favoritesData ?? [];
  const recentSearches = recentSearchesData ?? [];
  const results = searchResults ?? [];

  return (
    <PageContainer
      autoTitle
      autoBreadcrumbs
      headerProps={{
        pageIcon: <Star style={{ width: 20, height: 20 }} />,
      }}
    >
      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        sx={{ mb: 3 }}
      >
        <Tab
          icon={<Star size={16} />}
          label={`${i18n.t('pages.favorites_page.k4')}${favorites.length})`}
        />
        <Tab
          icon={<Clock size={16} />}
          label={`${i18n.t('pages.favorites_page.k5')}${recentSearches.length})`}
        />
        <Tab
          icon={<Search size={16} />}
          label={i18n.t('pages.favorites_page.k13')}
        />
      </Tabs>

      {/* Tab 1: 收藏列表 */}
      {activeTab === 0 && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
              <Button
                variant='outlined'
                size='small'
                startIcon={<Plus size={16} />}
                onClick={() => setAddDialogOpen(true)}
              >
                {i18n.t('pages.favorites_page.k6')}
              </Button>
            </Box>
            {favoritesLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : favorites.length === 0 ? (
              <Alert severity='info'>{i18n.t('pages.favorites_page.k14')}</Alert>
            ) : (
              <List>
                {favorites.map((fav: Favorite) => (
                  <ListItem
                    key={fav.id}
                    divider
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
                      {getEntityIcon(fav.entity_type)}
                    </Box>
                    <ListItemText
                      primary={fav.entity_name}
                      secondary={
                        <Box
                          component='span'
                          sx={{ display: 'flex', gap: 1, mt: 0.5 }}
                        >
                          <Chip
                            size='small'
                            label={fav.entity_type}
                            variant='outlined'
                          />
                          <Typography
                            variant='caption'
                            color='text.secondary'
                          >
                            {new Date(fav.created_at).toLocaleString('zh-CN')}
                          </Typography>
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        edge='end'
                        color='primary'
                        onClick={() => checkFavorite(fav.entity_type, fav.entity_id)}
                        aria-label={i18n.t('pages.favorites_page.k15')}
                        title={i18n.t('pages.favorites_page.k16')}
                      >
                        <Star size={18} />
                      </IconButton>
                      <IconButton
                        edge='end'
                        color='error'
                        onClick={() => removeMutation.mutate(fav.id)}
                        aria-label={i18n.t('pages.favorites_page.k17')}
                      >
                        <Trash2 size={18} />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab 2: 搜索历史 */}
      {activeTab === 1 && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant='h6'>{i18n.t('pages.favorites_page.k18')}</Typography>
              {recentSearches.length > 0 && (
                <Button
                  size='small'
                  color='error'
                  startIcon={<Trash2 size={16} />}
                  onClick={() => clearHistoryMutation.mutate()}
                >
                  {i18n.t('pages.favorites_page.k7')}
                </Button>
              )}
            </Box>
            {searchesLoading ? (
              <CircularProgress />
            ) : recentSearches.length === 0 ? (
              <Alert severity='info'>{i18n.t('pages.favorites_page.k19')}</Alert>
            ) : (
              <List>
                {recentSearches.map((term: string, idx: number) => (
                  <ListItem
                    key={idx}
                    divider
                    onClick={() => {
                      setSearchQuery(term);
                      setActiveTab(2);
                    }}
                    sx={{ cursor: 'pointer' }}
                  >
                    <Clock size={16} />
                    <ListItemText
                      primary={term}
                      sx={{ ml: 2 }}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab 3: 全局搜索 */}
      {activeTab === 2 && (
        <Card>
          <CardContent>
            <TextField
              fullWidth
              size='small'
              placeholder={i18n.t('pages.favorites_page.k8')}
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              sx={{ mb: 2 }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position='start'>
                      <Search size={18} />
                    </InputAdornment>
                  ),
                  endAdornment: searching ? (
                    <InputAdornment position='end'>
                      <CircularProgress size={16} />
                    </InputAdornment>
                  ) : null,
                },
              }}
            />
            <Divider sx={{ mb: 2 }} />
            {suggestions.length > 0 && searchQuery.trim().length >= 2 && (
              <Box sx={{ mb: 2 }}>
                <Typography
                  variant='caption'
                  color='text.secondary'
                  sx={{ mb: 0.5, display: 'block' }}
                >
                  {i18n.t('pages.favorites_page.k9')}
                </Typography>
                <Stack
                  direction='row'
                  spacing={1}
                  sx={{ flexWrap: 'wrap', gap: 1 }}
                >
                  {suggestions.map((s) => (
                    <Chip
                      key={s}
                      size='small'
                      label={s}
                      variant='outlined'
                      onClick={() => handleSearch(s)}
                      sx={{ cursor: 'pointer' }}
                    />
                  ))}
                </Stack>
              </Box>
            )}
            {searchQuery.trim() && results.length === 0 && !searching && (
              <Alert severity='info'>{i18n.t('pages.favorites_page.k20')}</Alert>
            )}
            {results.length > 0 && (
              <List>
                {results.map((result: SearchResult) => (
                  <ListItem
                    key={result.id}
                    divider
                    onClick={() => handleResultClick(result)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <ListItemText
                      primary={
                        <Box
                          component='span'
                          sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                        >
                          <Chip
                            size='small'
                            label={result.type}
                          />
                          {result.title}
                        </Box>
                      }
                      secondary={
                        <Box component='span'>
                          {result.description && (
                            <Typography
                              variant='body2'
                              color='text.secondary'
                            >
                              {result.description}
                            </Typography>
                          )}
                          {result.highlights && (
                            <Typography
                              variant='caption'
                              color='primary'
                              sx={{ display: 'block', mt: 0.5 }}
                              dangerouslySetInnerHTML={{ __html: sanitizeHtml(result.highlights) }}
                            />
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </CardContent>
        </Card>
      )}

      {/* 添加收藏对话框 */}
      <Dialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>{i18n.t('pages.favorites_page.k21')}</DialogTitle>
        <DialogContent>
          <Stack
            spacing={2}
            sx={{ mt: 1 }}
          >
            <FormControl
              size='small'
              fullWidth
            >
              <InputLabel>{i18n.t('pages.favorites_page.k22')}</InputLabel>
              <Select
                value={newFavType}
                label={i18n.t('pages.favorites_page.k23')}
                onChange={(e) => setNewFavType(e.target.value)}
              >
                {ENTITY_TYPES.map((t) => (
                  <MenuItem
                    key={t}
                    value={t}
                  >
                    {t}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              size='small'
              label={i18n.t('pages.favorites_page.id_24')}
              value={newFavId}
              onChange={(e) => setNewFavId(e.target.value)}
              fullWidth
            />
            <TextField
              size='small'
              label={i18n.t('pages.favorites_page.k25')}
              value={newFavName}
              onChange={(e) => setNewFavName(e.target.value)}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>{i18n.t('pages.favorites_page.k26')}</Button>
          <Button
            variant='contained'
            onClick={() => addFavoriteMutation.mutate()}
            disabled={!newFavId.trim() || !newFavName.trim() || addFavoriteMutation.isPending}
          >
            {i18n.t('pages.favorites_page.k10')}
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default FavoritesPage;
