import React from "react";
import type { SxProps, Theme } from "@mui/material";
import { Box, Typography } from "@mui/material";

const shadcnBase = {
  flexShrink: 0,
};

export const CardTitle: React.FC<{
  children: React.ReactNode;
  className?: string;
  sx?: SxProps<Theme>;
}> = ({ children, className, sx }) => (
  <Typography
    variant="h6"
    className={className}
    sx={[{ fontWeight: 600 }, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]}
  >
    {children}
  </Typography>
);

export const Label: React.FC<{
  children: React.ReactNode;
  htmlFor?: string;
  className?: string;
  sx?: SxProps<Theme>;
}> = ({ children, htmlFor, className, sx }) => (
  <Box
    component="label"
    htmlFor={htmlFor}
    className={className}
    sx={[
      {
        display: "block",
        fontSize: "0.875rem",
        fontWeight: 500,
        mb: 0.5,
        color: "text.primary",
      },
      ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
    ]}
  >
    {children}
  </Box>
);

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
      width: "100%",
      padding: "8px 12px",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      fontSize: "0.875rem",
      outline: "none",
      ...style,
    }}
  />
);

export const TabsList: React.FC<{
  children: React.ReactNode;
  className?: string;
  sx?: SxProps<Theme>;
}> = ({ children, className, sx }) => (
  <Box
    className={className}
    sx={[
      {
        display: "flex",
        borderBottom: 1,
        borderColor: "divider",
        gap: 1,
      },
      ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
    ]}
  >
    {children}
  </Box>
);

export const TabsTrigger: React.FC<{
  children: React.ReactNode;
  value: string;
  className?: string;
  active?: boolean;
  onClick?: () => void;
  sx?: SxProps<Theme>;
}> = ({ children, className, active, onClick, sx }) => (
  <Box
    component="button"
    onClick={onClick}
    className={className}
    sx={[
      {
        px: 2,
        py: 1,
        border: "none",
        background: "transparent",
        cursor: "pointer",
        borderBottom: 2,
        borderColor: active ? "primary.main" : "transparent",
        color: active ? "primary.main" : "text.secondary",
        fontWeight: active ? 600 : 400,
      },
      ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
    ]}
  >
    {children}
  </Box>
);

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

export const Progress: React.FC<{
  value?: number;
  className?: string;
  sx?: SxProps<Theme>;
}> = ({ value = 0, className, sx }) => (
  <Box
    className={className}
    sx={[
      {
        width: "100%",
        height: 8,
        backgroundColor: "grey.200",
        borderRadius: 4,
        overflow: "hidden",
      },
      ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
    ]}
  >
    <Box
      sx={{
        width: `${Math.min(100, Math.max(0, value))}%`,
        height: "100%",
        backgroundColor: "primary.main",
      }}
    />
  </Box>
);

export const TableHeader: React.FC<{
  children: React.ReactNode;
  className?: string;
  sx?: SxProps<Theme>;
}> = ({ children, className, sx }) => (
  <Box
    component="thead"
    className={className}
    sx={[
      {
        backgroundColor: "grey.50",
        "& th": {
          fontWeight: 600,
          fontSize: "0.875rem",
          color: "text.secondary",
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
