import { designTokens } from '@topems/tokens';
import React, { useRef, useEffect, useMemo } from 'react';
import {
  Box,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Typography,
  Divider,
  useTheme,
  alpha,
  LinearProgress,
} from '@mui/material';
import i18n from '@/i18n';
import type { Theme } from '@mui/material/styles';
import {
  SearchCode,
  FileText,
  Users,
  ShoppingCart,
  Package,
  Settings,
  ChevronRight,
} from 'lucide-react';
import type { SearchResultListProps } from './types';
import { groupResultsByModule, getModuleColor, getSearchSuggestions } from './utils';
import { SearchShortcuts } from './SearchShortcuts';
import { HotSearches } from './HotSearches';
import { SearchHistory } from './SearchHistory';

const moduleIcons: Record<string, React.ReactNode> = {
  user: <Users size={16} />,
  customer: <Users size={16} />,
  order: <ShoppingCart size={16} />,
  product: <Package size={16} />,
  document: <FileText size={16} />,
  admin: <Settings size={16} />,
  default: <SearchCode size={16} />,
};

const getModuleIcon = (module: string) => {
  return moduleIcons[module] || moduleIcons.default;
};

const EmptyResults: React.FC<{ query: string }> = ({ query }) => (
  <Box sx={{ p: 4, textAlign: 'center' }}>
    <svg
      width='32'
      height='32'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
      style={{ opacity: 0.3, margin: `0 auto ${designTokens.spacing.sm}px`, display: 'block' }}
    >
      <circle
        cx='11'
        cy='11'
        r='8'
      />
      <path d='m21 21-4.3-4.3' />
    </svg>
    <Typography
      variant='body2'
      color='text.secondary'
    >
      {i18n.t('components.search_result_list.k0')} "{query}"{' '}
      {i18n.t('components.search_result_list.k1')}
    </Typography>
  </Box>
);

interface HighlightTextProps {
  text: string;
  highlight: string;
  theme: Theme;
}

const HighlightText: React.FC<HighlightTextProps> = ({ text, highlight, theme }) => {
  if (!highlight.trim()) {
    return <>{text}</>;
  }

  const lowerHighlight = highlight.toLowerCase();
  const regex = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  const isDark = theme.palette.mode === 'dark';

  return (
    <>
      {parts.map((part, index) => {
        const isHighlighted = part.toLowerCase() === lowerHighlight;
        return isHighlighted ? (
          <Box
            key={index}
            component='span'
            sx={{
              color: isDark ? theme.palette.primary.light : theme.palette.primary.main,
              fontWeight: 600,
              backgroundColor: alpha(theme.palette.primary.main, isDark ? 0.2 : 0.1),
              px: 0.5,
              borderRadius: 0.5,
            }}
          >
            {part}
          </Box>
        ) : (
          <span key={index}>{part}</span>
        );
      })}
    </>
  );
};

const MemoizedSearchShortcuts = React.memo(SearchShortcuts);
const MemoizedHotSearches = React.memo(HotSearches);
const MemoizedSearchHistory = React.memo(SearchHistory);

