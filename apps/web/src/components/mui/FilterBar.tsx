import React, { useCallback } from "react";
import {
  Box,
  Paper,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Tooltip,
  Typography,
  Chip,
  Button,
  Collapse,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { Filter, X, ChevronDown, ChevronUp, RotateCcw } from "lucide-react";

// ============ 类型定义 ============

export interface FilterOption {
  label: string;
  value: string | number;
}

export interface FilterConfig {
  id: string;
  label: string;
  type: "select" | "multiselect" | "date" | "dateRange" | "text" | "number";
  placeholder?: string;
  options?: FilterOption[];
  value?: any;
  defaultValue?: any;
  onChange?: (value: any, filter: FilterConfig) => void;
  width?: number | string;
}

export interface FilterBarProps {
  filters: FilterConfig[];
  onFilterChange?: (filters: Record<string, any>) => void;
  onReset?: () => void;
  onSearch?: () => void;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  dense?: boolean;
  variant?: "standard" | "outlined" | "filled";
}

// ============ 单个筛选控件 ============

const FilterControl: React.FC<{
  filter: FilterConfig;
  onChange: (value: any, filter: FilterConfig) => void;
  dense?: boolean;
  variant?: "standard" | "outlined" | "filled";
}> = ({ filter, onChange, dense, variant }) => {
  const handleChange = useCallback(
    (e: any) => {
      const value = e.target?.value ?? e;
      onChange(value, filter);
    },
    [filter, onChange],
  );

  const commonProps = {
    size: dense ? "small" : "small",
    variant: variant as any,
    fullWidth: true,
  };

  switch (filter.type) {
    case "select":
      return (
        <FormControl {...commonProps} sx={{ minWidth: filter.width || 150 }}>
          <InputLabel>{filter.label}</InputLabel>
          <Select
            value={filter.value ?? filter.defaultValue ?? ""}
            label={filter.label}
            onChange={handleChange}
          >
            <MenuItem value="">全部</MenuItem>
            {filter.options?.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      );

    case "multiselect":
      return (
        <FormControl {...commonProps} sx={{ minWidth: filter.width || 200 }}>
          <InputLabel>{filter.label}</InputLabel>
          <Select
            multiple
            value={filter.value ?? filter.defaultValue ?? []}
            label={filter.label}
            onChange={handleChange}
            renderValue={(selected) =>
              (selected as any[])
                .map((v) => filter.options?.find((o) => o.value === v)?.label)
                .filter(Boolean)
                .join(", ") || "全部"
            }
          >
            {filter.options?.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      );

    case "date":
      return (
        <TextField
          {...commonProps}
          type="date"
          label={filter.label}
          value={filter.value ?? filter.defaultValue ?? ""}
          onChange={handleChange}
          InputLabelProps={{ shrink: true }}
          sx={{ width: filter.width || 180 }}
        />
      );

    case "dateRange":
      return (
        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
          <TextField
            {...commonProps}
            type="date"
            label="开始日期"
            value={filter.value?.start ?? ""}
            onChange={(e) =>
              handleChange({ ...filter.value, start: e.target.value })
            }
            InputLabelProps={{ shrink: true }}
            sx={{ width: filter.width || 140 }}
          />
          <Typography color="text.secondary">至</Typography>
          <TextField
            {...commonProps}
            type="date"
            label="结束日期"
            value={filter.value?.end ?? ""}
            onChange={(e) =>
              handleChange({ ...filter.value, end: e.target.value })
            }
            InputLabelProps={{ shrink: true }}
            sx={{ width: filter.width || 140 }}
          />
        </Box>
      );

    case "number":
      return (
        <TextField
          {...commonProps}
          type="number"
          label={filter.label}
          placeholder={filter.placeholder}
          value={filter.value ?? filter.defaultValue ?? ""}
          onChange={handleChange}
          sx={{ width: filter.width || 120 }}
        />
      );

    default:
      return (
        <TextField
          {...commonProps}
          label={filter.label}
          placeholder={filter.placeholder}
          value={filter.value ?? filter.defaultValue ?? ""}
          onChange={handleChange}
          sx={{ width: filter.width || 200 }}
        />
      );
  }
};

// ============ FilterBar 组件 ============

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onFilterChange,
  onReset,
  onSearch,
  collapsible = true,
  defaultExpanded = true,
  dense = false,
  variant = "outlined",
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [expanded, setExpanded] = React.useState(defaultExpanded);
  const [localFilters, setLocalFilters] = React.useState<Record<string, any>>(
    () => {
      const initial: Record<string, any> = {};
      filters.forEach((f) => {
        initial[f.id] = f.value ?? f.defaultValue;
      });
      return initial;
    },
  );

  // 同步外部 filters 变化
  React.useEffect(() => {
    const newFilters: Record<string, any> = {};
    filters.forEach((f) => {
      newFilters[f.id] = f.value ?? f.defaultValue;
    });
    setLocalFilters(newFilters);
  }, [filters]);

  // 筛选变化
  const handleFilterChange = useCallback(
    (value: any, filter: FilterConfig) => {
      const newFilters = { ...localFilters, [filter.id]: value };
      setLocalFilters(newFilters);
      filter.onChange?.(value, filter);
      onFilterChange?.(newFilters);
    },
    [localFilters, onFilterChange],
  );

  // 重置
  const handleReset = useCallback(() => {
    const resetFilters: Record<string, any> = {};
    filters.forEach((f) => {
      resetFilters[f.id] = f.defaultValue;
    });
    setLocalFilters(resetFilters);
    onReset?.();
  }, [filters, onReset]);

  // 是否有筛选条件
  const hasActiveFilters = Object.values(localFilters).some(
    (v) =>
      v !== undefined &&
      v !== "" &&
      v !== null &&
      !(Array.isArray(v) && v.length === 0),
  );

  // 已选中的筛选器数量
  const activeCount = Object.entries(localFilters).filter(
    ([, v]) =>
      v !== undefined &&
      v !== "" &&
      v !== null &&
      !(Array.isArray(v) && v.length === 0),
  ).length;

  return (
    <Paper
      sx={{
        p: dense ? 1.5 : 2,
        borderRadius: 2,
        mb: 2,
      }}
    >
      {/* 头部 */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
          mb: expanded ? (dense ? 1.5 : 2) : 0,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Filter style={{ width: 18, height: 18 }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            筛选条件
          </Typography>
          {activeCount > 0 && (
            <Chip
              label={activeCount}
              size="small"
              color="primary"
              sx={{ height: 20, fontSize: "0.75rem" }}
            />
          )}
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {onSearch && (
            <Button
              size="small"
              variant="contained"
              onClick={onSearch}
              disabled={!hasActiveFilters}
            >
              搜索
            </Button>
          )}
          {onReset && (
            <Tooltip title="重置筛选">
              <IconButton size="small" onClick={handleReset}>
                <RotateCcw style={{ width: 16, height: 16 }} />
              </IconButton>
            </Tooltip>
          )}
          {collapsible && (
            <IconButton size="small" onClick={() => setExpanded(!expanded)}>
              {expanded ? (
                <ChevronUp style={{ width: 18, height: 18 }} />
              ) : (
                <ChevronDown style={{ width: 18, height: 18 }} />
              )}
            </IconButton>
          )}
        </Box>
      </Box>

      {/* 筛选控件 */}
      <Collapse in={expanded}>
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 2,
            alignItems: "flex-start",
          }}
        >
          {filters.map((filter) => (
            <FilterControl
              key={filter.id}
              filter={{ ...filter, value: localFilters[filter.id] }}
              onChange={handleFilterChange}
              dense={dense}
              variant={variant}
            />
          ))}
        </Box>
      </Collapse>

      {/* 移动端折叠时显示已选条件 */}
      {!expanded && hasActiveFilters && isMobile && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="caption" color="text.secondary">
            已应用 {activeCount} 个筛选条件
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default FilterBar;
