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
import { styled, alpha } from '@mui/material/styles';
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

// styled() retained: custom isFocused prop requires shouldForwardProp
const SearchWrapper = styled('div', {
  shouldForwardProp: (prop) => prop !== 'isFocused',
})<{ isFocused?: boolean }>(({ theme, isFocused }) => ({
  display: 'flex',
  alignItems: 'center',
  backgroundColor: 'action.hover',
  borderRadius: theme.shape.borderRadius,
  border: `1px solid ${isFocused ? theme.palette.primary.main : 'transparent'}`,
  padding: '4px 12px',
  transition: 'all 0.2s',
  '&:hover': {
    backgroundColor: 'action.selected',
  },
}));

// styled() retained: custom isOpen prop requires shouldForwardProp
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

// styled() retained: custom isHighlighted prop requires shouldForwardProp
const SuggestionItem = styled(ListItem, {
  shouldForwardProp: (prop) => prop !== 'isHighlighted',
})<{ isHighlighted?: boolean }>(({ theme, isHighlighted }) => ({
  cursor: 'pointer',
  backgroundColor: isHighlighted
    ? alpha(theme.palette.primary.main, 0.12)
    : 'transparent',
  '&:hover': {
    backgroundColor: alpha(theme.palette.primary.main, 0.06),
  },
  '& .MuiListItemIcon-root': {
    color: theme.palette.text.secondary,
  },
  '& .MuiListItemText-primary': {
    fontSize: '0.875rem',
  },
}));

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
  autoFocus = false,
  width = 400,
  disabled = false,
  className,
}) => {
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
      <Box
        ref={containerRef}
        className={className}
        sx={{ position: 'relative', width }}
      >
        {/* 搜索输入框 */}
        <SearchWrapper
          onClick={() => !disabled && setOpen(true)}
          isFocused={isOpen}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'text.secondary',
              mr: 1,
            }}
          >
            <Search size={20} />
          </Box>
          <InputBase
            ref={inputRef}
            placeholder={placeholder}
            value={query}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setOpen(true)}
            disabled={disabled}
            fullWidth
            slotProps={{
              input: {
                'aria-label': 'search' as const,
              },
            }}
            sx={{
              flex: 1,
              color: 'inherit',
              '& .MuiInputBase-input': {
                padding: 0,
                fontSize: '0.875rem',
              },
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
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.25,
                p: '2px 6px',
                bgcolor: 'grey.200',
                borderRadius: 4,
                fontSize: '0.75rem',
                color: 'text.secondary',
              }}
            >
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
            </Box>
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
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: '8px 12px',
                  }}
                >
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
                </Box>
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
                <Typography
                  sx={{
                    p: '8px 12px',
                    fontSize: '0.75rem',
                    color: 'text.secondary',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  建议
                </Typography>
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
                <Typography
                  sx={{
                    p: '8px 12px',
                    fontSize: '0.75rem',
                    color: 'text.secondary',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  历史记录
                </Typography>
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
              <Box
                sx={{
                  p: 3,
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0.5,
                }}
              >
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
              </Box>
            )}

            {query && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  p: 1.5,
                  borderTop: '1px solid',
                  borderColor: 'divider',
                  cursor: 'pointer',
                  bgcolor: alpha('#000', 0.04),
                  '&:hover': {
                    bgcolor: alpha('#000', 0.08),
                  },
                }}
                onClick={handleSearch}
              >
                <Search size={16} />
                <Typography variant='body2'>搜索 "{query}"</Typography>
              </Box>
            )}
          </SuggestionsPaper>
        </Fade>
      </Box>
    </ClickAwayListener>
  );
};

export { QuickSearch };
export default QuickSearch;
