import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  InputBase,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Divider,
  Chip,
  Fade,
  ClickAwayListener,
} from '@mui/material';
import { styled, alpha, useTheme } from '@mui/material/styles';
import { Search, Clock, X, ArrowRight, TrendingUp, Star } from 'lucide-react';

/**
 * 搜索建议项
 */
export interface SearchSuggestion {
  /** 建议文本 */
  text: string;
  /** 图标类型 */
  icon?: 'history' | 'trending' | 'star' | 'recent';
  /** 点击回调 */
  onClick?: () => void;
}

/**
 * 搜索历史项
 */
export interface SearchHistoryItem {
  /** 历史文本 */
  text: string;
  /** 时间戳 */
  timestamp: number;
  /** 点击回调 */
  onClick?: () => void;
}

/**
 * 快速搜索组件属性
 */
export interface QuickSearchProps {
  /** 搜索回调 */
  onSearch?: (query: string) => void;
  /** 搜索建议列表 */
  suggestions?: SearchSuggestion[];
  /** 是否显示搜索建议 */
  showSuggestions?: boolean;
  /** 最大历史记录数量 */
  maxHistoryCount?: number;
  /** 是否启用键盘快捷键 */
  enableShortcut?: boolean;
  /** 快捷键修饰键，默认为 ['ctrl', 'meta'] */
  shortcutModifier?: ('ctrl' | 'meta' | 'alt' | 'shift')[];
  /** 快捷键键名，默认为 'k' */
  shortcutKey?: string;
  /** 占位符文本 */
  placeholder?: string;
  /** 自动聚焦 */
  autoFocus?: boolean;
  /** 搜索框宽度 */
  width?: number | string;
  /** 是否禁用 */
  disabled?: boolean;
  /** 自定义类名 */
  className?: string;
}

const STORAGE_KEY = 'quick-search-history';

/**
 * 快速搜索组件
 * 支持键盘快捷键触发、搜索历史和搜索建议功能
 */
