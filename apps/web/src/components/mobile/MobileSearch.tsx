import { useState, useRef, useEffect } from 'react';
import {
  Box,
  InputBase,
  IconButton,
  Collapse,
  List,
  ListItem,
  ListItemText,
  Typography,
  type SxProps,
  type Theme,
} from '@mui/material';
import i18n from '@/i18n';
import { Search, X, History } from 'lucide-react';

export interface MobileSearchProps {
  onSearch?: (query: string) => void;
  placeholder?: string;
  history?: string[];
  onHistoryClick?: (query: string) => void;
  onHistoryClear?: () => void;
  sx?: SxProps<Theme>;
}

export function MobileSearch({
  onSearch,
  placeholder = i18n.t('components.mobile_search.k0'),
  history = [],
  onHistoryClick,
  onHistoryClear,
  sx,
}: MobileSearchProps) {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (focused) inputRef.current?.focus();
  }, [focused]);

  const handleSubmit = () => {
    if (query.trim()) {
      onSearch?.(query.trim());
    }
  };

  return (
    <Box sx={sx}>
      {/* Search input bar */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          bgcolor: 'grey.100',
          borderRadius: 3,
          px: 1.5,
          py: 0.5,
          gap: 1,
        }}
      >
        <Search
          size={18}
          sx={{ color: 'text.secondary', flexShrink: 0 }}
        />
        <InputBase
          inputRef={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder={placeholder}
          sx={{ flex: 1, fontSize: '0.9375rem' }}
        />
        {query && (
          <IconButton
            size='small'
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
            aria-label={i18n.t('shared.mobile_search.k0')}
          >
            <X size={16} />
          </IconButton>
        )}
      </Box>

      {/* Search history dropdown */}
      <Collapse in={focused && !query && history.length > 0}>
        <Box sx={{ mt: 1 }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              px: 1,
              mb: 0.5,
            }}
          >
            <Typography
              variant='caption'
              color='text.secondary'
            >
              {i18n.t('components.mobile_search.k0')}
            </Typography>
            {onHistoryClear && (
              <Typography
                variant='caption'
                color='primary'
                sx={{ cursor: 'pointer' }}
                onClick={onHistoryClear}
              >
                {i18n.t('components.mobile_search.k1')}
              </Typography>
            )}
          </Box>
          <List
            dense
            disablePadding
          >
            {history.map((item) => (
              <ListItem
                key={item}
                onClick={() => {
                  onHistoryClick?.(item);
                  setQuery(item);
                  setFocused(false);
                }}
                sx={{
                  borderRadius: 3,
                  mx: 0.5,
                  cursor: 'pointer',
                  '&:active': { bgcolor: 'action.hover' },
                }}
              >
                <History
                  size={14}
                  sx={{ color: 'text.disabled', mr: 1.5 }}
                />
                <ListItemText
                  primary={item}
                  slotProps={{ primary: { variant: 'body2' } }}
                />
              </ListItem>
            ))}
          </List>
        </Box>
      </Collapse>
    </Box>
  );
}

export default MobileSearch;
