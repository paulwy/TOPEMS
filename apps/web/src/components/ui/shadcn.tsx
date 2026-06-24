import React from 'react';
import type { SxProps, Theme } from '@mui/material';
import {
  Box,
  Typography,
  Card as MuiCard,
  CardContent as MuiCardContent,
  CardHeader as MuiCardHeader,
  Dialog as MuiDialog,
  DialogContent as MuiDialogContent,
  DialogTitle as MuiDialogTitle,
  DialogActions as MuiDialogActions,
  Dialog as MuiDialogFooter,
  Select as MuiSelect,
  SelectChangeEvent,
  Tooltip as MuiTooltip,
} from '@mui/material';
import { styled } from '@mui/material';
import { useToast, toast } from '@/hooks/use-toast';

// Re-export useToast for convenience
export { useToast, toast };

const shadcnBase = {
  flexShrink: 0,
};

// Table components
export const Table: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <Box
    component='table'
    className={className}
    sx={{ width: '100%', borderCollapse: 'collapse' }}
  >
    {children}
  </Box>
);

export const TableBody: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <Box
    component='tbody'
    className={className}
  >
    {children}
  </Box>
);

export const TableCell: React.FC<{
  children?: React.ReactNode;
  className?: string;
  component?: string;
}> = ({ children, className, component = 'td' }) => (
  <Box
    component={component}
    className={className}
    sx={{ p: 1, borderBottom: 1, borderColor: 'divider' }}
  >
    {children}
  </Box>
);

export const TableHead: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <Box
    component='th'
    className={className}
    sx={{ p: 1, textAlign: 'left', fontWeight: 600 }}
  >
    {children}
  </Box>
);

export const TableRow: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <Box
    component='tr'
    className={className}
  >
    {children}
  </Box>
);

// Card components
export const Card = MuiCard;
export const CardContent = MuiCardContent;
export const CardHeader = MuiCardHeader;

export const CardTitle: React.FC<{
  children: React.ReactNode;
  className?: string;
  sx?: SxProps<Theme>;
}> = ({ children, className, sx }) => (
  <Typography
    variant='h6'
    className={className}
    sx={[{ fontWeight: 600 }, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]}
  >
    {children}
  </Typography>
);

// Badge component
export const Badge: React.FC<{
  children: React.ReactNode;
  className?: string;
  sx?: SxProps<Theme>;
}> = ({ children, className, sx }) => (
  <Box
    component='span'
    className={className}
    sx={[
      {
        display: 'inline-flex',
        alignItems: 'center',
        px: 1,
        py: 0.25,
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: 500,
        backgroundColor: 'primary.main',
        color: 'primary.contrastText',
      },
      ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
    ]}
  >
    {children}
  </Box>
);

// Dialog components
export const Dialog = MuiDialog;
export const DialogContent = MuiDialogContent;
export const DialogTitle = MuiDialogTitle;
export const DialogActions = MuiDialogActions;

export const DialogHeader: React.FC<{
  children: React.ReactNode;
  className?: string;
  sx?: SxProps<Theme>;
}> = ({ children, className, sx }) => (
  <Box
    className={className}
    sx={[{ mb: 2 }, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]}
  >
    {children}
  </Box>
);

export const DialogFooter: React.FC<{
  children: React.ReactNode;
  className?: string;
  sx?: SxProps<Theme>;
}> = ({ children, className, sx }) => (
  <Box
    className={className}
    sx={[
      { mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 },
      ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
    ]}
  >
    {children}
  </Box>
);

// Select components
export const Select = MuiSelect;

// We need SelectContent, SelectItem, SelectTrigger, SelectValue - these are typically used together
// For now, create simple wrappers that work with MUI Select
export interface SelectContentProps {
  children: React.ReactNode;
}

export const SelectContent: React.FC<SelectContentProps> = ({ children }) => <>{children}</>;

export interface SelectItemProps {
  value: string;
  children: React.ReactNode;
}

export const SelectItem: React.FC<SelectItemProps> = ({ children }) => <>{children}</>;

