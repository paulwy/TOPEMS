import React from 'react';
import {
  Button as MuiButton,
  Card as MuiCard,
  CardHeader,
  CardContent,
  CardActions,
  TextField as MuiTextField,
  Select as MuiSelect,
  MenuItem,
  FormControl,
  InputLabel,
  Table as MuiTable,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Paper,
  Checkbox,
  IconButton,
  Dialog as MuiDialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs as MuiTabs,
  Tab as MuiTab,
  Badge as MuiBadge,
  Skeleton as MuiSkeleton,
  Avatar as MuiAvatar,
  AvatarGroup,
  Box,
  Typography,
  Chip,
  Tooltip,
  type SxProps,
  type Theme,
} from '@mui/material';
import { Search, X as XIcon, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { v51DesignTokens } from '../tokens/v51-tokens';

// ============================================================
// V51.0 Design System Components
// 基于 MUI 的 V51 设计系统组件库
// ============================================================

export type V51ButtonVariant = 'primary' | 'secondary' | 'outline' | 'text' | 'icon';
export type V51ButtonSize = 'sm' | 'md' | 'lg';
export type V51ButtonColor = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';

export interface V51ButtonProps {
  variant?: V51ButtonVariant;
  size?: V51ButtonSize;
  color?: V51ButtonColor;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  children?: React.ReactNode;
  sx?: SxProps<Theme>;
  type?: 'button' | 'submit' | 'reset';
  href?: string;
}

export const V51Button: React.FC<V51ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  color = 'primary',
  disabled = false,
  loading = false,
  fullWidth = false,
  startIcon,
  endIcon,
  onClick,
  children,
  sx,
  type = 'button',
  href,
}) => {
  const sizeMap: Record<V51ButtonSize, { height: number; padding: string; fontSize: string }> = {
    sm: { height: 32, padding: '6px 12px', fontSize: v51DesignTokens.typography.fontSize.sm },
    md: { height: 40, padding: '8px 16px', fontSize: v51DesignTokens.typography.fontSize.sm },
    lg: { height: 48, padding: '12px 24px', fontSize: v51DesignTokens.typography.fontSize.base },
  };

  const variantMap: Record<V51ButtonVariant, 'contained' | 'outlined' | 'text'> = {
    primary: 'contained',
    secondary: 'contained',
    outline: 'outlined',
    text: 'text',
    icon: 'text',
  };

  const { height, padding, fontSize } = sizeMap[size];
  const muiVariant = variantMap[variant];
  const isIconOnly = variant === 'icon';

  return (
    <MuiButton
      variant={muiVariant}
      color={color}
      disabled={disabled || loading}
      onClick={onClick}
      type={type}
      href={href}
      fullWidth={fullWidth}
      sx={{
        height,
        minWidth: isIconOnly ? height : 'auto',
        width: isIconOnly ? height : 'auto',
        padding: isIconOnly ? 0 : padding,
        fontSize,
        fontWeight: v51DesignTokens.typography.fontWeight.medium,
        borderRadius: v51DesignTokens.borderRadius.lg,
        textTransform: 'none',
        boxShadow:
          variant === 'primary' || variant === 'secondary' ? v51DesignTokens.shadows.sm : 'none',
        '&:hover': {
          boxShadow:
            variant === 'primary' || variant === 'secondary' ? v51DesignTokens.shadows.md : 'none',
        },
        '&.MuiButton-outlined': {
          borderWidth: '1px',
        },
        ...sx,
      }}
      startIcon={loading ? undefined : startIcon}
      endIcon={loading ? undefined : endIcon}
      loading={loading}
      loadingPosition='center'
    >
      {children}
    </MuiButton>
  );
};

export interface V51CardProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  headerAction?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  sx?: SxProps<Theme>;
  contentSx?: SxProps<Theme>;
  headerSx?: SxProps<Theme>;
  footerSx?: SxProps<Theme>;
  bordered?: boolean;
  elevated?: boolean;
}

