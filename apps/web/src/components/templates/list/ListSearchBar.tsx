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
import { Search, RefreshCw } from 'lucide-react';
import type { FilterConfig, FilterValue } from '@topems/shared-components';

interface ListSearchBarProps {
  searchable?: boolean;
  searchPlaceholder?: string;
  searchInput: string;
  onSearchChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  globalSearch?: { fields: string[]; placeholder?: string };
  filters?: FilterConfig[];
  filtersValue?: Record<string, any>;
  onFilterChange?: (filters: Record<string, any>) => void;
  onRefresh?: () => void;
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
              {filter.searchable && (
                <TextField
                  size='small'
                  placeholder='搜索...'
                  sx={{ px: 1, my: 1, minWidth: 150 }}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position='start'>
                          <Search style={{ width: 16, height: 16 }} />
                        </InputAdornment>
                      ),
                    },
                  }}
                />
              )}
              {filter.options?.map((option) => (
                <MenuItem
                  key={option.value}
                  value={option.value}
                >
                  <Checkbox checked={selectedArr.includes(String(option.value))} />
                  <ListItemText primary={option.label} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );
      }

      case 'text':
        return (
          <TextField
            key={filter.id}
            {...commonProps}
            placeholder='搜索...'
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

      default:
        return (
          <TextField
            key={filter.id}
            {...commonProps}
            select
          >
            <MenuItem value=''>全部</MenuItem>
            {filter.options?.map((option) => (
              <MenuItem
                key={option.value}
                value={option.value}
              >
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        );
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

      {onRefresh && (
        <Tooltip title='刷新'>
          <IconButton
            size='small'
            onClick={onRefresh}
          >
            <RefreshCw style={{ width: 18, height: 18 }} />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
};
