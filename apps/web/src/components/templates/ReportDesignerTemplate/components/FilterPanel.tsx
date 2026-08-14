import React from 'react';
import {
  Box,
  Typography,
  IconButton,
  Divider,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
} from '@mui/material';
import i18n from '@/i18n';
import { Filter, ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import type { FilterCondition, DataSourceField, FilterOperator } from '../types';
import { FILTER_OPERATORS } from '../types';

interface FilterPanelProps {
  filters: FilterCondition[];
  availableFields: DataSourceField[];
  showFilterPanel: boolean;
  setShowFilterPanel: (show: boolean) => void;
  handleAddFilter: () => void;
  handleUpdateFilter: (filterId: string, updates: Partial<FilterCondition>) => void;
  handleRemoveFilter: (filterId: string) => void;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  availableFields,
  showFilterPanel,
  setShowFilterPanel,
  handleAddFilter,
  handleUpdateFilter,
  handleRemoveFilter,
}) => {
  return (
    <Box sx={{ mb: 3 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
        }}
        onClick={() => setShowFilterPanel(!showFilterPanel)}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Filter sx={{ width: 18, height: 18, color: 'secondary.main' }} />
          <Typography
            variant='subtitle1'
            sx={{ fontWeight: 600 }}
          >
            {i18n.t('components.filter_panel.k0')}
          </Typography>
          {filters.length > 0 && (
            <Chip
              size='small'
              label={filters.length}
              sx={{ ml: 1 }}
            />
          )}
        </Box>
        <IconButton
          size='small'
          aria-label={i18n.t('templates.filter_panel.k0')}
        >
          {showFilterPanel ? (
            <ChevronUp sx={{ width: 18, height: 18 }} />
          ) : (
            <ChevronDown sx={{ width: 18, height: 18 }} />
          )}
        </IconButton>
      </Box>
      <Divider sx={{ mb: 2 }} />
      {showFilterPanel && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {filters.map((filter) => (
            <Box
              key={filter.id}
              sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}
            >
              <FormControl sx={{ minWidth: 150 }}>
                <InputLabel size='small'>{i18n.t('templates.filter_panel.k1')}</InputLabel>
                <Select
                  size='small'
                  value={filter.fieldId}
                  label={i18n.t('templates.filter_panel.k2')}
                  onChange={(e) => {
                    const field = availableFields.find((f) => f.id === e.target.value);
                    handleUpdateFilter(filter.id, {
                      fieldId: e.target.value,
                      fieldName: field?.name || '',
                    });
                  }}
                >
                  {availableFields.map((f) => (
                    <MenuItem
                      key={f.id}
                      value={f.id}
                    >
                      {f.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl sx={{ minWidth: 120 }}>
                <InputLabel size='small'>{i18n.t('templates.filter_panel.k3')}</InputLabel>
                <Select
                  size='small'
                  value={filter.operator}
                  label={i18n.t('templates.filter_panel.k4')}
                  onChange={(e) =>
                    handleUpdateFilter(filter.id, { operator: e.target.value as FilterOperator })
                  }
                >
                  {FILTER_OPERATORS.map((op) => (
                    <MenuItem
                      key={op.value}
                      value={op.value}
                    >
                      {op.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                size='small'
                placeholder={i18n.t('templates.filter_panel.k5')}
                value={filter.value || ''}
                onChange={(e) => handleUpdateFilter(filter.id, { value: e.target.value })}
                sx={{ minWidth: 150 }}
              />
              {filter.operator === 'between' && (
                <TextField
                  size='small'
                  placeholder={i18n.t('templates.filter_panel.k6')}
                  value={filter.value2 || ''}
                  onChange={(e) => handleUpdateFilter(filter.id, { value2: e.target.value })}
                  sx={{ minWidth: 100 }}
                />
              )}
              <IconButton
                size='small'
                onClick={() => handleRemoveFilter(filter.id)}
                aria-label={i18n.t('templates.filter_panel.k7')}
              >
                <Trash2 sx={{ width: 16, height: 16, color: 'error.main' }} />
              </IconButton>
            </Box>
          ))}
          <Button
            size='small'
            startIcon={<Plus sx={{ width: 14, height: 14 }} />}
            onClick={handleAddFilter}
            disabled={availableFields.length === 0}
          >
            {i18n.t('components.filter_panel.k1')}
          </Button>
        </Box>
      )}
    </Box>
  );
};
