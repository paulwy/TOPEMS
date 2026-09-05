import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Chip,
  Button,
  TextField,
  InputAdornment,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
} from '@mui/material';
import i18n from '@/i18n';
import { Star, Trash2, Search, Clock, FileText, Users, Package, Plus } from 'lucide-react';
import { PageContainer } from '@/components/common';
import { ListPageTemplate } from '@/components/templates';
import type { ColumnDef, RowAction } from '@/components/templates/list/types';
import { favoriteApi, searchApi, type Favorite, type SearchResult } from '@/api/shared';
import { useNotificationStore } from '@/store';
import { QUERY_KEYS, CACHE_DURATIONS } from '@/lib/reactQuery';
import { apiLogger } from '@/utils/logger';
import { sanitizeHtml } from '@/lib/security';
import { useNavigate } from 'react-router-dom';

const ENTITY_TYPES = ['customer', 'product', 'document', 'order', 'project', 'task'] as const;

type RecentSearch = {
  id: string;
  query: string;
  searched_at?: string;
};

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
      addNotification({
        type: 'success',
        title: i18n.t('pages.favorites_page.k1'),
        message: i18n.t('pages.favorites_page.k0'),
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.SEARCH.FAVORITES,
        exact: false,
        refetchType: 'active',
      });
    },
    onError: (error: unknown) => {
      apiLogger.error(i18n.t('pages.favorites_page.k0'), error);
      addNotification({
        type: 'error',
        title: i18n.t('pages.favorites_page.k3'),
        message: i18n.t('pages.favorites_page.k2'),
      });
    },
  });

  // 清除搜索历史
  const clearHistoryMutation = useMutation({
    mutationFn: () => searchApi.clearRecentSearches(),
    onSuccess: () => {
      addNotification({
        type: 'success',
        title: i18n.t('pages.favorites_page.k5'),
        message: i18n.t('pages.favorites_page.k4'),
      });
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
      addNotification({
        type: 'success',
        title: i18n.t('pages.favorites_page.k7'),
        message: i18n.t('pages.favorites_page.k6'),
      });
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
      addNotification({
        type: 'error',
        title: i18n.t('pages.favorites_page.k9'),
        message: i18n.t('pages.favorites_page.k8'),
      });
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
          message: response.data
            ? i18n.t('pages.favorites_page.k12')
            : i18n.t('pages.favorites_page.k11'),
        });
      }
    } catch (error) {
      apiLogger.error(i18n.t('pages.favorites_page.k2'), error);
    }
  };

  // 获取搜索建议
  const fetchSuggestions = useCallback(async (query: string) => {
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
  }, []);

  const getEntityIcon = useCallback((entityType: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      customer: <Users size={18} />,
      product: <Package size={18} />,
      document: <FileText size={18} />,
      order: <FileText size={18} />,
    };
    return iconMap[entityType] || <Star size={18} />;
  }, []);

  const handleSearch = useCallback(
    (value: string) => {
      setSearchQuery(value);
      fetchSuggestions(value);
    },
    [fetchSuggestions]
  );

  const handleResultClick = useCallback(
    (result: SearchResult) => {
      navigate(result.url);
    },
    [navigate]
  );

  const handleRecentSearchClick = useCallback((row: RecentSearch) => {
    setSearchQuery(row.query);
    setActiveTab(2);
  }, []);

  const favorites = favoritesData ?? [];
  const recentSearches = useMemo(() => recentSearchesData ?? [], [recentSearchesData]);
  const results = searchResults ?? [];

  const recentSearchRows: RecentSearch[] = useMemo(
    () => recentSearches.map((query, index) => ({ id: `${index}-${query}`, query })),
    [recentSearches]
  );

  const favoriteColumns: ColumnDef<Favorite>[] = useMemo(
    () => [
      {
        id: 'name',
        label: i18n.t('pages.favorites_page.k25'),
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {getEntityIcon(row.entity_type)}
            <Typography>{row.entity_name}</Typography>
          </Box>
        ),
      },
      {
        id: 'entity_type',
        label: i18n.t('pages.favorites_page.k22'),
        render: (row) => (
          <Chip
            size='small'
            label={row.entity_type}
            variant='outlined'
          />
        ),
      },
      {
        id: 'created_at',
        label: i18n.t('shared.favorites_page.columns.created_at'),
        render: (row) => (
          <Typography
            variant='body2'
            color='text.secondary'
          >
            {new Date(row.created_at).toLocaleString('zh-CN')}
          </Typography>
        ),
      },
    ],
    [getEntityIcon]
  );

  const favoriteRowActions: RowAction<Favorite>[] = useMemo(
    () => [
      {
        key: 'check',
        label: i18n.t('pages.favorites_page.k10'),
        icon: <Star size={16} />,
        onClick: (row) => checkFavorite(row.entity_type, row.entity_id),
        color: 'primary',
      },
      {
        key: 'remove',
        label: i18n.t('pages.favorites_page.k17'),
        icon: <Trash2 size={16} />,
        onClick: (row) => removeMutation.mutate(row.id),
        color: 'error',
      },
    ],
    [removeMutation]
  );

  const favoriteActions = useMemo(
    () => [
      {
        label: i18n.t('pages.favorites_page.k6'),
        icon: <Plus size={16} />,
        onClick: () => setAddDialogOpen(true),
        variant: 'outlined' as const,
      },
    ],
    []
  );

  const recentSearchColumns: ColumnDef<RecentSearch>[] = useMemo(
    () => [
      {
        id: 'query',
        label: i18n.t('shared.favorites_page.columns.search_query'),
        render: (row: RecentSearch) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Clock size={16} />
            <Typography>{row.query}</Typography>
          </Box>
        ),
      },
      {
        id: 'searched_at',
        label: i18n.t('shared.favorites_page.columns.searched_at'),
        render: () => (
          <Typography
            variant='body2'
            color='text.secondary'
          >
            -
          </Typography>
        ),
      },
    ],
    []
  );

  const recentSearchActions = useMemo(
    () => [
      {
        label: i18n.t('pages.favorites_page.k7'),
        icon: <Trash2 size={16} />,
        onClick: () => clearHistoryMutation.mutate(),
        variant: 'outlined' as const,
        disabled: recentSearches.length === 0 || clearHistoryMutation.isPending,
      },
    ],
    [clearHistoryMutation, recentSearches.length]
  );

  const searchResultColumns: ColumnDef<SearchResult>[] = useMemo(
    () => [
      {
        id: 'title',
        label: i18n.t('shared.favorites_page.columns.title'),
        render: (row) => <Typography sx={{ fontWeight: 'medium' }}>{row.title}</Typography>,
      },
      {
        id: 'type',
        label: i18n.t('shared.favorites_page.columns.type'),
        render: (row) => (
          <Chip
            size='small'
            label={row.type}
          />
        ),
      },
      {
        id: 'source',
        label: i18n.t('shared.favorites_page.columns.source'),
        render: (row) => (
          <Box>
            {row.description && (
              <Typography
                variant='body2'
                color='text.secondary'
              >
                {row.description}
              </Typography>
            )}
            {row.highlights && (
              <Typography
                variant='caption'
                color='primary'
                sx={{ display: 'block', mt: 0.5 }}
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(row.highlights) }}
              />
            )}
          </Box>
        ),
      },
    ],
    []
  );

  const searchResultsHeaderContent = useMemo(
    () => (
      <Box>
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
      </Box>
    ),
    [searchQuery, searching, suggestions, handleSearch]
  );

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

      {activeTab === 0 && (
        <ListPageTemplate<Favorite>
          breadcrumbs={[]}
          columns={favoriteColumns}
          data={favorites}
          loading={favoritesLoading}
          actions={favoriteActions}
          rowActions={favoriteRowActions}
          emptyMessage={i18n.t('pages.favorites_page.k14')}
        />
      )}

      {activeTab === 1 && (
        <ListPageTemplate<RecentSearch>
          breadcrumbs={[]}
          columns={recentSearchColumns}
          data={recentSearchRows}
          loading={searchesLoading}
          actions={recentSearchActions}
          onRowClick={handleRecentSearchClick}
          getRowId={(row) => row.id}
          emptyMessage={i18n.t('pages.favorites_page.k19')}
        />
      )}

      {activeTab === 2 && (
        <ListPageTemplate<SearchResult>
          breadcrumbs={[]}
          columns={searchResultColumns}
          data={results}
          loading={searching}
          onRowClick={handleResultClick}
          headerContent={searchResultsHeaderContent}
          emptyMessage={i18n.t('pages.favorites_page.k20')}
        />
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
          <Button onClick={() => setAddDialogOpen(false)}>
            {i18n.t('pages.favorites_page.k26')}
          </Button>
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
