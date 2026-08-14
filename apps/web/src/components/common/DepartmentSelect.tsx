import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  TextField,
  Menu,
  MenuItem,
  ListItemText,
  Chip,
  CircularProgress,
} from '@mui/material';
import i18n from '@/i18n';
import { Search, Building2, ChevronRight, ChevronDown, Check } from 'lucide-react';

export interface Department {
  id: string;
  name: string;
  parentId?: string;
  children?: Department[];
  depth?: number;
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

const flattenDepartments = (departments: Department[], depth = 0): Department[] => {
  let result: Department[] = [];
  for (const dept of departments) {
    result.push({ ...dept, depth });
    if (dept.children && dept.children.length > 0) {
      result = result.concat(flattenDepartments(dept.children, depth + 1));
    }
  }
  return result;
};

export const DepartmentSelect: React.FC<DepartmentSelectProps> = ({
  value,
  onChange,
  multiple = false,
  placeholder = i18n.t('components.department_select.k0'),
  disabled = false,
  loading = false,
  departments = [],
  onSearch,
  allowClear = true,
}) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    new Set(departments.filter((d) => d.children?.length).map((d) => d.id))
  );

  useEffect(() => {
    onSearch?.(searchKeyword);
  }, [searchKeyword, onSearch]);

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      if (!disabled) {
        setAnchorEl(event.currentTarget);
        setSearchKeyword('');
      }
    },
    [disabled]
  );

  const handleClose = useCallback(() => {
    setAnchorEl(null);
    setSearchKeyword('');
  }, []);

  const handleSelect = useCallback(
    (dept: Department) => {
      if (multiple) {
        const currentValue = (value as Department[]) || [];
        const exists = currentValue.some((d) => d.id === dept.id);
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
    [value, multiple, onChange, handleClose]
  );

  const handleClear = useCallback(() => {
    onChange(null);
  }, [onChange]);

  const handleToggleExpand = useCallback((deptId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(deptId)) {
        next.delete(deptId);
      } else {
        next.add(deptId);
      }
      return next;
    });
  }, []);

  const isVisible = (dept: Department): boolean => {
    let current: Department | undefined = dept;
    while (current !== undefined) {
      const pId: string | undefined = current.parentId;
      if (pId && !expandedIds.has(pId)) {
        return false;
      }
      const p: Department | undefined = departments.find((d) => d.id === pId);
      current = p;
    }
    return true;
  };

  const selectedIds = multiple
    ? (value as Department[])?.map((d) => d.id) || []
    : [(value as Department)?.id].filter(Boolean);

  const displayValue = multiple
    ? (value as Department[])?.map((d) => d.name).join(', ')
    : (value as Department)?.name;

  const flattenedDepartments = flattenDepartments(departments);

  return (
    <Box>
      <TextField
        fullWidth
        size='small'
        value={displayValue || ''}
        placeholder={placeholder}
        onClick={handleClick}
        disabled={disabled}
        slotProps={{
          input: {
            readOnly: true,
            endAdornment: (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {allowClear && value && (
                  <Chip
                    size='small'
                    label={i18n.t('components.department_select.k1')}
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
        slotProps={{ paper: { sx: { maxHeight: 400, width: '400px' } } }}
      >
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <TextField
            size='small'
            placeholder={i18n.t('components.department_select.k0')}
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
          <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
            <CircularProgress size={24} />
          </Box>
        ) : flattenedDepartments.length === 0 ? (
          <MenuItem disabled>
            <ListItemText primary={i18n.t('components.department_select.k2')} />
          </MenuItem>
        ) : (
          flattenedDepartments.filter(isVisible).map((dept) => {
            const isSelected = selectedIds.includes(dept.id);
            const hasChildren = dept.children && dept.children.length > 0;
            const isExpanded = expandedIds.has(dept.id);
            const depth = ((dept as unknown as Record<string, unknown>).depth as number) || 0;

            return (
              <MenuItem
                key={dept.id}
                onClick={() => {
                  if (hasChildren) {
                    handleToggleExpand(dept.id);
                  }
                  handleSelect(dept);
                }}
                selected={isSelected}
                sx={{ pl: depth * 2 + 1, minHeight: 'auto', py: 1 }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                  {hasChildren && (
                    <Box
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleExpand(dept.id);
                      }}
                      sx={{ cursor: 'pointer' }}
                    >
                      {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </Box>
                  )}
                  {!hasChildren && <Box sx={{ width: 16 }} />}
                  <Building2
                    size={16}
                    sx={{ color: 'text.secondary' }}
                  />
                  <ListItemText
                    primary={dept.name}
                    sx={{ flex: 1 }}
                  />
                  {isSelected && <Check size={16} />}
                </Box>
              </MenuItem>
            );
          })
        )}
      </Menu>
    </Box>
  );
};

export default DepartmentSelect;
