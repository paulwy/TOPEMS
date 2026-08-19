import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Search,
  Grid3X3,
  List,
  RefreshCw,
  TrendingUp,
  Star,
  Clock,
  ShoppingCart,
} from 'lucide-react';
import { Box, Button, TextField, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { SUITES } from '@/api/plugin';
import type { SortOption, ViewMode } from '../hooks/usePluginMarketplace';

export interface PluginMarketplaceFiltersProps {
  searchQuery: string;
  selectedSuite: string;
  sortBy: SortOption;
  viewMode: ViewMode;
  onSearchChange: (query: string) => void;
  onSuiteChange: (suite: string) => void;
  onSortChange: (sort: SortOption) => void;
  onViewModeToggle: () => void;
  onRefresh: () => void;
}

export const PluginMarketplaceFilters: React.FC<PluginMarketplaceFiltersProps> = ({
  searchQuery,
  selectedSuite,
  sortBy,
  viewMode,
  onSearchChange,
  onSuiteChange,
  onSortChange,
  onViewModeToggle,
  onRefresh,
}) => {
  const { t } = useTranslation();
  const suites = useMemo(() => SUITES(), [t]);

  return (
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
          placeholder={t('plugin.marketplace_page.search_placeholder')}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          fullWidth
          sx={{ pl: 10 }}
        />
      </Box>

      <Box sx={{ display: 'flex', gap: 3 }}>
        <FormControl
          size='small'
          sx={{ minWidth: 160 }}
        >
          <InputLabel>{t('plugin.marketplace_page.filter.suite_label')}</InputLabel>
          <Select
            value={selectedSuite}
            label={t('plugin.marketplace_page.filter.suite_label')}
            onChange={(e) => onSuiteChange(e.target.value)}
          >
            <MenuItem value='all'>{t('plugin.marketplace_page.filter.all_suites')}</MenuItem>
            {suites.map((suite) => (
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
          <InputLabel>{t('plugin.marketplace_page.filter.sort_label')}</InputLabel>
          <Select
            value={sortBy}
            label={t('plugin.marketplace_page.filter.sort_label')}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
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
          onClick={onViewModeToggle}
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
          onClick={onRefresh}
          startIcon={<RefreshCw sx={{ width: 16, height: 16 }} />}
        >
          {t('plugin.action.refresh')}
        </Button>
      </Box>
    </Box>
  );
};

export default PluginMarketplaceFilters;