const QuickSearch: React.FC<QuickSearchProps> = ({
  onSearch,
  suggestions = [],
  showSuggestions = true,
  maxHistoryCount = 10,
  enableShortcut = true,
  shortcutModifier = ['ctrl', 'meta'],
  shortcutKey = 'k',
  placeholder = '搜索...',
  _autoFocus = false,
  width = 400,
  disabled = false,
  className,
}) => {
  const _theme = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 加载历史记录
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch {
      // 忽略错误
    }
  }, []);

  // 保存历史记录
  const saveHistory = useCallback(
    (text: string) => {
      const newHistory: SearchHistoryItem[] = [
        { text, timestamp: Date.now() },
        ...history.filter((h) => h.text !== text),
      ].slice(0, maxHistoryCount);

      setHistory(newHistory);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
      } catch {
        // 忽略错误
      }
    },
    [history, maxHistoryCount]
  );

  // 处理键盘快捷键
  useEffect(() => {
    if (!enableShortcut) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const modifierMatch = shortcutModifier.every((mod) => {
        if (mod === 'ctrl') return e.ctrlKey;
        if (mod === 'meta') return e.metaKey;
        if (mod === 'alt') return e.altKey;
        if (mod === 'shift') return e.shiftKey;
        return false;
      });

      if (modifierMatch && e.key.toLowerCase() === shortcutKey.toLowerCase()) {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enableShortcut, shortcutModifier, shortcutKey]);

  // 过滤建议和历史
  const filteredSuggestions = suggestions.filter((s) =>
    s.text.toLowerCase().includes(query.toLowerCase())
  );

  const filteredHistory = history.filter((h) => h.text.toLowerCase().includes(query.toLowerCase()));

  const showHistory = query.length === 0 && history.length > 0;
  const showFilteredSuggestions = query.length > 0 && filteredSuggestions.length > 0;
  const showFilteredHistory = query.length > 0 && filteredHistory.length > 0;

  // 处理输入变化
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setHighlightedIndex(-1);
  };

  // 处理键盘导航
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const totalItems =
      (showFilteredSuggestions ? filteredSuggestions.length : 0) +
      (showFilteredHistory ? filteredHistory.length : 0);

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev < totalItems - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : totalItems - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0) {
          const item = getItemAtIndex(highlightedIndex);
          if (item) {
            handleItemClick(item.text, item.onClick);
          }
        } else if (query) {
          handleSearch();
        }
        break;
      case 'Escape':
        setOpen(false);
        inputRef.current?.blur();
        break;
    }
  };

  // 根据索引获取项目
  const getItemAtIndex = (index: number): SearchSuggestion | SearchHistoryItem | null => {
    let currentIndex = 0;

    if (showFilteredSuggestions) {
      const suggestionCount = filteredSuggestions.length;
      if (index < suggestionCount) {
        return filteredSuggestions[index];
      }
      currentIndex += suggestionCount;
    }

    if (showFilteredHistory) {
      const historyCount = filteredHistory.length;
      if (index < currentIndex + historyCount) {
        return filteredHistory[index - currentIndex];
      }
    }

    return null;
  };

  // 处理搜索
  const handleSearch = () => {
    if (query.trim()) {
      saveHistory(query.trim());
      onSearch?.(query.trim());
      setOpen(false);
      setQuery('');
    }
  };

  // 处理项目点击
  const handleItemClick = (text: string, callback?: () => void) => {
    setQuery(text);
    saveHistory(text);
    callback?.();
    onSearch?.(text);
    setOpen(false);
  };

  // 清除历史
  const handleClearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // 忽略错误
    }
  };

  // 获取图标
  const getIcon = (icon?: string) => {
    switch (icon) {
      case 'history':
      case 'recent':
        return <Clock size={18} />;
      case 'trending':
        return <TrendingUp size={18} />;
      case 'star':
        return <Star size={18} />;
      default:
        return <Search size={18} />;
    }
  };

  const isOpen =
    open && showSuggestions && (showHistory || showFilteredSuggestions || showFilteredHistory);

  return (
    <ClickAwayListener onClickAway={() => setOpen(false)}>
      <Container
        ref={containerRef}
        className={className}
        sx={{ width }}
      >
        {/* 搜索输入框 */}
        <SearchWrapper
          onClick={() => !disabled && setOpen(true)}
          isFocused={isOpen}
        >
          <SearchIconWrapper>
            <Search size={20} />
          </SearchIconWrapper>
          <StyledInputBase
            ref={inputRef}
            placeholder={placeholder}
            value={query}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setOpen(true)}
            disabled={disabled}
            fullWidth
            inputProps={{
              'aria-label': 'search',
            }}
          />
          {query && (
            <IconButton
              size='small'
              onClick={(e) => {
                e.stopPropagation();
                setQuery('');
                inputRef.current?.focus();
              }}
              sx={{ marginRight: 0.5 }}
            >
              <X size={16} />
            </IconButton>
          )}
          {enableShortcut && !query && (
            <ShortcutHint>
              <Box
                component='span'
                sx={{
                  fontSize: 14,
                  fontWeight: 'bold',
                  fontFamily: 'monospace',
                }}
              >
                ⌘
              </Box>
              {shortcutKey.toUpperCase()}
            </ShortcutHint>
          )}
        </SearchWrapper>

        {/* 搜索建议/历史下拉 */}
        <Fade in={isOpen}>
          <SuggestionsPaper
            isOpen={isOpen}
            style={{
              width: containerRef.current?.offsetWidth || width,
            }}
          >
            {showHistory && (
              <>
                <HistoryHeader>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    最近搜索
                  </Typography>
                  <Chip
                    label='清除'
                    size='small'
                    onClick={handleClearHistory}
                    sx={{ cursor: 'pointer' }}
                  />
                </HistoryHeader>
                <List disablePadding>
                  {history.slice(0, maxHistoryCount).map((item, index) => (
                    <SuggestionItem
                      key={item.text}
                      onClick={() => handleItemClick(item.text)}
                      isHighlighted={highlightedIndex === index}
                    >
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <Clock size={18} />
                      </ListItemIcon>
                      <ListItemText primary={item.text} />
                      <ArrowRight size={16} />
                    </SuggestionItem>
                  ))}
                </List>
              </>
            )}

            {showHistory && (showFilteredSuggestions || showFilteredHistory) && <Divider />}

            {showFilteredSuggestions && (
              <>
                <SectionTitle>建议</SectionTitle>
                <List disablePadding>
                  {filteredSuggestions.map((suggestion, index) => {
                    const itemIndex = showHistory ? history.length + index : index;
                    return (
                      <SuggestionItem
                        key={suggestion.text}
                        onClick={() => handleItemClick(suggestion.text, suggestion.onClick)}
                        isHighlighted={highlightedIndex === itemIndex}
                      >
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          {getIcon(suggestion.icon)}
                        </ListItemIcon>
                        <Typography
                          variant='body1'
                          sx={{
                            fontWeight: highlightedIndex === itemIndex ? 600 : 400,
                          }}
                        >
                          {suggestion.text}
                        </Typography>
                        <ArrowRight size={16} />
                      </SuggestionItem>
                    );
                  })}
                </List>
              </>
            )}

            {showFilteredHistory && !showFilteredSuggestions && (
              <>
                <SectionTitle>历史记录</SectionTitle>
                <List disablePadding>
                  {filteredHistory.map((item, index) => {
                    const itemIndex = showHistory ? history.length + index : index;
                    return (
                      <SuggestionItem
                        key={item.text}
                        onClick={() => handleItemClick(item.text)}
                        isHighlighted={highlightedIndex === itemIndex}
                      >
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <Clock size={18} />
                        </ListItemIcon>
                        <ListItemText primary={item.text} />
                        <ArrowRight size={16} />
                      </SuggestionItem>
                    );
                  })}
                </List>
              </>
            )}

            {query && !showFilteredSuggestions && !showFilteredHistory && (
              <EmptyState>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  未找到相关结果
                </Typography>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  按 Enter 键搜索 "{query}"
                </Typography>
              </EmptyState>
            )}

            {query && (
              <SearchAction onClick={handleSearch}>
                <Search size={16} />
                <Typography variant='body2'>搜索 "{query}"</Typography>
              </SearchAction>
            )}
          </SuggestionsPaper>
        </Fade>
      </Container>
    </ClickAwayListener>
  );
};

