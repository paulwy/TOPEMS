import React from 'react';
import { Box, Tooltip, IconButton, Paper, Popover, useTheme } from '@mui/material';
import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useGlobalSearch } from '@/hooks/useGlobalSearch';
import { SearchInput } from './SearchInput';
import { SearchResultList } from './SearchResultList';

interface GlobalSearchBarProps {
  variant?: 'full' | 'icon';
}

export const GlobalSearchBar: React.FC<GlobalSearchBarProps> = ({ variant = 'full' }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const iconButtonRef = React.useRef<HTMLButtonElement>(null);

  const {
    query,
    setQuery,
    results,
    loading,
    selectedIndex,
    searchHistory,
    open,
    setOpen,
    inputRef,
    searchRef,
    handleResultClick,
    handleKeyDown,
    handleFocus,
    removeFromHistory,
    clearHistory,
  } = useGlobalSearch(navigate);

  const handleQueryChange = (value: string) => {
    setQuery(value);
  };

  const resultListProps = {
    results,
    loading,
    query,
    selectedIndex,
    onResultClick: handleResultClick,
    onShortcutSelect: setQuery,
    searchHistory,
    onHistorySelect: setQuery,
    onHistoryRemove: removeFromHistory,
    onHistoryClear: clearHistory,
  };

  if (variant === 'icon') {
    return (
      <>
        <Tooltip title="搜索 (Ctrl+K)">
          <IconButton
            onClick={() => {
              setOpen(true);
              setTimeout(() => inputRef.current?.focus(), 50);
            }}
            size="small"
            ref={iconButtonRef}
          >
            <Search size={18} />
          </IconButton>
        </Tooltip>
        <Popover
          open={open}
          anchorEl={iconButtonRef.current}
          onClose={() => setOpen(false)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          sx={{ mt: 1 }}
          disableRestoreFocus
        >
          <Box sx={{ width: { xs: '90vw', sm: 420 }, maxWidth: '100vw', p: 0 }}>
            <Box sx={{ p: 1 }}>
              <SearchInput
                query={query}
                onChange={handleQueryChange}
                onKeyDown={handleKeyDown}
                inputRef={inputRef}
                autoFocus
              />
            </Box>
            <SearchResultList {...resultListProps} />
          </Box>
        </Popover>
      </>
    );
  }

  return (
    <Box ref={searchRef} sx={{ position: 'relative', width: '100%', maxWidth: 480 }}>
      <SearchInput
        query={query}
        onChange={handleQueryChange}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        inputRef={inputRef}
        showShortcut
      />

      {open && (
        <Paper
          elevation={4}
          sx={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            mt: 0,
            borderTopLeftRadius: 0,
            borderTopRightRadius: 0,
            borderBottomLeftRadius: 2,
            borderBottomRightRadius: 2,
            overflow: 'hidden',
            zIndex: theme.zIndex.modal,
            maxHeight: 400,
            overflowY: 'auto',
          }}
        >
          <SearchResultList {...resultListProps} maxHeight={400} />
        </Paper>
      )}
    </Box>
  );
};

export default GlobalSearchBar;
