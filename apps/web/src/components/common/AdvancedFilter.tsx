import {
  TextField,
  Box,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Popover,
  Button,
} from '@mui/material';
import i18n from '@/i18n';
import { useState, type Key } from 'react';

import { Filter, X, Plus } from 'lucide-react';
import dayjs from 'dayjs';

export interface FilterCondition {
  field: string;
  operator: string;
  value: string | number | Date | null;
}

interface AdvancedFilterProps<T> {
  fields: {
    key: keyof T;
    label: string;
    type: 'text' | 'number' | 'date' | 'select';
  }[];
  selectOptions?: Record<string, { label: string; value: string }[]>;
  onFilterChange: (_conditions: FilterCondition[]) => void;
  initialConditions?: FilterCondition[];
}

const AdvancedFilterPanel = <T extends Record<string, unknown>>({
  fields,
  selectOptions,
  onFilterChange,
  initialConditions = [],
}: AdvancedFilterProps<T>) => {
  const [conditions, setConditions] = useState<FilterCondition[]>(initialConditions);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const operators: Record<string, { label: string; value: string }[]> = {
    text: [
      { label: i18n.t('shared.advanced_filter.k0'), value: 'contains' },
      { label: i18n.t('shared.advanced_filter.k1'), value: 'not_contains' },
      { label: i18n.t('shared.advanced_filter.k2'), value: 'equals' },
      { label: i18n.t('shared.advanced_filter.k3'), value: 'not_equals' },
      { label: i18n.t('shared.advanced_filter.k4'), value: 'is_empty' },
    ],
    number: [
      { label: i18n.t('shared.advanced_filter.k5'), value: 'equals' },
      { label: i18n.t('shared.advanced_filter.k6'), value: 'not_equals' },
      { label: i18n.t('shared.advanced_filter.k7'), value: 'greater_than' },
      { label: i18n.t('shared.advanced_filter.k8'), value: 'less_than' },
      { label: i18n.t('shared.advanced_filter.k9'), value: 'greater_or_equal' },
      { label: i18n.t('shared.advanced_filter.k10'), value: 'less_or_equal' },
    ],
    date: [
      { label: i18n.t('shared.advanced_filter.k11'), value: 'equals' },
      { label: i18n.t('shared.advanced_filter.k12'), value: 'not_equals' },
      { label: i18n.t('shared.advanced_filter.k13'), value: 'before' },
      { label: i18n.t('shared.advanced_filter.k14'), value: 'after' },
      { label: i18n.t('shared.advanced_filter.k15'), value: 'between' },
    ],
    select: [
      { label: i18n.t('shared.advanced_filter.k16'), value: 'equals' },
      { label: i18n.t('shared.advanced_filter.k17'), value: 'not_equals' },
      { label: i18n.t('shared.advanced_filter.k18'), value: 'in' },
    ],
  };

  const addCondition = () => {
    setConditions([
      ...conditions,
      { field: fields[0]?.key as string, operator: 'equals', value: null },
    ]);
  };

  const updateCondition = (index: number, updates: Partial<FilterCondition>) => {
    const newConditions = [...conditions];
    newConditions[index] = { ...newConditions[index], ...updates };
    setConditions(newConditions);
  };

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const getFieldType = (field: string) => {
    const found = fields.find((f) => f.key === field);
    return found?.type || 'text';
  };

  const applyFilters = () => {
    onFilterChange(conditions);
    setAnchorEl(null);
  };

  const resetFilters = () => {
    setConditions([]);
    onFilterChange([]);
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);

  return (
    <Box sx={{ position: 'relative' }}>
      <Button
        variant='outlined'
        onClick={(e) => setAnchorEl(e.currentTarget)}
        startIcon={<Filter style={{ width: 16, height: 16 }} />}
        endIcon={<Plus style={{ width: 16, height: 16 }} />}
        sx={{ gap: 1 }}
      >
        {i18n.t('components.advanced_filter.k0')}
      </Button>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        sx={{ width: 480 }}
      >
        <Box sx={{ p: 2 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 2,
            }}
          >
            <Box sx={{ fontWeight: 500 }}>{i18n.t('shared.advanced_filter.k19')}</Box>
            {conditions.length > 0 && (
              <Button
                variant='text'
                size='small'
                onClick={resetFilters}
                startIcon={<X style={{ width: 16, height: 16 }} />}
              >
                {i18n.t('components.advanced_filter.k1')}
              </Button>
            )}
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {conditions.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                <Box
                  component='p'
                  sx={{ mb: 1 }}
                >
                  {i18n.t('components.advanced_filter.k2')}
                </Box>
                <Box
                  component='p'
                  sx={{ fontSize: '0.875rem' }}
                >
                  {i18n.t('components.advanced_filter.k3')}
                </Box>
              </Box>
            ) : (
              conditions.map((condition, index) => {
                const fieldType = getFieldType(condition.field);
                const options = selectOptions?.[condition.field];

                return (
                  <Box
                    key={index}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      p: 1,
                      bgcolor: 'action.hover',
                      borderRadius: 1,
                    }}
                  >
                    <FormControl
                      size='small'
                      sx={{ width: 112 }}
                    >
                      <InputLabel>{i18n.t('shared.advanced_filter.k20')}</InputLabel>
                      <Select
                        value={condition.field}
                        label={i18n.t('shared.advanced_filter.k21')}
                        onChange={(e) => updateCondition(index, { field: e.target.value })}
                      >
                        {fields.map((field) => (
                          <MenuItem
                            key={String(field.key)}
                            value={String(field.key)}
                          >
                            {field.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <FormControl
                      size='small'
                      sx={{ width: 112 }}
                    >
                      <InputLabel>{i18n.t('shared.advanced_filter.k22')}</InputLabel>
                      <Select
                        value={condition.operator}
                        label={i18n.t('shared.advanced_filter.k23')}
                        onChange={(e) => updateCondition(index, { operator: e.target.value })}
                      >
                        {(operators[fieldType] || []).map((op) => (
                          <MenuItem
                            key={op.value}
                            value={op.value}
                          >
                            {op.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    {condition.operator !== 'is_empty' && (
                      <Box sx={{ flex: 1 }}>
                        {fieldType === 'select' && options ? (
                          <FormControl
                            size='small'
                            sx={{ width: '100%' }}
                          >
                            <InputLabel>{i18n.t('shared.advanced_filter.k24')}</InputLabel>
                            <Select
                              value={String(condition.value || '')}
                              label={i18n.t('shared.advanced_filter.k25')}
                              onChange={(e) =>
                                updateCondition(index, {
                                  value: e.target.value,
                                })
                              }
                            >
                              {(options || []).map((opt) => (
                                <MenuItem
                                  key={opt.value}
                                  value={opt.value}
                                >
                                  {opt.label}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        ) : fieldType === 'date' ? (
                          <TextField
                            type='date'
                            size='small'
                            value={
                              condition.value
                                ? dayjs(condition.value as Date).format('YYYY-MM-DD')
                                : ''
                            }
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              updateCondition(index, {
                                value: e.target.value ? new Date(e.target.value) : null,
                              })
                            }
                            sx={{ width: '100%' }}
                            slotProps={{
                              inputLabel: { shrink: true },
                            }}
                          />
                        ) : fieldType === 'number' ? (
                          <TextField
                            type='number'
                            size='small'
                            placeholder={i18n.t('shared.advanced_filter.k26')}
                            value={condition.value as number | undefined}
                            onChange={(e) =>
                              updateCondition(index, {
                                value: Number(e.target.value),
                              })
                            }
                            sx={{ width: '100%' }}
                          />
                        ) : (
                          <TextField
                            size='small'
                            placeholder={i18n.t('shared.advanced_filter.k27')}
                            value={condition.value as string | undefined}
                            onChange={(e) => updateCondition(index, { value: e.target.value })}
                            sx={{ width: '100%' }}
                          />
                        )}
                      </Box>
                    )}

                    <Button
                      variant='text'
                      size='small'
                      onClick={() => removeCondition(index)}
                      sx={{ minWidth: 32, p: 0.5 }}
                    >
                      <X style={{ width: 16, height: 16 }} />
                    </Button>
                  </Box>
                );
              })
            )}
          </Box>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mt: 2,
              pt: 2,
              borderTop: 1,
              borderColor: 'divider',
            }}
          >
            <Button
              variant='outlined'
              size='small'
              onClick={addCondition}
              startIcon={<Plus style={{ width: 16, height: 16 }} />}
              sx={{ gap: 0.5 }}
            >
              {i18n.t('components.advanced_filter.k4')}
            </Button>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant='outlined'
                size='small'
                onClick={() => setAnchorEl(null)}
              >
                {i18n.t('components.advanced_filter.k5')}
              </Button>
              <Button
                size='small'
                variant='contained'
                onClick={applyFilters}
              >
                {i18n.t('components.advanced_filter.k6')}
              </Button>
            </Box>
          </Box>
        </Box>
      </Popover>

      {conditions.length > 0 && !open && (
        <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {conditions.map((condition, index) => {
            const field = fields.find((f) => f.key === condition.field);
            const fieldLabel = field?.label || condition.field;
            const operator = operators[getFieldType(condition.field)]?.find(
              (op) => op.value === condition.operator
            );
            return (
              <Chip
                key={index}
                label={
                  <Box
                    component='span'
                    sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                  >
                    {fieldLabel} {operator?.label}
                    {condition.value && ` "${condition.value}"`}
                  </Box>
                }
                size='small'
                variant='outlined'
                onDelete={() => {
                  const newConditions = conditions.filter((_, i) => i !== index);
                  setConditions(newConditions);
                  onFilterChange(newConditions);
                }}
                deleteIcon={<X style={{ width: 14, height: 14 }} />}
                sx={{ gap: 0.5 }}
              />
            );
          })}
        </Box>
      )}
    </Box>
  );
};

export default AdvancedFilterPanel;
