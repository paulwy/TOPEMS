import React from 'react';
import { Paper, InputBase, IconButton, Chip, alpha, useTheme } from '@mui/material';
import { Search, X } from 'lucide-react';
import type { SearchInputProps } from './types';

export const SearchInput: React.FC<SearchInputProps> = ({
  query,
  onChange,
  onFocus,
  onKeyDown,
  inputRef,
  showShortcut = false,
  autoFocus = false,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const handleClear = () => {
    onChange('');
    inputRef.current?.focus();
  };

  return (
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
      <Search size={16} style={{ opacity: 0.6 }} />
      <InputBase
        inputRef={inputRef}
        value={query}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onKeyDown={onKeyDown}
        placeholder="搜索..."
        size="small"
        sx={{
          flex: 1,
          ml: 1.5,
          fontSize: 14,
          '& .MuiInputBase-input': {
            py: 0.5,
          },
        }}
        autoFocus={autoFocus}
        aria-label="全局搜索"
        aria-autocomplete="list"
        aria-expanded={!!query}
        role="combobox"
      />
      {query && (
        <IconButton size="small" onClick={handleClear} sx={{ p: 0.5 }}>
          <X size={14} />
        </IconButton>
      )}
      {showShortcut && (
        <Chip
          label="Ctrl K"
          size="small"
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
  );
};

export default SearchInput;
