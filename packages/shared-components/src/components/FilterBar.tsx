import { designTokens } from '@topems/tokens';
import React, { useCallback } from 'react';
import i18next from 'i18next';
import {
  Box,
  Paper,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Tooltip,
  Typography,
  Chip,
  Collapse,
  useTheme,
  useMediaQuery,
  Button,
} from '@mui/material';
import { Filter, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';

// ============ 类型定义 ============

export type FilterValue = string | number | string[] | Date | { start: string; end: string } | undefined;

export interface FilterOption {
  label: string;
  value: string | number;
}

export interface FilterConfig {
  id: string;
  label: string;
  type?: 'select' | 'multiselect' | 'date' | 'dateRange' | 'text' | 'number' | 'search';
  placeholder?: string;
  options?: FilterOption[];
  value?: any;
  defaultValue?: any;
  onChange?: (value: any, filter: FilterConfig) => void;
  width?: number | string;
  /** 是否显示搜索框（用于multiselect） */
  searchable?: boolean;
}

export interface FilterBarProps {
  filters: FilterConfig[];
  onFilterChange?: (filters: Record<string, any>) => void;
  onReset?: () => void;
  onSearch?: () => void;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  dense?: boolean;
  variant?: 'standard' | 'outlined' | 'filled';
  sx?: import('@mui/material/styles').SxProps<import('@mui/material/styles').Theme>;
  disabled?: boolean;
}

// ============ 单个筛选控件 ============

const FilterControl: React.FC<{
  filter: FilterConfig;
  onChange: (value: any, filter: FilterConfig) => void;
  dense?: boolean;
  variant?: 'standard' | 'outlined' | 'filled';
  disabled?: boolean;
}> = ({ filter, onChange, variant, disabled }) => {
  const handleChange = useCallback(
    (e: { target?: { value?: unknown } } | unknown) => {
      const value =
        'target' in (e as object)
          ? ((e as { target?: { value?: unknown } }).target?.value ?? e)
          : e;
      onChange(value, filter);
    },
    [filter, onChange]
  );

  const textFieldProps = {
    size: 'small' as const,
    variant: variant as 'outlined' | 'standard' | 'filled',
    fullWidth: true,
    disabled,
  };

  const formControlProps = {
    variant: variant as any,
    fullWidth: true,
    disabled,
  };

  const filterType = filter.type || 'text';

  switch (filterType) {
    case 'select':
      return (
        <FormControl
          {...formControlProps}
          sx={{ minWidth: filter.width || 150 }}
        >
          <InputLabel>{filter.label}</InputLabel>
          <Select
            size='small'
            value={filter.value ?? filter.defaultValue ?? ''}
            label={filter.label}
            onChange={handleChange}
          >
            <MenuItem value=''>
              {i18next.t('components.filter_bar.all', { defaultValue: 'All' })}
            </MenuItem>
            {filter.options?.map((option) => (
              <MenuItem
                key={option.value}
                value={option.value}
              >
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      );

    case 'multiselect':
      return (
        <FormControl
          {...formControlProps}
          sx={{ minWidth: filter.width || 200 }}
        >
          <InputLabel>{filter.label}</InputLabel>
          <Select
            size='small'
            multiple
            value={filter.value ?? filter.defaultValue ?? []}
            label={filter.label}
            onChange={handleChange}
            renderValue={(selected) =>
              (selected as any[])
                .map((v) => filter.options?.find((o) => o.value === v)?.label)
                .filter(Boolean)
                .join(', ') || i18next.t('components.filter_bar.all', { defaultValue: 'All' })
            }
          >
            {filter.options?.map((option) => (
              <MenuItem
                key={option.value}
                value={option.value}
              >
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      );

    case 'date':
      return (
        <TextField
          {...textFieldProps}
          type='date'
          label={filter.label}
          value={filter.value ?? filter.defaultValue ?? ''}
          onChange={handleChange}
          sx={{ width: filter.width || 180 }}
        />
      );

    case 'dateRange':
      return (
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <TextField
            {...textFieldProps}
            type='date'
            label={i18next.t('components.filter_bar.start_date', { defaultValue: 'Start date' })}
            value={filter.value?.start ?? ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange({ ...filter.value, start: e.target.value })}
            sx={{ width: filter.width || 140 }}
          />
          <Typography color='text.secondary'>
            {i18next.t('components.filter_bar.separator', { defaultValue: 'to' })}
          </Typography>
          <TextField
            {...textFieldProps}
            type='date'
            label={i18next.t('components.filter_bar.end_date', { defaultValue: 'End date' })}
            value={filter.value?.end ?? ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange({ ...filter.value, end: e.target.value })}
            sx={{ width: filter.width || 140 }}
          />
        </Box>
      );

    case 'number':
      return (
        <TextField
          {...textFieldProps}
          type='number'
          label={filter.label}
          placeholder={filter.placeholder}
          value={filter.value ?? filter.defaultValue ?? ''}
          onChange={handleChange}
          sx={{ width: filter.width || 120 }}
        />
      );

    default:
      return (
        <TextField
          {...textFieldProps}
          label={filter.label}
          placeholder={filter.placeholder}
          value={filter.value ?? filter.defaultValue ?? ''}
          onChange={handleChange}
          sx={{ width: filter.width || 200 }}
        />
      );
  }
};

// ============ FilterBar 组件 ============

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onFilterChange,
  onReset,
  onSearch,
  collapsible = true,
  defaultExpanded = true,
  dense = false,
  variant = 'outlined',
  sx,
  disabled = false,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [expanded, setExpanded] = React.useState(defaultExpanded);
  const [localFilters, setLocalFilters] = React.useState<Record<string, any>>(() => {
    const initial: Record<string, any> = {};
    filters.forEach((f) => {
      initial[f.id] = f.value ?? f.defaultValue;
    });
    return initial;
  });

  // 同步外部 filters 变化
  React.useEffect(() => {
    const newFilters: Record<string, any> = {};
    filters.forEach((f) => {
      newFilters[f.id] = f.value ?? f.defaultValue;
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocalFilters(newFilters);
  }, [filters]);

  // 筛选变化
  const handleFilterChange = useCallback(
    (value: any, filter: FilterConfig) => {
      const newFilters = { ...localFilters, [filter.id]: value };
      setLocalFilters(newFilters);
      filter.onChange?.(value, filter);
      onFilterChange?.(newFilters);
    },
    [localFilters, onFilterChange]
  );

  // 重置
  const handleReset = useCallback(() => {
    const resetFilters: Record<string, any> = {};
    filters.forEach((f) => {
      resetFilters[f.id] = f.defaultValue;
    });
    setLocalFilters(resetFilters);
    onReset?.();
  }, [filters, onReset]);

  // 是否有筛选条件
  const hasActiveFilters = Object.values(localFilters).some(
    (v) => v !== undefined && v !== '' && v !== null && !(Array.isArray(v) && v.length === 0)
  );

  // 已选中的筛选器数量
  const activeCount = Object.entries(localFilters).filter(
    ([, v]) => v !== undefined && v !== '' && v !== null && !(Array.isArray(v) && v.length === 0)
  ).length;

  return (
    <Paper
      sx={{
        p: dense ? 1.5 : 2,
        borderRadius: 2,
        mb: 2,
        ...sx,
      }}
    >
      {/* 头部 */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          mb: expanded ? (dense ? 1.5 : 2) : 0,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Filter
            style={{ width: 18, height: 18 }}
            aria-hidden='true'
          />
          <Typography
            variant='subtitle2'
            sx={{ fontWeight: 600 }}
          >
            {i18next.t('components.filter_bar.title', { defaultValue: 'Filters' })}
          </Typography>
          {activeCount > 0 && (
            <Chip
              label={activeCount}
              size='small'
              color='primary'
              sx={{ height: 20, fontSize: designTokens.typography.fontSize.scale['0.75rem'] }}
              aria-live='polite'
            />
          )}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {onSearch && (
            <Button
              size='small'
              variant='contained'
              onClick={onSearch}
              disabled={disabled || !hasActiveFilters}
            >
              {i18next.t('components.filter_bar.search', { defaultValue: 'Search' })}
            </Button>
          )}
          {onReset && (
            <Tooltip title={i18next.t('components.filter_bar.reset', { defaultValue: 'Reset filters' })}>
              <IconButton
                size='small'
                onClick={handleReset}
                disabled={disabled}
                aria-label={i18next.t('components.filter_bar.reset', { defaultValue: 'Reset filters' })}
              >
                <RotateCcw style={{ width: 16, height: 16 }} />
              </IconButton>
            </Tooltip>
          )}
          {collapsible && (
            <IconButton
              size='small'
              onClick={() => setExpanded(!expanded)}
              disabled={disabled}
              aria-label={
                expanded
                  ? i18next.t('components.filter_bar.collapse', { defaultValue: 'Collapse filters' })
                  : i18next.t('components.filter_bar.expand', { defaultValue: 'Expand filters' })
              }
              aria-expanded={expanded}
            >
              {expanded ? (
                <ChevronUp style={{ width: 18, height: 18 }} />
              ) : (
                <ChevronDown style={{ width: 18, height: 18 }} />
              )}
            </IconButton>
          )}
        </Box>
      </Box>

      {/* 筛选控件 */}
      <Collapse in={expanded}>
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 2,
            alignItems: 'flex-start',
          }}
        >
          {filters.map((filter) => (
            <FilterControl
              key={filter.id}
              filter={{ ...filter, value: localFilters[filter.id] }}
              onChange={handleFilterChange}
              dense={dense}
              variant={variant}
              disabled={disabled}
            />
          ))}
        </Box>
      </Collapse>

      {/* 移动端折叠时显示已选条件 */}
      {!expanded && hasActiveFilters && isMobile && (
        <Box sx={{ mt: 1 }}>
          <Typography
            variant='caption'
            color='text.secondary'
          >
            {i18next.t('components.filter_bar.applied_filters', {
              count: activeCount,
              defaultValue: '{{count}} filters applied',
            })}
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default FilterBar;