export const V51Card: React.FC<V51CardProps> = ({
  title,
  subtitle,
  headerAction,
  icon,
  action,
  children,
  footer,
  sx,
  contentSx,
  headerSx,
  footerSx,
  bordered = true,
  elevated = false,
}) => {
  const resolvedAction = headerAction ?? action;
  return (
    <MuiCard
      sx={{
        borderRadius: v51DesignTokens.borderRadius.xl,
        backgroundColor: 'var(--v51-surface-card)',
        border: bordered ? '1px solid var(--v51-border-default)' : 'none',
        boxShadow: elevated ? v51DesignTokens.shadows.md : 'none',
        overflow: 'hidden',
        ...sx,
      }}
    >
      {(title || resolvedAction || icon) && (
        <CardHeader
          sx={{
            padding: '16px 20px',
            borderBottom: children ? '1px solid var(--v51-border-default)' : 'none',
            '& .MuiCardHeader-title': {
              fontSize: v51DesignTokens.typography.fontSize.lg,
              fontWeight: v51DesignTokens.typography.fontWeight.semibold,
              color: 'var(--v51-text-primary)',
            },
            '& .MuiCardHeader-subheader': {
              fontSize: v51DesignTokens.typography.fontSize.sm,
              color: 'var(--v51-text-secondary)',
              mt: 0.5,
            },
            ...headerSx,
          }}
          title={title}
          subheader={subtitle}
          action={resolvedAction}
          avatar={icon}
        />
      )}
      <CardContent
        sx={{
          padding: 2.5,
          '&:last-child': { paddingBottom: '20px' },
          ...contentSx,
        }}
      >
        {children}
      </CardContent>
      {footer && (
        <CardActions
          sx={{
            padding: '16px 20px',
            borderTop: '1px solid var(--v51-border-default)',
            gap: 1,
            ...footerSx,
          }}
        >
          {footer}
        </CardActions>
      )}
    </MuiCard>
  );
};

export type V51InputValidationState = 'default' | 'success' | 'warning' | 'error';

export interface V51InputProps {
  label?: string;
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  type?: 'text' | 'password' | 'email' | 'number' | 'tel' | 'url';
  validationState?: V51InputValidationState;
  helperText?: string;
  error?: boolean;
  required?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  multiline?: boolean;
  rows?: number;
  maxLength?: number;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  onFocus?: () => void;
  startAdornment?: React.ReactNode;
  endAdornment?: React.ReactNode;
  name?: string;
  id?: string;
  autoComplete?: string;
  sx?: SxProps<Theme>;
  inputRef?: React.RefObject<HTMLInputElement>;
}

export const V51Input: React.FC<V51InputProps> = ({
  label,
  value,
  defaultValue,
  placeholder,
  type = 'text',
  validationState = 'default',
  helperText,
  error,
  required = false,
  disabled = false,
  fullWidth = true,
  multiline = false,
  rows,
  maxLength,
  onChange,
  onBlur,
  onFocus,
  startAdornment,
  endAdornment,
  name,
  id,
  autoComplete,
  sx,
  inputRef,
}) => {
  const borderColorMap: Record<V51InputValidationState, string> = {
    default: 'var(--v51-border-default)',
    success: v51DesignTokens.colors.success.main,
    warning: v51DesignTokens.colors.warning.main,
    error: v51DesignTokens.colors.error.main,
  };

  const helperTextColorMap: Record<V51InputValidationState, string> = {
    default: 'var(--v51-text-secondary)',
    success: v51DesignTokens.colors.success.main,
    warning: v51DesignTokens.colors.warning.main,
    error: v51DesignTokens.colors.error.main,
  };

  const resolvedError = error || validationState === 'error';

  return (
    <MuiTextField
      fullWidth={fullWidth}
      label={label}
      value={value}
      defaultValue={defaultValue}
      placeholder={placeholder}
      type={type}
      error={resolvedError}
      required={required}
      disabled={disabled}
      multiline={multiline}
      rows={rows}
      onChange={(e) => onChange?.(e.target.value)}
      onBlur={onBlur}
      onFocus={onFocus}
      name={name}
      id={id}
      autoComplete={autoComplete}
      inputRef={inputRef}
      helperText={helperText}
      sx={{
        '& .MuiOutlinedInput-root': {
          borderRadius: v51DesignTokens.borderRadius.lg,
          backgroundColor: 'var(--v51-surface-card)',
          transition: `border-color ${v51DesignTokens.motion.transition.fast}, box-shadow ${v51DesignTokens.motion.transition.fast}`,
          '& fieldset': {
            borderColor: borderColorMap[validationState],
            transition: 'border-color 150ms ease',
          },
          '&:hover fieldset': {
            borderColor:
              validationState === 'default'
                ? 'var(--v51-border-strong)'
                : borderColorMap[validationState],
          },
          '&.Mui-focused fieldset': {
            borderColor: borderColorMap[validationState],
            borderWidth: '2px',
          },
        },
        '& .MuiFormHelperText-root': {
          color: helperTextColorMap[validationState],
          fontSize: v51DesignTokens.typography.fontSize.xs,
        },
        '& .MuiInputLabel-root': {
          color: 'var(--v51-text-secondary)',
          '&.Mui-focused': {
            color: borderColorMap[validationState],
          },
        },
        ...sx,
      }}
      slotProps={{
        input: {
          startAdornment,
          endAdornment,
        },
        htmlInput: { maxLength },
      }}
    />
  );
};

export interface V51SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
  children?: React.ReactNode;
}