// 样式化组件
const Container = styled(Box)({
  position: 'relative',
});

const SearchWrapper = styled('div', {
  shouldForwardProp: (prop) => prop !== 'isFocused',
})<{ isFocused?: boolean }>(({ theme, isFocused }) => ({
  display: 'flex',
  alignItems: 'center',
  backgroundColor:
    theme.palette.mode === 'dark'
      ? alpha(theme.palette.common.white, 0.05)
      : theme.palette.grey[100],
  borderRadius: theme.shape.borderRadius,
  border: `1px solid ${isFocused ? theme.palette.primary.main : 'transparent'}`,
  padding: '4px 12px',
  transition: 'all 0.2s',
  '&:hover': {
    backgroundColor:
      theme.palette.mode === 'dark'
        ? alpha(theme.palette.common.white, 0.08)
        : theme.palette.grey[200],
  },
}));

const SearchIconWrapper = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: theme.palette.text.secondary,
  marginRight: 8,
}));

const StyledInputBase = styled(InputBase)(({ _theme }) => ({
  flex: 1,
  color: 'inherit',
  '& .MuiInputBase-input': {
    padding: 0,
    fontSize: '0.875rem',
  },
}));

const ShortcutHint = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 2,
  padding: '2px 6px',
  backgroundColor:
    theme.palette.mode === 'dark'
      ? alpha(theme.palette.common.white, 0.1)
      : theme.palette.grey[200],
  borderRadius: 4,
  fontSize: '0.75rem',
  color: theme.palette.text.secondary,
}));

const SuggestionsPaper = styled(Paper, {
  shouldForwardProp: (prop) => prop !== 'isOpen',
})<{ isOpen?: boolean }>(({ theme, isOpen }) => ({
  position: 'absolute',
  top: '100%',
  left: 0,
  right: 0,
  marginTop: 4,
  zIndex: theme.zIndex.modal,
  display: isOpen ? 'block' : 'none',
  maxHeight: 400,
  overflow: 'auto',
}));

const HistoryHeader = styled('div')(({ _theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '8px 12px',
}));

const SectionTitle = styled(Typography)(({ theme }) => ({
  padding: '8px 12px',
  fontSize: '0.75rem',
  color: theme.palette.text.secondary,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
}));

const SuggestionItem = styled(ListItem, {
  shouldForwardProp: (prop) => prop !== 'isHighlighted',
})<{ isHighlighted?: boolean }>(({ theme, isHighlighted }) => ({
  cursor: 'pointer',
  backgroundColor: isHighlighted
    ? theme.palette.mode === 'dark'
      ? alpha(theme.palette.primary.main, 0.2)
      : `${theme.palette.primary.light}40`
    : 'transparent',
  '&:hover': {
    backgroundColor:
      theme.palette.mode === 'dark'
        ? alpha(theme.palette.primary.main, 0.1)
        : `${theme.palette.primary.light}20`,
  },
  '& .MuiListItemIcon-root': {
    color: theme.palette.text.secondary,
  },
  '& .MuiListItemText-primary': {
    fontSize: '0.875rem',
  },
}));

const EmptyState = styled('div')(({ _theme }) => ({
  padding: 24,
  textAlign: 'center',
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
}));

const SearchAction = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: 12,
  borderTop: `1px solid ${theme.palette.divider}`,
  cursor: 'pointer',
  backgroundColor: `${theme.palette.primary.main}10`,
  '&:hover': {
    backgroundColor: `${theme.palette.primary.main}20`,
  },
}));

export { QuickSearch };
export default QuickSearch;