export const SearchResultList: React.FC<SearchResultListProps> = ({
  results,
  loading,
  query,
  selectedIndex,
  onResultClick,
  onShortcutSelect,
  searchHistory,
  onHistorySelect,
  onHistoryRemove,
  onHistoryClear,
  maxHeight = 340,
}) => {
  const theme = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const isDark = theme.palette.mode === 'dark';

  useEffect(() => {
    if (selectedIndex < 0 || !containerRef.current || !query) return;
    const element = containerRef.current.querySelector(`[data-index="${selectedIndex}"]`);
    if (element) {
      element.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedIndex, query]);

  const groupedResults = useMemo(() => groupResultsByModule(results), [results]);
  const suggestions = useMemo(() => getSearchSuggestions(query, 6), [query]);

  const indexMap = useMemo(() => {
    const map = new Map<string, number>();
    let flatIndex = 0;
    groupedResults.forEach((group) => {
      group.results.forEach((result) => {
        map.set(result.id, flatIndex++);
      });
    });
    return map;
  }, [groupedResults]);

  const totalResults = results.length;
  const totalGroups = groupedResults.length;

  if (!query) {
    return (
      <Box>
        <MemoizedSearchShortcuts onSelect={onShortcutSelect} />
        <Divider />
        <MemoizedHotSearches onSelect={onShortcutSelect} />
        {searchHistory.length > 0 && <Divider />}
        <MemoizedSearchHistory
          history={searchHistory}
          onSelect={onHistorySelect}
          onRemove={onHistoryRemove}
          onClear={onHistoryClear}
        />
      </Box>
    );
  }

  if (!loading && results.length === 0) {
    return <EmptyResults query={query} />;
  }

  return (
    <Box
      ref={containerRef}
      sx={{ maxHeight, overflowY: 'auto' }}
    >
      {loading && (
        <Box sx={{ position: 'sticky', top: 0, zIndex: 1 }}>
          <LinearProgress sx={{ height: 2 }} />
        </Box>
      )}
      {suggestions.length > 0 && (
        <>
          <Box sx={{ px: 2, py: 1 }}>
            <Typography
              variant='caption'
              color='text.secondary'
              sx={{ mb: 1, display: 'block' }}
            >
              {i18n.t('components.search_result_list.k0')}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {suggestions.map((s: string) => (
                <Chip
                  key={s}
                  label={
                    <HighlightText
                      text={s}
                      highlight={query}
                      theme={theme}
                    />
                  }
                  size='small'
                  variant='outlined'
                  onClick={() => onShortcutSelect(s)}
                  sx={{ cursor: 'pointer' }}
                />
              ))}
            </Box>
          </Box>
          {results.length > 0 && <Divider />}
        </>
      )}
      {totalResults > 0 && (
        <>
          <Box
            sx={{
              px: 2,
              py: 0.75,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: alpha(theme.palette.background.default, 0.6),
              borderBottom: `1px solid ${alpha(theme.palette.divider, 0.3)}`,
            }}
          >
            <Typography
              variant='caption'
              color='text.secondary'
            >
              {i18n.t('components.search_result_list.k2')}{' '}
              <Box
                component='span'
                sx={{ fontWeight: 700, color: 'text.primary' }}
              >
                {totalResults}
              </Box>{' '}
              {i18n.t('components.search_result_list.k3')}
              {totalGroups > 1 && (
                <>
                  {' '}
                  {i18n.t('components.search_result_list.k4')}{' '}
                  <Box
                    component='span'
                    sx={{ fontWeight: 600 }}
                  >
                    {totalGroups}
                  </Box>{' '}
                  {i18n.t('components.search_result_list.k1')}
                </>
              )}
            </Typography>
            <Typography
              variant='caption'
              color='text.disabled'
              sx={{ fontSize: 10 }}
            >
              {i18n.t('components.search_result_list.k2')}
            </Typography>
          </Box>
        </>
      )}
      {totalResults > 0 && (
        <Box
          role='listbox'
          aria-label={i18n.t('components.search_result_list.k0')}
        >
          {groupedResults.map((group, groupIndex) => (
            <React.Fragment key={group.module}>
              {groupIndex > 0 && <Divider />}
              <Box
                sx={{
                  px: 2,
                  py: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  backgroundColor: alpha(theme.palette.action.hover, 0.3),
                }}
              >
                <Box sx={{ color: getModuleColor(group.module, theme), display: 'flex' }}>
                  {getModuleIcon(group.module)}
                </Box>
                <Typography
                  variant='caption'
                  sx={{
                    fontWeight: 600,
                    color: getModuleColor(group.module, theme),
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  {group.label}
                </Typography>
                <Typography
                  variant='caption'
                  color='text.disabled'
                >
                  {group.results.length} {i18n.t('components.search_result_list.k5')}
                </Typography>
              </Box>
              {group.results.map((result) => {
                const currentIndex = indexMap.get(result.id) ?? -1;
                const isSelected = selectedIndex === currentIndex;
                const moduleColor = getModuleColor(result.module ?? '', theme);
                return (
                  <ListItem
                    key={result.id}
                    component='div'
                    onClick={() => onResultClick(result)}
                    data-index={currentIndex}
                    sx={{
                      cursor: 'pointer',
                      py: 1.5,
                      pl: 2,
                      pr: 1.5,
                      borderLeft: isSelected
                        ? `3px solid ${theme.palette.primary.main}`
                        : '3px solid transparent',
                      backgroundColor: isSelected
                        ? alpha(theme.palette.primary.main, isDark ? 0.18 : 0.12)
                        : 'transparent',
                      '&:hover': {
                        backgroundColor: alpha(theme.palette.primary.main, isDark ? 0.08 : 0.04),
                      },
                      '&.Mui-selected:hover': {
                        backgroundColor: alpha(theme.palette.primary.main, isDark ? 0.18 : 0.12),
                      },
                      transition: 'background-color 0.15s ease, border-color 0.15s ease',
                    }}
                    role='option'
                    aria-selected={isSelected}
                  >
                    <ListItemIcon sx={{ minWidth: 36, color: moduleColor }}>
                      {getModuleIcon(result.module ?? '')}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <HighlightText
                          text={result.title}
                          highlight={query}
                          theme={theme}
                        />
                      }
                      secondary={
                        result.description ? (
                          <HighlightText
                            text={result.description}
                            highlight={query}
                            theme={theme}
                          />
                        ) : (
                          ''
                        )
                      }
                      sx={{
                        '& .MuiListItemText-primary': {
                          fontSize: 13,
                          fontWeight: isSelected ? 600 : 500,
                          color: isSelected
                            ? isDark
                              ? theme.palette.primary.light
                              : theme.palette.primary.main
                            : undefined,
                        },
                        '& .MuiListItemText-secondary': {
                          fontSize: 12,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        },
                      }}
                    />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip
                        label={result.type_name || result.module}
                        size='small'
                        sx={{
                          height: 20,
                          fontSize: 10,
                          backgroundColor: alpha(moduleColor, isDark ? 0.15 : 0.1),
                          color: isDark ? moduleColor : moduleColor,
                          '& .MuiChip-label': { px: 1 },
                        }}
                      />
                      <ChevronRight
                        size={14}
                        style={{ opacity: isSelected ? (isDark ? 0.7 : 0.6) : 0.3 }}
                      />
                    </Box>
                  </ListItem>
                );
              })}
            </React.Fragment>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default SearchResultList;