export interface V51SelectProps {
  label?: string;
  value?: string | number;
  defaultValue?: string | number;
  options: V51SelectOption[];
  placeholder?: string;
  searchable?: boolean;
  error?: boolean;
  required?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  helperText?: string;
  onChange?: (value: string | number) => void;
  sx?: SxProps<Theme>;
}

export const V51Select: React.FC<V51SelectProps> = ({
  label,
  value,
  defaultValue,
  options,
  placeholder = '请选择',
  searchable = false,
  error = false,
  required = false,
  disabled = false,
  fullWidth = true,
  helperText,
  onChange,
  sx,
}) => {
  const [searchText, setSearchText] = React.useState('');
  const [open, setOpen] = React.useState(false);

  const filteredOptions =
    searchable && searchText
      ? options.filter((opt) => opt.label.toLowerCase().includes(searchText.toLowerCase()))
      : options;

  return (
    <FormControl
      fullWidth={fullWidth}
      error={error}
      required={required}
      disabled={disabled}
      sx={{ minWidth: 200, ...sx }}
    >
      {label && (
        <InputLabel
          sx={{
            color: 'var(--v51-text-secondary)',
            '&.Mui-focused': { color: 'var(--v51-color-primary-main)' },
          }}
        >
          {label}
        </InputLabel>
      )}
      <MuiSelect
        value={value ?? ''}
        defaultValue={defaultValue ?? ''}
        label={label}
        onChange={(e) => onChange?.(e.target.value)}
        onOpen={() => setOpen(true)}
        onClose={() => setOpen(false)}
        sx={{
          borderRadius: v51DesignTokens.borderRadius.lg,
          backgroundColor: 'var(--v51-surface-card)',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'var(--v51-border-default)',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: 'var(--v51-border-strong)',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: 'var(--v51-color-primary-main)',
            borderWidth: '2px',
          },
        }}
        MenuProps={{
          slotProps: {
            paper: {
              sx: {
                borderRadius: v51DesignTokens.borderRadius.lg,
                boxShadow: v51DesignTokens.shadows.lg,
                border: '1px solid var(--v51-border-default)',
                mt: 0.5,
              },
            },
          },
        }}
      >
        {searchable && open && (
          <Box
            sx={{
              px: 1.5,
              py: 1,
              position: 'sticky',
              top: 0,
              bgcolor: 'var(--v51-surface-card)',
              zIndex: 1,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 1,
                py: 0.5,
                borderRadius: 1,
                bgcolor: 'var(--v51-fill-subtle)',
              }}
            >
              <Search
                size={16}
                style={{ color: 'var(--v51-text-tertiary)' }}
              />
              <input
                autoFocus
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder='搜索...'
                style={{
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  fontSize: v51DesignTokens.typography.fontSize.sm,
                  color: 'var(--v51-text-primary)',
                  width: '100%',
                }}
              />
            </Box>
          </Box>
        )}
        <MenuItem
          value=''
          disabled
        >
          <Typography
            sx={{
              color: 'var(--v51-text-tertiary)',
              fontSize: v51DesignTokens.typography.fontSize.sm,
            }}
          >
            {placeholder}
          </Typography>
        </MenuItem>
        {filteredOptions.map((opt) => (
          <MenuItem
            key={opt.value}
            value={opt.value}
            disabled={opt.disabled}
            sx={{
              fontSize: v51DesignTokens.typography.fontSize.sm,
              borderRadius: v51DesignTokens.borderRadius.sm,
              mx: 0.5,
              my: 0.25,
              minHeight: 36,
            }}
          >
            {opt.label}
          </MenuItem>
        ))}
      </MuiSelect>
      {helperText && (
        <Typography
          sx={{
            fontSize: v51DesignTokens.typography.fontSize.xs,
            color: error ? v51DesignTokens.colors.error.main : 'var(--v51-text-secondary)',
            mt: 0.5,
          }}
        >
          {helperText}
        </Typography>
      )}
    </FormControl>
  );
};

export type V51SortDirection = 'asc' | 'desc';

export interface V51TableColumn<T = any> {
  id: string;
  label: string;
  accessor?: keyof T;
  sortable?: boolean;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  render?: (value: any, row: T) => React.ReactNode;
}

export interface V51TableProps<T = any> {
  columns: V51TableColumn<T>[];
  data: T[];
  rowKey?: keyof T;
  selectable?: boolean;
  selectedRows?: T[];
  onSelectionChange?: (rows: T[]) => void;
  sortable?: boolean;
  sortBy?: string;
  sortDirection?: V51SortDirection;
  onSort?: (column: string, direction: V51SortDirection) => void;
  pagination?: boolean;
  page?: number;
  pageSize?: number;
  pageSizeOptions?: number[];
  totalCount?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  loading?: boolean;
  emptyMessage?: string;
  maxHeight?: number | string;
  sx?: SxProps<Theme>;
  density?: 'compact' | 'default' | 'comfortable';
}