export interface SelectTriggerProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const SelectTrigger: React.FC<SelectTriggerProps> = ({ children, className }) => (
  <Box className={className}>{children}</Box>
);

export interface SelectValueProps {
  children?: React.ReactNode;
  placeholder?: string;
}

export const SelectValue: React.FC<SelectValueProps> = ({ children, placeholder }) => (
  <span>{children || placeholder}</span>
);

// Tabs component
export const Tabs: React.FC<{
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => <Box className={className}>{children}</Box>;

// Tooltip component
export const Tooltip = MuiTooltip;

// Label component
export const Label: React.FC<{
  children: React.ReactNode;
  htmlFor?: string;
  className?: string;
  sx?: SxProps<Theme>;
}> = ({ children, htmlFor, className, sx }) => (
  <Box
    component='label'
    htmlFor={htmlFor}
    className={className}
    sx={[
      {
        display: 'block',
        fontSize: '0.875rem',
        fontWeight: 500,
        mb: 0.5,
        color: 'text.primary',
      },
      ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
    ]}
  >
    {children}
  </Box>
);

// Input component
export const Input: React.FC<{
  id?: string;
  type?: string;
  value?: string | number;
  defaultValue?: string | number;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  style?: React.CSSProperties;
}> = ({ className, style, ...props }) => (
  <input
    {...props}
    className={className}
    style={{
      width: '100%',
      padding: '8px 12px',
      border: '1px solid #d1d5db',
      borderRadius: '6px',
      fontSize: '0.875rem',
      outline: 'none',
      ...style,
    }}
  />
);

// TabsList component
export const TabsList: React.FC<{
  children: React.ReactNode;
  className?: string;
  sx?: SxProps<Theme>;
}> = ({ children, className, sx }) => (
  <Box
    className={className}
    sx={[
      {
        display: 'flex',
        borderBottom: 1,
        borderColor: 'divider',
        gap: 1,
      },
      ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
    ]}
  >
    {children}
  </Box>
);

// TabsTrigger component
export const TabsTrigger: React.FC<{
  children: React.ReactNode;
  value: string;
  className?: string;
  active?: boolean;
  onClick?: () => void;
  sx?: SxProps<Theme>;
}> = ({ children, className, active, onClick, sx }) => (
  <Box
    component='button'
    onClick={onClick}
    className={className}
    sx={[
      {
        px: 2,
        py: 1,
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        borderBottom: 2,
        borderColor: active ? 'primary.main' : 'transparent',
        color: active ? 'primary.main' : 'text.secondary',
        fontWeight: active ? 600 : 400,
      },
      ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
    ]}
  >
    {children}
  </Box>
);

// TabsContent component
export const TabsContent: React.FC<{
  children: React.ReactNode;
  value: string;
  active?: boolean;
  className?: string;
  sx?: SxProps<Theme>;
}> = ({ children, active, className, sx }) =>
  active ? (
    <Box
      className={className}
      sx={[{ pt: 2 }, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]}
    >
      {children}
    </Box>
  ) : null;

// Progress component
export const Progress: React.FC<{
  value?: number;
  className?: string;
  sx?: SxProps<Theme>;
}> = ({ value = 0, className, sx }) => (
  <Box
    className={className}
    sx={[
      {
        width: '100%',
        height: 8,
        backgroundColor: 'grey.200',
        borderRadius: 4,
        overflow: 'hidden',
      },
      ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
    ]}
  >
    <Box
      sx={{
        width: `${Math.min(100, Math.max(0, value))}%`,
        height: '100%',
        backgroundColor: 'primary.main',
      }}
    />
  </Box>
);

// TableHeader component
export const TableHeader: React.FC<{
  children: React.ReactNode;
  className?: string;
  sx?: SxProps<Theme>;
}> = ({ children, className, sx }) => (
  <Box
    component='thead'
    className={className}
    sx={[
      {
        backgroundColor: 'grey.50',
        '& th': {
          fontWeight: 600,
          fontSize: '0.875rem',
          color: 'text.secondary',
        },
      },
      ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
    ]}
  >
    {children}
  </Box>
);

// Stub for backwards compat
export { shadcnBase };
