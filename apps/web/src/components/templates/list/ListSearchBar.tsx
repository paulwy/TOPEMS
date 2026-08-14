import React from 'react';
import {
  Box,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  OutlinedInput,
  Checkbox,
  Chip,
  MenuItem,
  ListItemText,
  Tooltip,
  IconButton,
} from '@mui/material';
import i18n from '@/i18n';
import { Search, RefreshCw } from 'lucide-react';
import type { FilterConfig, FilterValue } from '@topems/shared-components';
import { designTokens, semanticTokens } from '@topems/tokens';

interface ListSearchBarProps {
  searchable?: boolean;
  searchPlaceholder?: string;
  searchInput: string;
  onSearchChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  globalSearch?: { fields: string[]; placeholder?: string };
  filters?: FilterConfig[];
  filtersValue?: Record<string, unknown>;
  onFilterChange?: (filters: Record<string, unknown>) => void;
  onRefresh?: () => void;
  quickFilters?: Array<{
    key?: string;
    label: string;
    filters: Record<string, unknown>;
    searchValue?: string;
  }>;
  onQuickFilter?: (quickFilter: {
    key?: string;
    filters: Record<string, unknown>;
    searchValue?: string;
  }) => void;
  /** 当前激活的 quickFilter key（用于高亮显示） */
  activeQuickFilterKey?: string | null;
}

export const ListSearchBar: React.FC<ListSearchBarProps> = ({
  searchable,
  searchPlaceholder,
  searchInput,
  onSearchChange,
  globalSearch,
  filters,
  onFilterChange,
  onRefresh,
  quickFilters,
  onQuickFilter,
  activeQuickFilterKey,
}) => {
  const renderFilter = (filter: FilterConfig) => {
    const filterValue = filter.value || (filter.type === 'multiselect' ? [] : '');
    const commonProps = {
      size: 'small' as const,
      label: filter.label,
      value: filterValue,
      onChange: (e: { target: { value: unknown } }) => {
        const val = e.target.value as FilterValue;
        filter.onChange?.(val, filter);
        onFilterChange?.({ [filter.id]: val });
      },
      sx: { minWidth: 150 },
    };

    switch (filter.type) {
      case 'multiselect': {
        const selectedArr = Array.isArray(filterValue) ? filterValue : [];
        const menuItems =
          filter.options?.map((option) => (
            <MenuItem
              key={option.value}
              value={option.value}
            >
              <Checkbox checked={selectedArr.includes(String(option.value))} />
              <ListItemText primary={option.label} />
            </MenuItem>
          )) || [];

        return (
          <FormControl
            key={filter.id}
            size='small'
            sx={{ minWidth: 180 }}
          >
            <InputLabel>{filter.label}</InputLabel>
            <Select
              {...commonProps}
              multiple
              value={selectedArr}
              input={<OutlinedInput label={filter.label} />}
              renderValue={(selected) => {
                const arr = Array.isArray(selected) ? selected : [];
                return (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {arr.map((value: unknown) => {
                      const option = filter.options?.find((opt) => opt.value === value);
                      return (
                        <Chip
                          key={String(value)}
                          label={option?.label || String(value)}
                          size='small'
                        />
                      );
                    })}
                  </Box>
                );
              }}
            >
              {menuItems}
            </Select>
          </FormControl>
        );
      }

      case 'text':
        return (
          <TextField
            key={filter.id}
            {...commonProps}
            placeholder={i18n.t('components.list_search_bar.k0')}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position='start'>
                    <Search style={{ width: 18, height: 18 }} />
                  </InputAdornment>
                ),
              },
            }}
          />
        );

      case 'date':
        return (
          <TextField
            key={filter.id}
            {...commonProps}
            type='date'
            slotProps={{
              inputLabel: { shrink: true },
            }}
          />
        );

      default: {
        const menuItems = [
          <MenuItem
            key=''
            value=''
          >
            {i18n.t('components.list_search_bar.k1')}
          </MenuItem>,
          ...(filter.options?.map((option) => (
            <MenuItem
              key={option.value}
              value={option.value}
            >
              {option.label}
            </MenuItem>
          )) || []),
        ];

        return (
          <TextField
            key={filter.id}
            {...commonProps}
            select
          >
            {menuItems}
          </TextField>
        );
      }
    }
  };

  if (!searchable && !globalSearch && !filters) return null;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        mb: 2,
        flexWrap: 'wrap',
      }}
    >
      {(searchable || globalSearch) && (
        <TextField
          size='small'
          placeholder={globalSearch?.placeholder || searchPlaceholder}
          value={searchInput}
          onChange={onSearchChange}
          sx={{ minWidth: 250 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position='start'>
                  <Search style={{ width: 18, height: 18 }} />
                </InputAdornment>
              ),
            },
          }}
        />
      )}

      {filters?.map((filter) => renderFilter(filter))}

      {quickFilters?.map((quickFilter, index) => {
        const key = quickFilter.key ?? String(index);
        const isActive = activeQuickFilterKey === key;
        return (
          <button
            key={key}
            onClick={() =>
              onQuickFilter?.({
                key,
                filters: quickFilter.filters,
                searchValue: quickFilter.searchValue,
              })
            }
            style={{
              padding: '6px 12px',
              borderRadius: 'xs',
              border: isActive ? `1px solid ${designTokens.colors.primary.dark}` : `1px solid ${designTokens.colors.grey['300']}`,
              backgroundColor: isActive ? 'colors.primary.50' : '#f5f5f5',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: isActive ? 600 : 500,
              color: isActive ? designTokens.colors.primary.dark : '#333',
              transition: 'all 0.2s',
            }}
          >
            {quickFilter.label}
          </button>
        );
      })}

      {onRefresh && (
        <Tooltip title={i18n.t('components.list_search_bar.k0')}>
          <IconButton
            size='small'
            onClick={onRefresh}
            aria-label={i18n.t('components.list_search_bar.k1')}
          >
            <RefreshCw style={{ width: 18, height: 18 }} />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
};
