import React, { useState } from 'react';
import {
  Box,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Chip,
  IconButton,
  Button,
  Typography,
  Paper,
} from '@mui/material';
import { Filter, RefreshCw, ChevronDown } from 'lucide-react';
import type { FilterConfig } from '@/api/bi';

interface FilterBarProps {
  filters: FilterConfig[];
  values: Record<string, unknown>;
  onChange: (values: Record<string, unknown>) => void;
  onReset?: () => void;
  onApply?: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  values,
  onChange,
  onReset,
  onApply,
}) => {
  const [expanded, setExpanded] = useState(true);

  const handleFilterChange = (id: string, value: unknown) => {
    onChange({ ...values, [id]: value });
  };

  const handleReset = () => {
    const resetValues: Record<string, unknown> = {};
    filters.forEach((f) => {
      resetValues[f.id] = f.default_value ?? '';
    });
    onChange(resetValues);
    onReset?.();
  };

  const renderFilter = (filter: FilterConfig) => {
    const value = values[filter.id] ?? '';

    switch (filter.type) {
      case 'select':
        return (
          <FormControl
            key={filter.id}
            size='small'
            sx={{ minWidth: 180 }}
          >
            <InputLabel>{filter.label}</InputLabel>
            <Select
              value={value as string}
              label={filter.label}
              onChange={(e) => handleFilterChange(filter.id, e.target.value)}
            >
              <MenuItem value=''>
                <em>全部</em>
              </MenuItem>
              {filter.options?.map((opt) => (
                <MenuItem key={String(opt.value)} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );

      case 'date':
      case 'date_range':
      case 'number':
      case 'input':
      default:
        return (
          <TextField
            key={filter.id}
            label={filter.label}
            size='small'
            value={value as string}
            onChange={(e) => handleFilterChange(filter.id, e.target.value)}
            placeholder={filter.placeholder}
            type={filter.type === 'number' ? 'number' : 'text'}
            sx={{ minWidth: 180 }}
          />
        );
    }
  };

  const activeFilters = filters.filter(
    (f) => values[f.id] !== undefined && values[f.id] !== '' && values[f.id] !== null
  );

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        mb: 3,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: expanded ? 2 : 0,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Filter size={18} color='text.secondary' />
          <Typography variant='subtitle2' sx={{ fontWeight: 600 }}>
            筛选条件
          </Typography>
          {activeFilters.length > 0 && (
            <Chip
              label={`${activeFilters.length} 个已选`}
              size='small'
              color='primary'
              variant='outlined'
            />
          )}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button
            size='small'
            startIcon={<RefreshCw size={16} />}
            onClick={handleReset}
          >
            重置
          </Button>
          {onApply && (
            <Button size='small' variant='contained' onClick={onApply}>
              应用筛选
            </Button>
          )}
          <IconButton
            size='small'
            onClick={() => setExpanded(!expanded)}
          >
            <ChevronDown
              size={18}
              style={{
                transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.3s',
              }}
            />
          </IconButton>
        </Box>
      </Box>

      {expanded && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'row',
            gap: 2,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          {filters.map(renderFilter)}
        </Box>
      )}
    </Paper>
  );
};

export default FilterBar;