export function V51Table<T extends Record<string, any>>({
  columns,
  data,
  rowKey,
  selectable = false,
  selectedRows = [],
  onSelectionChange,
  sortable = false,
  sortBy,
  sortDirection = 'asc',
  onSort,
  pagination = true,
  page = 0,
  pageSize = 10,
  pageSizeOptions = [5, 10, 25, 50],
  totalCount,
  onPageChange,
  onPageSizeChange,
  loading = false,
  emptyMessage = '暂无数据',
  maxHeight,
  sx,
  density = 'default',
}: V51TableProps<T>) {
  const [internalPage, setInternalPage] = React.useState(page);
  const [internalPageSize, setInternalPageSize] = React.useState(pageSize);

  const effectivePage = onPageChange ? page : internalPage;
  const effectivePageSize = onPageSizeChange ? pageSize : internalPageSize;

  const paginatedData = pagination
    ? data.slice(
        effectivePage * effectivePageSize,
        effectivePage * effectivePageSize + effectivePageSize
      )
    : data;

  const total = totalCount ?? data.length;

  const handleSort = (columnId: string) => {
    if (!sortable || !onSort) return;
    const newDirection = sortBy === columnId && sortDirection === 'asc' ? 'desc' : 'asc';
    onSort(columnId, newDirection);
  };

  const allSelected =
    selectable &&
    paginatedData.length > 0 &&
    paginatedData.every((row) =>
      selectedRows.some((sr) => JSON.stringify(sr) === JSON.stringify(row))
    );

  const handleSelectAll = () => {
    if (!selectable || !onSelectionChange) return;
    if (allSelected) {
      onSelectionChange(
        selectedRows.filter(
          (sr) => !paginatedData.some((pd) => JSON.stringify(pd) === JSON.stringify(sr))
        )
      );
    } else {
      const newRows = [...selectedRows];
      paginatedData.forEach((row) => {
        if (!newRows.some((sr) => JSON.stringify(sr) === JSON.stringify(row))) {
          newRows.push(row);
        }
      });
      onSelectionChange(newRows);
    }
  };

  const handleRowSelect = (row: T) => {
    if (!selectable || !onSelectionChange) return;
    const isSelected = selectedRows.some((sr) => JSON.stringify(sr) === JSON.stringify(row));
    if (isSelected) {
      onSelectionChange(selectedRows.filter((sr) => JSON.stringify(sr) !== JSON.stringify(row)));
    } else {
      onSelectionChange([...selectedRows, row]);
    }
  };

  const cellPadding =
    density === 'compact' ? '6px 12px' : density === 'comfortable' ? '16px 20px' : '12px 16px';

  return (
    <Paper
      sx={{
        borderRadius: v51DesignTokens.borderRadius.xl,
        border: '1px solid var(--v51-border-default)',
        overflow: 'hidden',
        ...sx,
      }}
    >
      <TableContainer sx={{ maxHeight }}>
        <MuiTable
          stickyHeader
          size={density === 'compact' ? 'small' : 'medium'}
        >
          <TableHead>
            <TableRow>
              {selectable && (
                <TableCell
                  padding='checkbox'
                  sx={{
                    bgcolor: 'var(--v51-surface-sunken)',
                    borderBottom: '1px solid var(--v51-border-default)',
                  }}
                >
                  <Checkbox
                    checked={allSelected}
                    onChange={handleSelectAll}
                    size='small'
                  />
                </TableCell>
              )}
              {columns.map((col) => (
                <TableCell
                  key={col.id}
                  align={col.align || 'left'}
                  sx={{
                    bgcolor: 'var(--v51-surface-sunken)',
                    borderBottom: '1px solid var(--v51-border-default)',
                    fontWeight: v51DesignTokens.typography.fontWeight.semibold,
                    fontSize: v51DesignTokens.typography.fontSize.sm,
                    color: 'var(--v51-text-secondary)',
                    padding: cellPadding,
                    width: col.width,
                  }}
                  sortDirection={sortBy === col.id ? sortDirection : false}
                >
                  {sortable && col.sortable ? (
                    <TableSortLabel
                      active={sortBy === col.id}
                      direction={sortBy === col.id ? sortDirection : 'asc'}
                      onClick={() => handleSort(col.id)}
                      sx={{
                        '&.Mui-active': { color: 'var(--v51-color-primary-main)' },
                      }}
                    >
                      {col.label}
                    </TableSortLabel>
                  ) : (
                    col.label
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              Array.from({ length: effectivePageSize }).map((_, idx) => (
                <TableRow key={`skeleton-${idx}`}>
                  {selectable && (
                    <TableCell padding='checkbox'>
                      <MuiSkeleton sx={{ borderRadius: 1 }} />
                    </TableCell>
                  )}
                  {columns.map((col) => (
                    <TableCell
                      key={col.id}
                      sx={{ padding: cellPadding }}
                    >
                      <MuiSkeleton sx={{ borderRadius: 1 }} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : paginatedData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  align='center'
                  sx={{ py: 6, color: 'var(--v51-text-tertiary)' }}
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((row, rowIndex) => {
                const key = rowKey ? (row[rowKey] as string) : rowIndex;
                const isRowSelected = selectedRows.some(
                  (sr) => JSON.stringify(sr) === JSON.stringify(row)
                );
                return (
                  <TableRow
                    key={key}
                    hover
                    selected={isRowSelected}
                    sx={{
                      '&.Mui-selected': {
                        bgcolor: 'var(--v51-color-primary-50)',
                      },
                      '&:hover': {
                        bgcolor: 'var(--v51-fill-subtle)',
                      },
                    }}
                  >
                    {selectable && (
                      <TableCell padding='checkbox'>
                        <Checkbox
                          checked={isRowSelected}
                          onChange={() => handleRowSelect(row)}
                          size='small'
                        />
                      </TableCell>
                    )}
                    {columns.map((col) => (
                      <TableCell
                        key={col.id}
                        align={col.align || 'left'}
                        sx={{
                          borderBottom: '1px solid var(--v51-border-subtle)',
                          padding: cellPadding,
                          fontSize: v51DesignTokens.typography.fontSize.sm,
                          color: 'var(--v51-text-primary)',
                        }}
                      >
                        {col.render
                          ? col.render(col.accessor ? row[col.accessor] : null, row)
                          : col.accessor
                            ? row[col.accessor]
                            : null}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </MuiTable>
      </TableContainer>
      {pagination && (
        <TablePagination
          component='div'
          count={total}
          page={effectivePage}
          onPageChange={(_, newPage) => {
            if (onPageChange) {
              onPageChange(newPage);
            } else {
              setInternalPage(newPage);
            }
          }}
          rowsPerPage={effectivePageSize}
          onRowsPerPageChange={(e) => {
            const newSize = parseInt(e.target.value, 10);
            if (onPageSizeChange) {
              onPageSizeChange(newSize);
            } else {
              setInternalPageSize(newSize);
            }
            if (onPageChange) {
              onPageChange(0);
            } else {
              setInternalPage(0);
            }
          }}
          rowsPerPageOptions={pageSizeOptions}
          sx={{
            borderTop: '1px solid var(--v51-border-default)',
            fontSize: v51DesignTokens.typography.fontSize.sm,
            color: 'var(--v51-text-secondary)',
          }}
        />
      )}
    </Paper>
  );
}

export interface V51DialogProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmLoading?: boolean;
  confirmDisabled?: boolean;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  fullWidth?: boolean;
  closable?: boolean;
  showCloseButton?: boolean;
  footer?: React.ReactNode;
  sx?: SxProps<Theme>;
}

export const V51Dialog: React.FC<V51DialogProps> = ({
  open,
  onClose,
  title,
  children,
  confirmText = '确认',
  cancelText = '取消',
  onConfirm,
  onCancel,
  confirmLoading = false,
  confirmDisabled = false,
  maxWidth = 'sm',
  fullWidth = true,
  closable = true,
  showCloseButton = true,
  footer,
  sx,
}) => {
  return (
    <MuiDialog
      open={open}
      onClose={closable ? onClose : undefined}
      maxWidth={maxWidth}
      fullWidth={fullWidth}
      sx={{
        '& .MuiDialog-paper': {
          borderRadius: v51DesignTokens.borderRadius['2xl'],
          boxShadow: v51DesignTokens.shadows['2xl'],
          border: '1px solid var(--v51-border-default)',
        },
        ...sx,
      }}
    >
      {title && (
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            pb: 1,
            borderBottom: '1px solid var(--v51-border-default)',
          }}
        >
          <Typography
            variant='h6'
            sx={{ fontWeight: 600, color: 'var(--v51-text-primary)' }}
          >
            {title}
          </Typography>
          {showCloseButton && closable && (
            <IconButton
              size='small'
              onClick={onClose}
              sx={{ color: 'var(--v51-text-tertiary)' }}
            >
              <XIcon size={20} />
            </IconButton>
          )}
        </DialogTitle>
      )}
      <DialogContent sx={{ pt: title ? 2 : 3, pb: 2 }}>{children}</DialogContent>
      {(footer || onConfirm || onCancel) && (
        <DialogActions
          sx={{
            px: 3,
            py: 2,
            borderTop: '1px solid var(--v51-border-default)',
            gap: 1,
          }}
        >
          {footer ? (
            footer
          ) : (
            <>
              {onCancel && (
                <V51Button
                  variant='outline'
                  onClick={() => {
                    onCancel();
                    onClose();
                  }}
                >
                  {cancelText}
                </V51Button>
              )}
              {onConfirm && (
                <V51Button
                  variant='primary'
                  onClick={onConfirm}
                  loading={confirmLoading}
                  disabled={confirmDisabled}
                >
                  {confirmText}
                </V51Button>
              )}
            </>
          )}
        </DialogActions>
      )}
    </MuiDialog>
  );
};

export type V51ToastType = 'success' | 'error' | 'warning' | 'info';

export interface V51ToastMessage {
  id: string;
  type: V51ToastType;
  title?: string;
  message: string;
  duration?: number;
}

export interface V51ToastContextValue {
  toasts: V51ToastMessage[];
  showToast: (toast: Omit<V51ToastMessage, 'id'>) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  removeToast: (id: string) => void;
}

const V51ToastContext = React.createContext<V51ToastContextValue | null>(null);

export const useV51Toast = (): V51ToastContextValue => {
  const ctx = React.useContext(V51ToastContext);
  if (!ctx) throw new Error('useV51Toast must be used within V51ToastProvider');
  return ctx;
};

const V51ToastItem: React.FC<{
  toast: V51ToastMessage;
  onClose: () => void;
}> = ({ toast, onClose }) => {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  React.useEffect(() => {
    const duration = toast.duration ?? 4000;
    if (duration <= 0) return;
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 250);
    }, duration);
    return () => clearTimeout(timer);
  }, [toast.duration, onClose]);

  const typeConfig: Record<V51ToastType, { icon: React.ReactNode; color: string; bg: string }> = {
    success: {
      icon: <CheckCircle2 size={20} />,
      color: v51DesignTokens.colors.success.main,
      bg: v51DesignTokens.colors.success[50],
    },
    error: {
      icon: <AlertCircle size={20} />,
      color: v51DesignTokens.colors.error.main,
      bg: v51DesignTokens.colors.error[50],
    },
    warning: {
      icon: <AlertTriangle size={20} />,
      color: v51DesignTokens.colors.warning.main,
      bg: v51DesignTokens.colors.warning[50],
    },
    info: {
      icon: <Info size={20} />,
      color: v51DesignTokens.colors.info.main,
      bg: v51DesignTokens.colors.info[50],
    },
  };

  const config = typeConfig[toast.type];

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1.5,
        padding: '12px 16px',
        borderRadius: v51DesignTokens.borderRadius.lg,
        backgroundColor: config.bg,
        border: `1px solid ${config.color}30`,
        boxShadow: v51DesignTokens.shadows.lg,
        transition: 'all 250ms ease',
        transform: visible ? 'translateX(0)' : 'translateX(100%)',
        opacity: visible ? 1 : 0,
        minWidth: 300,
        maxWidth: 400,
      }}
    >
      <Box sx={{ color: config.color, flexShrink: 0, mt: 0.5 }}>{config.icon}</Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {toast.title && (
          <Typography
            sx={{
              fontWeight: 600,
              fontSize: v51DesignTokens.typography.fontSize.sm,
              color: config.color,
              mb: 0.5,
            }}
          >
            {toast.title}
          </Typography>
        )}
        <Typography
          sx={{
            fontSize: v51DesignTokens.typography.fontSize.sm,
            color: 'var(--v51-text-primary)',
            lineHeight: 1.5,
          }}
        >
          {toast.message}
        </Typography>
      </Box>
      <IconButton
        size='small'
        onClick={() => {
          setVisible(false);
          setTimeout(onClose, 250);
        }}
        sx={{ color: 'var(--v51-text-tertiary)', flexShrink: 0 }}
      >
        <XIcon size={16} />
      </IconButton>
    </Box>
  );
};

export const V51ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = React.useState<V51ToastMessage[]>([]);

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = React.useCallback((toast: Omit<V51ToastMessage, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
  }, []);

  const value = React.useMemo<V51ToastContextValue>(
    () => ({
      toasts,
      showToast,
      success: (message, title) => showToast({ type: 'success', message, title }),
      error: (message, title) => showToast({ type: 'error', message, title }),
      warning: (message, title) => showToast({ type: 'warning', message, title }),
      info: (message, title) => showToast({ type: 'info', message, title }),
      removeToast,
    }),
    [toasts, showToast, removeToast]
  );

  return (
    <V51ToastContext.Provider value={value}>
      {children}
      <Box
        sx={{
          position: 'fixed',
          top: 16,
          right: 16,
          zIndex: v51DesignTokens.zIndex.toast,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          maxWidth: 'calc(100% - 32px)',
          pointerEvents: 'none',
        }}
      >
        {toasts.map((toast) => (
          <Box
            key={toast.id}
            sx={{ pointerEvents: 'auto' }}
          >
            <V51ToastItem
              toast={toast}
              onClose={() => removeToast(toast.id)}
            />
          </Box>
        ))}
      </Box>
    </V51ToastContext.Provider>
  );
};

export interface V51TabItem {
  id: string;
  label: React.ReactNode;
  content: React.ReactNode;
  disabled?: boolean;
  icon?: React.ReactNode;
}

export interface V51TabsProps {
  tabs: V51TabItem[];
  activeTab?: string;
  defaultTab?: string;
  onChange?: (tabId: string) => void;
  orientation?: 'horizontal' | 'vertical';
  variant?: 'standard' | 'scrollable' | 'fullWidth';
  sx?: SxProps<Theme>;
  tabSx?: SxProps<Theme>;
  contentSx?: SxProps<Theme>;
}

export const V51Tabs: React.FC<V51TabsProps> = ({
  tabs,
  activeTab: controlledTab,
  defaultTab,
  onChange,
  orientation = 'horizontal',
  variant = 'standard',
  sx,
  tabSx,
  contentSx,
}) => {
  const [internalTab, setInternalTab] = React.useState(
    controlledTab || defaultTab || tabs[0]?.id || ''
  );
  const currentTab = controlledTab || internalTab;

  const handleChange = (_: React.SyntheticEvent, newValue: string) => {
    if (!controlledTab) {
      setInternalTab(newValue);
    }
    onChange?.(newValue);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: orientation === 'vertical' ? 'row' : 'column',
        width: '100%',
        ...sx,
      }}
    >
      <MuiTabs
        value={currentTab}
        onChange={handleChange}
        orientation={orientation}
        variant={variant}
        sx={{
          borderBottom:
            orientation === 'horizontal' ? '1px solid var(--v51-border-default)' : 'none',
          borderRight: orientation === 'vertical' ? '1px solid var(--v51-border-default)' : 'none',
          minHeight: 44,
          '& .MuiTabs-indicator': {
            height: 3,
            borderRadius: '3px 3px 0 0',
            backgroundColor: 'var(--v51-color-primary-main)',
          },
          ...tabSx,
        }}
      >
        {tabs.map((tab) => (
          <MuiTab
            key={tab.id}
            value={tab.id}
            label={tab.label as string}
            disabled={tab.disabled}
            // @ts-expect-error MUI v9 Tab icon prop 类型与 V51 tab 数据结构存在已知兼容问题
            icon={tab.icon}
            iconPosition='start'
            sx={{
              textTransform: 'none',
              fontWeight: v51DesignTokens.typography.fontWeight.medium,
              fontSize: v51DesignTokens.typography.fontSize.sm,
              minWidth: 'auto',
              padding: '12px 20px',
              color: 'var(--v51-text-secondary)',
              '&.Mui-selected': {
                color: 'var(--v51-color-primary-main)',
                fontWeight: v51DesignTokens.typography.fontWeight.semibold,
              },
              '&:hover': {
                color: 'var(--v51-color-primary-main)',
                backgroundColor: 'var(--v51-fill-subtle)',
              },
            }}
          />
        ))}
      </MuiTabs>
      <Box sx={{ flex: 1, ...contentSx }}>{tabs.find((t) => t.id === currentTab)?.content}</Box>
    </Box>
  );
};

export type V51BadgeVariant =
  'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'neutral';
export type V51BadgeSize = 'sm' | 'md' | 'lg';

export interface V51BadgeProps {
  label: React.ReactNode;
  variant?: V51BadgeVariant;
  size?: V51BadgeSize;
  dot?: boolean;
  href?: string;
  onClick?: () => void;
  sx?: SxProps<Theme>;
  icon?: React.ReactNode;
}

const variantColorMap: Record<V51BadgeVariant, { bg: string; color: string }> = {
  primary: { bg: 'var(--v51-color-primary-50)', color: 'var(--v51-color-primary-700)' },
  secondary: { bg: 'var(--v51-color-secondary-50)', color: 'var(--v51-color-secondary-700)' },
  success: { bg: 'var(--v51-color-success-50)', color: 'var(--v51-color-success-700)' },
  warning: { bg: 'var(--v51-color-warning-50)', color: 'var(--v51-color-warning-700)' },
  error: { bg: 'var(--v51-color-error-50)', color: 'var(--v51-color-error-700)' },
  info: { bg: 'var(--v51-color-info-50)', color: 'var(--v51-color-info-700)' },
  neutral: { bg: 'var(--v51-fill-muted)', color: 'var(--v51-text-secondary)' },
};

export const V51Badge: React.FC<V51BadgeProps> = ({
  label,
  variant = 'primary',
  size = 'md',
  dot = false,
  href,
  onClick,
  sx,
  icon,
}) => {
  const colors = variantColorMap[variant];

  const sizeConfig: Record<V51BadgeSize, { px: string; fontSize: string; height: number }> = {
    sm: { px: '6px', fontSize: v51DesignTokens.typography.fontSize['2xs'], height: 18 },
    md: { px: '8px', fontSize: v51DesignTokens.typography.fontSize.xs, height: 22 },
    lg: { px: '10px 12px', fontSize: v51DesignTokens.typography.fontSize.sm, height: 28 },
  };

  const config = sizeConfig[size];

  return (
    <Chip
      label={dot ? undefined : (label as React.ReactElement)}
      icon={dot ? undefined : (icon as React.ReactElement)}
      onClick={onClick as React.MouseEventHandler<HTMLDivElement>}
      component={href ? 'a' : 'span'}
      clickable={!!onClick}
      sx={{
        backgroundColor: colors.bg,
        color: colors.color,
        fontSize: config.fontSize,
        fontWeight: v51DesignTokens.typography.fontWeight.medium,
        height: config.height,
        '& .MuiChip-label': {
          px: config.px,
        },
        '& .MuiChip-icon': {
          color: colors.color,
          fontSize: config.fontSize,
        },
        borderRadius: v51DesignTokens.borderRadius.full,
        ...sx,
      }}
    />
  );
};

export interface V51SkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: number | string;
  height?: number | string;
  animation?: 'pulse' | 'wave' | false;
  sx?: SxProps<Theme>;
}

export const V51Skeleton: React.FC<V51SkeletonProps> = ({
  variant = 'rectangular',
  width,
  height,
  animation = 'wave',
  sx,
}) => {
  return (
    <MuiSkeleton
      variant={variant}
      width={width}
      height={height}
      animation={animation}
      sx={{
        backgroundColor: 'var(--v51-fill-muted)',
        borderRadius: variant === 'circular' ? '50%' : v51DesignTokens.borderRadius.md,
        ...sx,
      }}
    />
  );
};

export interface V51SkeletonCardProps {
  rows?: number;
  showAvatar?: boolean;
  sx?: SxProps<Theme>;
}

export const V51SkeletonCard: React.FC<V51SkeletonCardProps> = ({
  rows = 3,
  showAvatar = false,
  sx,
}) => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2, ...sx }}>
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
        {showAvatar && (
          <V51Skeleton
            variant='circular'
            width={40}
            height={40}
          />
        )}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <V51Skeleton
            variant='text'
            width='40%'
          />
          <V51Skeleton
            variant='text'
            width='20%'
          />
        </Box>
      </Box>
      {Array.from({ length: rows }).map((_, i) => (
        <V51Skeleton
          key={i}
          variant='text'
          width={`${90 - i * 10}%`}
        />
      ))}
    </Box>
  );
};

