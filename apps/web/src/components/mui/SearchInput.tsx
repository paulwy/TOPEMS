import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  Box,
  TextField,
  InputAdornment,
  IconButton,
  Paper,
  List,
  ListItem,
  ListItemText,
  Typography,
  Divider,
  Chip,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { Search, X, Clock, TrendingUp, History } from "lucide-react";

// ============ 类型定义 ============

export interface SearchSuggestion {
  id: string;
  label: string;
  description?: string;
  type?: "recent" | "suggestion" | "result";
  icon?: React.ReactNode;
}

export interface SearchInputProps {
  value?: string;
  onChange?: (value: string) => void;
  onSearch?: (value: string) => void;
  onClear?: () => void;
  placeholder?: string;
  suggestions?: SearchSuggestion[];
  recentSearches?: string[];
  showSuggestions?: boolean;
  onSuggestionClick?: (suggestion: SearchSuggestion) => void;
  loading?: boolean;
  debounceMs?: number;
  fullWidth?: boolean;
  size?: "small" | "medium";
}

// ============ SearchInput 组件 ============

export const SearchInput: React.FC<SearchInputProps> = ({
  value = "",
  onChange,
  onSearch,
  onClear,
  placeholder = "搜索...",
  suggestions,
  recentSearches,
  showSuggestions = true,
  onSuggestionClick,
  loading,
  debounceMs = 300,
  fullWidth = true,
  size = "small",
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [localValue, setLocalValue] = useState(value);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // 同步外部值
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // 外部值变化时更新内部状态
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setLocalValue(newValue);
      onChange?.(newValue);

      // 防抖
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        onSearch?.(newValue);
      }, debounceMs);
    },
    [onChange, onSearch, debounceMs],
  );

  // 清除
  const handleClear = useCallback(() => {
    setLocalValue("");
    onChange?.("");
    onClear?.();
    inputRef.current?.focus();
  }, [onChange, onClear]);

  // 提交搜索
  const handleSubmit = useCallback(() => {
    if (localValue.trim()) {
      onSearch?.(localValue);
      setShowDropdown(false);
    }
  }, [localValue, onSearch]);

  // 按键处理
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleSubmit();
      } else if (e.key === "Escape") {
        setShowDropdown(false);
        inputRef.current?.blur();
      }
    },
    [handleSubmit],
  );

  // 点击建议项
  const handleSuggestionClick = useCallback(
    (suggestion: SearchSuggestion) => {
      setLocalValue(suggestion.label);
      onChange?.(suggestion.label);
      onSuggestionClick?.(suggestion);
      setShowDropdown(false);
    },
    [onChange, onSuggestionClick],
  );

  // 点击历史记录
  const handleRecentClick = useCallback(
    (search: string) => {
      setLocalValue(search);
      onChange?.(search);
      onSearch?.(search);
      setShowDropdown(false);
    },
    [onChange, onSearch],
  );

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 判断是否显示下拉
  const shouldShowDropdown =
    showSuggestions &&
    (localValue.length > 0 || (recentSearches && recentSearches.length > 0));

  return (
    <Box
      ref={containerRef}
      sx={{ position: "relative", width: fullWidth ? "100%" : "auto" }}
    >
      <TextField
        inputRef={inputRef}
        value={localValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => setShowDropdown(true)}
        placeholder={placeholder}
        size={size}
        fullWidth={fullWidth}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search style={{ width: 18, height: 18 }} />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              {loading ? (
                <Typography variant="caption" color="text.secondary">
                  搜索中...
                </Typography>
              ) : localValue ? (
                <IconButton size="small" onClick={handleClear}>
                  <X style={{ width: 16, height: 16 }} />
                </IconButton>
              ) : null}
            </InputAdornment>
          ),
        }}
        sx={{
          "& .MuiOutlinedInput-root": {
            borderRadius: 2,
          },
        }}
      />

      {/* 下拉建议 */}
      {shouldShowDropdown && (
        <Paper
          elevation={4}
          sx={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            mt: 0.5,
            zIndex: 1000,
            maxHeight: 400,
            overflow: "auto",
            borderRadius: 2,
          }}
        >
          {/* 搜索建议 */}
          {suggestions && suggestions.length > 0 && (
            <>
              <Box sx={{ px: 2, py: 1 }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontWeight: 500 }}
                >
                  建议
                </Typography>
              </Box>
              <List disablePadding dense>
                {suggestions.map((suggestion) => (
                  <ListItem
                    key={suggestion.id}
                    button
                    onClick={() => handleSuggestionClick(suggestion)}
                    sx={{
                      py: 1.5,
                      "&:hover": { bgcolor: "action.hover" },
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                        width: "100%",
                      }}
                    >
                      {suggestion.icon || (
                        <TrendingUp
                          style={{ width: 16, height: 16, opacity: 0.5 }}
                        />
                      )}
                      <ListItemText
                        primary={suggestion.label}
                        secondary={suggestion.description}
                        primaryTypographyProps={{ variant: "body2" }}
                        secondaryTypographyProps={{ variant: "caption" }}
                      />
                      {suggestion.type && (
                        <Chip
                          label={
                            suggestion.type === "recent"
                              ? "最近"
                              : suggestion.type
                          }
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: "0.7rem" }}
                        />
                      )}
                    </Box>
                  </ListItem>
                ))}
              </List>
              <Divider />
            </>
          )}

          {/* 历史记录 */}
          {recentSearches && recentSearches.length > 0 && !localValue && (
            <>
              <Box
                sx={{
                  px: 2,
                  py: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontWeight: 500 }}
                >
                  历史记录
                </Typography>
              </Box>
              <List disablePadding dense>
                {recentSearches.slice(0, 5).map((search, index) => (
                  <ListItem
                    key={index}
                    button
                    onClick={() => handleRecentClick(search)}
                    sx={{
                      py: 1.5,
                      "&:hover": { bgcolor: "action.hover" },
                    }}
                  >
                    <History
                      style={{ width: 16, height: 16, mr: 1.5, opacity: 0.5 }}
                    />
                    <ListItemText
                      primary={search}
                      primaryTypographyProps={{ variant: "body2" }}
                    />
                  </ListItem>
                ))}
              </List>
            </>
          )}

          {/* 空状态 */}
          {suggestions?.length === 0 && localValue && (
            <Box sx={{ p: 3, textAlign: "center" }}>
              <Typography variant="body2" color="text.secondary">
                未找到相关结果
              </Typography>
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
};

export default SearchInput;
