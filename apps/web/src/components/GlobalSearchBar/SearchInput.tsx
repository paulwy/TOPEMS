import React, { useState, useMemo } from 'react';
import {
  Paper,
  InputBase,
  IconButton,
  Chip,
  alpha,
  useTheme,
  Popover,
  Box,
  Typography,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import i18n from '@/i18n';
import { Search, X, Filter } from 'lucide-react';
import { SEARCH_SHORTCUTS, getShortcutKeyLabel } from '@/hooks/shortcuts';
import type { SearchInputProps } from './types';

export const SearchInput: React.FC<SearchInputProps> = ({
  query,
  onChange,
  onFocus,
  onKeyDown,
  inputRef,
  showShortcut = false,
  autoFocus = false,
  filter,
  onFilterChange,
  availableServices,
  availableTypes,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [activeTab, setActiveTab] = useState<'module' | 'type'>('module');

  const openShortcutLabel = useMemo(() => getShortcutKeyLabel(SEARCH_SHORTCUTS.OPEN), []);

  const hasFilter = filter && (filter.service || filter.type);

  const handleClear = () => {
    onChange('');
    inputRef.current?.focus();
  };

  const handleFilterClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleFilterClose = () => {
    setAnchorEl(null);
  };

  const handleModuleSelect = (module: string) => {
    if (!onFilterChange) return;
    const newService = filter?.service === module ? undefined : module;
    onFilterChange({ ...filter, service: newService, type: newService ? filter?.type : undefined });
  };

  const handleTypeSelect = (type: string) => {
    if (!onFilterChange) return;
    const newType = filter?.type === type ? undefined : type;
    onFilterChange({ ...filter, type: newType });
  };

  const handleClearFilter = () => {
    if (!onFilterChange) return;
    onFilterChange({ service: undefined, type: undefined });
  };

  const open = Boolean(anchorEl);
  const id = open ? 'filter-popover' : undefined;

  return (
    <>
      <Paper
        elevation={0}
        sx={{
          display: 'flex',
          alignItems: 'center',
          px: 2,
          py: 0.5,
          borderRadius: 2,
          backgroundColor: alpha(theme.palette.text.primary, isDark ? 0.08 : 0.04),
          border: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
          transition: theme.transitions.create(['box-shadow', 'border-color']),
          '&:hover': {
            borderColor: alpha(theme.palette.primary.main, 0.5),
          },
        }}
      >
        <Search
          size={16}
          style={{ opacity: 0.6 }}
        />
        <InputBase
          inputRef={inputRef}
          value={query}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus}
          onKeyDown={onKeyDown}
          placeholder={i18n.t('components.search_input.k0')}
          size='small'
          sx={{
            flex: 1,
            ml: 1.5,
            fontSize: 14,
            '& .MuiInputBase-input': {
              py: 0.5,
            },
          }}
          autoFocus={autoFocus}
          aria-label={i18n.t('components.search_input.k0')}
          aria-autocomplete='list'
          aria-expanded={!!query}
          role='combobox'
        />
        {query && (
          <IconButton
            size='small'
            onClick={handleClear}
            sx={{ p: 0.5 }}
            aria-label={i18n.t('components.search_input.k1')}
          >
            <X size={14} />
          </IconButton>
        )}
        <IconButton
          size='small'
          onClick={handleFilterClick}
          sx={{ p: 0.5, opacity: availableServices?.length || availableTypes?.length ? 0.6 : 0.3 }}
          disabled={!availableServices?.length && !availableTypes?.length}
          aria-label={i18n.t('components.search_input.k2')}
        >
          <Filter size={14} />
        </IconButton>
        {hasFilter && (
          <Chip
            label={
              filter?.service
                ? `${i18n.t('components.search_input.k1')} ${availableServices?.find((m) => m.value === filter.service)?.label || filter.service}`
                : `${i18n.t('components.search_input.k2')} ${availableTypes?.find((t) => t.value === filter.type)?.label || filter.type}`
            }
            size='small'
            onDelete={handleClearFilter}
            sx={{
              ml: 0.5,
              height: 20,
              fontSize: 10,
              backgroundColor: alpha(theme.palette.primary.main, isDark ? 0.15 : 0.1),
              color: theme.palette.primary.main,
              '& .MuiChip-label': { px: 1 },
            }}
          />
        )}
        {showShortcut && (
          <Chip
            label={openShortcutLabel}
            size='small'
            sx={{
              ml: 1,
              height: 20,
              fontSize: 10,
              backgroundColor: alpha(theme.palette.text.primary, isDark ? 0.12 : 0.06),
              '& .MuiChip-label': { px: 1 },
            }}
          />
        )}
      </Paper>

      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleFilterClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        sx={{ mt: 0.5 }}
        disableRestoreFocus
      >
        <Box sx={{ width: 280, p: 2 }}>
          <Box
            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}
          >
            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600 }}
            >
              {i18n.t('components.search_input.k3')}
            </Typography>
            <Typography
              variant='caption'
              color='primary'
              sx={{ cursor: 'pointer' }}
              onClick={handleClearFilter}
            >
              {i18n.t('components.search_input.k4')}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', borderBottom: `1px solid ${theme.palette.divider}` }}>
            <Box
              component='button'
              onClick={() => setActiveTab('module')}
              sx={{
                flex: 1,
                py: 1,
                px: 2,
                textAlign: 'center',
                fontSize: 12,
                fontWeight: activeTab === 'module' ? 600 : 500,
                color:
                  activeTab === 'module'
                    ? theme.palette.primary.main
                    : theme.palette.text.secondary,
                borderBottom:
                  activeTab === 'module' ? `2px solid ${theme.palette.primary.main}` : 'none',
                cursor: 'pointer',
                backgroundColor: 'transparent',
                '&:hover': {
                  backgroundColor: alpha(theme.palette.action.hover, 0.5),
                },
              }}
            >
              {i18n.t('components.search_input.k5')}
            </Box>
            <Box
              component='button'
              onClick={() => setActiveTab('type')}
              sx={{
                flex: 1,
                py: 1,
                px: 2,
                textAlign: 'center',
                fontSize: 12,
                fontWeight: activeTab === 'type' ? 600 : 500,
                color:
                  activeTab === 'type' ? theme.palette.primary.main : theme.palette.text.secondary,
                borderBottom:
                  activeTab === 'type' ? `2px solid ${theme.palette.primary.main}` : 'none',
                cursor: 'pointer',
                backgroundColor: 'transparent',
                '&:hover': {
                  backgroundColor: alpha(theme.palette.action.hover, 0.5),
                },
              }}
            >
              {i18n.t('components.search_input.k6')}
            </Box>
          </Box>

          <Box sx={{ maxHeight: 200, overflowY: 'auto', mt: 2 }}>
            {activeTab === 'module'
              ? (availableServices || []).map((module) => (
                  <FormControlLabel
                    key={module.value}
                    control={
                      <Checkbox
                        size='small'
                        checked={!!(filter && filter.module === module.value)}
                        onChange={() => handleModuleSelect(module.value)}
                        sx={{
                          '&.Mui-checked': {
                            color: theme.palette.primary.main,
                          },
                        }}
                      />
                    }
                    label={
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          width: '100%',
                        }}
                      >
                        <Typography variant='body2'>{module.label}</Typography>
                        <Typography
                          variant='caption'
                          color='text.secondary'
                        >
                          {module.count}
                        </Typography>
                      </Box>
                    }
                    sx={{
                      '&:hover': {
                        backgroundColor: alpha(theme.palette.action.hover, 0.3),
                      },
                    }}
                  />
                ))
              : (availableTypes || []).map((type) => (
                  <FormControlLabel
                    key={type.value}
                    control={
                      <Checkbox
                        size='small'
                        checked={!!(filter && filter.type === type.value)}
                        onChange={() => handleTypeSelect(type.value)}
                        sx={{
                          '&.Mui-checked': {
                            color: theme.palette.primary.main,
                          },
                        }}
                      />
                    }
                    label={
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          width: '100%',
                        }}
                      >
                        <Typography variant='body2'>{type.label}</Typography>
                        <Typography
                          variant='caption'
                          color='text.secondary'
                        >
                          {type.count}
                        </Typography>
                      </Box>
                    }
                    sx={{
                      '&:hover': {
                        backgroundColor: alpha(theme.palette.action.hover, 0.3),
                      },
                    }}
                  />
                ))}
          </Box>
        </Box>
      </Popover>
    </>
  );
};

export default SearchInput;