export interface V51AvatarProps {
  src?: string;
  alt?: string;
  fallback?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'circular' | 'rounded' | 'square';
  online?: boolean;
  sx?: SxProps<Theme>;
}

const avatarColors = [
  'var(--v51-color-primary-main)',
  'var(--v51-color-secondary-main)',
  'var(--v51-color-success-main)',
  'var(--v51-color-warning-main)',
  'var(--v51-color-error-main)',
  'var(--v51-color-info-main)',
];

function getInitials(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getColorFromName(name?: string): string {
  if (!name) return avatarColors[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

export const V51Avatar: React.FC<V51AvatarProps> = ({
  src,
  alt,
  fallback,
  size = 'md',
  variant = 'circular',
  online,
  sx,
}) => {
  const [imgError, setImgError] = React.useState(false);

  const sizeMap: Record<string, { size: number; fontSize: string }> = {
    sm: { size: 28, fontSize: v51DesignTokens.typography.fontSize.xs },
    md: { size: 36, fontSize: v51DesignTokens.typography.fontSize.sm },
    lg: { size: 48, fontSize: v51DesignTokens.typography.fontSize.lg },
    xl: { size: 64, fontSize: v51DesignTokens.typography.fontSize['2xl'] },
  };

  const config = sizeMap[size];
  const showFallback = !src || imgError;
  const color = getColorFromName(fallback || alt);
  const initials = getInitials(fallback || alt);

  return (
    <Box sx={{ position: 'relative', display: 'inline-flex' }}>
      <MuiAvatar
        src={showFallback ? undefined : src}
        alt={alt}
        variant={variant}
        onError={() => setImgError(true)}
        sx={{
          width: config.size,
          height: config.size,
          fontSize: config.fontSize,
          fontWeight: v51DesignTokens.typography.fontWeight.semibold,
          backgroundColor: showFallback ? color : 'transparent',
          color: 'common.white',
          ...sx,
        }}
      >
        {showFallback && initials}
      </MuiAvatar>
      {online !== undefined && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: Math.max(8, config.size * 0.25),
            height: Math.max(8, config.size * 0.25),
            borderRadius: '50%',
            bgcolor: online ? v51DesignTokens.colors.success.main : 'grey.400',
            border: '2px solid var(--v51-surface-card)',
          }}
        />
      )}
    </Box>
  );
};
