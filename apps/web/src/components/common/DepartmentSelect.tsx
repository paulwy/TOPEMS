import React, { useState, useCallback, useEffect } from "react";
import {
  Box,
  TextField,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Chip,
  CircularProgress,
  Collapse,
} from "@mui/material";
import {
  Search,
  Building2,
  ChevronRight,
  ChevronDown,
  Check,
  X,
} from "lucide-react";

export interface Department {
  id: string;
  name: string;
  parentId?: string;
  children?: Department[];
}

export interface DepartmentSelectProps {
  value?: Department | Department[] | null;
  onChange: (value: Department | Department[] | null) => void;
  multiple?: boolean;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  departments?: Department[];
  onSearch?: (keyword: string) => void;
  allowClear?: boolean;
}

const TreeNode: React.FC<{
  node: Department;
  selected: boolean;
  onClick: () => void;
  onToggleExpand: () => void;
  expanded: boolean;
  depth: number;
}> = ({ node, selected, onClick, onToggleExpand, expanded, depth }) => {
  const hasChildren = node.children && node.children.length > 0;

  return (
    <React.Fragment>
      <MenuItem
        onClick={onClick}
        selected={selected}
        sx={{ pl: depth * 2 + 1, minHeight: "auto", py: 1 }}
      >
        <Box
          sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%" }}
        >
          {hasChildren && (
            <Box
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand();
              }}
              sx={{ cursor: "pointer" }}
            >
              {expanded ? (
                <ChevronDown size={16} />
              ) : (
                <ChevronRight size={16} />
              )}
            </Box>
          )}
          {!hasChildren && <Box sx={{ width: 16 }} />}
          <Building2 size={16} sx={{ color: "text.secondary" }} />
          <ListItemText primary={node.name} sx={{ flex: 1 }} />
          {selected && <Check size={16} />}
        </Box>
      </MenuItem>
      {hasChildren && expanded && (
        <Collapse in={expanded}>
          {node.children!.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              selected={false}
              onClick={() => {}}
              onToggleExpand={() => {}}
              expanded={false}
              depth={depth + 1}
            />
          ))}
        </Collapse>
      )}
    </React.Fragment>
  );
};

const DepartmentTree: React.FC<{
  departments: Department[];
  selectedIds: string[];
  onSelect: (dept: Department) => void;
}> = ({ departments, selectedIds, onSelect }) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    new Set(departments.filter((d) => d.children?.length).map((d) => d.id)),
  );

  const renderTree = (nodes: Department[], depth = 0) => {
    return nodes.map((node) => {
      const isSelected = selectedIds.includes(node.id);
      const isExpanded = expandedIds.has(node.id);
      const hasChildren = node.children && node.children.length > 0;

      return (
        <React.Fragment key={node.id}>
          <MenuItem
            onClick={() => onSelect(node)}
            selected={isSelected}
            sx={{ pl: depth * 2 + 1, minHeight: "auto", py: 1 }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                width: "100%",
              }}
            >
              {hasChildren && (
                <Box
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedIds((prev) => {
                      const next = new Set(prev);
                      if (next.has(node.id)) {
                        next.delete(node.id);
                      } else {
                        next.add(node.id);
                      }
                      return next;
                    });
                  }}
                  sx={{ cursor: "pointer" }}
                >
                  {isExpanded ? (
                    <ChevronDown size={16} />
                  ) : (
                    <ChevronRight size={16} />
                  )}
                </Box>
              )}
              {!hasChildren && <Box sx={{ width: 16 }} />}
              <Building2 size={16} sx={{ color: "text.secondary" }} />
              <ListItemText primary={node.name} sx={{ flex: 1 }} />
              {isSelected && <Check size={16} />}
            </Box>
          </MenuItem>
          {hasChildren && isExpanded && (
            <Collapse in={isExpanded}>
              {renderTree(node.children!, depth + 1)}
            </Collapse>
          )}
        </React.Fragment>
      );
    });
  };

  return <>{renderTree(departments)}</>;
};

export const DepartmentSelect: React.FC<DepartmentSelectProps> = ({
  value,
  onChange,
  multiple = false,
  placeholder = "选择部门",
  disabled = false,
  loading = false,
  departments = [],
  onSearch,
  allowClear = true,
}) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [searchKeyword, setSearchKeyword] = useState("");

  useEffect(() => {
    onSearch?.(searchKeyword);
  }, [searchKeyword, onSearch]);

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      if (!disabled) {
        setAnchorEl(event.currentTarget);
        setSearchKeyword("");
      }
    },
    [disabled],
  );

  const handleClose = useCallback(() => {
    setAnchorEl(null);
    setSearchKeyword("");
  }, []);

  const handleSelect = useCallback(
    (dept: Department) => {
      if (multiple) {
        const currentValue = (value as Department[]) || [];
        const exists = currentValue.find((d) => d.id === dept.id);
        if (exists) {
          onChange(currentValue.filter((d) => d.id !== dept.id));
        } else {
          onChange([...currentValue, dept]);
        }
      } else {
        onChange(dept);
        handleClose();
      }
    },
    [value, multiple, onChange, handleClose],
  );

  const handleClear = useCallback(() => {
    onChange(null);
  }, [onChange]);

  const selectedIds = multiple
    ? (value as Department[])?.map((d) => d.id) || []
    : [(value as Department)?.id].filter(Boolean);

  const displayValue = multiple
    ? (value as Department[])?.map((d) => d.name).join(", ")
    : (value as Department)?.name;

  return (
    <Box>
      <TextField
        fullWidth
        size="small"
        value={displayValue || ""}
        placeholder={placeholder}
        onClick={handleClick}
        disabled={disabled}
        slotProps={{
          input: {
            readOnly: true,
            endAdornment: (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                {allowClear && value && (
                  <Chip
                    size="small"
                    label="清除"
                    onDelete={handleClear}
                    sx={{ minWidth: 0, height: 24 }}
                  />
                )}
              </Box>
            ),
          },
        }}
      />

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        slotProps={{ paper: { sx: { maxHeight: 400, width: "400px" } } }}
      >
        <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
          <TextField
            size="small"
            placeholder="搜索部门..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <Box sx={{ mr: 1 }}>
                    <Search size={16} />
                  </Box>
                ),
              },
            }}
            fullWidth
          />
        </Box>

        {loading ? (
          <Box sx={{ p: 4, display: "flex", justifyContent: "center" }}>
            <CircularProgress size={24} />
          </Box>
        ) : departments.length === 0 ? (
          <MenuItem disabled>
            <ListItemText primary="暂无部门" />
          </MenuItem>
        ) : (
          <DepartmentTree
            departments={departments}
            selectedIds={selectedIds}
            onSelect={handleSelect}
          />
        )}
      </Menu>
    </Box>
  );
};

export default DepartmentSelect;
